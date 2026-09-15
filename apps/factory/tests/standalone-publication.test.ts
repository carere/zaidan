import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { captureResources } from "../src/captured-resources.ts";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { createPublicationGit } from "../src/publication-git.ts";
import type { PublicationGitHub, PublishedPullRequest } from "../src/standalone-publication.ts";
import type { TriageAdapter } from "../src/triage.ts";
import type { WorkerOutcome } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

function fixture(t: { after(fn: () => void): void }) {
  const root = mkdtempSync(join(tmpdir(), "factory-publication-"));
  const repository = join(root, "source");
  mkdirSync(repository);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.test");
  writeFileSync(join(repository, "greeting"), "hello\n");
  git("add", ".");
  git("commit", "-m", "initial");
  const base = git("rev-parse", "HEAD");
  const bare = join(root, "trusted.git");
  const remote = join(root, "remote.git");
  git("clone", "--bare", repository, bare);
  git("clone", "--bare", repository, remote);
  writeFileSync(join(repository, "greeting"), "hello world\n");
  git("commit", "-am", "implementation");
  const commit = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const artifact = join(root, "candidate.bundle");
  git("bundle", "create", artifact, "HEAD");
  const issue: DiscoveredIssue = {
    issueId: "I_one",
    revision: "revision-1",
    contentRevision: "content-1",
    repository: "owner/repo",
    number: 1,
    title: "Greeting",
    body: "## What to build\nGreet the world.\n## Acceptance criteria\nSay hello world.",
    state: "open",
    stateReason: null,
    labels: ["ready-for-agent"],
    parentIds: [],
    childIds: [],
    dependencyIds: [],
    sourceRef: "https://github.com/owner/repo/issues/1",
    updatedAt: "2026-09-15T00:00:00Z",
  };
  const skills = join(root, "implement");
  mkdirSync(skills);
  writeFileSync(join(skills, "SKILL.md"), "---\nname: implement\n---\nImplement.");
  const pulls: PublishedPullRequest[] = [];
  const notifications: string[] = [];
  let pushes = 0;
  let creates = 0;
  let closes = 0;
  let dispatches = 0;
  let transform: (value: WorkerOutcome) => WorkerOutcome = (value) => value;
  let losePush = false;
  let loseCreate = false;
  const source: PublicationGitHub = {
    async findPullRequests() {
      return structuredClone(pulls);
    },
    async createPullRequest(input) {
      creates++;
      const pr: PublishedPullRequest = {
        id: "PR_one",
        number: 10,
        url: "https://github.com/owner/repo/pull/10",
        repository: issue.repository,
        headRef: input.branch,
        headCommit: input.commit,
        baseRef: "main",
        state: "open",
        draft: false,
        mergedAt: null,
        mergeCommit: null,
        marker: input.marker,
      };
      pulls.push(pr);
      if (loseCreate) {
        loseCreate = false;
        throw Error("Lost create response");
      }
      return pr;
    },
    async closeIssue() {
      closes++;
      issue.state = "closed";
      issue.stateReason = "completed";
    },
  };
  const transport = createPublicationGit({ trustedGitDirectory: bare, remote });
  const stores: SqliteWorkflowStore[] = [];
  const open = (triage?: TriageAdapter) => {
    const store = new SqliteWorkflowStore(join(root, "state.sqlite"));
    stores.push(store);
    return new IssueWorkflow({
      store,
      triage,
      discovery: {
        async read() {
          return {
            repository: issue.repository,
            revision: "snapshot",
            issues: [structuredClone(issue)],
          };
        },
      },
      engine: {
        async start({ runId }) {
          return runId;
        },
        async find() {
          return undefined;
        },
        async wake() {},
      },
      notifications: {
        async send() {
          return "unused";
        },
        async reconcile() {
          return undefined;
        },
      },
      captureResources: (input) =>
        captureResources({
          directory: join(root, "resources"),
          issue: input,
          entry: "implement",
          skills: [{ path: skills }],
          dependencies: {},
          checks: ["node --test"],
        }),
      worker: {
        async dispatch(request) {
          dispatches++;
          const binding = {
            commit,
            tree,
            reviewBase: base,
            snapshot: request.resources?.id,
            issueRevision: request.issue.revision,
            provider: "openai-codex",
            model: "gpt-6-astra",
            reasoning: "high",
          };
          return transform({
            type: "completed",
            candidate: {
              ...binding,
              checks: [{ ...binding, command: "node --test", exitCode: 0 }],
              reviews: ["standards", "spec"].map((axis) => ({
                ...binding,
                axis,
                passed: true,
                findings: [],
                delegateSession: axis,
              })),
              artifact: {
                kind: "git-bundle",
                path: artifact,
                sha256: createHash("sha256").update(readFileSync(artifact)).digest("hex"),
              },
            },
          });
        },
        async resume() {
          throw Error("unused");
        },
        async reconcile() {
          return undefined;
        },
      },
      publication: {
        git: {
          ...transport,
          async publishBranch(...args) {
            pushes++;
            await transport.publishBranch(...args);
            if (losePush) {
              losePush = false;
              throw Error("Lost push response");
            }
          },
        },
        github: source,
        async notify(input) {
          if (!notifications.includes(input.operationId)) notifications.push(input.operationId);
          return input.operationId;
        },
      },
    });
  };
  t.after(() => {
    for (const store of stores) store.close();
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    issue,
    open,
    base,
    commit,
    pulls,
    notifications,
    git,
    bare,
    remote,
    source,
    artifact,
    transform: (fn: typeof transform) => {
      transform = fn;
    },
    losePush: () => {
      losePush = true;
    },
    loseCreate: () => {
      loseCreate = true;
    },
    counts: () => ({ pushes, creates, closes, dispatches }),
  };
}

test("standalone work publishes the covered candidate and stays open until its main merge is observed", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  const published = await workflow.publishStandalone(run.runId);
  assert.equal(published.publication?.state, "reviewable");
  assert.equal(f.pulls[0].headCommit, f.commit);
  assert.equal(f.pulls[0].baseRef, "main");
  assert.equal(f.issue.state, "open");
  assert.equal(f.notifications.length, 1);
  const resumed = f.open();
  await resumed.publishStandalone(run.runId);
  assert.deepEqual(f.counts(), { pushes: 1, creates: 1, closes: 0, dispatches: 1 });
  f.pulls[0].state = "closed";
  f.pulls[0].mergedAt = "2026-09-15T01:00:00Z";
  f.pulls[0].mergeCommit = f.commit;
  const delivered = await resumed.publishStandalone(run.runId);
  assert.equal(delivered.publication?.state, "delivered");
  assert.equal(f.issue.state, "closed");
  assert.equal(f.counts().closes, 1);
});

