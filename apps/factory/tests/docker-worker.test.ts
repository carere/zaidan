import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  captureResources,
  DockerPiWorker,
  IssueWorkflow,
  SqliteWorkflowStore,
  startModelPermitServer,
  type WorkerRequest,
} from "../src/index.ts";

function fixture(number = 1, permits = false) {
  const directory = mkdtempSync(join(tmpdir(), "factory-docker-515-"));
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
  writeFileSync(join(repository, "README.md"), "Disposable worker fixture\n");
  git("add", ".");
  git("commit", "-m", "test: initial fixture");
  const base = git("rev-parse", "HEAD");
  const skill = join(directory, "home-skill");
  mkdirSync(skill);
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: fixture\ndescription: captured fixture\ndisable-model-invocation: true\n---\nRead [support](support.txt). Ask the human before implementation. Then copy support into result.txt, checkpoint, validate, delegate standards and spec reviews and complete.\n",
  );
  writeFileSync(join(skill, "support.txt"), "original captured resource\n");
  if (number === 7) writeFileSync(join(skill, "large.txt"), `${"x".repeat(70)}\n`.repeat(1500));
  const auth = join(directory, "auth.json");
  // Deliberately fake OAuth, only in the dedicated no-network synthetic-provider image.
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
  const issue = {
    issueId: `I_${number}`,
    revision: "r1",
    repository: "fixture/local",
    number,
    startingRevision: base,
    reviewBase: base,
  };
  const events: { type: string; event: unknown; operationId: string }[] = [];
  const workerOptions = {
    directory: join(directory, "workers"),
    repositoryPath: repository,
    image: permits ? "zaidan-factory-worker-test-516:0.85.1" : "zaidan-factory-worker-test:0.85.1",
    ...(permits ? {} : { network: "none" as const }),
    auth: { sourceFile: auth, lockDirectory: join(directory, "auth-locks") },
    onEvent: (event: (typeof events)[number]) => events.push(event),
  };
  const worker = new DockerPiWorker(workerOptions);
  const database = join(directory, "state", "workflow.db");
  const store = new SqliteWorkflowStore(database);
  const shared = {
    engine: {
      async find() {
        return "eve-fixture";
      },
      async start() {
        return "eve-fixture";
      },
      async wake() {},
    },
    notifications: {
      async reconcile() {
        return undefined;
      },
      async send() {
        return "notification";
      },
    },
    captureResources: (admitted: typeof issue) =>
      captureResources({
        directory: join(directory, "snapshots"),
        issue: admitted,
        entry: "fixture",
        skills: [{ path: skill }],
        dependencies: {},
        repositoryPath: repository,
        checks: [
          number === 5 ? "false" : "test \"$(cat result.txt)\" = 'original captured resource'",
        ],
      }),
  };
  return {
    directory,
    skill,
    issue,
    worker,
    store,
    database,
    shared,
    workerOptions,
    events,
    workflow: new IssueWorkflow({ ...shared, store, worker }),
  };
}

test("real Docker/Pi invokes captured hidden skill, resumes original session and produces independently reviewed committed evidence", {
  timeout: 120000,
}, async () => {
  const f = fixture();
  let reopened: SqliteWorkflowStore | undefined;
  try {
    const admitted = await f.workflow.admit(f.issue);
    await f.workflow.drive(admitted.runId);
    const waiting = f.workflow.observe(admitted.runId);
    assert.equal(waiting.status, "waiting-human", JSON.stringify(waiting));
    assert.equal(waiting.checkpoint?.question.prompt, "Choose fixture implementation");
    f.store.close();
    rmSync(f.skill, { recursive: true });
    reopened = new SqliteWorkflowStore(f.database);
    const worker = new DockerPiWorker(f.workerOptions);
    const restarted = new IssueWorkflow({ ...f.shared, store: reopened, worker });
    assert.ok(waiting.checkpoint);
    const answer = {
      runId: waiting.runId,
      issueId: f.issue.issueId,
      revision: "r1",
      checkpointId: waiting.checkpoint.id,
      answerId: "answer-1",
      answer: { text: "Implement" },
    };
    assert.equal(await restarted.answer(answer), "accepted");
    await restarted.drive(waiting.runId);
    const completed = restarted.observe(waiting.runId);
    assert.equal(completed.status, "completed", JSON.stringify(completed));
    assert.deepEqual(completed.resources, admitted.resources);
    assert.deepEqual(completed.session, admitted.session);
    assert.equal(await restarted.answer(answer), "already-answered");
    const candidate = completed.candidate;
    assert.ok(candidate);
    assert.match(candidate.commit, /^[0-9a-f]{40}$/);
    assert.equal(
      (candidate.reviews as { passed: boolean }[]).every((review) => review.passed),
      true,
    );
    const sessions = readdirSync(admitted.session.path).filter((name) => name.endsWith(".jsonl"));
    assert.equal(sessions.length, 3, "one original session and two independent delegates");
    const original = readFileSync(
      join(admitted.session.path, `${admitted.session.id}.jsonl`),
      "utf8",
    );
    assert.match(original, /<skill name=|<skill /);
    assert.match(original, /Read \[support\]\(support.txt\)/);
    assert.ok(f.events.some((event) => event.type === "tool_execution_end"));
    assert.equal((await worker.reconcile(`${waiting.runId}:worker:1`))?.type, "completed");
    await assert.rejects(
      worker.dispatch({
        operationId: `${admitted.runId}:worker:0`,
        runId: admitted.runId,
        issue: f.issue,
        phase: 0,
        resources: admitted.resources,
        session: { ...admitted.session, id: "unrelated-session" },
      }),
      /identity reused/,
    );
  } finally {
    reopened?.close();
    try {
      f.store.close();
    } catch {}
    if (process.env.FACTORY_KEEP_FIXTURES !== "1")
      rmSync(f.directory, { recursive: true, force: true });
  }
});

