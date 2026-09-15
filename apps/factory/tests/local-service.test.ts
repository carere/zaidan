import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { LocalService } from "../src/local-service.ts";
import { serviceConfig } from "../src/service-config.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "factory-service-"));
  const store = new SqliteWorkflowStore(join(root, "workflow.sqlite"));
  let now = 100000;
  let scans = 0;
  let hold: Promise<void> | undefined;
  const unavailable = async (): Promise<never> => {
    throw new Error("Unexpected worker");
  };
  const workflow = new IssueWorkflow({
    store,
    engine: { find: async () => undefined, start: unavailable, wake: unavailable },
    worker: { dispatch: unavailable, resume: unavailable, reconcile: unavailable },
    notifications: { send: unavailable, reconcile: unavailable },
    discovery: {
      read: async () => {
        scans++;
        await hold;
        return { repository: "fixture/repo", revision: "one", issues: [] };
      },
    },
  });
  return {
    root,
    workflow,
    service: () => new LocalService({ workflow, stateDirectory: root, clock: { now: () => now } }),
    scans: () => scans,
    advance: (ms: number) => {
      now += ms;
    },
    hold: (value?: Promise<void>) => {
      hold = value;
    },
    cleanup: () => {
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("six-hour discovery, sleep catch-up and overlapping triggers coalesce", async () => {
  const f = fixture();
  const service = f.service();
  try {
    await service.start();
    assert.equal(f.scans(), 1);
    f.advance(21600000 - 1);
    await service.poll();
    // An elapsed polling gap is one wake catch-up, even before the six-hour deadline.
    assert.equal(f.scans(), 2);
    for (let i = 0; i < 720; i++) {
      f.advance(30000);
      await service.poll();
    }
    assert.equal(f.scans(), 3);
    let release!: () => void;
    f.hold(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const manual = service.trigger("manual");
    f.advance(3 * 86400000);
    const wake = service.poll();
    const scheduled = service.trigger("scheduled");
    release();
    await Promise.all([manual, wake, scheduled]);
    assert.equal(f.scans(), 4);
    await service.poll();
    assert.equal(f.scans(), 4);
    assert.equal(service.status().mode, "read-only");
    assert.equal(f.workflow.admissions().length, 0);
  } finally {
    await service.stop();
    f.cleanup();
  }
});

test("restart retains last success, rejects a second owner and coalesces downtime into one scan", async () => {
  const f = fixture();
  const first = f.service();
  const duplicate = f.service();
  try {
    await first.start();
    await assert.rejects(duplicate.start(), /Another coordinator/);
    await first.stop();
    f.advance(5 * 86400000);
    let release!: () => void;
    f.hold(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const restarting = duplicate.start();
    assert.equal(duplicate.status().lastSuccessAt, 100000);
    const manual = duplicate.trigger("manual");
    const wake = duplicate.trigger("wake");
    release();
    await Promise.all([restarting, manual, wake]);
    await duplicate.poll();
    assert.equal(f.scans(), 2);
    assert.equal(duplicate.status().ready, true);
  } finally {
    await first.stop();
    await duplicate.stop();
    f.cleanup();
  }
});

test("startup restores an uncertain worker receipt and original checkpoint before discovery", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-service-recovery-"));
  const dbPath = join(root, "workflow.sqlite");
  let store = new SqliteWorkflowStore(dbPath);
  let accepted = false;
  let receiptVisible = false;
  let dispatches = 0;
  let notifications = 0;
  const options = {
    engine: {
      find: async () => "eve-existing",
      start: async () => "eve-existing",
      wake: async () => {},
    },
    worker: {
      dispatch: async (): Promise<never> => {
        dispatches++;
        accepted = true;
        throw new Error("Lost response");
      },
      resume: async (): Promise<never> => {
        throw new Error("Unexpected resume");
      },
      reconcile: async () => {
        if (accepted && !receiptVisible) throw new Error("Receipt temporarily unreadable");
        return accepted
          ? { type: "checkpoint" as const, question: { prompt: "Continue?" } }
          : undefined;
      },
    },
    notifications: {
      send: async () => {
        notifications++;
        return "message-one";
      },
      reconcile: async () => undefined,
    },
  };
  const original = new IssueWorkflow({ store, ...options });
  const run = await original.admit({
    issueId: "fixture-one",
    repository: "fixture/repo",
    number: 1,
    revision: "one",
    startingRevision: "abc",
    reviewBase: "abc",
  });
  await original.drive(run.runId);
  store.close();
  store = new SqliteWorkflowStore(dbPath);
  let discovered = 0;
  const restored = new IssueWorkflow({
    store,
    ...options,
    discovery: {
      read: async () => {
        discovered++;
        assert.equal(restored.observe(run.runId).status, "waiting-human");
        assert.equal(notifications, 1);
        return { repository: "fixture/repo", revision: "one", issues: [] };
      },
    },
  });
  const service = new LocalService({ workflow: restored, stateDirectory: root });
  try {
    await assert.rejects(service.start(), /Receipt temporarily unreadable/);
    assert.equal(discovered, 0);
    assert.equal(service.status().ready, false);
    receiptVisible = true;
    await service.trigger("manual");
    assert.equal(service.status().ready, true);
    assert.equal(discovered, 1);
    assert.equal(dispatches, 1);
    assert.deepEqual(restored.observe(run.runId).session, run.session);
    assert.equal(restored.observe(run.runId).checkpoint?.question.prompt, "Continue?");
  } finally {
    await service.stop();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("service configuration rejects Git state, redirected Eve deployments and non-loopback port settings", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-service-config-"));
  try {
    const repository = resolve(import.meta.dirname, "../../..");
    assert.throws(() => serviceConfig({ FACTORY_STATE_DIR: repository }), /outside Git/);
    symlinkSync(repository, join(root, "eve"), "dir");
    assert.throws(() => serviceConfig({ FACTORY_STATE_DIR: root }), /outside Git/);
    rmSync(join(root, "eve"));
    assert.throws(
      () => serviceConfig({ FACTORY_STATE_DIR: root, FACTORY_EVE_PORT: "4311" }),
      /ports must differ/,
    );
    assert.throws(
      () => serviceConfig({ FACTORY_STATE_DIR: root, FACTORY_COORDINATOR_PORT: "0.0.0.0:1234" }),
      /ports must be integers/,
    );
    assert.equal(serviceConfig({ FACTORY_STATE_DIR: root }).evePort, 4312);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
