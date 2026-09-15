import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IssueWorkflow, type IssueWorkflowOptions } from "../src/issue-workflow.ts";
import type { WorkerOutcome, WorkerRequest } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

const issue = {
  issueId: "I_fixture",
  revision: "content-v1",
  repository: "carere/zaidan",
  number: 42,
  startingRevision: "abc123",
  reviewBase: "base123",
};
function fixture(t: { after(fn: () => void): void }) {
  const root = mkdtempSync(join(tmpdir(), "factory-workflow-"));
  const stores: SqliteWorkflowStore[] = [];
  t.after(() => {
    for (const store of stores) store.close();
    rmSync(root, { recursive: true, force: true });
  });
  const dispatches: WorkerRequest[] = [];
  const resumes: WorkerRequest[] = [];
  const notifications: unknown[] = [];
  const receipts = new Map<string, WorkerOutcome>();
  const engines = new Map<string, string>();
  let now = 1000;
  const adapters: Omit<IssueWorkflowOptions, "store"> = {
    clock: { now: () => now },
    engine: {
      async start({ runId }: { runId: string }) {
        const id = `eve-${runId}`;
        engines.set(runId, id);
        return id;
      },
      async find(runId: string) {
        return engines.get(runId);
      },
      async wake() {},
    },
    worker: {
      async dispatch(request: WorkerRequest): Promise<WorkerOutcome> {
        dispatches.push(request);
        const outcome: WorkerOutcome = {
          type: "checkpoint",
          question: { prompt: "Which color?", options: [{ id: "blue", label: "Blue" }] },
        };
        receipts.set(request.operationId, outcome);
        return outcome;
      },
      async resume(request: WorkerRequest): Promise<WorkerOutcome> {
        resumes.push(request);
        const outcome: WorkerOutcome = { type: "completed", candidate: { commit: "def456" } };
        receipts.set(request.operationId, outcome);
        return outcome;
      },
      async reconcile(id: string) {
        return receipts.get(id);
      },
    },
    notifications: {
      async send(input: unknown) {
        notifications.push(input);
        return "notification-1";
      },
      async reconcile() {
        return undefined;
      },
    },
  };
  const open = () => {
    const store = new SqliteWorkflowStore(join(root, "state.sqlite"));
    stores.push(store);
    return new IssueWorkflow({ store, ...adapters });
  };
  return {
    root,
    open,
    adapters,
    dispatches,
    resumes,
    notifications,
    advance: () => {
      now += 60000;
    },
  };
}

test("an admitted issue waits for an answer and resumes its original session to candidate completion", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const admitted = await workflow.admit(issue);
  const waiting = await workflow.drive(admitted.runId);
  assert.equal(waiting.status, "waiting-human");
  assert.equal(f.dispatches[0].issue.startingRevision, "abc123");
  assert.equal(f.dispatches[0].session.id, admitted.session.id);
  assert.equal(f.notifications.length, 1);
  assert.equal(
    await workflow.answer({
      runId: waiting.runId,
      issueId: issue.issueId,
      revision: issue.revision,
      checkpointId: waiting.checkpoint?.id ?? "missing",
      answerId: "reply-1",
      answer: { optionId: "blue" },
    }),
    "accepted",
  );
  const completed = await workflow.drive(admitted.runId);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.candidate, { commit: "def456" });
  assert.equal(f.resumes[0].session.id, admitted.session.id);
  assert.deepEqual(f.resumes[0].answer, { optionId: "blue" });
});

test("restart at a human wait preserves identity, question, and rejects cross-revision or duplicate answers", async (t) => {
  const f = fixture(t);
  const first = f.open();
  const run = await first.admit(issue);
  const waiting = await first.drive(run.runId);
  const recovered = f.open();
  await recovered.recover();
  const same = await recovered.admit(issue);
  assert.equal(same.runId, run.runId);
  assert.deepEqual(same.session, run.session);
  assert.deepEqual(same.checkpoint, waiting.checkpoint);
  const reply = {
    runId: same.runId,
    issueId: issue.issueId,
    revision: issue.revision,
    checkpointId: same.checkpoint?.id ?? "missing",
    answerId: "reply",
    answer: { optionId: "blue" },
  };
  assert.equal(await recovered.answer({ ...reply, revision: "old-revision" }), "stale");
  assert.equal(await recovered.answer({ ...reply, checkpointId: "other-checkpoint" }), "stale");
  assert.equal(await recovered.answer(reply), "accepted");
  assert.equal(await recovered.answer(reply), "already-answered");
  await recovered.drive(run.runId);
  assert.equal(f.dispatches.length, 1);
  assert.equal(f.resumes.length, 1);
  assert.equal(f.notifications.length, 1);
});

test("two coordinators admit one revision once while another stable issue remains independent", async (t) => {
  const f = fixture(t);
  const a = f.open();
  const b = f.open();
  const [one, two] = await Promise.all([a.admit(issue), b.admit(issue)]);
  assert.equal(one.runId, two.runId);
  await Promise.all([a.drive(one.runId), b.drive(two.runId)]);
  assert.equal(f.dispatches.length, 1);
  const other = await a.admit({ ...issue, issueId: "I_other_repo", repository: "other/repo" });
  assert.notEqual(other.runId, one.runId);
});

