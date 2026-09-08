import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect, Schema } from "effect";
import { FactoryError, Implementation, type JobResult } from "../envelopes.ts";
import { assertAgentBoundary, callAgent, mechanical, reviewCode, testUi } from "./agents.ts";
import { api, closeIssue, eligible, readIssue } from "./issues.ts";
import { checkpoint, exec, git, head, phase } from "./phases.ts";
import { issuePrompt } from "./worker.ts";

export const prepareMerge = (shared: string, candidate: string, sha: string) =>
  Effect.gen(function* () {
    yield* git(["switch", "-c", candidate, shared]);
    const base = yield* head();
    const workspace = yield* Workspace;
    const merge = yield* workspace.git(["merge", "--no-ff", "--no-commit", sha]);
    const conflicts = yield* git(["diff", "--name-only", "--diff-filter=U"]);
    if (!merge.succeeded && !conflicts) return yield* new FactoryError({ message: merge.stderr });
    return { base, conflicts };
  });

export const advanceShared = (shared: string, candidate: string, expected: string) =>
  Effect.gen(function* () {
    // CAS prevents an unexpected actor advancing the branch during validation.
    if ((yield* git(["rev-parse", shared])) !== expected)
      return yield* new FactoryError({
        message: "Shared integration branch moved during validation",
      });
    yield* git(["switch", shared]);
    yield* git(["merge", "--ff-only", candidate]);
    return yield* head();
  });

const Pull = Schema.Struct({
  number: Schema.Number,
  html_url: Schema.String,
  state: Schema.String,
  merged_at: Schema.NullOr(Schema.String),
});

export const publish = (
  repo: string,
  shared: string,
  base: string,
  completed: ReadonlyArray<JobResult>,
) =>
  Effect.gen(function* () {
    // Explicit refspec; no force push. Finding by head also recovers create-after-output-loss.
    yield* git(["push", "origin", `refs/heads/${shared}:refs/heads/${shared}`]);
    const owner = repo.split("/")[0];
    const pulls = yield* api(
      `repos/${repo}/pulls?state=all&head=${encodeURIComponent(`${owner}:${shared}`)}&per_page=100`,
      Schema.Array(Pull),
    );
    if (pulls.length > 1)
      return yield* new FactoryError({ message: "More than one PR exists for the shared branch" });
    const existing = pulls[0];
    if (existing && existing.state !== "open")
      return yield* new FactoryError({
        message: "The run's PR was closed or merged; refusing to create a second PR",
      });
    const first = completed[0];
    if (!first) return yield* new FactoryError({ message: "No integrated issue to publish" });
    const title = (
      completed.length === 1
        ? `Implement #${first.job.issue.number}: ${first.job.issue.title}`
        : "Implement Zaidan issues"
    ).slice(0, 256);
    const body = [
      "Implements the following issues on one shared integration branch.",
      "",
      ...completed.map((result) => `- #${result.job.issue.number}: ${result.summary}`),
      "",
      "Validation: implementation code review, independent standards/spec reviews, UI testing with evidence, and repository checks.",
      "Issues are closed after successful integration into this branch; the PR remains open for review.",
    ].join("\n");
    // gh receives structured argv fields; issue content never becomes shell source.
    const path = existing ? `repos/${repo}/pulls/${existing.number}` : `repos/${repo}/pulls`;
    const args = [
      "--method",
      existing ? "PATCH" : "POST",
      "-f",
      `title=${title}`,
      "-f",
      `body=${body}`,
      ...(!existing ? ["-f", `head=${shared}`, "-f", `base=${base}`, "-F", "draft=true"] : []),
    ];
    const result = yield* api(path, Pull, args);
    return result.html_url;
  });

