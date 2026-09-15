import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FixtureFaults } from "../src/fixture-faults.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

test("a recorded post-effect fixture crash happens once and permits original receipt recovery after restart", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-faults-"));
  const options = {
    path: join(root, "faults.json"),
    repository: "carere/zaidan-factory-fixture",
    mode: "fixture",
    points: ["branch-publication.after" as const],
    interrupt() {
      throw new Error("injected death");
    },
  };
  let effects = 0;
  try {
    const faults = new FixtureFaults(options);
    await assert.rejects(
      faults.effect("branch-publication", async () => {
        effects++;
        return "published";
      }),
      /injected death/,
    );
    assert.equal(effects, 1);
    const restored = new FixtureFaults(options);
    assert.equal(restored.receipts()[0].point, "branch-publication.after");
    restored.hit("branch-publication.after");
    assert.throws(
      () => new FixtureFaults({ ...options, repository: "carere/zaidan", mode: "live" }),
      /restricted/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("answer interruption before and after SQLite persistence retains one checkpoint and recovers only its pending wake", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-answer-faults-"));
  const store = new SqliteWorkflowStore(join(root, "workflow.sqlite"));
  let wakes = 0;
  const faults = new FixtureFaults({
    path: join(root, "faults.json"),
    repository: "carere/zaidan-factory-fixture",
    mode: "fixture",
    points: ["answer-persistence.before", "answer-persistence.after"],
    interrupt() {
      throw new Error("injected death");
    },
  });
  const options = {
    store,
    checkpointEffect: (point: "answer-persistence.before" | "answer-persistence.after") =>
      faults.hit(point),
    engine: {
      start: async () => "eve",
      find: async () => "eve",
      wake: async () => {
        wakes++;
      },
    },
    worker: {
      dispatch: async () => ({ type: "checkpoint" as const, question: { prompt: "Continue?" } }),
      resume: async () => ({ type: "completed" as const, candidate: { commit: "candidate" } }),
      reconcile: async () => undefined,
    },
    notifications: { send: async () => "sent", reconcile: async () => "sent" },
  };
  try {
    const workflow = new IssueWorkflow(options);
    const run = await workflow.admit({
      issueId: "I_one",
      revision: "r1",
      repository: "fixture/local",
      number: 1,
      startingRevision: "base",
      reviewBase: "base",
    });
    const waiting = await workflow.drive(run.runId);
    assert.ok(waiting.checkpoint);
    const answer = {
      runId: run.runId,
      issueId: "I_one",
      revision: "r1",
      checkpointId: waiting.checkpoint.id,
      answerId: "telegram:1",
      answer: { text: "yes" },
    };
    await assert.rejects(workflow.answer(answer), /injected death/);
    assert.equal(workflow.observe(run.runId).checkpoint?.answer, undefined);
    await assert.rejects(workflow.answer(answer), /injected death/);
    assert.equal(workflow.observe(run.runId).checkpoint?.answerId, "telegram:1");
    assert.equal(wakes, 0);
    const restored = new IssueWorkflow(options);
    await restored.recover();
    assert.equal(wakes, 1);
    assert.equal(await restored.answer(answer), "already-answered");
    assert.equal(wakes, 1);
    assert.deepEqual(restored.observe(run.runId).session, run.session);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
