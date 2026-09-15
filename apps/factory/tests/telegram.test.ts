import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IssueWorkflow, SqliteWorkflowStore } from "../src/index.ts";
import { TelegramControl } from "../src/telegram.ts";

test("Telegram persists exact questions, authenticates buttons and free text, and resumes one original workflow across transport restart", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "telegram-contract-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const messages: { reply_markup: { inline_keyboard: { callback_data: string }[][] } }[] = [];
  const updates: { update_id: number; message?: unknown; callback_query?: unknown }[] = [];
  const offsets: number[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    let result: unknown = true;
    if (req.url?.endsWith("sendMessage")) {
      messages.push(body);
      result = { message_id: messages.length, chat: { id: 42, type: "private" } };
    }
    if (req.url?.endsWith("getUpdates")) {
      offsets.push(body.offset);
      assert.equal(body.timeout, 25);
      result = updates.filter((update) => update.update_id >= body.offset);
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const options = {
    database: join(directory, "telegram.sqlite"),
    token: "fixture-token",
    maintainerId: 42,
    apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
  let telegram = new TelegramControl(options);
  t.after(() => telegram.close());
  const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  let resumes = 0;
  const workflow = new IssueWorkflow({
    store,
    notifications: telegram,
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    worker: {
      reconcile: async () => undefined,
      dispatch: async () => ({
        type: "checkpoint",
        question: {
          prompt: "Investigation and recommendation",
          options: [{ id: "proceed", label: "Verify claim" }],
          allowFreeform: true,
        },
      }),
      resume: async () => {
        resumes++;
        return { type: "completed", candidate: { commit: "candidate" } };
      },
    },
  });
  const issue = {
    issueId: "I1",
    revision: "rev",
    number: 1,
    repository: "fixture/local",
    startingRevision: "base",
    reviewBase: "base",
  };
  const run = await workflow.admit(issue);
  await workflow.drive(run.runId);
  const data = messages[0]?.reply_markup.inline_keyboard[0]?.[0]?.callback_data;
  assert.ok(data);
  assert.ok(Buffer.byteLength(data) <= 64);
  updates.push({
    update_id: 1,
    callback_query: {
      id: "bad",
      from: { id: 99 },
      data,
      message: { message_id: 1, chat: { id: 42, type: "private" } },
    },
  });
  await telegram.pollOnce(workflow);
  assert.equal(workflow.observe(run.runId).checkpoint?.answer, undefined);
  telegram.close();
  telegram = new TelegramControl(options);
  updates.push({
    update_id: 2,
    message: {
      message_id: 8,
      from: { id: 42 },
      chat: { id: 42, type: "private" },
      reply_to_message: { message_id: 1 },
      text: "Verify with the reporter's example",
    },
  });
  await telegram.pollOnce(workflow);
  assert.deepEqual(workflow.observe(run.runId).checkpoint?.answer, {
    text: "Verify with the reporter's example",
  });
  updates.push({
    update_id: 3,
    callback_query: {
      id: "duplicate",
      from: { id: 42 },
      data,
      message: { message_id: 1, chat: { id: 42, type: "private" } },
    },
  });
  await telegram.pollOnce(workflow);
  await workflow.drive(run.runId);
  await workflow.recover();
  assert.equal(resumes, 1);
  assert.equal(messages.length, 1);
  assert.deepEqual(offsets, [0, 2, 3]);
  assert.equal(telegram.status().offset, 4);
});

test("a lost Telegram send receipt is retained as uncertain, never resent automatically, and an authenticated button reconciles its decision", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "telegram-uncertain-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const sent: { reply_markup: { inline_keyboard: { callback_data: string }[][] } }[] = [];
  const updates: { update_id: number; message?: unknown; callback_query?: unknown }[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    if (req.url?.endsWith("sendMessage")) {
      sent.push(body);
      req.socket.destroy();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result: req.url?.endsWith("getUpdates") ? updates : true }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const options = {
    database: join(directory, "telegram.sqlite"),
    token: "fake",
    maintainerId: 42,
    apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
  let telegram = new TelegramControl(options);
  t.after(() => telegram.close());
  const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  const workflow = new IssueWorkflow({
    store,
    notifications: telegram,
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    worker: {
      reconcile: async () => undefined,
      dispatch: async () => ({
        type: "checkpoint",
        question: { prompt: "Proceed?", options: [{ id: "yes", label: "Yes" }] },
      }),
      resume: async () => ({ type: "completed", candidate: { commit: "done" } }),
    },
  });
  const run = await workflow.admit({
    issueId: "I",
    revision: "r",
    repository: "fixture/local",
    number: 1,
    startingRevision: "b",
    reviewBase: "b",
  });
  await workflow.drive(run.runId);
  await workflow.recover();
  assert.equal(sent.length, 1);
  assert.equal(telegram.status().uncertain.length, 1);
  telegram.close();
  telegram = new TelegramControl(options);
  updates.push({
    update_id: 10,
    callback_query: {
      id: "reply",
      from: { id: 42 },
      data: sent[0]?.reply_markup.inline_keyboard[0]?.[0]?.callback_data,
      message: { message_id: 9, chat: { id: 42, type: "private" } },
    },
  });
  await telegram.pollOnce(workflow);
  assert.equal(workflow.observe(run.runId).checkpoint?.answer?.optionId, "yes");
  assert.equal(telegram.status().uncertain.length, 0);
  assert.equal(sent.length, 1);
});
