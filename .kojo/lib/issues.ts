import { Effect, Schema } from "effect";
import { FactoryError, type Issue } from "../envelopes.ts";
import { exec } from "./phases.ts";

const ApiIssue = Schema.Struct({
  number: Schema.Number,
  html_url: Schema.String,
  state: Schema.String,
  title: Schema.String,
  body: Schema.NullOr(Schema.String),
  labels: Schema.Array(Schema.Struct({ name: Schema.String })),
  pull_request: Schema.optional(Schema.Unknown),
});

export const api = <S extends Schema.Top>(path: string, schema: S, options: string[] = []) =>
  Effect.gen(function* () {
    const raw = yield* exec([
      "gh",
      "api",
      path,
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2026-03-10",
      ...options,
    ]);
    const value = yield* Effect.try({
      try: () => JSON.parse(raw),
      catch: () => new FactoryError({ message: `Invalid JSON from GitHub: ${path}` }),
    });
    return yield* Schema.decodeUnknownEffect(schema)(value);
  });
const list = (path: string) =>
  api(path, Schema.Array(Schema.Array(ApiIssue)), ["--paginate", "--slurp"]).pipe(
    Effect.map((pages) => pages.flat().filter((issue) => !issue.pull_request)),
  );
const ref = (issue: typeof ApiIssue.Type) => ({
  number: issue.number,
  url: issue.html_url,
  state: issue.state,
});

export const readIssue = (repo: string, number: number) =>
  Effect.gen(function* () {
    const path = `repos/${repo}/issues/${number}`;
    const raw = yield* api(path, ApiIssue);
    const blockers = yield* list(`${path}/dependencies/blocked_by?per_page=100`);
    const children = yield* list(`${path}/sub_issues?per_page=100`);
    return {
      ...ref(raw),
      title: raw.title,
      body: raw.body ?? "",
      labels: raw.labels.map((label) => label.name),
      blockers: blockers.map(ref),
      children: children.map(ref),
    } satisfies Issue;
  });

export const discover = (repo: string, roots: ReadonlyArray<number>) =>
  Effect.gen(function* () {
    const initial =
      roots.length > 0
        ? [...roots]
        : (yield* list(
            `repos/${repo}/issues?state=open&labels=ready-for-agent,kojo&per_page=100`,
          )).map((issue) => issue.number);
    const found = new Map<number, Issue>();
    const pending = [...initial];
    while (pending.length > 0) {
      const number = pending.shift();
      if (number === undefined) break;
      if (found.has(number)) continue;
      const issue = yield* readIssue(repo, number);
      found.set(number, issue);
      // Every member still needs both labels. Cross-repository dependencies stay pending.
      for (const related of [...issue.blockers, ...issue.children]) {
        if (
          related.url.startsWith(`https://github.com/${repo}/issues/`) &&
          related.state === "open"
        )
          pending.push(related.number);
      }
    }
    return [...found.values()].sort((a, b) => a.number - b.number);
  });

export const pendingReasons = (issue: Issue): string[] => [
  ...["ready-for-agent", "kojo"]
    .filter((label) => !issue.labels.includes(label))
    .map((label) => `missing label ${label}`),
  ...issue.blockers
    .filter((item) => item.state !== "closed")
    .map((item) => `blocked by ${item.url}`),
  ...issue.children
    .filter((item) => item.state !== "closed")
    .map((item) => `open sub-issue ${item.url}`),
];
export const eligible = (issue: Issue) =>
  issue.state === "open" && pendingReasons(issue).length === 0;

export const closeIssue = (repo: string, number: number) =>
  api(`repos/${repo}/issues/${number}`, Schema.Struct({ state: Schema.String }), [
    "--method",
    "PATCH",
    "-f",
    "state=closed",
    "-f",
    "state_reason=completed",
  ]).pipe(
    Effect.flatMap((result) =>
      result.state === "closed"
        ? Effect.void
        : Effect.fail(new FactoryError({ message: `GitHub did not close #${number}` })),
    ),
  );
