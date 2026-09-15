import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { createEveEngine, findFactoryRun } from "../src/eve-engine.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import type { WorkerAdapter, WorkerRequest } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";
import { buildEveHost, eventually } from "./eve-host-fixture.ts";

test("uncertain Eve start reconciliation searches all pages and rejects duplicate owners", async () => {
  const calls: (string | undefined)[] = [];
  assert.equal(
    await findFactoryRun("factory-a", async (cursor) => {
      calls.push(cursor);
      return cursor
        ? {
            data: [{ runId: "eve-a", attributes: { factoryRunId: "factory-a" } }],
            cursor: null,
            hasMore: false,
          }
        : {
            data: [{ runId: "eve-b", attributes: { factoryRunId: "factory-b" } }],
            cursor: "next",
            hasMore: true,
          };
    }),
    "eve-a",
  );
  assert.deepEqual(calls, [undefined, "next"]);
  await assert.rejects(
    findFactoryRun("factory-a", async (cursor) => ({
      data: [{ runId: cursor ? "second" : "first", attributes: { factoryRunId: "factory-a" } }],
      cursor: cursor ? null : "next",
      hasMore: !cursor,
    })),
    /Multiple Eve runs/,
  );
  await assert.rejects(
    findFactoryRun("factory-a", async () => ({
      data: [],
      cursor: "repeated",
      hasMore: true,
    })),
    /Invalid Eve pagination/,
  );
});