test("an active earlier revision cannot receive a second standalone admission", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  await workflow.admitStandalone(f.issue.issueId, { startingRevision: f.base, reviewBase: f.base });
  f.issue.revision = "revision-2";
  await assert.rejects(
    workflow.admitStandalone(f.issue.issueId, { startingRevision: f.base, reviewBase: f.base }),
    /earlier revision/i,
  );
  assert.equal(workflow.admissions().length, 1);
});

test("lost push and PR responses recover from remote state without duplicate publication", async (t) => {
  const f = fixture(t);
  let workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  f.losePush();
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  workflow = f.open();
  f.loseCreate();
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  const recovered = await f.open().publishStandalone(run.runId);
  assert.equal(recovered.publication?.state, "reviewable");
  assert.equal(f.pulls.length, 1);
  assert.deepEqual(f.counts(), { pushes: 1, creates: 1, closes: 0, dispatches: 1 });
});

test("readiness, requirements and membership changes prevent dispatch and publication", async (t) => {
  for (const kind of ["label", "brief", "membership"]) {
    const f = fixture(t);
    const workflow = f.open();
    const run = await workflow.admitStandalone(f.issue.issueId, {
      startingRevision: f.base,
      reviewBase: f.base,
    });
    const initial = structuredClone(f.issue);
    const revoke = () => {
      if (kind === "label") f.issue.labels = ["ready-for-human"];
      else if (kind === "brief") f.issue.body += "\nChanged requirement";
      else f.issue.parentIds = ["I_graph"];
    };
    revoke();
    await assert.rejects(workflow.drive(run.runId));
    assert.equal(f.counts().dispatches, 0);
    Object.assign(f.issue, initial);
    await workflow.drive(run.runId);
    revoke();
    assert.equal(
      (await workflow.publishStandalone(run.runId)).publication?.state,
      "reconciliation",
    );
    assert.equal(f.counts().pushes, 0);
    assert.equal(f.pulls.length, 0);
  }
});

