import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IssueWorkflow, LocalService, SqliteWorkflowStore, TelegramControl } from "../src/index.ts";
import { TelegramOperations, type TelegramOperationsOptions } from "../src/telegram-operations.ts";
import { TRIAGE_DISCLAIMER, type TriageAdapter, type TriageRequest } from "../src/triage.ts";
import type { WorkerOutcome } from "../src/workflow-contracts.ts";

async function fixture(
  t: { after(fn: () => void | Promise<void>): void },
  extra: {
    triage?: TriageAdapter;
    triageRecovery?: TelegramOperationsOptions["triageRecovery"];
    graphs?: TelegramOperationsOptions["graphs"];
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "factory-operators-"));
  const updates: { update_id: number; message: unknown }[] = [];
  const messages: string[] = [];
  let lose = false;
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    let result: unknown = true;
    if (req.url?.endsWith("sendMessage")) {
      messages.push(body.text);
      if (lose) {
        lose = false;
        req.socket.destroy();
        return;
      }
      result = { message_id: messages.length, chat: { id: 42, type: "private" } };
    }
    if (req.url?.endsWith("getUpdates"))
      result = updates.filter((item) => item.update_id >= body.offset);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const options = {
    database: join(directory, "telegram.sqlite"),
    token: "fake",
    maintainerId: 42,
    apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
  let telegram = new TelegramControl(options);
  let store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  let outcome: WorkerOutcome = {
    type: "failed",
    category: "validation",
    reason: "secret-token-must-not-leak",
  };
  let dispatched = 0;
  let hold = false;
  let stopped = 0;
  const descendants = new Set<string>();
  const waiting = new Map<string, (outcome: WorkerOutcome) => void>();
  const engine = { find: async () => "eve", start: async () => "eve", wake: async () => {} };
  const worker = {
    reconcile: async () => undefined,
    dispatch: async (request: { operationId: string }) => {
      dispatched++;
      if (hold) {
        descendants.add("parent");
        descendants.add("review");
        return new Promise<WorkerOutcome>((resolve) => waiting.set(request.operationId, resolve));
      }
      return outcome;
    },
    resume: async () => outcome,
    cancel: async (id: string) => {
      stopped++;
      descendants.clear();
      const receipt = { type: "cancelled" as const, reason: "stopped" };
      waiting.get(id)?.(receipt);
      return receipt;
    },
  };
  const openWorkflow = () =>
    new IssueWorkflow({
      store,
      engine,
      worker,
      notifications: telegram,
      triage: extra.triage,
      discovery: {
        read: async () => ({
          repository: "fixture/local",
          issues: [],
          revision: "scan",
          observedAt: 1,
        }),
      },
    });
  let workflow = openWorkflow();
  let service = new LocalService({ workflow, stateDirectory: directory });
  await service.start();
  const operatorOptions = () => ({
    database: join(directory, "operators.sqlite"),
    workflow,
    service,
    telegram,
    triageRecovery: extra.triageRecovery,
    graphs: extra.graphs,
  });
  let operators = new TelegramOperations(operatorOptions());
  const command = async (id: number, text: string, author = 42, replyTo?: number) => {
    updates.push({
      update_id: id,
      message: {
        message_id: id,
        text,
        from: { id: author },
        chat: { id: 42, type: "private" },
        ...(replyTo ? { reply_to_message: { message_id: replyTo } } : {}),
      },
    });
    await telegram.pollOnce(workflow, (input) => operators.handle(input));
  };
  t.after(async () => {
    operators.close();
    telegram.close();
    await service.stop();
    store.close();
    server.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    get workflow() {
      return workflow;
    },
    get operators() {
      return operators;
    },
    get telegram() {
      return telegram;
    },
    messages,
    command,
    descendants,
    get stopped() {
      return stopped;
    },
    hold() {
      hold = true;
    },
    get dispatched() {
      return dispatched;
    },
    outcome(value: WorkerOutcome) {
      outcome = value;
    },
    loseNext() {
      lose = true;
    },
    async restart() {
      operators.close();
      telegram.close();
      await service.stop();
      store.close();
      telegram = new TelegramControl(options);
      store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
      workflow = openWorkflow();
      service = new LocalService({ workflow, stateDirectory: directory });
      await service.start();
      operators = new TelegramOperations(operatorOptions());
    },
    async admit(id = "I", route?: "triage" | "implementation", graphId?: string) {
      return workflow.admit({
        issueId: id,
        route,
        ...(graphId ? { graphId } : {}),
        revision: "r1",
        repository: "fixture/local",
        number: 1,
        startingRevision: "base",
        reviewBase: "base",
      });
    },
  };
}

test("authorized operator commands retain targets, sessions and one retry across restart and duplicate delivery", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  await f.workflow.drive(run.runId);
  await f.command(1, `/retry run ${run.runId}`, 99);
  assert.equal(f.workflow.observe(run.runId).status, "failed");
  await f.command(2, `/retry run ${run.runId}`);
  assert.equal(f.workflow.observe(run.runId).execution?.attempt, 1);
  await f.workflow.drive(run.runId);
  await f.restart();
  await f.operators.handle({ id: "telegram:2", name: "retry", argument: `run ${run.runId}` });
  assert.equal(f.workflow.observe(run.runId).status, "failed");
  assert.equal(f.workflow.observe(run.runId).execution?.attempt, 1);
  assert.deepEqual(f.workflow.observe(run.runId).session, run.session);
  await f.command(3, "/status factory");
  assert.ok(
    f.messages.some((message) => message.includes(run.runId) && message.includes("failed")),
  );
  assert.ok(!f.messages.join("\n").includes("secret-token-must-not-leak"));
});

