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
import { integrationFixture, issue } from "./graph-fixture.ts";

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
    fixture.setLosePush();
    fixture.setLoseCreate();
    fixture.setLoseClose();
    fixture.setLoseReady();
    fixture.setLoseNotify();
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

test("independent graph work proceeds while external delivery waits, then exact contained receiving-base adoption releases it", async (t) => {
  const f = integrationFixture(t);
  const external = { ...issue("external"), number: 10, parentIds: [], labels: ["ready-for-human"] };
  f.issues.push(external);
  f.issues[2].dependencyIds = ["external"];
  let workflow = f.make();
  const work = new ProductionWork({
    workflow,
    git: f.transport,
    enabled: () => true,
    attention: async () => "attention",
  });
  await work.onScan(await workflow.scan());
  const original = workflow.admissions()[0];
  assert.equal(original.issue.issueId, "a");
  assert.equal(workflow.admissions().length, 1);
  await workflow.drive(original.runId);
  await workflow.drive(original.runId);
  await workflow.drive(original.runId);
  const graph = workflow.observeGraph("root");
  assert.equal(f.issues[1].state, "closed");
  const main = f.maintainerAdvance("main", f.base);
  external.state = "closed";
  external.stateReason = "completed";
  external.revision = "delivered";
  f.externalPulls.push({
    id: "external-pr",
    url: "https://github.com/owner/repo/pull/11",
    repository: "owner/repo",
    revision: "merged",
    state: "MERGED",
    baseRef: "main",
    mergeCommit: main,
    mergedAt: "2026-09-15T12:00:00Z",
  });
  const waiting = await workflow.reconcileGraph("root");
  assert.equal(waiting.reconciliation?.receivingBase?.contained, false);
  const refused = await workflow.reconcileGraph("root", {
    revision: waiting.reconciliation?.revision ?? "",
    continueRunIds: [],
    adoptReceivingBase: main,
  });
  assert.match(refused.reason ?? "", /contained/);
  assert.equal(refused.reviewBase, f.base);
  assert.equal(workflow.admissions().length, 1);
  const head = f.maintainerBringMain(graph.branch, graph.head, main);
  assert.match((await workflow.reconcileGraph("root")).reason ?? "", /explicit reconciliation/);
  const revision = workflow.observeGraph("root").reconciliation?.revision ?? "";
  const stale = await workflow.reconcileGraph("root", {
    revision: "stale",
    continueRunIds: [],
    adoptReceivingBase: main,
  });
  assert.match(stale.reason ?? "", /explicit reconciliation|stale/);
  await workflow.reconcileGraph("root", { revision, continueRunIds: [], adoptReceivingBase: main });
  workflow = f.make();
  await workflow.recoverGraph("root");
  const dependent = workflow.admissions().find((run) => run.issue.issueId === "b");
  assert.ok(dependent);
  assert.equal(dependent.issue.reviewBase, main);
  assert.equal(dependent.issue.startingRevision, head);
  assert.equal(f.git("show", `${head}:maintainer-change`), "retained extra change");
  assert.equal(f.git("show", `${head}:part-a`), "a");
  assert.deepEqual(workflow.observe(original.runId).issue, original.issue);
  assert.deepEqual(workflow.observe(original.runId).session, original.session);
  assert.equal(workflow.observeGraph("root").receivingBaseHistory?.length, 1);
});

test("a production scan with no eligible graph leaf leaves no frozen branch before external delivery", async (t) => {
  const f = integrationFixture(t);
  f.issues[1].labels = ["ready-for-human"];
  const workflow = f.make();
  const work = new ProductionWork({
    workflow,
    git: f.transport,
    enabled: () => true,
    attention: async () => "waiting",
  });
  await work.onScan(await workflow.scan());
  assert.equal(workflow.admittedGraphs().length, 0);
  assert.equal(f.events.length, 0);
  f.issues[1].labels = ["ready-for-agent"];
  await work.onScan(await workflow.scan());
  assert.equal(workflow.admittedGraphs().length, 1);
  assert.equal(workflow.admissions().length, 1);
});
