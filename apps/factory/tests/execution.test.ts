import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import type { WorkerOutcome, WorkerRequest } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

function fixture(t: { after(fn: () => void): void }, limits = {}) {
  const directory = mkdtempSync(join(tmpdir(), "factory-execution-"));
  const stores: SqliteWorkflowStore[] = [];
  let now = 1000;
  const requests: WorkerRequest[] = [];
  const pending = new Map<string, (outcome: WorkerOutcome) => void>();
  const receipts = new Map<string, WorkerOutcome>();
  const notices: string[] = [];
  const worker = {
    async dispatch(request: WorkerRequest) {
      requests.push(request);
      return new Promise<WorkerOutcome>((resolve) => pending.set(request.operationId, resolve));
    },
    async resume(request: WorkerRequest) {
      return this.dispatch(request);
    },
    async reconcile(id: string) {
      return receipts.get(id);
    },
    async cancel(id: string, reason: string) {
      const outcome: WorkerOutcome = { type: "cancelled", reason };
      receipts.set(id, outcome);
      pending.get(id)?.(outcome);
      return outcome;
    },
  };
  const open = () => {
    const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
    stores.push(store);
    return new IssueWorkflow({
      store,
      worker,
      clock: { now: () => now },
      execution: limits,
      engine: {
        async find(id) {
          return id;
        },
        async start({ runId }) {
          return runId;
        },
        async wake() {},
      },
      notifications: {
        async reconcile() {
          return undefined;
        },
        async send(request) {
          notices.push(request.operationId);
          return request.operationId;
        },
      },
    });
  };
  const admit = (workflow: IssueWorkflow, id: string) =>
    workflow.admit({
      issueId: id,
      revision: "v1",
      repository: "fixture/repo",
      number: 1,
      startingRevision: "base",
      reviewBase: "base",
    });
  const finish = (id: string, outcome: WorkerOutcome) => {
    receipts.set(id, outcome);
    pending.get(id)?.(outcome);
  };
  t.after(() => {
    for (const store of stores) store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    worker,
    open,
    admit,
    requests,
    finish,
    notices,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("four issue workers execute while a fifth queues and human waits release capacity", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const runs = await Promise.all([1, 2, 3, 4, 5].map((id) => f.admit(workflow, String(id))));
  const drives = runs.map((run) => workflow.drive(run.runId));
  await tick();
  assert.equal(f.requests.length, 4);
  assert.equal(workflow.observe(runs[4].runId).status, "admitted");
  f.finish(f.requests[0].operationId, { type: "checkpoint", question: { prompt: "Decision?" } });
  await drives[0];
  const fifth = workflow.drive(runs[4].runId);
  await tick();
  assert.equal(f.requests.length, 5);
  for (const request of f.requests.slice(1))
    f.finish(request.operationId, { type: "completed", candidate: { commit: "candidate" } });
  await Promise.all([...drives, fifth]);
});

test("model permits are independent, durable, scoped, and a waiting parent frees its slot for a delegate", async (t) => {
  const f = fixture(t, { workers: 2, modelCalls: 4 });
  const workflow = f.open();
  const run = await f.admit(workflow, "models");
  const drive = workflow.drive(run.runId);
  await tick();
  const token = workflow.observe(run.runId).execution?.token;
  assert.ok(token);
  const acquire = (owner: string, capability = token) =>
    workflow.modelPermit(run.runId, capability, owner, "acquire");
  assert.equal(acquire("parent", "wrong"), "denied");
  for (const owner of ["parent", "delegate-a", "delegate-b", "delegate-c"])
    assert.equal(acquire(owner), "granted");
  assert.equal(acquire("delegate-d"), "queued");
  const restarted = f.open();
  assert.equal(restarted.modelPermit(run.runId, token, "delegate-d", "acquire"), "queued");
  assert.equal(workflow.modelPermit(run.runId, token, "parent", "release"), "granted");
  assert.equal(acquire("delegate-d"), "granted");
  f.finish(f.requests[0].operationId, { type: "checkpoint", question: { prompt: "Wait" } });
  await drive;
  assert.equal(acquire("parent"), "denied");
  assert.deepEqual(workflow.observe(run.runId).execution?.models, []);
});

test("active budgets survive restart, exclude human waits, and stop expired descendants before freeing slots", async (t) => {
  const f = fixture(t, { workers: 1, budgetMs: 100 });
  const workflow = f.open();
  const run = await f.admit(workflow, "budget");
  const first = workflow.drive(run.runId);
  await tick();
  f.advance(60);
  f.finish(f.requests[0].operationId, { type: "checkpoint", question: { prompt: "Continue?" } });
  const waiting = await first;
  f.advance(50000);
  const restarted = f.open();
  await restarted.answer({
    runId: run.runId,
    issueId: run.issue.issueId,
    revision: "v1",
    checkpointId: waiting.checkpoint?.id ?? "missing",
    answerId: "yes",
    answer: { text: "yes" },
  });
  const second = restarted.drive(run.runId);
  await tick();
  assert.equal(restarted.observe(run.runId).execution?.consumedMs, 60);
  f.advance(41);
  await restarted.enforceBudgets();
  await second;
  const expired = restarted.observe(run.runId);
  assert.equal(expired.status, "failed");
  assert.equal(expired.reason, "Active execution budget exhausted");
  assert.equal(expired.execution?.consumedMs, 101);
  assert.equal(expired.execution?.operationId, undefined);
  assert.deepEqual(expired.session, run.session);
});

test("transient failures retry once while quota and authentication wait durably without resetting useful work", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await f.admit(workflow, "retries");
  let drive = workflow.drive(run.runId);
  await tick();
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "failed",
    reason: "transport",
    category: "transient",
  });
  assert.equal((await drive).status, "admitted");
  drive = workflow.drive(run.runId);
  await tick();
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "failed",
    reason: "transport",
    category: "transient",
  });
  assert.equal((await drive).status, "failed");
  await workflow.drive(run.runId);
  assert.equal(f.requests.length, 2);
  await workflow.retry(run.runId);
  drive = workflow.drive(run.runId);
  await tick();
  f.advance(20);
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "subscription-paused",
    reason: "Allowance exhausted",
  });
  assert.equal((await drive).status, "waiting-subscription");
  const restarted = f.open();
  await restarted.recover();
  await restarted.drive(run.runId);
  assert.equal(f.notices.length, 1);
  f.advance(100000);
  await restarted.resume(run.runId);
  drive = restarted.drive(run.runId);
  await tick();
  assert.equal(restarted.observe(run.runId).execution?.consumedMs, 20);
  assert.deepEqual(f.requests.at(-1)?.session, run.session);
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "reauthentication-required",
    reason: "Login expired",
  });
  assert.equal((await drive).status, "waiting-authentication");
  await assert.rejects(restarted.resume(run.runId), /reauthentication/i);
  await restarted.resume(run.runId, { reauthenticated: true });
  drive = restarted.drive(run.runId);
  await tick();
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "failed",
    reason: "Tests failed",
    category: "validation",
  });
  assert.equal((await drive).status, "failed");
  await restarted.drive(run.runId);
  assert.equal(f.requests.length, 5);
});