test("factory pause survives restart, gates new work and preserves only its own paused sessions", async (t) => {
  const f = await fixture(t);
  const own = await f.admit("own");
  const manual = await f.admit("manual");
  await f.command(1, `/pause run ${manual.runId}`);
  await f.command(2, "/pause factory");
  assert.equal(f.workflow.observe(own.runId).status, "paused");
  await f.restart();
  await assert.rejects(f.admit("new"), /paused/);
  await f.workflow.drive(own.runId);
  assert.equal(f.dispatched, 0);
  await f.command(3, "/scan factory");
  await f.command(4, "/resume factory");
  assert.equal(f.workflow.observe(own.runId).status, "admitted");
  assert.equal(f.workflow.observe(manual.runId).status, "paused");
  assert.deepEqual(f.workflow.observe(own.runId).session, own.session);
  await f.admit("new");
});

test("uncertain command replies require an explicit duplicate-risk confirmation before resending", async (t) => {
  const f = await fixture(t);
  f.loseNext();
  await f.command(1, "/status factory");
  const uncertain = f.telegram.status().uncertain[0];
  assert.ok(uncertain);
  await f.restart();
  await f.operators.sweep();
  assert.equal(f.messages.length, 1);
  await f.command(2, `/retry notification ${uncertain}`);
  const warning = f.messages.at(-1) ?? "";
  assert.match(warning, /duplicate/);
  const confirmation = warning.match(/\/retry notification [^\s]+ confirm [a-f0-9]+/)?.[0];
  assert.ok(confirmation);
  assert.equal(f.telegram.status().uncertain.length, 1);
  await f.command(3, confirmation, 99);
  assert.equal(f.telegram.status().uncertain.length, 1);
  await f.command(4, confirmation, 42, 2);
  assert.equal(f.telegram.status().uncertain.length, 0);
  const count = f.messages.length;
  await f.restart();
  await f.operators.handle({
    id: "telegram:4",
    name: "retry",
    argument: confirmation.replace("/retry ", ""),
  });
  assert.equal(f.messages.length, count);
});

test("failure and subscription notifications are actionable and stay quiet across polling and restart", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  await f.workflow.drive(run.runId);
  await f.operators.sweep();
  assert.ok(f.messages.at(-1)?.includes(`/retry run ${run.runId}`));
  const count = f.messages.length;
  await f.operators.sweep();
  await f.restart();
  await f.operators.sweep();
  assert.equal(f.messages.length, count);
  assert.ok(!f.messages.join("\n").includes("secret-token-must-not-leak"));
  await f.command(1, `/retry run ${run.runId}`);
  f.outcome({ type: "subscription-paused", reason: "fixture quota" });
  await f.workflow.drive(run.runId);
  const before = f.messages.length;
  await f.operators.sweep();
  await f.operators.sweep();
  assert.equal(f.messages.length, before);
  assert.ok(f.messages.at(-1)?.includes(`/resume run ${run.runId}`));
});

