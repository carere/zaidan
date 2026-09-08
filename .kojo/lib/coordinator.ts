import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect, Queue, Schema } from "effect";
import { FactoryError, Issue, JobResult } from "../envelopes.ts";
import type { Settings } from "../settings.ts";
import { integrate, publishAndClose } from "./integration.ts";
import { discover, eligible, pendingReasons } from "./issues.ts";
import { git, phase } from "./phases.ts";
import { implementIssue } from "./worker.ts";

export const Outcome = Schema.Struct({
  completed: Schema.Array(JobResult),
  failed: Schema.Array(JobResult),
  pending: Schema.Array(Schema.String),
  pr: Schema.String,
});
export type Outcome = typeof Outcome.Type;

/**
 * The one consumer integrates serially. Worker completion order is recorded as a code phase;
 * replay must consume that recorded order rather than race the workers a second time.
 */
export const coordinate = (
  settings: Settings,
  repo: string,
  cwd: string,
  shared: string,
  epoch: number,
  previous: Outcome = { completed: [], failed: [], pending: [], pr: "" },
) =>
  Effect.gen(function* () {
    const events = yield* Queue.unbounded<JobResult>();
    const active = new Set<number>();
    const seen = new Set(previous.completed.map((result) => result.job.issue.number));
    const consumed = new Set<string>();
    const completed = [...previous.completed];
    const failed: JobResult[] = [];
    let pr = previous.pr;
    let tick = 0;
    while (true) {
      const prefix = `epoch-${epoch}/tick-${tick++}`;
      const issues = yield* phase(
        `${prefix}/discover`,
        Schema.Array(Issue),
        discover(repo, settings.roots),
      );
      const candidates = issues.filter((issue) => eligible(issue) && !seen.has(issue.number));
      for (const issue of candidates.slice(0, Math.max(0, settings.concurrency - active.size))) {
        const key = `epoch-${epoch}/issue-${issue.number}`;
        const job = yield* phase(
          `${key}/claim`,
          JobResult.fields.job,
          Effect.gen(function* () {
            const base = yield* git(["rev-parse", shared]);
            const prior = previous.failed.find(
              (result) => result.job.issue.number === issue.number,
            );
            return {
              issue,
              key,
              base,
              branch: `${shared}-issue-${issue.number}-epoch-${epoch}`,
              feedback: prior
                ? `Previous branch ${prior.job.branch}, commit ${prior.sha}. Inspect and reuse its work where applicable. Repair: ${prior.findings.join("; ")}`
                : "",
            };
          }),
        );
        seen.add(issue.number);
        active.add(issue.number);
        yield* implementIssue(job, cwd, settings.attempts).pipe(
          Effect.catch((error) =>
            Effect.succeed({
              job,
              passed: false,
              sha: "",
              summary: "Worker infrastructure failure",
              findings: [String(error)],
            } satisfies JobResult),
          ),
          Effect.flatMap((result) => Queue.offer(events, result)),
          Effect.forkScoped,
        );
      }
      if (active.size === 0)
        return {
          completed,
          failed,
          pr,
          pending: issues
            .filter((issue) => issue.state === "open" && !seen.has(issue.number))
            .map(
              (issue) =>
                `#${issue.number}: ${pendingReasons(issue).join("; ") || "not dispatched"}`,
            ),
        } satisfies Outcome;

      const result = yield* phase(
        `${prefix}/next-completion`,
        JobResult,
        Effect.gen(function* () {
          while (true) {
            const next = yield* Queue.take(events);
            // Replayed workers enqueue results even when earlier next-completion phases replay.
            if (!consumed.has(next.job.key)) return next;
          }
        }),
      );
      consumed.add(result.job.key);
      active.delete(result.job.issue.number);
      if (result.sha === "")
        return yield* new FactoryError({
          message: `Worker #${result.job.issue.number} needs recovery: ${result.findings.join("; ")}`,
        });
      if (!result.passed) {
        failed.push(result);
        continue;
      }
      const integrated = yield* integrate(result, shared, repo, settings.attempts);
      if (!integrated.passed) {
        failed.push(integrated);
        continue;
      }
      completed.push(integrated);
      pr = yield* publishAndClose(
        `${result.job.key}/publication`,
        repo,
        shared,
        settings.baseBranch,
        completed,
      );
      // Rediscover now: closure can unblock issues while unrelated workers are still running.
    }
  });

export const lockRef = "refs/kojo/implement-owner";

export const claimRun = (run: string) =>
  Effect.gen(function* () {
    const workspace = yield* Workspace;
    const existing = yield* workspace.git(["rev-parse", "--verify", lockRef]);
    if (existing.succeeded) {
      const owner = yield* git(["show", "-s", "--format=%B", existing.stdout.trim()]);
      if (owner !== run)
        return yield* new FactoryError({
          message: `Another implement run owns this clone: ${owner}`,
        });
      return existing.stdout.trim();
    }
    const tree = yield* git(["rev-parse", "HEAD^{tree}"]);
    const token = yield* git(["commit-tree", tree, "-m", run]);
    yield* git(["update-ref", lockRef, token, "0".repeat(token.length)]);
    return token;
  });

export const releaseRun = (token: string) => git(["update-ref", "-d", lockRef, token]);
