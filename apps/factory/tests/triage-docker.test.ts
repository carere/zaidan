import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  captureResources,
  DockerPiWorker,
  type IssueSnapshot,
  IssueWorkflow,
  SqliteWorkflowStore,
} from "../src/index.ts";

test("real sandboxed Pi invokes triage resources, stops before verification and resumes its retained session to an approval proposal", {
  timeout: 120000,
}, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "triage-docker-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const repository = join(directory, "repository");
  mkdirSync(repository);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@localhost");
  writeFileSync(join(repository, "README.md"), "Disposable triage fixture\n");
  git("add", ".");
  git("commit", "-m", "test: triage fixture");
  const base = git("rev-parse", "HEAD");
  const skill = join(directory, "triage");
  mkdirSync(skill);
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: triage\ndescription: triage contract fixture\ndisable-model-invocation: true\n---\nRead AGENT-BRIEF.md and OUT-OF-SCOPE.md; investigate and recommend, wait for direction, then verify and propose the exact disclaimer-prefixed outcome.\n",
  );
  writeFileSync(
    join(skill, "AGENT-BRIEF.md"),
    "Record the source, scope and acceptance criteria.\n",
  );
  writeFileSync(
    join(skill, "OUT-OF-SCOPE.md"),
    "Record rejected enhancements, never already implemented features.\n",
  );
  const auth = join(directory, "auth.json");
  writeFileSync(
    auth,
    JSON.stringify({
      "openai-codex": {
        type: "oauth",
        access: "fixture",
        refresh: "fixture",
        expires: 9999999999999,
      },
    }),
    { mode: 0o600 },
  );
  let store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  const workerOptions = {
    directory: join(directory, "worker"),
    repositoryPath: repository,
    image: process.env.FACTORY_DOCKER_TEST_IMAGE ?? "zaidan-factory-triage-test:0.85.1",
    network: "none" as const,
    auth: { sourceFile: auth, lockDirectory: join(directory, "auth-lock") },
  };
  const options = {
    worker: new DockerPiWorker(workerOptions),
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    notifications: { reconcile: async () => undefined, send: async () => "notification" },
    captureResources: (issue: IssueSnapshot) =>
      captureResources({
        directory: join(directory, "snapshots"),
        issue,
        entry: "triage",
        skills: process.env.FACTORY_TRIAGE_SKILL_ROOT
          ? ["triage", "grilling", "domain-modeling"].map((name) => ({
              path: join(process.env.FACTORY_TRIAGE_SKILL_ROOT ?? "", name),
            }))
          : [{ path: skill }],
        ...(process.env.FACTORY_TRIAGE_SKILL_ROOT ? {} : { dependencies: {} }),
        repositoryPath: repository,
      }),
  };
  let workflow = new IssueWorkflow({ ...options, store });
  const run = await workflow.admit({
    issueId: "I518",
    revision: "r1",
    repository: "fixture/local",
    number: 518,
    startingRevision: base,
    reviewBase: base,
    route: "triage",
    sourceContent: { body: "Add missing greeting" },
  });
  const waiting = await workflow.drive(run.runId);
  assert.equal(waiting.status, "waiting-human", JSON.stringify(waiting));
  assert.ok(waiting.checkpoint);
  assert.match(waiting.checkpoint.question.prompt, /recommend/i);
  store.close();
  store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  rmSync(skill, { recursive: true });
  workflow = new IssueWorkflow({ ...options, worker: new DockerPiWorker(workerOptions), store });
  await workflow.answer({
    runId: run.runId,
    issueId: run.issue.issueId,
    revision: run.issue.revision,
    checkpointId: waiting.checkpoint.id,
    answerId: "human-recommendation",
    answer: { text: "Verify then prepare a brief" },
  });
  const proposed = await workflow.drive(run.runId);
  assert.equal(proposed.status, "waiting-human", JSON.stringify(proposed));
  assert.equal(proposed.triage?.proposal.state, "ready-for-agent");
  assert.deepEqual(proposed.session, run.session);
  assert.deepEqual(proposed.resources, run.resources);
  const session = readFileSync(join(run.session.path, `${run.session.id}.jsonl`), "utf8");
  assert.match(session, /<skill name=/);
  assert.match(session, /OUT-OF-SCOPE/);
  assert.match(session, /factory_triage_propose/);
});