test("run cancellation stops the controlled worker and descendants once while preserving evidence and releasing capacity", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  f.hold();
  const driving = f.workflow.drive(run.runId);
  while (!f.descendants.size) await new Promise((resolve) => setImmediate(resolve));
  await f.command(1, `/cancel run ${run.runId}`);
  await driving;
  assert.equal(f.descendants.size, 0);
  assert.equal(f.stopped, 1);
  assert.equal(f.workflow.observe(run.runId).execution?.operationId, undefined);
  assert.equal(f.workflow.observe(run.runId).status, "cancelled");
  await f.restart();
  await f.operators.handle({ id: "telegram:1", name: "cancel", argument: `run ${run.runId}` });
  assert.equal(f.stopped, 1);
  assert.deepEqual(f.workflow.observe(run.runId).session, run.session);
  assert.deepEqual(f.workflow.observe(run.runId).issue, run.issue);
});

test("atomic run receipts prevent an interrupted command response from resetting the next failure's budget", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  await f.workflow.drive(run.runId);
  await f.workflow.operate({ id: "telegram:8", runId: run.runId, action: "retry" });
  await f.workflow.drive(run.runId);
  await f.restart();
  await f.command(8, `/retry run ${run.runId}`);
  assert.equal(f.workflow.observe(run.runId).status, "failed");
  assert.equal(f.workflow.observe(run.runId).execution?.attempt, 1);
});

test("authentication requires an explicit reauthenticated command and factory resume keeps a manual pause", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  f.outcome({ type: "reauthentication-required", reason: "secret-auth-error" });
  await f.workflow.drive(run.runId);
  await f.command(1, `/resume run ${run.runId}`);
  assert.equal(f.workflow.observe(run.runId).status, "waiting-authentication");
  await f.command(2, `/resume run ${run.runId} reauthenticated`);
  assert.equal(f.workflow.observe(run.runId).status, "admitted");
  assert.equal(f.workflow.observe(run.runId).execution?.attempt, 0);
  await f.command(3, "/pause factory");
  await f.command(4, `/pause run ${run.runId}`);
  await f.command(5, "/pause factory");
  await f.command(6, "/resume factory");
  assert.equal(f.workflow.observe(run.runId).status, "paused");
  assert.ok(!f.messages.join("\n").includes("secret-auth-error"));
});

test("uncertain approved triage recovery requires the exact operator choice and respects pause before remote writes", async (t) => {
  let request: TriageRequest | undefined;
  let creates = 0;
  let delivered = false;
  const result = { commentRef: "https://github.com/fixture/local/issues/1#issuecomment-1" };
  const adapter: TriageAdapter = {
    prepare: async (issue) => issue,
    reconcile: async () => (delivered ? result : undefined),
    apply: async (input) => {
      request = input;
      creates++;
      throw new Error("uncertain secret request");
    },
  };
  const recovery = {
    pending: () =>
      request && !delivered ? [{ operationId: request.operationId, attempted: ["comment"] }] : [],
    retryUncertain: async (input: TriageRequest, step: string) => {
      assert.deepEqual(input, request);
      assert.equal(step, "comment");
      creates++;
      delivered = true;
      return result;
    },
  };
  const f = await fixture(t, { triage: adapter, triageRecovery: recovery });
  const run = await f.admit("triage", "triage");
  f.outcome({
    type: "checkpoint",
    question: { prompt: "Recommended investigation", allowFreeform: true },
  });
  await f.workflow.drive(run.runId);
  let current = f.workflow.observe(run.runId);
  assert.ok(current.checkpoint);
  await f.workflow.answer({
    runId: run.runId,
    issueId: run.issue.issueId,
    revision: run.issue.revision,
    checkpointId: current.checkpoint.id,
    answerId: "recommendation",
    answer: { text: "Proceed" },
  });
  f.outcome({
    type: "triage-proposed",
    proposal: {
      category: "enhancement",
      state: "ready-for-agent",
      investigation: "Evidence",
      recommendation: "Implement",
      verification: "Verified",
      comment: `${TRIAGE_DISCLAIMER}\n\nApproved brief`,
    },
  });
  await f.workflow.drive(run.runId);
  current = f.workflow.observe(run.runId);
  assert.ok(current.checkpoint);
  await f.workflow.answer({
    runId: run.runId,
    issueId: run.issue.issueId,
    revision: run.issue.revision,
    checkpointId: current.checkpoint.id,
    answerId: "approved",
    answer: { optionId: "apply" },
  });
  await f.workflow.drive(run.runId);
  assert.equal(creates, 1);
  const operationId = `${current.checkpoint.id}:triage`;
  await f.command(1, `/retry triage ${operationId} comment`);
  const confirmation = (f.messages.at(-1) ?? "").match(
    /\/retry triage [^\s]+ comment confirm [a-f0-9]+/,
  )?.[0];
  assert.ok(confirmation);
  await f.command(2, "/pause factory");
  await f.command(3, confirmation);
  assert.equal(creates, 1);
  await f.command(4, "/resume factory");
  await f.command(5, confirmation);
  assert.equal(creates, 2);
  await f.workflow.recover();
  assert.equal(f.workflow.observe(run.runId).status, "completed");
  await f.restart();
  await f.operators.handle({
    id: "telegram:5",
    name: "retry",
    argument: confirmation.replace("/retry ", ""),
  });
  assert.equal(creates, 2);
  assert.ok(!f.messages.join("\n").includes("uncertain secret request"));
});

