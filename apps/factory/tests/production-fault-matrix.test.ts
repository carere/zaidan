import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { captureResources } from "../src/captured-resources.ts";
import { type FixtureFaultPoint, FixtureFaults } from "../src/fixture-faults.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { ProductionWork } from "../src/production-work.ts";
import { TelegramControl } from "../src/telegram.ts";
import type { WorkerRequest } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";
import { integrationFixture } from "./graph-fixture.ts";

for (const effect of ["branch-publication", "issue-closure", "pr-readiness"] as const) {
  for (const when of ["before", "after"] as const) {
    test(`production policy ${effect}.${when} resumes original SQLite state and completes the missing effect once`, async (t) => {
      const f = integrationFixture(t, true);
      const directory = mkdtempSync(join(tmpdir(), "factory-publication-matrix-"));
      t.after(() => rmSync(directory, { recursive: true, force: true }));
      const point: FixtureFaultPoint = `${effect}.${when}`;
      const faults = () =>
        new FixtureFaults({
          path: join(directory, "faults.json"),
          repository: "carere/zaidan-factory-fixture",
          mode: "fixture",
          points: [point],
          interrupt() {
            throw Error("matrix interruption");
          },
        });
      let workflow = f.make();
      const work = new ProductionWork({
        workflow,
        git: f.transport,
        enabled: () => true,
        attention: async () => "attention",
      });
      await work.onScan(await workflow.scan());
      let original = workflow.admissions()[0];
      await workflow.drive(original.runId);
      if (effect === "pr-readiness") {
        await workflow.drive(original.runId);
        const dependent = workflow.admissions().find((run) => run.issue.issueId === "b");
        assert.ok(dependent);
        original = dependent;
        await workflow.drive(original.runId);
        await workflow.drive(original.runId);
      }
      f.setEffects((name, action) => faults().effect(name, action));
      const beforeEffects = f.events.length;
      await workflow.drive(original.runId);
      const interrupted = workflow.observe(original.runId);
      const graph = workflow.observeGraph("root");
      assert.deepEqual(
        faults()
          .receipts()
          .map((receipt) => receipt.point),
        [point],
      );
      assert.deepEqual(interrupted.issue, original.issue);
      assert.deepEqual(interrupted.session, original.session);
      assert.deepEqual(interrupted.resources, original.resources);
      assert.equal(interrupted.execution?.operationId, undefined);
      const expectedEffects = when === "before" ? 0 : 1;
      const event =
        effect === "branch-publication"
          ? `publish:${interrupted.candidate?.commit}`
          : effect === "issue-closure"
            ? "close:a"
            : "ready";
      assert.equal(
        f.events.slice(beforeEffects).filter((value) => value === event).length,
        expectedEffects,
      );
      if (effect === "branch-publication")
        assert.equal(
          await f.transport.branchHead(graph.branch),
          when === "after" ? interrupted.candidate?.commit : original.issue.startingRevision,
        );
      if (effect === "issue-closure")
        assert.equal(f.issues[1].state, when === "after" ? "closed" : "open");
      if (effect === "pr-readiness") assert.equal(f.pulls[0].draft, when === "before");
      const requests = f.requests.length;
      const budget = structuredClone(interrupted.execution);
      f.setClock(100000); // Waiting and coordinator downtime must not become active attempt time.
      workflow = f.restart();
      f.setEffects((name, action) => faults().effect(name, action));
      if (effect === "pr-readiness") await workflow.recoverGraph("root");
      else await workflow.drive(original.runId);
      const recovered = workflow.observe(original.runId);
      assert.deepEqual(recovered.issue, original.issue);
      assert.deepEqual(recovered.session, original.session);
      assert.deepEqual(recovered.resources, original.resources);
      assert.deepEqual(recovered.candidate, interrupted.candidate);
      assert.equal(recovered.execution?.consumedMs, budget?.consumedMs);
      assert.equal(recovered.execution?.attempt, budget?.attempt);
      assert.equal(recovered.execution?.retries, budget?.retries);
      assert.equal(
        f.requests.length,
        requests,
        "publication recovery cannot redispatch a worker or acceptance",
      );
      assert.equal(f.events.filter((value) => value === event).length, 1);
      assert.equal(f.pulls.length, 1);
      if (effect === "pr-readiness") {
        assert.equal(workflow.observeGraph("root").state, "reviewable");
        assert.equal(
          f.events.filter((value) => value.startsWith("graph:root:reviewable:")).length,
          1,
        );
        assert.equal(f.issues[0].state, "open");
      } else {
        assert.equal(f.events.filter((value) => value === "close:a").length, 1);
        const dependent = workflow.admissions().find((run) => run.issue.issueId === "b");
        assert.ok(dependent);
        assert.equal(f.git("show", `${dependent.issue.startingRevision}:part-a`), "a");
      }
      await workflow.recoverGraph("root");
      assert.equal(f.events.filter((value) => value === event).length, 1);
      assert.equal(f.requests.length, requests);
    });
  }
}

