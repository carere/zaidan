import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createEveEngine } from "../src/eve-engine.ts";
import { LocalService } from "../src/local-service.ts";
import { ProductionWork } from "../src/production-work.ts";
import { listenLocalService } from "../src/service-http.ts";
import { buildEveHost, eventually } from "./eve-host-fixture.ts";
import { integrationFixture } from "./graph-fixture.ts";

test("an owned service scan automatically delivers a graph through compiled Eve, immediate dependencies and acceptance", {
  timeout: 180000,
}, async (t) => {
  const host = await buildEveHost();
  const fixture = integrationFixture(t, true);
  const directory = mkdtempSync(join(tmpdir(), "factory-production-service-"));
  const workflow = fixture.make(undefined, createEveEngine({ baseUrl: host.baseUrl }));
  const attention: string[] = [];
  const work = new ProductionWork({
    workflow,
    git: fixture.transport,
    enabled: () => true,
    attention: async (input) => attention.push(input.text),
  });
  const service = new LocalService({
    workflow,
    stateDirectory: directory,
    onScan: (result) => work.onScan(result),
  });
  const transport = await listenLocalService({ workflow, service, port: 0 });
  let passed = false;
  try {
    await host.start(transport.url);
    await service.start();
    // No direct admit, drive, integrate, finalize or publish calls: native Eve owns every phase.
    await eventually(
      async () => workflow.admittedGraphs()[0]?.state,
      (state) => state === "reviewable",
    );
    assert.equal(workflow.observeGraph("root").state, "reviewable");
    assert.deepEqual(
      fixture.issues.map((issue) => issue.state),
      ["open", "closed", "closed"],
    );
    assert.equal(
      fixture.requests.filter((request) => !request.integration && !request.acceptance).length,
      2,
    );
    assert.equal(fixture.requests.filter((request) => request.integration).length, 2);
    assert.equal(fixture.requests.filter((request) => request.acceptance).length, 1);
    const dependent = fixture.requests.find(
      (request) => request.issue.issueId === "b" && !request.integration && !request.acceptance,
    );
    assert.ok(dependent);
    assert.equal(fixture.git("show", `${dependent.issue.startingRevision}:part-a`), "a");
    assert.ok(fixture.events.indexOf("draft") < fixture.events.indexOf("close:a"));
    assert.deepEqual(attention, []);
    // Deterministic maintainer observation only; no production code has a main merge action.
    const graph = workflow.observeGraph("root");
    fixture.maintainerMerge(graph.head);
    Object.assign(fixture.pulls[0], {
      state: "closed",
      mergedAt: "2026-09-15T12:00:00Z",
      mergeCommit: graph.head,
    });
    await service.trigger("manual");
    assert.equal(workflow.observeGraph("root").state, "delivered");
    assert.equal(fixture.issues[0].state, "closed");
    passed = true;
  } finally {
    await work.stop();
    await service.stop();
    await host.stop();
    await transport.close();
    rmSync(directory, { recursive: true, force: true });
    if (passed) rmSync(host.root, { recursive: true, force: true });
    else process.stderr.write(`Retained assembled service evidence: ${host.root}\n`);
  }
});
