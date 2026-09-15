/** Explicit subscription fixture; never included in the default tests. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureResources,
  DockerPiWorker,
  IssueWorkflow,
  SqliteWorkflowStore,
  startModelPermitServer,
} from "../src/index.ts";

const [authFile, skillsRoot] = process.argv.slice(2);
if (!authFile || !skillsRoot)
  throw new Error(
    "Explicit live fixture requires selected auth file and source skills directory arguments",
  );
const directory = mkdtempSync(join(tmpdir(), "factory-live-515-"));
const repository = join(directory, "repository");
mkdirSync(join(repository, "src"), { recursive: true });
mkdirSync(join(repository, "docs", "agents"), { recursive: true });
writeFileSync(
  join(repository, "src", "greeting.mjs"),
  'export function greeting(name) { return "Hello"; }\n',
);
writeFileSync(
  join(repository, "README.md"),
  "# Disposable greeting fixture\nRun node --test and node --check src/greeting.mjs. No dependencies.\n",
);
writeFileSync(
  join(repository, "AGENTS.md"),
  "The authoritative fixture issue specification is /resources/manifest.json under issue.sourceContent.body. The greeting function is the approved public test seam. Use Node built-in test and assert. Do not call any remote issue tracker or publish anything. This disposable fixture has no external side effects.\n",
);
writeFileSync(
  join(repository, "docs", "agents", "issue-tracker.md"),
  "This disposable fixture captures its full originating issue in /resources/manifest.json under issue.sourceContent.body. Use that immutable snapshot as the tracker read. There is no remote fixture issue or tracker credential.\n",
);
const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
git("init", "-b", "main");
git("config", "user.name", "Fixture");
git("config", "user.email", "fixture@localhost");
git("add", ".");
git("commit", "-m", "test: initial greeting fixture");
const base = git("rev-parse", "HEAD");
const issue = {
  issueId: "live-fixture-515",
  revision: "1",
  repository: "fixture/local",
  number: 515,
  startingRevision: base,
  reviewBase: base,
  sourceContent: {
    body: "Implement greeting(name) in src/greeting.mjs so greeting('Ada') returns 'Hello, Ada!' and greeting('Lin') returns 'Hello, Lin!'. Preserve the argument as supplied; no additional coercion or validation is requested. Add focused behavioral tests at the approved greeting API seam, using Node built-in test. The seam and implementation scope are explicitly pre-approved; no clarification is needed. Use the captured existing implement, tdd and code-review skills, commit before review, run required checks, and obtain independent standards/spec review. Complete with factory_complete after all evidence covers current HEAD. No remote operations.",
  },
};
const events: string[] = [];
const worker = new DockerPiWorker({
  directory: join(directory, "workers"),
  repositoryPath: repository,
  auth: { sourceFile: authFile, lockDirectory: join(directory, "auth-locks") },
  onEvent(event) {
    events.push(event.type);
    if (event.type === "tool_execution_start")
      console.log(
        JSON.stringify({ event: event.type, tool: (event.event as { toolName: string }).toolName }),
      );
  },
});
const store = new SqliteWorkflowStore(join(directory, "state", "workflow.db"));
const workflow = new IssueWorkflow({
  store,
  worker,
  engine: {
    async find() {
      return "fixture-eve";
    },
    async start() {
      return "fixture-eve";
    },
    async wake() {},
  },
  notifications: {
    async reconcile() {
      return undefined;
    },
    async send() {
      return "fixture-notification";
    },
  },
  captureResources: () =>
    captureResources({
      directory: join(directory, "snapshots"),
      issue,
      entry: "implement",
      skills: ["implement", "tdd", "code-review", "codebase-design"].map((name) => ({
        path: join(skillsRoot, name),
      })),
      repositoryPath: repository,
      checks: ["node --test", "node --check src/greeting.mjs"],
    }),
});
const permitServer = await startModelPermitServer(workflow);
workflow.configureModelPermits(permitServer.url);
const admitted = await workflow.admit(issue);
console.log(JSON.stringify({ directory, runId: admitted.runId, snapshot: admitted.resources?.id }));
const timeout = setTimeout(() => {
  worker
    .cancel(
      `${admitted.runId}:worker:${workflow.observe(admitted.runId).phase}`,
      "Explicit live fixture deadline",
    )
    .catch(() => {});
}, 600000);
try {
  await workflow.drive(admitted.runId);
  const completed = workflow.observe(admitted.runId);
  const report = {
    status: completed.status,
    runId: completed.runId,
    candidate: completed.candidate,
    checkpoint: completed.checkpoint,
    reason: completed.reason,
    snapshot: completed.resources,
    session: completed.session,
    eventTypes: [...new Set(events)],
  };
  writeFileSync(join(directory, "evidence.json"), JSON.stringify(report, null, 2));
  // Compare secrets in memory; report counts only, never credential contents.
  const auth = JSON.parse(readFileSync(authFile, "utf8"))["openai-codex"];
  let leaks = 0;
  const scan = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (entry.isFile()) {
        const bytes = readFileSync(file);
        for (const secret of [auth.access, auth.refresh])
          if (typeof secret === "string" && bytes.includes(secret)) leaks++;
      }
    }
  };
  scan(directory);
  assert.equal(leaks, 0, "Credential material must remain outside fixture evidence and sessions");
  console.log(
    JSON.stringify({
      directory,
      status: completed.status,
      commit: completed.candidate?.commit,
      secretOccurrences: leaks,
    }),
  );
  assert.equal(
    completed.status,
    "completed",
    "Live fixture must produce verified committed evidence",
  );
} finally {
  clearTimeout(timeout);
  await permitServer.close();
  store.close();
}
