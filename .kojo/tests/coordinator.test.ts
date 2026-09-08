import { Deferred, Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Issue, Job, JobResult } from "../envelopes.ts";
import { coordinate, type Outcome } from "../lib/coordinator.ts";

let issues: Issue[];
let timeline: string[];
let slow: Deferred.Deferred<void>;
let failIssue: number | undefined;
const recorded = new Map<string, unknown>();
let replay: boolean;
const remember = <A, E, R>(name: string, body: Effect.Effect<A, E, R>) =>
  Effect.suspend(() =>
    replay && recorded.has(name)
      ? Effect.succeed(recorded.get(name) as A)
      : body.pipe(
          Effect.tap((value) =>
            Effect.sync(() => {
              recorded.set(name, value);
            }),
          ),
        ),
  );

vi.mock("../lib/phases.ts", () => ({
  phase: (name: string, _schema: unknown, body: Effect.Effect<unknown, unknown, unknown>) =>
    remember(name, body),
  git: () => Effect.succeed("shared-sha"),
}));
vi.mock("../lib/issues.ts", async (original) => ({
  ...(await original<typeof import("../lib/issues.ts")>()),
  discover: () => Effect.sync(() => structuredClone(issues)),
}));
vi.mock("../lib/worker.ts", () => ({
  implementIssue: (job: Job) =>
    remember(
      `worker/${job.key}`,
      Effect.gen(function* () {
        timeline.push(`start-${job.issue.number}`);
        if (job.issue.number === 2) yield* Deferred.await(slow);
        if (job.issue.number === 3) yield* Deferred.succeed(slow, undefined);
        return {
          job,
          passed: job.issue.number !== failIssue,
          sha: "verified-sha",
          summary: "Implemented",
          findings: job.issue.number === failIssue ? ["UI failed"] : [],
        } satisfies JobResult;
      }),
    ),
}));
vi.mock("../lib/integration.ts", () => ({
  integrate: (result: JobResult) =>
    remember(
      `integrate/${result.job.key}`,
      Effect.sync(() => {
        timeline.push(`merge-${result.job.issue.number}`);
        return result;
      }),
    ),
  publishAndClose: (
    _name: string,
    _repo: string,
    _shared: string,
    _base: string,
    completed: JobResult[],
  ) =>
    remember(
      _name,
      Effect.sync(() => {
        const number = completed.at(-1)?.job.issue.number;
        timeline.push(`pr-${number}`, `close-${number}`);
        issues = issues.map((issue) => ({
          ...issue,
          state: issue.number === number ? "closed" : issue.state,
          blockers: issue.blockers.map((ref) => ({
            ...ref,
            state: ref.number === number ? "closed" : ref.state,
          })),
        }));
        return "https://github.com/carere/zaidan/pull/99";
      }),
    ),
}));

const issue = (number: number, blockers: Issue["blockers"] = []): Issue => ({
  number,
  url: `https://github.com/carere/zaidan/issues/${number}`,
  title: `Issue ${number}`,
  body: "spec",
  state: "open",
  labels: ["kojo", "ready-for-agent"],
  children: [],
  blockers,
});
const settings = { runKey: "test", roots: [], concurrency: 2, attempts: 2, baseBranch: "main" };
const run = () =>
  Effect.runPromise(
    Effect.scoped(
      coordinate(settings, "carere/zaidan", "/fixture", "shared", 1),
    ) as unknown as Effect.Effect<Outcome, unknown>,
  );
beforeEach(async () => {
  timeline = [];
  failIssue = undefined;
  replay = false;
  recorded.clear();
  slow = await Effect.runPromise(Deferred.make<void>());
  issues = [
    issue(1),
    issue(2),
    issue(3, [{ number: 1, url: "https://github.com/carere/zaidan/issues/1", state: "open" }]),
  ];
});

describe("continuous coordinator", () => {
  it("starts newly unblocked work before an unrelated slow issue finishes; updates one PR", async () => {
    const result = await run();
    expect(result.completed.map((job) => job.job.issue.number).sort()).toEqual([1, 2, 3]);
    expect(timeline.indexOf("start-3")).toBeLessThan(timeline.indexOf("merge-2"));
    expect(timeline.indexOf("close-1")).toBeLessThan(timeline.indexOf("start-3"));
    expect(timeline.indexOf("pr-1")).toBeLessThan(timeline.indexOf("close-1"));
    expect(result.pr).toBe("https://github.com/carere/zaidan/pull/99");
    expect(new Set(timeline.filter((entry) => entry.startsWith("start-"))).size).toBe(3);
  });
  it("replays recorded completion order without duplicate work, merges or PR updates", async () => {
    const first = await run();
    replay = true;
    timeline = [];
    const second = await run();
    expect(second).toEqual(first);
    expect(timeline).toEqual([]);
  });
  it("handles a solo issue with one PR update and closes it afterwards", async () => {
    issues = [issue(1)];
    const result = await run();
    expect(result.completed).toHaveLength(1);
    expect(timeline).toEqual(["start-1", "merge-1", "pr-1", "close-1"]);
  });
  it("leaves failed issues open and does not call their merge or publication", async () => {
    issues = [issue(1)];
    failIssue = 1;
    const result = await run();
    expect(result.failed).toHaveLength(1);
    expect(result.completed).toHaveLength(0);
    expect(issues[0]?.state).toBe("open");
    expect(timeline).toEqual(["start-1"]);
  });
  it("reports a blocked graph without spinning or claiming its members", async () => {
    issues = [
      issue(1, [{ number: 2, url: "https://github.com/carere/zaidan/issues/2", state: "open" }]),
      issue(2, [{ number: 1, url: "https://github.com/carere/zaidan/issues/1", state: "open" }]),
    ];
    const result = await run();
    expect(result.pending).toHaveLength(2);
    expect(timeline).toEqual([]);
  });
});