test("a worker receipt written while Docker inspection waits for exit remains a checkpoint", {
  timeout: 120000,
}, async () => {
  const f = fixture();
  const originalPath = process.env.PATH;
  const docker = execFileSync("which", ["docker"], { encoding: "utf8" }).trim();
  const bin = join(f.directory, "bin");
  mkdirSync(bin);
  // Delay the real transport response until exit to exercise the receipt/status race.
  writeFileSync(
    join(bin, "docker"),
    `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const docker = ${JSON.stringify(docker)};
const args = process.argv.slice(2);
if (args[0] === "inspect") spawnSync(docker, ["wait", args[1]], { stdio: "ignore" });
const result = spawnSync(docker, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
`,
    { mode: 0o700 },
  );
  process.env.PATH = `${bin}:${originalPath}`;
  try {
    const admitted = await f.workflow.admit(f.issue);
    const result = await f.workflow.drive(admitted.runId);
    assert.equal(result.status, "waiting-human", JSON.stringify(result));
    assert.equal(result.checkpoint?.question.prompt, "Choose fixture implementation");
  } finally {
    process.env.PATH = originalPath;
    f.store.close();
    if (process.env.FACTORY_KEEP_FIXTURES !== "1")
      rmSync(f.directory, { recursive: true, force: true });
  }
});

test("real worker refuses failed review, missing resources, failed checks and changed candidates", {
  timeout: 120000,
}, async () => {
  for (const number of [2, 3, 5, 6]) {
    const f = fixture(number);
    try {
      const admitted = await f.workflow.admit(f.issue);
      await f.workflow.drive(admitted.runId);
      let state = f.workflow.observe(admitted.runId);
      if (number !== 3) {
        assert.ok(state.checkpoint);
        await f.workflow.answer({
          runId: state.runId,
          issueId: f.issue.issueId,
          revision: "r1",
          checkpointId: state.checkpoint.id,
          answerId: "answer",
          answer: { text: "Implement" },
        });
        await f.workflow.drive(state.runId);
        state = f.workflow.observe(state.runId);
      }
      assert.equal(state.status, "failed", JSON.stringify(state));
      assert.equal(state.candidate, undefined);
    } finally {
      f.store.close();
      if (process.env.FACTORY_KEEP_FIXTURES !== "1")
        rmSync(f.directory, { recursive: true, force: true });
    }
  }
});

test("cancellation stops the whole issue container, preserving the original checkout/session and containment", {
  timeout: 60000,
}, async () => {
  const f = fixture(4);
  try {
    const admitted = await f.workflow.admit(f.issue);
    const request: WorkerRequest = {
      operationId: `${admitted.runId}:worker:0`,
      runId: admitted.runId,
      issue: f.issue,
      session: admitted.session,
      resources: admitted.resources,
      phase: 0,
    };
    const pending = f.worker.dispatch(request);
    for (
      let attempt = 0;
      attempt < 100 &&
      !f.events.some(
        (event) =>
          event.type === "factory.delegate" &&
          (event.event as { event?: { type?: string } }).event?.type === "tool_execution_start",
      );
      attempt++
    )
      await delay(100);
    assert.ok(
      f.events.some(
        (event) =>
          event.type === "factory.delegate" &&
          (event.event as { event?: { type?: string } }).event?.type === "tool_execution_start",
      ),
    );
    const name = `zaidan-worker-${createHash("sha256").update(request.operationId).digest("hex").slice(0, 32)}`;
    const [container] = JSON.parse(execFileSync("docker", ["inspect", name], { encoding: "utf8" }));
    assert.equal(container.Config.User, "1000:1000");
    assert.equal(container.HostConfig.Privileged, false);
    assert.equal(container.HostConfig.ReadonlyRootfs, true);
    assert.deepEqual(container.HostConfig.CapDrop, ["ALL"]);
    assert.ok(container.HostConfig.SecurityOpt.includes("no-new-privileges"));
    assert.ok(
      container.Mounts.every(
        (mount: { Destination: string }) =>
          !mount.Destination.includes("docker.sock") && mount.Destination !== "/home",
      ),
    );
    assert.ok(
      container.Config.Env.every(
        (env: string) => !/^(GH_|GITHUB_|TELEGRAM_|OPENAI_API_KEY)/.test(env),
      ),
    );
    await f.worker.cancel(request.operationId);
    assert.equal((await pending).type, "cancelled");
    assert.equal(
      (await new DockerPiWorker(f.workerOptions).reconcile(request.operationId))?.type,
      "cancelled",
    );
    assert.equal(
      execFileSync("docker", ["ps", "-a", "--filter", `name=^/${name}$`, "--format", "{{.ID}}"], {
        encoding: "utf8",
      }).trim(),
      "",
    );
    assert.ok(readdirSync(admitted.session.path).length);
  } finally {
    f.store.close();
    if (process.env.FACTORY_KEEP_FIXTURES !== "1")
      rmSync(f.directory, { recursive: true, force: true });
  }
});