test("ambiguous or unmerged closure never fabricates standalone delivery", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  await workflow.publishStandalone(run.runId);
  f.pulls[0].state = "closed";
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  assert.equal(f.issue.state, "open");
  f.pulls[0].state = "open";
  f.issue.state = "closed";
  f.issue.stateReason = "not_planned";
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  assert.equal(f.counts().closes, 0);
});

test("no-change work is routed to triage without a manufactured PR or delivery", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  f.transform(() => ({ type: "no-change", reason: "Requested behavior already exists" }));
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  const outcome = await workflow.publishStandalone(run.runId);
  assert.equal(outcome.publication?.state, "triage");
  assert.match(outcome.publication?.reason ?? "", /already exists/);
  assert.equal(f.pulls.length, 0);
  assert.equal(f.counts().pushes, 0);
  assert.equal(f.issue.state, "open");
});

test("reopening a delivered standalone issue preserves its PR and requests reconciliation", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  await workflow.publishStandalone(run.runId);
  f.pulls[0].state = "closed";
  f.pulls[0].mergedAt = "2026-09-15T01:00:00Z";
  f.pulls[0].mergeCommit = f.commit;
  await workflow.publishStandalone(run.runId);
  f.issue.state = "open";
  f.issue.stateReason = "reopened";
  f.issue.revision = "revision-reopened";
  await assert.rejects(
    workflow.admitStandalone(f.issue.issueId, { startingRevision: f.base, reviewBase: f.base }),
    /earlier revision/i,
  );
  const state = await f.open().publishStandalone(run.runId);
  assert.equal(state.publication?.state, "reconciliation");
  assert.equal(f.issue.state, "open");
  assert.equal(f.counts().closes, 1);
  await assert.rejects(
    workflow.admitStandalone(f.issue.issueId, { startingRevision: f.base, reviewBase: f.base }),
    /earlier revision/i,
  );
  assert.equal(workflow.admissions().length, 1);
});

test("standalone admission starts from the observed main head and rejects caller-selected stale bases", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  f.git("push", f.remote, "HEAD:main");
  await assert.rejects(
    workflow.admitStandalone(f.issue.issueId, { startingRevision: f.base, reviewBase: f.base }),
    /main head/i,
  );
  assert.equal(workflow.admissions().length, 0);
});

test("failed or stale candidate coverage and a changed exported bundle cannot publish", async (t) => {
  for (const corruption of ["checks", "review", "candidate", "bundle"]) {
    const f = fixture(t);
    const workflow = f.open();
    f.transform((value) => {
      if (value.type !== "completed") throw Error("fixture");
      if (corruption === "checks")
        (value.candidate.checks as { exitCode: number }[])[0].exitCode = 1;
      if (corruption === "review")
        (value.candidate.reviews as { delegateSession: string }[])[1].delegateSession = "standards";
      if (corruption === "candidate") value.candidate.commit = f.base;
      return value;
    });
    const run = await workflow.admitStandalone(f.issue.issueId, {
      startingRevision: f.base,
      reviewBase: f.base,
    });
    await workflow.drive(run.runId);
    if (corruption === "bundle") writeFileSync(f.artifact, "changed after sandbox verification");
    assert.equal(
      (await workflow.publishStandalone(run.runId)).publication?.state,
      "reconciliation",
    );
    assert.equal(f.pulls.length, 0);
    assert.equal(f.counts().pushes, 0);
  }
});

test("an uncertain PR create that is not yet visible waits instead of issuing another create", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  f.loseCreate();
  await workflow.publishStandalone(run.runId);
  const pending = f.pulls.pop();
  assert.ok(pending);
  const recovered = await f.open().publishStandalone(run.runId);
  assert.equal(recovered.publication?.state, "reconciliation");
  assert.equal(f.counts().creates, 1);
  f.pulls.push(pending);
  assert.equal((await f.open().publishStandalone(run.runId)).publication?.state, "reviewable");
  assert.equal(f.counts().creates, 1);
});

