import { randomUUID } from "node:crypto";
import type { FixtureGitHub, NativeIssue, NativePull } from "./github.ts";
import { digest, FixtureJournal } from "./journal.ts";
import {
  checks,
  externalFiles,
  type IssueKey,
  issueBody,
  marker,
  relationships,
  repository,
  skillNames,
  sourceFiles,
  specs,
} from "./scenario.ts";
import { setupGit } from "./setup-git.ts";

export interface SetupState {
  version: 1;
  scenario: string;
  repository: string;
  timestamp: string;
  sourceHash: string;
  main: string;
  external: string;
  externalBranch: string;
  repositoryId?: string;
  actorId?: number;
  originalE1?: { issue: NativeIssue; comments: unknown[] };
  issues: Partial<Record<IssueKey, NativeIssue>>;
  externalPull?: NativePull;
  complete?: boolean;
  activated?: boolean;
}
export function prepareFixture(directory: string) {
  const journal = new FixtureJournal(directory);
  let state = journal.read<SetupState>("fixture-setup.json");
  const sourceHash = digest({ sourceFiles, externalFiles, specs, relationships, checks });
  if (
    state &&
    (state.version !== 1 || state.repository !== repository || state.sourceHash !== sourceHash)
  )
    throw Error(
      "Existing fixture scenario differs from this reviewed source; preserve it and reconcile",
    );
  if (!state) {
    const scenario = randomUUID();
    const timestamp = new Date().toISOString();
    const git = setupGit(directory, timestamp);
    state = {
      version: 1,
      scenario,
      repository,
      timestamp,
      sourceHash,
      main: git.main,
      external: git.external,
      externalBranch: `codex/fixture-${scenario}-external`,
      issues: {},
    };
    journal.save("fixture-setup.json", state);
  }
  journal.save("setup-plan.json", {
    version: 1,
    scenario: state.scenario,
    repository,
    sourceHash,
    main: state.main,
    external: state.external,
    sourceFiles,
    externalFiles,
    issues: Object.fromEntries(
      Object.keys(specs).map((key) => [
        key,
        { title: specs[key as IssueKey].title, body: issueBody(state.scenario, key as IssueKey) },
      ]),
    ),
    relationships,
    checks,
    initialLabels: "ready-for-human",
    activation:
      "Explicit setup --apply --activate after full topology; E1 needs-triage, R/P/A/B/D ready-for-agent",
    maintainerMerges: ["E1 normal", "E2 squash", "graph maintainer merge"],
    skills: skillNames,
  });
  return { journal, state };
}
export async function applyFixture(
  directory: string,
  github: FixtureGitHub,
  token: string,
  activate = false,
) {
  const { journal, state } = prepareFixture(directory);
  const repo = await github.request<{ node_id: string; full_name: string; private: boolean }>(
    github.path,
  );
  const actor = await github.request<{ id: number }>("user");
  if (!repo || repo.full_name !== repository || !repo.private || !repo.node_id || !actor?.id)
    throw Error("Private fixture repository and setup actor identity required");
  if (state.repositoryId && (state.repositoryId !== repo.node_id || state.actorId !== actor.id))
    throw Error("Fixture repository or actor identity changed");
  state.repositoryId = repo.node_id;
  state.actorId = actor.id;
  if (!state.originalE1) {
    const issue = await github.request<NativeIssue>(`${github.path}/issues/1`);
    if (!issue || issue.pull_request || issue.state !== "open")
      throw Error("Existing E1 must be present and open");
    state.originalE1 = { issue, comments: await github.list(`${github.path}/issues/1/comments`) };
  }
  journal.save("fixture-setup.json", state);
  const git = setupGit(directory, state.timestamp, token);
  if (git.main !== state.main || git.external !== state.external)
    throw Error("Prepared source identity changed");
  for (const [branch, sha] of [
    ["main", state.main],
    [state.externalBranch, state.external],
  ]) {
    await journal.effect(
      `branch:${branch}`,
      { branch, sha },
      async () => {
        const found = await github.request<{ object: { sha: string } }>(
          `${github.path}/git/ref/heads/${branch}`,
        );
        if (found && found.object.sha !== sha)
          throw Error("Existing setup branch differs; never reset main");
        return found ? { sha } : undefined;
      },
      () => git.publish(branch, sha),
    );
  }
  for (const name of ["needs-triage", "ready-for-agent", "ready-for-human", "enhancement"])
    await journal.effect(
      `label:${name}`,
      { name },
      async () => await github.request(`${github.path}/labels/${name}`),
      async () => await github.request(`${github.path}/labels`, "POST", { name, color: "0E8A16" }),
    );
  const allIssues = () => github.list<NativeIssue>(`${github.path}/issues?state=all`);
  for (const key of Object.keys(specs) as IssueKey[]) {
    const body =
      key === "E1"
        ? `${state.originalE1.issue.body ?? ""}\n\n---\n\n${issueBody(state.scenario, key)}`
        : issueBody(state.scenario, key);
    if (key === "E1") {
      const original = state.originalE1.issue;
      const labels = [
        ...original.labels
          .map((label) => label.name)
          .filter(
            (name) =>
              ![
                "needs-triage",
                "needs-info",
                "ready-for-agent",
                "ready-for-human",
                "wontfix",
              ].includes(name),
          ),
        "ready-for-human",
      ];
      state.issues.E1 = await journal.effect(
        "E1:revision",
        { body, labels, nodeId: original.node_id },
        async () => {
          const current = await github.request<NativeIssue>(`${github.path}/issues/1`);
          if (!current || current.node_id !== original.node_id) throw Error("E1 identity changed");
          if (
            current.body === body &&
            digest(current.labels.map((label) => label.name).sort()) === digest([...labels].sort())
          )
            return current;
          if (current.body !== original.body || current.updated_at !== original.updated_at)
            throw Error("E1 changed since setup preservation");
          return undefined;
        },
        async () => {
          const result = await github.request<NativeIssue>(`${github.path}/issues/1`, "PATCH", {
            body,
            labels,
          });
          if (!result) throw Error("Missing E1 update receipt");
          return result;
        },
      );
    } else {
      const title = `[factory live ${key}] ${specs[key].title}`;
      state.issues[key] = await journal.effect(
        `issue:${key}`,
        { title, body },
        async () => {
          const found = (await allIssues()).filter(
            (issue) => !issue.pull_request && issue.body?.includes(marker(state.scenario, key)),
          );
          if (
            found.length > 1 ||
            found.some(
              (issue) => issue.user.id !== actor.id || issue.title !== title || issue.body !== body,
            )
          )
            throw Error("Ambiguous or changed fixture issue");
          return found[0];
        },
        async () => {
          const result = await github.request<NativeIssue>(`${github.path}/issues`, "POST", {
            title,
            body,
            labels: ["ready-for-human", "enhancement"],
          });
          if (!result) throw Error("Missing native issue receipt");
          return result;
        },
      );
    }
    journal.save("fixture-setup.json", state);
  }
  for (const relation of relationships) {
    const from = state.issues[relation.from];
    const to = state.issues[relation.to];
    if (!from || !to) throw Error("Fixture relation endpoint missing");
    const route = `${github.path}/issues/${from.number}/${relation.kind === "child" ? "sub_issues" : "dependencies/blocked_by"}`;
    const find = async () =>
      (await github.list<NativeIssue>(route)).find(
        (issue) => issue.id === to.id && issue.node_id === to.node_id,
      );
    await journal.effect(
      `relation:${relation.kind}:${from.id}:${to.id}`,
      relation,
      find,
      async () => {
        await github.request(
          route,
          "POST",
          relation.kind === "child" ? { sub_issue_id: to.id } : { issue_id: to.id },
        );
        const found = await find();
        if (!found) throw Error("Native relation write awaits visible receipt");
        return found;
      },
    );
  }
  const body = `Human-owned fixture scaffolding. Maintainer must squash-merge this PR.\n\nCloses #${state.issues.E2?.number}\n\n${marker(state.scenario, "external-pr")}`;
  state.externalPull = await journal.effect(
    "external-pr",
    { head: state.externalBranch, commit: state.external, body },
    async () => {
      const matches = (await github.list<NativePull>(`${github.path}/pulls?state=all`)).filter(
        (pr) => pr.body?.includes(marker(state.scenario, "external-pr")),
      );
      if (matches.length > 1) throw Error("Ambiguous external fixture PR");
      const found = matches[0];
      if (
        found &&
        (found.user.id !== actor.id ||
          found.head.sha !== state.external ||
          found.head.ref !== state.externalBranch ||
          found.base.ref !== "main" ||
          found.body !== body ||
          found.base.repo.full_name !== repository ||
          found.head.repo.full_name !== repository)
      )
        throw Error("External fixture PR changed");
      return found;
    },
    async () => {
      const result = await github.request<NativePull>(`${github.path}/pulls`, "POST", {
        title: "[factory live E2] External formatter for squash delivery",
        head: state.externalBranch,
        base: "main",
        body,
        draft: false,
      });
      if (!result) throw Error("Missing external PR receipt");
      return result;
    },
  );
  state.complete = true;
  journal.save("fixture-setup.json", state);
  if (activate) {
    // Read topology again at activation; old setup receipts do not authorize removed relations.
    for (const relation of relationships) {
      const from = state.issues[relation.from];
      const to = state.issues[relation.to];
      if (!from || !to) throw Error("Missing activation relation endpoint");
      const route = `${github.path}/issues/${from.number}/${relation.kind === "child" ? "sub_issues" : "dependencies/blocked_by"}`;
      if (
        !(await github.list<NativeIssue>(route)).some(
          (issue) => issue.id === to.id && issue.node_id === to.node_id,
        )
      )
        throw Error(
          "Fixture topology changed before activation; reconcile without replacing retained work",
        );
    }
    for (const key of ["A", "B", "D", "P", "R", "E1"] as IssueKey[]) {
      const issue = state.issues[key];
      if (!issue) throw Error("Missing activation issue");
      const label = key === "E1" ? "needs-triage" : "ready-for-agent";
      await journal.effect(
        `activate:${key}`,
        { nodeId: issue.node_id, label },
        async () => {
          const current = await github.request<NativeIssue>(
            `${github.path}/issues/${issue.number}`,
          );
          if (
            !current ||
            current.node_id !== issue.node_id ||
            current.body !== issue.body ||
            current.state !== "open"
          )
            throw Error("Fixture scope changed before activation");
          const canonical = current.labels
            .map((item) => item.name)
            .filter((name) =>
              [
                "needs-triage",
                "needs-info",
                "ready-for-agent",
                "ready-for-human",
                "wontfix",
              ].includes(name),
            );
          return canonical.length === 1 && canonical[0] === label ? { label } : undefined;
        },
        async () => {
          const labels = [
            ...issue.labels
              .map((item) => item.name)
              .filter(
                (name) =>
                  ![
                    "needs-triage",
                    "needs-info",
                    "ready-for-agent",
                    "ready-for-human",
                    "wontfix",
                  ].includes(name),
              ),
            label,
          ];
          await github.request(`${github.path}/issues/${issue.number}`, "PATCH", { labels });
          return { label };
        },
      );
    }
    state.activated = true;
    journal.save("fixture-setup.json", state);
  }
  return state;
}
