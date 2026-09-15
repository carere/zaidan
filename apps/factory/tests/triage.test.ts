import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { IssueWorkflow, SqliteWorkflowStore, type WorkerRequest } from "../src/index.ts";
import {
  TRIAGE_DISCLAIMER,
  type TriageProposal,
  type TriageReceipt,
  type TriageRequest,
} from "../src/triage.ts";

const proposal: TriageProposal = {
  category: "enhancement",
  state: "ready-for-agent",
  investigation:
    "Searched registry and component names; no existing implementation or prior rejection.",
  recommendation: "Small well specified addition suitable for an agent.",
  verification: "Confirmed the requested component does not exist.",
  comment: `${TRIAGE_DISCLAIMER}\n\n## Agent brief\nAdd a greeting component.\n\n## Acceptance criteria\nRenders the agreed greeting.`,
};
const issue = {
  issueId: "I_parent",
  revision: "rev1",
  repository: "fixture/local",
  number: 1,
  startingRevision: "base",
  reviewBase: "base",
  route: "triage" as const,
  labels: ["needs-triage"],
  dependencyIds: ["unresolved"],
};
test("triage retains recommendation decision before verification, then approves exact outcome and recovers a lost publication receipt", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "triage-workflow-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  const requests: WorkerRequest[] = [];
  const published = new Map<string, TriageReceipt>();
  let mutations = 0;
  const adapters = {
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    worker: {
      reconcile: async () => undefined,
      dispatch: async (request: WorkerRequest) => {
        requests.push(request);
        return {
          type: "checkpoint" as const,
          question: {
            prompt: `Investigation: searched components. Recommend enhancement / ready-for-agent. Proceed to verification?`,
            allowFreeform: true,
          },
        };
      },
      resume: async (request: WorkerRequest) => {
        requests.push(request);
        return { type: "triage-proposed" as const, proposal };
      },
    },
    notifications: { reconcile: async () => undefined, send: async () => "notice" },
    triage: {
      prepare: async (value: typeof issue) => value,
      apply: async (request: TriageRequest) => {
        mutations++;
        published.set(request.operationId, {
          commentRef: "https://github.com/fixture/local/issues/1#issuecomment-1",
        });
        throw new Error("lost response");
      },
      reconcile: async (request: TriageRequest) => published.get(request.operationId),
    },
  };
  let workflow = new IssueWorkflow({ ...adapters, store });
  const run = await workflow.admit(issue);
  const answer = async (optionId?: string) => {
    const current = workflow.observe(run.runId);
    assert.ok(current.checkpoint);
    return workflow.answer({
      runId: run.runId,
      issueId: issue.issueId,
      revision: issue.revision,
      checkpointId: current.checkpoint.id,
      answerId: `${current.checkpoint.id}:answer`,
      answer: optionId ? { optionId } : { text: "Proceed with verification" },
    });
  };
  await workflow.drive(run.runId);
  assert.equal(requests.length, 1);
  assert.equal(workflow.observe(run.runId).execution?.operationId, undefined);
  assert.equal(mutations, 0);
  assert.equal(await answer(), "accepted");
  await workflow.drive(run.runId);
  assert.equal(workflow.observe(run.runId).status, "waiting-human");
  assert.match(workflow.observe(run.runId).checkpoint?.question.prompt ?? "", /Agent brief/);
  assert.equal(mutations, 0);
  assert.equal(workflow.observe(run.runId).execution?.operationId, undefined);
  assert.equal(await answer("apply"), "accepted");
  assert.equal((await workflow.drive(run.runId)).status, "running");
  store.close();
  store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  workflow = new IssueWorkflow({ ...adapters, store });
  await workflow.pause(run.runId);
  await workflow.recover();
  assert.equal(workflow.observe(run.runId).status, "paused");
  assert.equal(workflow.observe(run.runId).triage?.receipt, undefined);
  assert.equal(mutations, 1);
  await workflow.resume(run.runId);
  await workflow.recover();
  assert.equal(workflow.observe(run.runId).status, "completed");
  assert.deepEqual(workflow.observe(run.runId).session, run.session);
  assert.equal(mutations, 1);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].session.id, run.session.id);
  assert.equal(workflow.observe(run.runId).candidate, undefined);
});

test("changed triage source rejects a Telegram decision before resumption and never applies an unapproved proposal", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "triage-stale-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  let current = true;
  let resumes = 0;
  const workflow = new IssueWorkflow({
    store,
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    notifications: { reconcile: async () => undefined, send: async () => "notice" },
    triage: {
      prepare: async (issue) => issue,
      current: async () => current,
      reconcile: async () => undefined,
      apply: async () => {
        throw new Error("Unapproved outcome must not publish");
      },
    },
    worker: {
      reconcile: async () => undefined,
      dispatch: async () => ({
        type: "checkpoint",
        question: {
          prompt: "Recommend enhancement. Verify claim?",
          options: [{ id: "verify", label: "Verify" }],
          allowFreeform: true,
        },
      }),
      resume: async () => {
        resumes++;
        return { type: "triage-proposed", proposal };
      },
    },
  });
  const run = await workflow.admit(issue);
  const waiting = await workflow.drive(run.runId);
  assert.ok(waiting.checkpoint);
  const reply = {
    runId: run.runId,
    issueId: issue.issueId,
    revision: issue.revision,
    checkpointId: waiting.checkpoint.id,
    answerId: "answer",
    answer: { optionId: "verify" },
  };
  assert.equal(
    await workflow.answer({ ...reply, answer: { optionId: "verify", text: "Do not verify" } }),
    "invalid",
  );
  current = false;
  assert.equal(await workflow.answer(reply), "stale");
  assert.equal(resumes, 0);
  current = true;
  assert.equal(await workflow.answer(reply), "accepted");
  current = false;
  await assert.rejects(workflow.drive(run.runId), /source changed/);
  assert.equal(resumes, 0);
  current = true;
  const proposed = await workflow.drive(run.runId);
  assert.equal(proposed.status, "waiting-human");
  assert.equal(resumes, 1);
  await workflow.drive(run.runId);
  assert.equal(resumes, 1);
});

test("a worker cannot skip the original recommendation checkpoint or the triage disclaimer", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "triage-invalid-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  t.after(() => store.close());
  const workflow = new IssueWorkflow({
    store,
    engine: { find: async () => "eve", start: async () => "eve", wake: async () => {} },
    notifications: {
      reconcile: async () => undefined,
      send: async () => {
        throw new Error("Invalid proposal must not notify");
      },
    },
    worker: {
      reconcile: async () => undefined,
      dispatch: async () => ({ type: "triage-proposed", proposal }),
      resume: async () => ({
        type: "triage-proposed",
        proposal: { ...proposal, comment: "Missing disclaimer" },
      }),
    },
  });
  const run = await workflow.admit(issue);
  assert.equal((await workflow.drive(run.runId)).status, "failed");
  assert.equal(workflow.observe(run.runId).triage, undefined);
});
