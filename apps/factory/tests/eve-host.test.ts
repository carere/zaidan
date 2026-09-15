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
      const result = { type: "checkpoint" as const, question: { prompt: "Which color?" } };
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
  const uncertainEngine = {
    ...engine,
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
  const bridge = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const { runId } = JSON.parse(Buffer.concat(chunks).toString());
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
    const waiting = await eventually(
      async () => workflow.observe(admitted.runId),
      (run) => run.status === "waiting-human",
    );
    assert.ok(waiting.checkpoint);
    assert.equal(notifications.size, 1);
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
    assert.equal(requests.length, 1);

    // Kill the actual compiled Node host. Reopen SQLite with a fresh coordinator
    // while preserving the external Eve world and admission identities.
    await host.stop();
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
    assert.deepEqual(recovered.checkpoint, waiting.checkpoint);
    assert.ok(
      existsSync(join(host.root, ".eve/.workflow-data")),
      "Eve world lives in the external deployment directory",
    );

    const answer = {
      runId: admitted.runId,
      issueId: issue.issueId,
      revision: issue.revision,
      checkpointId: waiting.checkpoint.id,
      answerId: "answer-514",
      answer: { text: "blue" },
    };
    assert.equal(await workflow.answer({ ...answer, revision: "stale" }), "stale");
    assert.equal(await workflow.answer(answer), "accepted");
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
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].session, requests[0].session);
    assert.equal(notifications.size, 1);
    success = true;
  } finally {
    await host.stop();
    bridge.closeAllConnections();
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
    store.close();
    if (success) rmSync(host.root, { recursive: true, force: true });
    else console.error(`Eve restart fixture evidence: ${host.root}`);
  }
});