export const integrate = (result: JobResult, shared: string, repo: string, attempts: number) =>
  Effect.gen(function* () {
    const key = `${result.job.key}/integration`;
    const candidate = `${shared}-candidate-${result.job.issue.number}-${result.job.key.split("/")[0]}`;
    const current = yield* phase(
      `${key}/eligibility`,
      Schema.Boolean,
      readIssue(repo, result.job.issue.number).pipe(
        Effect.map((issue) => eligible(issue) && issue.body === result.job.issue.body),
      ),
    );
    if (!current)
      return {
        ...result,
        passed: false,
        findings: ["Issue eligibility changed before integration"],
      };
    const prepared = yield* phase(
      `${key}/prepare`,
      Schema.Struct({ base: Schema.String, conflicts: Schema.String }),
      prepareMerge(shared, candidate, result.sha),
    );
    let faults: string[] = prepared.conflicts
      ? [`Resolve these conflicts: ${prepared.conflicts}`]
      : [];
    let currentHead = prepared.base;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const prefix = `${key}/attempt-${attempt}`;
      const prompt =
        `${issuePrompt(result.job)}\nIntegration review base: ${prepared.base}. ` +
        `The incoming issue commit is ${result.sha}. Review the entire combined candidate.\n${faults.join("\n")}`;
      if (faults.length > 0) {
        const fixed = yield* callAgent(
          `${prefix}/resolve`,
          "integrator",
          prompt,
          Implementation,
          true,
        );
        yield* assertAgentBoundary(`${prefix}/boundary`, currentHead);
        faults = [
          ...fixed.value.reviewFindings,
          ...(!fixed.value.reviewPassed ? ["Repair review failed"] : []),
        ];
      }
      const unmerged = yield* phase(
        `${prefix}/unmerged`,
        Schema.String,
        git(["diff", "--name-only", "--diff-filter=U"]),
      );
      if (unmerged) faults.push(`Unresolved merge paths: ${unmerged}`);
      // Preserve failed resolutions on the candidate branch too. They never advance shared.
      currentHead = yield* checkpoint(
        `${prefix}/checkpoint`,
        `fix: integrate #${result.job.issue.number}`,
      );
      const review = yield* reviewCode(`${prefix}/review`, prompt);
      const ui = yield* testUi(`${prefix}/ui`, prompt);
      const checks = yield* mechanical(`${prefix}/checks`);
      yield* assertAgentBoundary(`${prefix}/verified-boundary`, currentHead);
      faults = [...faults, ...review, ...ui, ...checks];
      const generated = yield* checkpoint(
        `${prefix}/generated`,
        `chore: refresh integration artifacts for #${result.job.issue.number}`,
      );
      if (generated !== currentHead)
        faults.push("Generated tracked files changed; repeat verification");
      currentHead = generated;
      if (faults.length === 0) {
        const stillEligible = yield* phase(
          `${key}/final-eligibility`,
          Schema.Boolean,
          readIssue(repo, result.job.issue.number).pipe(
            Effect.map((issue) => eligible(issue) && issue.body === result.job.issue.body),
          ),
        );
        if (!stillEligible) {
          yield* phase(`${key}/eligibility-restore`, Schema.String, git(["switch", shared]));
          return {
            ...result,
            passed: false,
            findings: ["Issue requirements or dependencies changed during integration"],
          };
        }
        const sha = yield* phase(
          `${key}/merge`,
          Schema.String,
          advanceShared(shared, candidate, prepared.base),
        );
        return { ...result, passed: true, sha, findings: [] };
      }
    }
    yield* phase(`${key}/restore`, Schema.String, git(["switch", shared]));
    return { ...result, passed: false, findings: faults };
  });

export const publishAndClose = (
  name: string,
  repo: string,
  shared: string,
  base: string,
  completed: ReadonlyArray<JobResult>,
) =>
  Effect.gen(function* () {
    const url = yield* phase(`${name}/pr`, Schema.String, publish(repo, shared, base, completed));
    const latest = completed[completed.length - 1];
    if (!latest) return yield* new FactoryError({ message: "No integrated issue to close" });
    yield* phase(`${name}/close`, Schema.Void, closeIssue(repo, latest.job.issue.number));
    return url;
  });

export const repository = () =>
  exec(["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