for (const point of [
  "question-notification.before",
  "question-notification.after",
  "answer-persistence.before",
  "answer-persistence.after",
] as const) {
  test(`native Telegram ${point} preserves one checkpoint, decision and budget across store restart`, async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "factory-telegram-matrix-"));
    const messages: {
      text: string;
      reply_markup: { inline_keyboard: { callback_data: string }[][] };
    }[] = [];
    const updates: {
      update_id: number;
      callback_query: {
        id: string;
        from: { id: number };
        data: string;
        message: { message_id: number; chat: { id: number; type: string } };
      };
    }[] = [];
    const server = createServer(async (request, response) => {
      let text = "";
      for await (const chunk of request) text += chunk;
      const body = JSON.parse(text);
      let result: unknown = true;
      if (request.url?.endsWith("sendMessage")) {
        messages.push(body);
        result = { message_id: messages.length, chat: { id: 42, type: "private" } };
      }
      if (request.url?.endsWith("getUpdates"))
        result = updates.filter((update) => update.update_id >= body.offset);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, result }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const skill = join(directory, "selected-skill");
    mkdirSync(skill);
    writeFileSync(
      join(skill, "SKILL.md"),
      "---\nname: fixture\n---\nOriginal captured instructions.\n",
    );
    let now = 1000;
    let captures = 0;
    let nativeOwner: string | undefined;
    let starts = 0;
    const wakes: { checkpoint: string; input: unknown }[] = [];
    const requests: WorkerRequest[] = [];
    const faultOptions = {
      path: join(directory, "faults.json"),
      repository: "carere/zaidan-factory-fixture",
      mode: "fixture",
      points: [point],
      interrupt() {
        throw Error("matrix interruption");
      },
    };
    let faults = new FixtureFaults(faultOptions);
    const make = () => {
      const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
      const telegram = new TelegramControl({
        database: join(directory, "telegram.sqlite"),
        token: "synthetic-matrix-token",
        maintainerId: 42,
        apiBase: `http://127.0.0.1:${address.port}`,
        checkpointEffect: (point) => faults.hit(point),
      });
      const workflow = new IssueWorkflow({
        store,
        notifications: telegram,
        clock: { now: () => now },
        execution: { budgetMs: 1000 },
        checkpointEffect: (point) => faults.hit(point),
        captureResources(issue) {
          captures++;
          return captureResources({
            directory: join(directory, "resources"),
            issue,
            entry: "fixture",
            skills: [{ path: skill }],
            checks: ["true"],
          });
        },
        engine: {
          async find() {
            return nativeOwner;
          },
          async start() {
            starts++;
            nativeOwner = "controlled-eve-owner";
            return nativeOwner;
          },
          async wake(checkpoint, input) {
            wakes.push({ checkpoint, input });
          },
        },
        worker: {
          async reconcile() {
            return undefined;
          },
          async dispatch(request) {
            requests.push(request);
            now += 20;
            return {
              type: "checkpoint",
              question: {
                prompt: "Continue the same retained work?",
                options: [{ id: "yes", label: "Continue" }],
                allowFreeform: true,
              },
            };
          },
          async resume(request) {
            requests.push(request);
            now += 30;
            return { type: "completed", candidate: { commit: "controlled-worker-candidate" } };
          },
        },
      });
      return { store, telegram, workflow };
    };
    let current = make();
    t.after(async () => {
      current.telegram.close();
      current.store.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(directory, { recursive: true, force: true });
    });
    const restart = () => {
      current.telegram.close();
      current.store.close();
      faults = new FixtureFaults(faultOptions);
      current = make();
    };
    const original = await current.workflow.admit({
      issueId: "I_matrix",
      revision: "revision-1",
      repository: "fixture/local",
      number: 1,
      startingRevision: "base",
      reviewBase: "base",
    });
    await current.workflow.drive(original.runId);
    const waiting = current.workflow.observe(original.runId);
    assert.equal(waiting.status, "waiting-human");
    assert.ok(waiting.checkpoint);
    assert.equal(waiting.execution?.consumedMs, 20);
    assert.equal(waiting.execution?.operationId, undefined);
    const checkpoint = waiting.checkpoint;
    writeFileSync(
      join(skill, "SKILL.md"),
      "---\nname: fixture\n---\nChanged after admission; never recapture.\n",
    );
    if (point.startsWith("question-notification")) {
      assert.equal(messages.length, point.endsWith("before") ? 0 : 1);
      assert.equal(current.telegram.status().uncertain.length, 1);
      now = 100000;
      restart();
      await current.workflow.recover();
      assert.equal(
        messages.length,
        point.endsWith("before") ? 0 : 1,
        "uncertain native sends cannot be automatically repeated",
      );
      if (point.endsWith("before")) {
        // The deterministic operator knows the injected cut preceded HTTP. The transport itself cannot infer this.
        const operation = current.telegram.status().uncertain[0];
        assert.ok(operation);
        await current.telegram.retryUncertain(operation);
      }
    }
    assert.equal(messages.length, 1);
    const data = messages[0].reply_markup.inline_keyboard[0][0].callback_data;
    const update = (id: number, author = 42, type = "private", token = data) => ({
      update_id: id,
      callback_query: {
        id: `callback-${id}`,
        from: { id: author },
        data: token,
        message: { message_id: 1, chat: { id: 42, type } },
      },
    });
    updates.push(
      update(1, 99),
      update(2, 42, "group"),
      update(3, 42, "private", `a:${"0".repeat(32)}:0`),
    );
    await current.telegram.pollOnce(current.workflow);
    assert.equal(current.workflow.observe(original.runId).checkpoint?.answer, undefined);
    const answer = {
      runId: original.runId,
      issueId: original.issue.issueId,
      revision: original.issue.revision,
      checkpointId: checkpoint.id,
      answerId: "direct-stale",
      answer: { optionId: "yes" },
    };
    assert.equal(await current.workflow.answer({ ...answer, revision: "stale-revision" }), "stale");
    assert.equal(
      await current.workflow.answer({ ...answer, checkpointId: "stale-checkpoint" }),
      "stale",
    );
    updates.push(update(4));
    if (point.startsWith("answer-persistence")) {
      await assert.rejects(current.telegram.pollOnce(current.workflow), /matrix interruption/);
      assert.equal(
        Boolean(current.workflow.observe(original.runId).checkpoint?.answer),
        point.endsWith("after"),
      );
      assert.equal(wakes.length, 0);
      now = 100000;
      restart();
      await current.workflow.recover();
      assert.equal(wakes.length, point.endsWith("after") ? 1 : 0);
      await current.telegram.pollOnce(current.workflow); // Replays the original unacknowledged update ID.
    } else await current.telegram.pollOnce(current.workflow);
    const answered = current.workflow.observe(original.runId);
    assert.equal(answered.checkpoint?.id, checkpoint.id);
    assert.equal(answered.checkpoint?.answerId, "telegram:4");
    assert.deepEqual(answered.checkpoint?.answer, { optionId: "yes" });
    assert.equal(answered.execution?.consumedMs, 20);
    assert.equal(current.telegram.status().uncertain.length, 0);
    assert.equal(wakes.length, 1);
    assert.equal(wakes[0].checkpoint, checkpoint.id);
    updates.push(update(5));
    await current.telegram.pollOnce(current.workflow);
    assert.equal(wakes.length, 1);
    assert.equal(
      await current.workflow.answer({ ...answer, checkpointId: "old-checkpoint" }),
      "stale",
    );
    await current.workflow.drive(original.runId);
    await current.workflow.recover();
    const completed = current.workflow.observe(original.runId);
    assert.equal(completed.status, "completed");
    assert.deepEqual(completed.issue, original.issue);
    assert.deepEqual(completed.session, original.session);
    assert.deepEqual(completed.resources, original.resources);
    assert.equal(completed.eveRunId, original.eveRunId);
    assert.equal(completed.execution?.consumedMs, 50);
    assert.equal(completed.execution?.attempt, waiting.execution?.attempt);
    assert.equal(completed.execution?.retries, waiting.execution?.retries);
    assert.equal(captures, 1);
    assert.equal(starts, 1);
    assert.equal(requests.length, 2);
    assert.equal(messages.length, 1);
    assert.equal(wakes.length, 1);
    assert.deepEqual(requests[1].resources, original.resources);
    assert.deepEqual(requests[1].session, original.session);
    assert.deepEqual(
      faults.receipts().map((receipt) => receipt.point),
      [point],
    );
  });
}