test("concurrent publishers and an edited remote branch cannot duplicate or overwrite publication", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  await Promise.all([workflow.publishStandalone(run.runId), f.open().publishStandalone(run.runId)]);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.counts().creates, 1);
  const branch = workflow.observe(run.runId).publication?.branch;
  assert.ok(branch);
  f.git("push", "--force", f.remote, `${f.base}:refs/heads/${branch}`);
  const changed = await workflow.publishStandalone(run.runId);
  assert.equal(changed.publication?.state, "reconciliation");
  assert.equal(f.counts().pushes, 1);
});

test("a committed candidate whose final tree matches its review base routes through triage", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  f.git("revert", "--no-edit", f.commit);
  const commit = f.git("rev-parse", "HEAD");
  const tree = f.git("rev-parse", "HEAD^{tree}");
  f.git("bundle", "create", f.artifact, "HEAD");
  f.transform((value) => {
    if (value.type !== "completed") throw Error("fixture");
    Object.assign(value.candidate, { commit, tree });
    for (const evidence of [
      ...(value.candidate.checks as Record<string, unknown>[]),
      ...(value.candidate.reviews as Record<string, unknown>[]),
    ])
      Object.assign(evidence, { commit, tree });
    return value;
  });
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "triage");
  assert.equal(f.counts().pushes, 0);
  assert.equal(f.pulls.length, 0);
  assert.equal(f.issue.state, "open");
});

test("lost issue-closure response reconciles completed delivery without closing twice", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  await workflow.publishStandalone(run.runId);
  f.pulls[0].state = "closed";
  f.pulls[0].mergedAt = "2026-09-15T01:00:00Z";
  f.pulls[0].mergeCommit = f.commit;
  const original = f.source.closeIssue;
  f.source.closeIssue = async (...args) => {
    await original(...args);
    throw Error("Lost close response");
  };
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  assert.equal((await f.open().publishStandalone(run.runId)).publication?.state, "delivered");
  assert.equal(f.counts().closes, 1);
});

test("authorization revoked while a PR is created pauses before advertising it as reviewable", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const create = f.source.createPullRequest;
  f.source.createPullRequest = async (input) => {
    const pr = await create(input);
    f.issue.labels = ["ready-for-human"];
    return pr;
  };
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  await workflow.drive(run.runId);
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reconciliation");
  assert.equal(f.pulls.length, 1);
  assert.equal(f.notifications.length, 0);
});

test("standalone admission and publication retain the triage-approved brief and reject a later changed comment", async (t) => {
  const f = fixture(t);
  f.issue.body = "Please add a greeting.";
  const brief = {
    issueId: f.issue.issueId,
    contentRevision: f.issue.contentRevision,
    ref: `${f.issue.sourceRef}#issuecomment-approved`,
    content: "## Agent brief\nGreet the world.\n## Acceptance criteria\nSay hello world.",
  };
  const triage: TriageAdapter = {
    prepare: async (issue) => issue,
    apply: async () => {
      throw new Error("Implementation never publishes triage");
    },
    reconcile: async () => undefined,
    approvedBriefs: async () => [structuredClone(brief)],
  };
  const workflow = f.open(triage);
  assert.equal((await workflow.scan()).decisions[0].route, "implementation");
  const run = await workflow.admitStandalone(f.issue.issueId, {
    startingRevision: f.base,
    reviewBase: f.base,
  });
  assert.equal(run.issue.sourceContent?.brief, brief.content);
  assert.equal(run.issue.briefRef, brief.ref);
  await workflow.drive(run.runId);
  assert.equal((await workflow.publishStandalone(run.runId)).publication?.state, "reviewable");
  brief.content += "\nChanged scope.";
  const restarted = f.open(triage);
  assert.equal((await restarted.publishStandalone(run.runId)).publication?.state, "reconciliation");
  assert.deepEqual(f.counts(), { pushes: 1, creates: 1, closes: 0, dispatches: 1 });
});