test("uncertain cancellation retains capacity across restart until descendants are confirmed stopped", async (t) => {
  const f = fixture(t, { workers: 1 });
  const workflow = f.open();
  const first = await f.admit(workflow, "cancel");
  const second = await f.admit(workflow, "queued");
  const drive = workflow.drive(first.runId);
  await tick();
  const token = workflow.observe(first.runId).execution?.token;
  assert.ok(token);
  workflow.modelPermit(first.runId, token, "parent", "acquire");
  const original = f.worker.cancel;
  f.worker.cancel = async () => {
    throw new Error("Docker response unknown");
  };
  await assert.rejects(workflow.cancel(first.runId), /unknown/);
  assert.ok(workflow.observe(first.runId).execution?.operationId);
  assert.equal(workflow.modelPermit(first.runId, token, "another", "acquire"), "denied");
  assert.equal((await workflow.drive(second.runId)).status, "admitted");
  assert.equal(f.requests.length, 1);
  f.worker.cancel = original;
  const restarted = f.open();
  await restarted.enforceBudgets();
  await drive;
  assert.equal(restarted.observe(first.runId).status, "cancelled");
  assert.deepEqual(restarted.observe(first.runId).execution?.models, []);
  const next = restarted.drive(second.runId);
  await tick();
  f.finish(f.requests.at(-1)?.operationId ?? "missing", {
    type: "completed",
    candidate: { commit: "next" },
  });
  await next;
  assert.equal(f.requests.length, 2);
});

test("operator pause retains a pending human checkpoint and resume does not invent another phase", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await f.admit(workflow, "paused-human");
  const drive = workflow.drive(run.runId);
  await tick();
  f.finish(f.requests[0].operationId, { type: "checkpoint", question: { prompt: "Human choice" } });
  const waiting = await drive;
  await workflow.pause(run.runId);
  const resumed = await workflow.resume(run.runId);
  assert.equal(resumed.status, "waiting-human");
  assert.deepEqual(resumed.checkpoint, waiting.checkpoint);
  assert.equal(resumed.phase, waiting.phase);
});

test("a quota receipt completed during coordinator loss excludes the later recovery outage from active usage", async (t) => {
  const f = fixture(t, { budgetMs: 100 });
  const original = f.worker.dispatch;
  f.worker.dispatch = async (request) => {
    await original(request);
    throw new Error("response lost");
  };
  const workflow = f.open();
  const run = await f.admit(workflow, "lost-quota");
  const drive = workflow.drive(run.runId);
  await tick();
  f.advance(20);
  f.finish(f.requests[0].operationId, {
    type: "subscription-paused",
    reason: "quota",
    finishedAt: 1020,
  });
  await drive;
  f.advance(50000);
  const restarted = f.open();
  await restarted.recover();
  assert.equal(restarted.observe(run.runId).status, "waiting-subscription");
  assert.equal(restarted.observe(run.runId).execution?.consumedMs, 20);
});