test("lost worker, notification and answer wake receipts recover without repeating effects", async (t) => {
  const f = fixture(t);
  const dispatch = f.adapters.worker.dispatch;
  let loseDispatch = true;
  f.adapters.worker.dispatch = async (request) => {
    const result = await dispatch(request);
    if (loseDispatch) {
      loseDispatch = false;
      throw new Error("lost worker response");
    }
    return result;
  };
  const notices = new Map<string, string>();
  f.adapters.notifications.send = async (input) => {
    const request = input as { operationId: string };
    f.notifications.push(input);
    notices.set(request.operationId, "notice");
    throw new Error("lost notification response");
  };
  f.adapters.notifications.reconcile = async (id: string) => notices.get(id);
  let wakeWorks = false;
  f.adapters.engine.wake = async () => {
    if (!wakeWorks) throw new Error("hook not created yet");
  };
  const a = f.open();
  const run = await a.admit(issue);
  assert.equal((await a.drive(run.runId)).status, "running");
  const b = f.open();
  const waiting = await b.drive(run.runId);
  assert.equal(waiting.status, "waiting-human");
  assert.equal(f.dispatches.length, 1);
  const reply = {
    runId: run.runId,
    issueId: issue.issueId,
    revision: issue.revision,
    checkpointId: waiting.checkpoint?.id ?? "missing",
    answerId: "reply",
    answer: { optionId: "blue" },
  };
  assert.equal(await b.answer(reply), "accepted");
  const c = f.open();
  wakeWorks = true;
  await c.recover();
  assert.deepEqual(c.observe(run.runId).checkpoint?.answer, { optionId: "blue" });
  assert.equal((await c.drive(run.runId)).status, "completed");
  assert.equal(f.notifications.length, 1);
});

test("an expired lease cannot race a still-live uncertain Eve start", async (t) => {
  const f = fixture(t);
  let starts = 0;
  f.adapters.engine.start = async () => {
    starts++;
    throw new Error("network timeout while Eve may still be starting");
  };
  const a = f.open();
  const run = await a.admit(issue);
  f.advance();
  const b = f.open();
  await b.recover();
  await b.admit(issue);
  assert.equal(starts, 1);
  assert.equal(b.observe(run.runId).runId, run.runId);
});

test("an accepted Eve start with a lost receipt is found on recovery without another start", async (t) => {
  const f = fixture(t);
  const start = f.adapters.engine.start;
  let starts = 0;
  f.adapters.engine.start = async (input) => {
    starts++;
    await start(input);
    throw new Error("lost start response");
  };
  const a = f.open();
  const admitted = await a.admit(issue);
  assert.equal(admitted.eveRunId, undefined);
  const b = f.open();
  await b.recover();
  const recovered = await b.admit(issue);
  assert.equal(starts, 1);
  assert.equal(recovered.eveRunId, `eve-${admitted.runId}`);
  assert.deepEqual(recovered.session, admitted.session);
});

test("a malformed answer cannot consume the checkpoint", async (t) => {
  const f = fixture(t);
  const workflow = f.open();
  const run = await workflow.admit(issue);
  const waiting = await workflow.drive(run.runId);
  assert.ok(waiting.checkpoint);
  const reply = {
    runId: run.runId,
    issueId: issue.issueId,
    revision: issue.revision,
    checkpointId: waiting.checkpoint.id,
    answerId: "reply",
    answer: {},
  };
  assert.equal(await workflow.answer(reply), "invalid");
  assert.equal(await workflow.answer({ ...reply, answer: { optionId: "red" } }), "invalid");
  assert.equal(workflow.observe(run.runId).checkpoint?.answer, undefined);
  assert.equal(await workflow.answer({ ...reply, answer: { optionId: "blue" } }), "accepted");
});

test("process death during admission recovers the persisted original run and session", async (t) => {
  const f = fixture(t);
  const coordinatorUrl = new URL("../src/issue-workflow.ts", import.meta.url).href;
  const storeUrl = new URL("../src/workflow-store.ts", import.meta.url).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `
    import { IssueWorkflow } from ${JSON.stringify(coordinatorUrl)};
    import { SqliteWorkflowStore } from ${JSON.stringify(storeUrl)};
    const workflow = new IssueWorkflow({
      store: new SqliteWorkflowStore(${JSON.stringify(join(f.root, "state.sqlite"))}),
      clock: { now: () => 0 },
      engine: { find: async () => undefined, start: async () => process.exit(0) },
    });
    await workflow.admit(${JSON.stringify(issue)});
  `,
  ]);
  f.advance();
  const recovered = f.open();
  const original = recovered.admissions()[0];
  assert.equal(original.status, "admitted");
  await recovered.recover();
  const run = await recovered.admit(issue);
  assert.equal(run.runId, original.runId);
  assert.deepEqual(run.session, original.session);
  assert.equal((await recovered.drive(run.runId)).status, "waiting-human");
  assert.equal(f.dispatches.length, 1);
});