test("real Pi parent and delegates share one scoped loopback permit without deadlocking", {
  timeout: 120000,
}, async () => {
  const f = fixture(7, true);
  const workflow = new IssueWorkflow({
    ...f.shared,
    store: f.store,
    worker: f.worker,
    execution: { modelCalls: 1 },
  });
  const server = await startModelPermitServer(workflow);
  workflow.configureModelPermits(server.url);
  const owners = new Set<string>();
  let maximum = 0;
  const timer = setInterval(() => {
    for (const run of workflow.admissions()) {
      maximum = Math.max(maximum, run.execution?.models.length ?? 0);
      for (const owner of run.execution?.models ?? []) owners.add(owner);
    }
  }, 5);
  try {
    const run = await workflow.admit(f.issue);
    const waiting = await workflow.drive(run.runId);
    assert.equal(waiting.status, "waiting-human", JSON.stringify(waiting));
    assert.equal(
      (
        await fetch(`${server.url.replace("host.docker.internal", "127.0.0.1")}/acquire`, {
          method: "POST",
          body: JSON.stringify({ runId: run.runId, owner: "intruder" }),
        })
      ).status,
      403,
    );
    await workflow.answer({
      runId: run.runId,
      issueId: f.issue.issueId,
      revision: "r1",
      checkpointId: waiting.checkpoint?.id ?? "missing",
      answerId: "yes",
      answer: { text: "Implement" },
    });
    const completed = await workflow.drive(run.runId);
    assert.equal(completed.status, "completed", JSON.stringify(completed));
    const workspace = join(
      f.workerOptions.directory,
      "runs",
      createHash("sha256").update(run.runId).digest("hex"),
    );
    const calls = readFileSync(join(workspace, "provider-dispatched.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.ok(
      calls.some((call) => call.summarizing),
      "native session compaction runs under the model permit",
    );
    assert.equal(maximum, 1);
    assert.ok(
      owners.size >= 4,
      "original phase, resumed parent and both delegates acquire actual permits",
    );
    assert.deepEqual(completed.execution?.models, []);
  } finally {
    clearInterval(timer);
    await server.close();
    f.store.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("real Pi provider errors become quota and authentication waits with automatic provider retries disabled", {
  timeout: 120000,
}, async () => {
  for (const [number, status] of [
    [8, "waiting-subscription"],
    [9, "waiting-authentication"],
  ] as const) {
    const f = fixture(number, true);
    const server = await startModelPermitServer(f.workflow);
    f.workflow.configureModelPermits(server.url);
    try {
      const run = await f.workflow.admit(f.issue);
      const waiting = await f.workflow.drive(run.runId);
      assert.equal(waiting.status, status, JSON.stringify(waiting));
      assert.equal(waiting.execution?.operationId, undefined);
      assert.deepEqual(waiting.execution?.models, []);
      await f.workflow.recover();
      assert.deepEqual(f.workflow.observe(run.runId).session, run.session);
    } finally {
      await server.close();
      f.store.close();
      rmSync(f.directory, { recursive: true, force: true });
    }
  }
});

test("unreachable model permit transport stops Pi before any provider dispatch", {
  timeout: 30000,
}, async () => {
  const f = fixture(7, true);
  const server = await startModelPermitServer(f.workflow);
  f.workflow.configureModelPermits(server.url);
  await server.close();
  try {
    const run = await f.workflow.admit(f.issue);
    const result = await f.workflow.drive(run.runId);
    assert.equal(result.status, "admitted", JSON.stringify(result));
    assert.equal(result.execution?.retries, 1);
    const workspace = join(
      f.workerOptions.directory,
      "runs",
      createHash("sha256").update(run.runId).digest("hex"),
    );
    assert.equal(existsSync(join(workspace, "provider-dispatched.jsonl")), false);
    assert.equal(result.execution?.operationId, undefined);
  } finally {
    f.store.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