test("compiled Eve host reconciles a lost start response and resumes the same SQLite admission after restart", {
  timeout: 180000,
}, async () => {
  const host = await buildEveHost();
  const database = join(host.root, "factory-state", "workflow.sqlite");
  let store = new SqliteWorkflowStore(database);
  const requests: WorkerRequest[] = [];
  const receipts = new Map<string, Awaited<ReturnType<WorkerAdapter["dispatch"]>>>();
  const notifications = new Map<string, string>();
  const worker: WorkerAdapter = {
    async dispatch(request) {
      requests.push(request);
      const result =
        request.phase === 0
          ? {
              type: "subscription-paused" as const,
              reason: "Fixture subscription allowance exhausted",
            }
          : { type: "checkpoint" as const, question: { prompt: "Which color?" } };
      receipts.set(request.operationId, result);
      return result;
    },
    async resume(request) {
      requests.push(request);
      assert.deepEqual(request.answer, { text: "blue" });
      const result = {
        type: "completed" as const,
        candidate: { commit: "fixture-reviewed-commit" },
      };
      receipts.set(request.operationId, result);
      return result;
    },
    async reconcile(operationId) {
      return receipts.get(operationId);
    },
  };
  let starts = 0;
  const engine = createEveEngine({ baseUrl: host.baseUrl });
  let wakeEffects = 0;
  let releaseWake!: () => void;
  const heldWake = new Promise<void>((resolve) => {
    releaseWake = resolve;
  });
  let answerReady!: () => void;
  const readyAnswer = new Promise<void>((resolve) => {
    answerReady = resolve;
  });
  const uncertainEngine = {
    ...engine,
    async wake(token: string, payload: unknown) {
      wakeEffects++;
      await engine.wake(token, payload);
      await heldWake;
    },
    async start(input: { runId: string }) {
      starts++;
      const ids = await Promise.all([engine.start(input), engine.start(input)]);
      assert.equal(ids[0], ids[1], "concurrent fresh HTTP starts share one persisted Eve run");
      throw new Error("Lost Eve start response after run creation");
    },
  };
  function coordinator() {
    return new IssueWorkflow({
      store,
      engine: uncertainEngine,
      worker,
      notifications: {
        async send(request) {
          const receipt = `message:${request.operationId}`;
          notifications.set(request.operationId, receipt);
          return receipt;
        },
        async reconcile(id) {
          return notifications.get(id);
        },
      },
    });
  }
  let workflow = coordinator();
  let wakeCalls = 0;
  const bridge = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const { runId } = JSON.parse(Buffer.concat(chunks).toString());
      if (request.url === "/factory/wake-pending") {
        wakeCalls++;
        // Arrange an answer before this step calls the real coordinator wake effect.
        await readyAnswer;
      }
      const result =
        request.url === "/factory/drive"
          ? await workflow.drive(runId)
          : request.url === "/factory/wake-pending"
            ? ((await workflow.recoverWake(runId)) ?? { recovered: true })
            : undefined;
      response.writeHead(result ? 200 : 404, { "content-type": "application/json" });
      response.end(JSON.stringify(result ?? {}));
    } catch {
      response.writeHead(500);
      response.end();
    }
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");
  const address = bridge.address();
  if (!address || typeof address === "string") throw new Error("No coordinator port");
  const bridgeUrl = `http://127.0.0.1:${address.port}`;
  let success = false;
  try {
    await host.start(bridgeUrl);
    const issue = {
      issueId: "github:fixture:514",
      repository: "fixture/factory",
      number: 514,
      revision: "issue-revision-a",
      startingRevision: "starting-git-sha",
      reviewBase: "review-base-sha",
    };
    const admitted = await workflow.admit(issue);
    assert.equal(admitted.eveRunId, undefined, "start response was lost");
    const quota = await eventually(
      async () => workflow.observe(admitted.runId),
      (run) => run.status === "waiting-subscription",
    );
    const quotaEveRun = await engine.find(admitted.runId);
    assert.ok(quotaEveRun);
    await host.stop();
    store.close();
    store = new SqliteWorkflowStore(database);
    workflow = coordinator();
    await host.start(bridgeUrl);
    await workflow.recover();
    assert.equal(workflow.observe(admitted.runId).status, "waiting-subscription");
    assert.deepEqual(workflow.observe(admitted.runId).session, quota.session);
    await workflow.resume(admitted.runId);
    const waiting = await eventually(
      async () => workflow.observe(admitted.runId),
      (run) => run.status === "waiting-human",
    );
    assert.ok(waiting.checkpoint);
    assert.equal(notifications.size, 2);
    const originalEveRun = await engine.find(admitted.runId);
    assert.ok(originalEveRun);
    await eventually(
      async () =>
        (await (await fetch(`${host.baseUrl}/factory/engine/state/${originalEveRun}`)).json()) as {
          pendingHooks?: string[];
        },
      (state) => state.pendingHooks?.includes(waiting.checkpoint?.id ?? "missing") ?? false,
    );
    const duplicateStarts = await Promise.all([
      engine.start({ runId: admitted.runId }),
      engine.start({ runId: admitted.runId }),
    ]);
    assert.deepEqual(duplicateStarts, [originalEveRun, originalEveRun]);
    assert.equal(requests.length, 2);

    const answer = {
      runId: admitted.runId,
      issueId: issue.issueId,
      revision: issue.revision,
      checkpointId: waiting.checkpoint.id,
      answerId: "answer-514",
      answer: { text: "blue" },
    };
    assert.equal(await workflow.answer({ ...answer, revision: "stale" }), "stale");
    const answering = workflow.answer(answer);
    answerReady();
    assert.equal(await workflow.answer(answer), "already-answered");
    // Receiving the hook queues native HTTP replay while the real engine wake
    // effect is still in flight. Coordinator coalescing must keep that effect once.
    await eventually(
      async () => wakeCalls,
      (count) => count >= 1,
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(wakeEffects, 1);
    assert.equal(requests.length, 2);
    const answeredCheckpoint = workflow.observe(admitted.runId).checkpoint;

    // Force SIGKILL inside the native recoverWake step, after its ownership was
    // journaled but before the result. The default remote ownership lease must not
    // strand the same local run for minutes after its sole host dies.
    await eventually(
      async () => wakeCalls,
      (count) => count >= 1,
    );
    await host.stop();
    releaseWake();
    assert.equal(await answering, "accepted");
    store.close();
    store = new SqliteWorkflowStore(database);
    workflow = coordinator();
    await host.start(bridgeUrl);
    await workflow.recover();
    const recovered = await workflow.admit(issue);
    assert.equal(recovered.runId, admitted.runId);
    assert.deepEqual(recovered.session, admitted.session);
    assert.equal(recovered.eveRunId, originalEveRun);
    assert.equal(starts, 1, "reconciliation must not start a second Eve run");
    assert.deepEqual(recovered.checkpoint, answeredCheckpoint);
    assert.ok(
      existsSync(join(host.root, ".eve/.workflow-data")),
      "Eve world lives in the external deployment directory",
    );

    assert.equal(await workflow.answer(answer), "already-answered");
    const completed = await eventually(
      async () => workflow.observe(admitted.runId),
      (run) => run.status === "completed",
    );
    const eveState = await eventually(
      async () => {
        const response = await fetch(`${host.baseUrl}/factory/engine/state/${originalEveRun}`);
        assert.equal(response.status, 200);
        return (await response.json()) as { status: string; result: { status: string } };
      },
      (state) => state.status === "completed",
    );
    assert.equal(eveState.result.status, "completed");
    assert.equal(completed.candidate?.commit, "fixture-reviewed-commit");
    assert.equal(requests.length, 3);
    assert.equal(wakeEffects, 1);
    assert.deepEqual(requests[2].session, requests[0].session);
    assert.equal(notifications.size, 2);
    success = true;
  } finally {
    answerReady();
    releaseWake();
    await host.stop();
    bridge.closeAllConnections();
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
    store.close();
    if (success) rmSync(host.root, { recursive: true, force: true });
    else console.error(`Eve restart fixture evidence: ${host.root}`);
  }
});

test("compiled Eve keeps a completed graph child alive until durable integration actions finish", {
  timeout: 180000,
}, async () => {
  const host = await buildEveHost();
  let polls = 0;
  let delivered = false;
  const bridge = createServer(async (request, response) => {
    for await (const _chunk of request) {
    }
    polls++;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "completed", graphPending: !delivered }));
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");
  const address = bridge.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  let success = false;
  try {
    await host.start(url);
    const engine = createEveEngine({ baseUrl: host.baseUrl });
    const runId = await engine.start({ runId: "graph-integration-fixture" });
    await eventually(
      async () => polls,
      (n) => n >= 2,
    );
    await host.stop();
    const before = polls;
    await host.start(url);
    await eventually(
      async () => polls,
      (n) => n > before,
    );
    assert.equal(await engine.find("graph-integration-fixture"), runId);
    delivered = true;
    await eventually(
      async () => polls,
      (n) => n > before + 1,
    );
    success = true;
  } finally {
    await host.stop();
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
    if (success) rmSync(host.root, { recursive: true, force: true });
  }
});