test("factory retry captures failed targets once, preserves its pause gate and leaves fresh admissions alone", async (t) => {
  const f = await fixture(t);
  const failed = await f.admit("failed");
  await f.workflow.drive(failed.runId);
  const queued = await f.admit("queued");
  await f.command(1, "/pause factory");
  await f.command(2, "/retry factory");
  assert.equal(f.workflow.observe(failed.runId).execution?.attempt, 1);
  assert.equal(f.workflow.observe(queued.runId).execution?.attempt, undefined);
  assert.equal(f.workflow.factoryPaused(), true);
  await f.command(3, "/resume factory");
  await f.workflow.drive(failed.runId);
  await f.restart();
  await f.operators.handle({ id: "telegram:2", name: "retry", argument: "factory" });
  assert.equal(f.workflow.observe(failed.runId).execution?.attempt, 1);
  assert.equal(f.workflow.observe(failed.runId).status, "failed");
});

test("operator status projects graph progress and notifies once for each reviewable assembled head", async (t) => {
  let head = "a".repeat(40);
  const f = await fixture(t, {
    graphs: () => [
      {
        graphId: "G1",
        repository: "fixture/local",
        issueNumber: 10,
        head,
        state: "reviewable",
        integrated: 3,
        total: 3,
        pullRequestUrl: "https://github.com/fixture/local/pull/20",
      },
    ],
  });
  await f.command(1, "/status factory");
  assert.match(f.messages.at(-1) ?? "", /Graph G1 #10: reviewable; 3\/3 integrated/);
  await f.operators.sweep();
  const count = f.messages.length;
  await f.restart();
  await f.operators.sweep();
  assert.equal(f.messages.length, count);
  head = "b".repeat(40);
  await f.operators.sweep();
  assert.equal(f.messages.length, count + 1);
  assert.ok(f.messages.at(-1)?.includes("https://github.com/fixture/local/pull/20"));
});

test("factory resume restores an authentication wait without claiming reauthentication, then one explicit run command continues it", async (t) => {
  const f = await fixture(t);
  const run = await f.admit();
  f.outcome({ type: "reauthentication-required", reason: "unavailable" });
  await f.workflow.drive(run.runId);
  await f.command(1, "/pause factory");
  await f.command(2, "/resume factory");
  assert.equal(f.workflow.factoryPaused(), false);
  assert.equal(f.workflow.observe(run.runId).status, "waiting-authentication");
  await f.command(3, `/pause run ${run.runId}`);
  await f.command(4, `/resume run ${run.runId} reauthenticated`);
  assert.equal(f.workflow.observe(run.runId).status, "admitted");
  assert.deepEqual(f.workflow.observe(run.runId).session, run.session);
});

test("factory commands retain completed graph publication work as a paused target across restart", async (t) => {
  const f = await fixture(t);
  const run = await f.admit("graph-child", "implementation", "graph-root");
  f.outcome({ type: "completed", candidate: { commit: "reviewed-child" } });
  await f.workflow.drive(run.runId);
  const completed = f.workflow.observe(run.runId);
  assert.equal(completed.status, "completed");
  assert.equal(completed.graphPending, true);
  await f.command(1, "/pause factory");
  assert.equal(f.workflow.observe(run.runId).operatorPaused, true);
  await f.restart();
  const paused = await f.workflow.drive(run.runId);
  assert.equal(paused.status, "completed");
  assert.equal(paused.graphPending, true);
  assert.equal(paused.operatorPaused, true);
  await f.command(2, "/resume factory");
  const resumed = f.workflow.observe(run.runId);
  assert.equal(resumed.operatorPaused, undefined);
  assert.equal(f.workflow.factoryPaused(), false);
  assert.deepEqual(resumed.session, completed.session);
  assert.deepEqual(resumed.candidate, completed.candidate);
  assert.equal(resumed.phase, completed.phase);
  assert.equal(resumed.execution?.consumedMs, completed.execution?.consumedMs);
  assert.equal(f.dispatched, 1);
});
