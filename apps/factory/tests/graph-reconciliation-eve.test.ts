import assert from "node:assert/strict";
import { once } from "node:events";
import { rmSync } from "node:fs";
import { createServer } from "node:http";
import { test } from "node:test";
import { createEveEngine } from "../src/eve-engine.ts";
import { buildEveHost, eventually } from "./eve-host-fixture.ts";
import { integrationFixture } from "./graph-fixture.ts";

test("reopening a terminal graph child starts a durable Eve continuation on its original factory run", {
  timeout: 180000,
}, async (t) => {
  const host = await buildEveHost();
  const fixture = integrationFixture(t);
  const engine = createEveEngine({ baseUrl: host.baseUrl });
  let workflow = fixture.make(undefined, engine);
  const bridge = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const input = JSON.parse(Buffer.concat(chunks).toString());
      const result =
        request.url === "/factory/drive"
          ? await workflow.driveOwned(input.runId, input.continuationId)
          : request.url === "/factory/wake-pending"
            ? ((await workflow.recoverWakeOwned(input.runId, input.continuationId)) ?? {
                recovered: true,
              })
            : undefined;
      response.writeHead(result ? 200 : 404, { "content-type": "application/json" });
      response.end(JSON.stringify(result ?? {}));
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");
  const address = bridge.address();
  assert.ok(address && typeof address !== "string");
  let succeeded = false;
  try {
    await host.start(`http://127.0.0.1:${address.port}`);
    await workflow.admitGraph("root");
    await eventually(
      async () => fixture.issues[2].state,
      (state) => state === "closed",
    );
    await eventually(
      async () => workflow.observeGraph("root"),
      (graph) => !graph.lock && workflow.admissions().every((run) => !run.graphPending),
    );
    const original = workflow.admissions().find((r) => r.issue.issueId === "a");
    assert.ok(original?.eveRunId);
    await eventually(
      async () => {
        const response = await fetch(`${host.baseUrl}/factory/engine/state/${original.eveRunId}`);
        assert.equal(response.status, 200);
        return (await response.json()) as { status: string };
      },
      (result) => result.status === "completed",
    );
    await host.stop();
    workflow = fixture.make(undefined, engine);
    fixture.issues[1].state = "open";
    fixture.issues[1].stateReason = null;
    fixture.issues[1].revision = "a-reopened-after-terminal-owner";
    const observed = await workflow.reconcileGraph("root");
    await assert.rejects(
      workflow.reconcileGraph("root", {
        revision: observed.reconciliation?.revision ?? "",
        continueRunIds: [original.runId],
      }),
      /fetch failed/,
    );
    const queued = workflow.observe(original.runId);
    assert.ok(queued.eveContinuationId, JSON.stringify(workflow.observeGraph("root")));
    assert.equal(
      queued.eveRunId,
      undefined,
      "unavailable host leaves a durable pending continuation start",
    );
    await host.start(`http://127.0.0.1:${address.port}`);
    await workflow.recoverGraph("root");
    await eventually(
      async () => fixture.issues[1].state,
      (state) => state === "closed",
    );
    const completed = workflow.observe(original.runId);
    assert.notEqual(completed.eveRunId, original.eveRunId);
    assert.deepEqual(completed.session, original.session);
    assert.deepEqual(completed.resources, original.resources);
    assert.deepEqual(completed.issue, original.issue);
    const requests = fixture.requests.filter((r) => r.runId === original.runId);
    assert.equal(requests.length, 3);
    assert.equal(requests.filter((r) => !r.integration).length, 1);
    assert.equal((await workflow.driveOwned(original.runId)).graphPending, false);
    assert.equal(fixture.requests.filter((r) => r.runId === original.runId).length, 3);
    succeeded = true;
  } finally {
    await host.stop();
    await new Promise<void>((resolve) => bridge.close(() => resolve()));
    if (succeeded) rmSync(host.root, { recursive: true, force: true });
    else process.stderr.write(`Retained graph continuation fixture: ${host.root}\n`);
  }
});
