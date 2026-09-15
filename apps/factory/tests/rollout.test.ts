import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { RolloutPolicy } from "../src/rollout.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

test("live writes require all actual acceptance receipts bound to current identities, including after restart", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-rollout-"));
  const evidence = join(root, "acceptance.json");
  const binding = { runtime: "runtime-v1", configuration: "config-v1", repositoryId: "R_zaidan" };
  try {
    const gate = () =>
      new RolloutPolicy({ mode: "live", repository: "carere/zaidan", binding, evidence });
    assert.equal(gate().status().enabled, false);
    writeFileSync(evidence, JSON.stringify({ version: 1, binding, complete: true }));
    assert.equal(gate().status().enabled, false, "an unqualified success flag is insufficient");
    const receipt = {
      version: 1,
      binding,
      fixture: {
        repository: "carere/zaidan-factory-fixture",
        repositoryId: "R_fixture",
        completed: true,
        scenarios: [
          "authenticated-contained-workers",
          "telegram-human-restart",
          "concurrent-conflict-graph",
          "standalone-normal-delivery",
          "external-squash-delivery",
          "graph-maintainer-delivery",
          "publication-restart",
        ],
        evidenceHash: "a".repeat(64),
      },
      discovery: {
        repository: "carere/zaidan",
        repositoryId: "R_zaidan",
        readOnly: true,
        snapshotHash: "b".repeat(64),
      },
    };
    writeFileSync(evidence, JSON.stringify(receipt));
    gate().assertAllowed();
    assert.equal(
      new RolloutPolicy({
        mode: "live",
        repository: "carere/zaidan",
        binding: { ...binding, runtime: "changed" },
        evidence,
      }).status().enabled,
      false,
    );
    const retained = gate();
    receipt.fixture.scenarios.pop();
    writeFileSync(evidence, JSON.stringify(receipt));
    assert.throws(
      () => retained.assertAllowed(),
      /Rollout disabled/,
      "already retained runs must see evidence withdrawal",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("default discovery cannot write and fixture authority is confined to the named repository", () => {
  const binding = { runtime: "r", configuration: "c", repositoryId: "R_fixture" };
  assert.throws(
    () => new RolloutPolicy({ repository: "carere/zaidan", binding }).assertAllowed(),
    /Rollout disabled/,
  );
  new RolloutPolicy({
    mode: "fixture",
    repository: "carere/zaidan-factory-fixture",
    binding,
  }).assertAllowed();
  assert.throws(
    () =>
      new RolloutPolicy({ mode: "fixture", repository: "carere/zaidan", binding }).assertAllowed(),
    /Rollout disabled/,
  );
});

test("a retained admitted run cannot dispatch or publish after the service returns to read-only", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-retained-rollout-"));
  const store = new SqliteWorkflowStore(join(root, "workflow.sqlite"));
  let starts = 0;
  const forbidden = async (): Promise<never> => {
    starts++;
    throw new Error("Unexpected live action");
  };
  const options = {
    store,
    engine: { start: async () => "eve", find: async () => "eve", wake: async () => {} },
    worker: { dispatch: forbidden, resume: forbidden, reconcile: async () => undefined },
    notifications: { send: forbidden, reconcile: async () => undefined },
    discovery: {
      read: async () => ({ repository: "carere/zaidan", revision: "scan", issues: [] }),
    },
  };
  try {
    const original = new IssueWorkflow(options);
    const run = await original.admit({
      repository: "carere/zaidan",
      issueId: "I_one",
      revision: "v1",
      number: 1,
      startingRevision: "a".repeat(40),
      reviewBase: "a".repeat(40),
    });
    const restored = new IssueWorkflow({
      ...options,
      rollout: new RolloutPolicy({
        repository: "carere/zaidan",
        binding: { runtime: "r", configuration: "c", repositoryId: "R_one" },
      }),
    });
    await restored.scan();
    const response = await restored.driveOwned(run.runId);
    assert.equal(
      response.status,
      "running",
      "Eve receives a durable poll response without exhausting step retries",
    );
    assert.equal(restored.observe(run.runId).status, "admitted");
    assert.equal(starts, 0);
    assert.throws(() => restored.assertLiveAction(run.runId), /Rollout disabled/);
    assert.equal(
      (await restored.cancel(run.runId)).status,
      "cancelled",
      "operator cancellation remains available",
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("disabled recovery retains pending engine, checkpoint notification and answer wake effects until rollout returns", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-rollout-recovery-"));
  const store = new SqliteWorkflowStore(join(root, "workflow.sqlite"));
  let starts = 0,
    sends = 0,
    wakes = 0;
  let failStart = true,
    failSend = true,
    failWake = true;
  const options = {
    store,
    engine: {
      find: async () => undefined,
      start: async () => {
        starts++;
        if (failStart) {
          failStart = false;
          throw Error("lost start");
        }
        return `eve-${starts}`;
      },
      wake: async () => {
        wakes++;
        if (failWake) {
          failWake = false;
          throw Error("lost wake");
        }
      },
    },
    worker: {
      dispatch: async () => ({ type: "checkpoint" as const, question: { prompt: "Continue?" } }),
      resume: async () => ({ type: "completed" as const, candidate: { commit: "candidate" } }),
      reconcile: async () => undefined,
    },
    notifications: {
      reconcile: async () => undefined,
      send: async () => {
        sends++;
        if (failSend) {
          failSend = false;
          throw Error("lost send");
        }
        return "sent";
      },
    },
  };
  const issue = (id: string) => ({
    repository: "fixture/local",
    issueId: id,
    number: 1,
    revision: "v1",
    startingRevision: "base",
    reviewBase: "base",
  });
  try {
    const original = new IssueWorkflow(options);
    const pendingStart = await original.admit(issue("pending-start"));
    store.change(pendingStart.runId, (_run, operations) => {
      for (const operation of operations) {
        operation.ownerPid = 2147483647;
        operation.leaseUntil = 0;
      }
    });
    const waiting = await original.admit(issue("pending-send"));
    await original.drive(waiting.runId);
    const answered = await original.admit(issue("pending-wake"));
    const question = await original.drive(answered.runId);
    assert.ok(question.checkpoint);
    await original.answer({
      runId: answered.runId,
      issueId: answered.issue.issueId,
      revision: "v1",
      checkpointId: question.checkpoint.id,
      answerId: "human:1",
      answer: { text: "yes" },
    });
    const before = { starts, sends, wakes };
    let enabled = false;
    const restored = new IssueWorkflow({
      ...options,
      rollout: {
        status: () => ({ enabled }),
        assertAllowed: () => {
          if (!enabled) throw Error("Rollout disabled");
        },
      },
    });
    await restored.recover();
    assert.deepEqual(
      { starts, sends, wakes },
      before,
      "retained recovery must not start any new gated effect",
    );
    assert.equal(restored.observe(answered.runId).checkpoint?.answerId, "human:1");
    assert.deepEqual(restored.observe(waiting.runId).session, waiting.session);
    enabled = true;
    await restored.recover();
    assert.deepEqual(
      { starts, sends, wakes },
      { starts: before.starts + 1, sends: before.sends + 1, wakes: before.wakes + 1 },
    );
    await restored.recover();
    assert.deepEqual(
      { starts, sends, wakes },
      { starts: before.starts + 1, sends: before.sends + 1, wakes: before.wakes + 1 },
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
