import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SqliteGraphStore } from "../src/graph-integration.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import type { TriageAdapter } from "../src/triage.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";
import { integrationFixture, issue } from "./graph-fixture.ts";

test("graph admission creates a branch at main and only releases leaves with contained prerequisites", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "factory-graph-"));
  const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  const graphs = new SqliteGraphStore(join(directory, "graphs.sqlite"));
  t.after(() => {
    store.close();
    graphs.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const heads = new Map([["main", "a".repeat(40)]]);
  const workflow = new IssueWorkflow({
    store,
    engine: {
      async start() {
        return "eve";
      },
      async find() {
        return undefined;
      },
      async wake() {},
    },
    worker: {
      async dispatch() {
        throw Error("not dispatched");
      },
      async resume() {
        throw Error("not dispatched");
      },
      async reconcile() {
        return undefined;
      },
    },
    notifications: {
      async send() {
        return "sent";
      },
      async reconcile() {
        return undefined;
      },
    },
    discovery: {
      async read() {
        return {
          repository: "owner/repo",
          revision: "scan1",
          issues: [issue("root", ["a", "b"]), issue("a"), issue("b", [], ["a"])],
        };
      },
    },
    graph: {
      store: graphs,
      git: {
        async branchHead(branch) {
          return heads.get(branch);
        },
        async publishBranch(branch, commit, expected) {
          assert.equal(heads.get(branch), expected);
          heads.set(branch, commit);
        },
        async importCandidate() {
          throw Error("unused");
        },
        async contains() {
          return true;
        },
        async exportBundle() {
          throw Error("unused");
        },
      },
      github: {
        async findPullRequests() {
          return [];
        },
        async createPullRequest() {
          throw Error("No initialization PR");
        },
        async closeIssue() {
          throw Error("No premature closure");
        },
      },
      entry: "resolving-merge-conflicts",
    },
  });
  const graph = await workflow.admitGraph("root");
  assert.equal(heads.get(graph.branch), heads.get("main"));
  assert.equal(workflow.admissions().length, 1);
  assert.equal(workflow.admissions()[0].issue.issueId, "a");
  assert.equal(workflow.admissions()[0].issue.startingRevision, heads.get("main"));
  assert.equal((await workflow.admitGraph("root")).branch, graph.branch);
  assert.equal(workflow.admissions().length, 1);
});

test("published integration recovers after restart, closes once, and immediately admits dependent from prerequisite code", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  await workflow.drive(original.runId);
  let run = workflow.observe(original.runId);
  assert.equal(run.status, "admitted");
  assert.equal(run.execution?.consumedMs, 100);
  assert.deepEqual(run.issue, original.issue);
  assert.deepEqual(run.session, original.session);
  assert.deepEqual(run.resources, original.resources);
  f.setLosePush();
  await workflow.drive(run.runId);
  run = workflow.observe(run.runId);
  assert.equal(run.status, "completed");
  assert.equal(run.execution?.consumedMs, 200);
  assert.equal(run.execution?.operationId, undefined);
  assert.equal(f.events.filter((e) => e.startsWith("close")).length, 0);
  workflow = f.make();
  await workflow.drive(run.runId);
  const graph = workflow.observeGraph("root");
  assert.equal(graph.state, "active", graph.reason);
  assert.equal(f.requests.length, 2);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.pulls[0].draft, true);
  assert.deepEqual(f.events.slice(-2), ["draft", "close:a"]);
  const dependent = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(dependent);
  assert.equal(dependent.issue.startingRevision, graph.head);
  assert.equal(f.git("show", `${dependent.issue.startingRevision}:greeting`), "hello world");
  assert.equal(workflow.observe(run.runId).graphPending, false);
  await workflow.drive(run.runId);
  assert.equal(f.events.filter((e) => e === "close:a").length, 1);
});
test("lost draft and child closure replies reconcile independently without another integration", async (t) => {
  for (const failure of ["draft", "close"]) {
    const f = integrationFixture(t);
    let workflow = f.make();
    await workflow.admitGraph("root");
    const run = workflow.admissions()[0];
    await workflow.drive(run.runId);
    if (failure === "draft") f.setLoseCreate();
    else f.setLoseClose();
    await workflow.drive(run.runId);
    assert.equal(workflow.observeGraph("root").state, "reconciliation");
    workflow = f.make();
    await workflow.drive(run.runId);
    assert.equal(
      workflow.observeGraph("root").state,
      "active",
      workflow.observeGraph("root").reason,
    );
    assert.equal(f.requests.length, 2);
    assert.equal(f.pulls.length, 1);
    assert.equal(f.events.filter((e) => e === "close:a").length, 1);
  }
});
test("revoked authorization prevents integration dispatch and changed graph heads cannot publish stale evidence", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  await workflow.drive(run.runId);
  f.issues[1].labels = ["ready-for-human"];
  const paused = await workflow.drive(run.runId);
  assert.equal(paused.status, "paused");
  assert.match(paused.reason ?? "", /authorization/);
  assert.equal(f.requests.length, 1);
  assert.equal(workflow.observe(run.runId).execution?.operationId, undefined);
  assert.equal(f.pulls.length, 0);
  f.issues[1].labels = ["ready-for-agent"];
  await workflow.resume(run.runId);
  const graph = workflow.observeGraph("root");
  f.setBeforePublish(() => {
    f.issues[1].labels = ["ready-for-human"];
  });
  await workflow.drive(run.runId);
  assert.equal(workflow.observeGraph("root").state, "reconciliation");
  assert.equal(f.events.filter((e) => e.startsWith("close")).length, 0);
  assert.equal(workflow.admissions().length, 1);
  assert.equal(graph.integrations.length, 0);
});
test("integration consumes the original attempt budget and cannot obtain a fresh budget by changing phase", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  await workflow.drive(run.runId);
  const queued = workflow.observe(run.runId);
  assert.equal(queued.execution?.consumedMs, 100);
  f.setClock(9000000);
  await workflow.drive(run.runId);
  assert.equal(workflow.observe(run.runId).execution?.consumedMs, 200);
  assert.equal(workflow.observe(run.runId).execution?.attempt, 0);
});
test("same-graph siblings wait without capacity while another graph can integrate independently", async (t) => {
  const f = integrationFixture(t);
  f.issues[2].dependencyIds = [];
  const secondRoot = { ...issue("root2", ["c"]), number: 10, parentIds: [] };
  const secondChild = { ...issue("c"), number: 11, parentIds: ["root2"] };
  f.issues.push(secondRoot, secondChild);
  const workflow = f.make();
  await workflow.admitGraph("root");
  await workflow.admitGraph("root2");
  const a = workflow.admissions().find((r) => r.issue.issueId === "a"),
    b = workflow.admissions().find((r) => r.issue.issueId === "b"),
    c = workflow.admissions().find((r) => r.issue.issueId === "c");
  assert.ok(a && b && c);
  await workflow.drive(a.runId);
  await workflow.drive(b.runId);
  await workflow.drive(c.runId);
  assert.equal(workflow.observe(a.runId).status, "admitted");
  assert.equal(workflow.observe(b.runId).status, "completed");
  assert.equal(workflow.observe(b.runId).integration, undefined);
  assert.equal(workflow.observe(b.runId).execution?.operationId, undefined);
  assert.equal(workflow.observe(c.runId).status, "admitted");
  let release = () => {};
  let entered = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  f.setBeforeWorker(async (request) => {
    if (request.runId === a.runId && request.integration) {
      entered();
      await held;
    }
  });
  const integrating = workflow.drive(a.runId);
  await started;
  await workflow.drive(b.runId);
  await workflow.drive(c.runId);
  assert.equal(workflow.observe(c.runId).graphPending, false);
  assert.equal(workflow.observe(b.runId).integration, undefined);
  release();
  await integrating;
  await workflow.drive(b.runId);
  const queued = workflow.observe(b.runId);
  assert.equal(queued.status, "admitted");
  assert.equal(queued.integration?.expectedHead, workflow.observeGraph("root").head);
  assert.equal(queued.execution?.consumedMs, 100);
  await workflow.drive(b.runId);
  assert.equal(workflow.observe(b.runId).graphPending, false, workflow.observeGraph("root").reason);
  assert.equal(f.pulls.length, 2);
  assert.equal(f.requests.filter((r) => r.runId === b.runId && r.integration).length, 1);
});
test("assembled validation must cover the exact candidate and publication uses compare-and-set", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  await workflow.drive(run.runId);
  f.setTransform((candidate) => ({
    ...candidate,
    reviews: candidate.reviews.map((review) => ({ ...review, commit: f.base })),
  }));
  await workflow.drive(run.runId);
  assert.equal(workflow.observeGraph("root").state, "reconciliation");
  assert.match(workflow.observeGraph("root").reason ?? "", /reviews/);
  assert.equal(f.pulls.length, 0);
  assert.equal(f.events.length, 1);
  const current = workflow.observeGraph("root");
  await assert.rejects(
    f.transport.publishBranch(current.branch, run.issue.startingRevision, "f".repeat(40)),
    /reconcile/,
  );
  assert.equal(await f.transport.branchHead(current.branch), current.head);
});
test("restart after recorded closure retries the missing dependent frontier before completing the Eve run", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  await workflow.drive(run.runId);
  f.failNextDependentCapture();
  await workflow.drive(run.runId);
  assert.equal(f.issues[1].state, "closed");
  assert.equal(workflow.observe(run.runId).graphPending, true);
  assert.equal(workflow.admissions().length, 1);
  workflow = f.make();
  await workflow.drive(run.runId);
  assert.equal(workflow.observe(run.runId).graphPending, false);
  assert.equal(workflow.admissions().length, 2);
  assert.equal(f.requests.length, 2);
  assert.equal(f.events.filter((e) => e === "close:a").length, 1);
});
test("reopened prerequisites and revoked parent authorization pause dependent execution without fabricating delivery", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  await workflow.drive(run.runId);
  await workflow.drive(run.runId);
  const dependent = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(dependent);
  f.issues[1].state = "open";
  f.issues[1].stateReason = null;
  f.issues[1].revision = "a-reopened";
  const paused = await workflow.drive(dependent.runId);
  assert.equal(paused.status, "paused");
  assert.match(paused.reason ?? "", /prerequisite/);
  assert.equal(f.requests.length, 2);
  assert.equal(workflow.observeGraph("root").integrations[0].issueRevision, "a-1-closed");
  const g = integrationFixture(t);
  const other = g.make();
  await other.admitGraph("root");
  g.issues[0].state = "closed";
  const child = other.admissions()[0];
  const blocked = await other.drive(child.runId);
  assert.equal(blocked.status, "paused");
  assert.match(blocked.reason ?? "", /specification/);
  assert.equal(g.requests.length, 0);
});
test("overlapping coordinators create one graph branch and one admission while unrelated blocked leaves stay queued", async (t) => {
  const f = integrationFixture(t);
  f.issues[2].dependencyIds = ["unreadable"];
  const first = f.make(),
    second = f.make();
  const [a, b] = await Promise.all([first.admitGraph("root"), second.admitGraph("root")]);
  assert.equal(a.branch, b.branch);
  assert.equal(first.admissions().length, 1);
  assert.equal(first.admissions()[0].issue.issueId, "a");
  assert.equal(f.events.filter((event) => event.startsWith("publish:")).length, 1);
});
test("an existing graph PR made ready cannot receive another child publication", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const next = workflow.admissions().find((run) => run.issue.issueId === "b");
  assert.ok(next);
  await workflow.drive(next.runId);
  const head = workflow.observeGraph("root").head;
  f.pulls[0].draft = false;
  await workflow.drive(next.runId);
  assert.equal(await f.transport.branchHead(workflow.observeGraph("root").branch), head);
  assert.match(workflow.observeGraph("root").reason ?? "", /PR authorization/);
  assert.equal(f.issues[2].state, "open");
});

test("graph integration retains a triage-approved brief and rejects changed approval before publishing", async (t) => {
  const f = integrationFixture(t);
  const child = f.issues.find((item) => item.issueId === "a");
  assert.ok(child);
  child.body = "Please add a greeting.";
  const brief = {
    issueId: child.issueId,
    contentRevision: child.contentRevision,
    ref: `${child.sourceRef}#issuecomment-approved`,
    content: "## Agent brief\nGreet the world.\n## Acceptance criteria\nSay hello world.",
  };
  const triage: TriageAdapter = {
    prepare: async (issue) => issue,
    apply: async () => {
      throw Error("Graph implementation cannot publish triage");
    },
    reconcile: async () => undefined,
    approvedBriefs: async () => [structuredClone(brief)],
  };
  const workflow = f.make(triage);
  const graph = await workflow.admitGraph("root");
  const run = workflow.admissions()[0];
  assert.equal(run.issue.issueId, "a");
  assert.equal(run.issue.sourceContent?.brief, brief.content);
  assert.equal(run.issue.briefRef, brief.ref);
  await workflow.drive(run.runId);
  assert.ok(workflow.observe(run.runId).integration);
  brief.content += "\nChanged scope.";
  const restarted = f.make(triage);
  await restarted.drive(run.runId);
  assert.equal(restarted.observe(run.runId).status, "paused");
  assert.match(restarted.observe(run.runId).reason ?? "", /authorization|requirements/);
  assert.equal(await f.transport.branchHead(graph.branch), f.base);
  assert.equal(f.pulls.length, 0);
  assert.equal(child.state, "open");
  assert.equal(f.requests.length, 1);
});

test("whole-graph acceptance uses the assembled head and retained attempt before readiness", async (t) => {
  const f = integrationFixture(t, true);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const last = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(last);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  const queued = workflow.observe(last.runId);
  assert.ok(queued.acceptance, "all closed children queue explicit acceptance");
  assert.equal(f.pulls[0].draft, true);
  assert.deepEqual(queued.issue, last.issue);
  assert.deepEqual(queued.session, last.session);
  assert.deepEqual(queued.resources, last.resources);
  assert.equal(queued.execution?.consumedMs, 200);
  assert.equal(queued.acceptance.head, workflow.observeGraph("root").head);
  assert.deepEqual(queued.acceptance.members.map((i) => i.issueId).sort(), ["a", "b", "root"]);
  await workflow.drive(last.runId);
  assert.equal(f.pulls[0].draft, false);
  assert.equal(workflow.observeGraph("root").state, "reviewable");
  assert.equal(f.description()?.title, "Add the complete greeting feature");
  assert.match(f.description()?.body ?? "", /The greeting was incomplete/);
  assert.equal(workflow.observe(last.runId).execution?.consumedMs, 300);
  assert.equal(f.events.filter((e) => e === "ready").length, 1);
  assert.equal(f.issues[0].state, "open");
  assert.equal(f.requests.filter((r) => r.acceptance).length, 1);
});

async function acceptanceReadyFixture(t: { after(fn: () => void): void }) {
  const f = integrationFixture(t, true);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const last = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(last);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  return { ...f, workflow, last };
}
test("readiness and notification recover lost responses without repeating completed actions", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setLoseReady();
  await f.workflow.drive(f.last.runId);
  assert.equal(f.pulls[0].draft, false);
  assert.equal(f.workflow.observeGraph("root").finalization?.state, "passed");
  const restarted = f.make();
  f.setLoseNotify();
  await restarted.recoverGraph("root");
  await f.make().recoverGraph("root");
  assert.equal(f.events.filter((e) => e === "ready").length, 1);
  assert.equal(f.events.filter((e) => e.startsWith("graph:root:reviewable:")).length, 1);
  assert.equal(f.requests.filter((r) => r.acceptance).length, 1);
  assert.equal(restarted.observeGraph("root").state, "reviewable");
});
test("failed whole-spec review leaves the assembled PR draft", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setTransform((candidate) => ({
    ...candidate,
    reviews: candidate.reviews.map((r) => ({
      ...r,
      passed: false,
      findings: ["Parent requirement absent"],
    })),
  }));
  await f.workflow.drive(f.last.runId);
  assert.equal(f.pulls[0].draft, true);
  assert.equal(f.workflow.observeGraph("root").state, "reconciliation");
  assert.equal(f.events.filter((e) => e === "ready").length, 0);
});
test("changed specification withdraws readiness even after implementation authorization is revoked", async (t) => {
  const f = await acceptanceReadyFixture(t);
  await f.workflow.drive(f.last.runId);
  f.issues[0].labels = ["needs-info"];
  f.issues[0].revision = "root-2";
  await f.make().recoverGraph("root");
  assert.equal(f.pulls[0].draft, true);
  assert.equal(f.workflow.observeGraph("root").finalization?.state, "stale");
  assert.equal(f.events.filter((e) => e === "withdraw").length, 1);
});

test("all specification parents close only after observed main delivery, recovering a lost closure", async (t) => {
  const f = integrationFixture(t, true);
  const nested = issue("nested", ["b"]);
  nested.number = 4;
  f.issues[0].childIds = ["a", "nested"];
  f.issues[2].parentIds = ["nested"];
  f.issues.push(nested);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const last = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(last);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  assert.equal(f.pulls[0].draft, false);
  await workflow.recoverGraph("root");
  assert.equal(f.issues[0].state, "open");
  assert.equal(nested.state, "open");
  const head = workflow.observeGraph("root").head;
  Object.assign(f.pulls[0], {
    state: "closed",
    mergedAt: "2026-09-16T00:00:00Z",
    mergeCommit: head,
  });
  await workflow.recoverGraph("root");
  assert.equal(f.issues[0].state, "open", "merge must be present in receiving main");
  // The controlled external maintainer advances the fixture main; no workflow merge API exists.
  f.maintainerMerge(head);
  f.setLoseClose();
  await f.make().recoverGraph("root");
  await f.make().recoverGraph("root");
  assert.equal(workflow.observeGraph("root").state, "delivered");
  for (const parent of [f.issues[0], nested]) {
    assert.equal(parent.state, "closed");
    assert.equal(f.events.filter((e) => e === `close:${parent.issueId}`).length, 1);
  }
});

test("invalid acceptance evidence is a failed attempt that explicit retry can replace", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setTransform((candidate) => ({
    ...candidate,
    reviews: candidate.reviews.map((r) => ({
      ...r,
      passed: false,
      findings: ["Missing parent behavior"],
    })),
  }));
  await f.workflow.drive(f.last.runId);
  assert.equal(f.workflow.observe(f.last.runId).status, "failed");
  assert.equal(f.workflow.observeGraph("root").finalization?.state, "failed");
  f.setTransform((candidate) => candidate);
  await f.workflow.retry(f.last.runId);
  await f.workflow.drive(f.last.runId);
  assert.equal(f.pulls[0].draft, false);
  assert.equal(f.workflow.observeGraph("root").state, "reviewable");
  assert.equal(f.workflow.observe(f.last.runId).execution?.attempt, 1);
});

test("source revision changing during sandbox acceptance cannot establish readiness", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setBeforeWorker(async (request) => {
    if (request.acceptance) {
      f.issues[0].revision = "root-edited";
      f.issues[0].body += "\nA newly required behavior.";
    }
  });
  await f.workflow.drive(f.last.runId);
  assert.equal(f.pulls[0].draft, true);
  assert.equal(f.workflow.observeGraph("root").finalization?.state, "stale");
  assert.equal(f.events.filter((e) => e === "ready").length, 0);
});

test("factory pause retains a completed graph candidate across restart and resume publishes it once", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  await workflow.drive(original.runId);
  f.setLosePush();
  await workflow.drive(original.runId);
  const candidate = workflow.observe(original.runId);
  assert.equal(candidate.status, "completed");
  assert.equal(candidate.graphPending, true);
  workflow.factoryPaused(true);
  await workflow.operate({ id: "factory-pause", runId: original.runId, action: "pause" });
  workflow = f.make();
  const events = [...f.events];
  const paused = await workflow.drive(original.runId);
  assert.equal(paused.status, "completed");
  assert.equal(paused.graphPending, true);
  assert.equal(paused.operatorPaused, true);
  assert.equal(workflow.factoryPaused(), true);
  await assert.rejects(workflow.recoverGraph("root"), /paused/);
  assert.deepEqual(f.events, events);
  assert.equal(f.requests.length, 2);
  await workflow.operate({
    id: "factory-resume",
    runId: original.runId,
    action: "resume",
    restoreOnly: true,
  });
  workflow.factoryPaused(false);
  await workflow.drive(original.runId);
  const delivered = workflow.observe(original.runId);
  assert.equal(delivered.graphPending, false);
  assert.deepEqual(delivered.candidate, candidate.candidate);
  assert.deepEqual(delivered.session, original.session);
  assert.deepEqual(delivered.resources, original.resources);
  assert.equal(delivered.execution?.consumedMs, candidate.execution?.consumedMs);
  assert.equal(delivered.phase, candidate.phase);
  assert.equal(f.requests.length, 2);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.events.filter((event) => event === "close:a").length, 1);
  assert.equal(workflow.admissions().length, 2);
});

test("factory pause after acceptance preserves evidence and prevents readiness until explicit resume", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setBeforeWorker(async (request) => {
    if (request.acceptance) f.workflow.factoryPaused(true);
  });
  await f.workflow.drive(f.last.runId);
  const paused = f.workflow.observe(f.last.runId);
  assert.ok(paused.acceptanceResult);
  assert.equal(f.pulls[0].draft, true);
  const originalInput = paused.acceptance;
  const restarted = f.make();
  await assert.rejects(restarted.recoverGraph("root"), /paused/);
  restarted.factoryPaused(false);
  await restarted.recoverGraph("root");
  assert.equal(f.pulls[0].draft, false);
  assert.deepEqual(restarted.observe(f.last.runId).acceptance, originalInput);
  assert.equal(f.requests.filter((r) => r.acceptance).length, 1);
});

test("edited approved parent brief after readiness prevents specification closure", async (t) => {
  const f = integrationFixture(t, true);
  const root = f.issues[0];
  root.body = "Please implement the greeting feature.";
  const brief = {
    issueId: root.issueId,
    contentRevision: root.contentRevision,
    ref: "https://github.com/owner/repo/issues/1#issuecomment-approved",
    content: "## Agent brief\nGreet the world.\n## Acceptance criteria\nGreeting works.",
  };
  const triage: TriageAdapter = {
    prepare: async (issue) => issue,
    apply: async () => {
      throw Error("unused");
    },
    reconcile: async () => undefined,
    approvedBriefs: async () => [structuredClone(brief)],
  };
  const workflow = f.make(triage);
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const last = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(last);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  await workflow.drive(last.runId);
  assert.equal(f.pulls[0].draft, false);
  assert.equal(workflow.observeGraph("root").finalization?.input.briefs[0].content, brief.content);
  const head = workflow.observeGraph("root").head;
  Object.assign(f.pulls[0], {
    state: "closed",
    mergedAt: "2026-09-16T00:00:00Z",
    mergeCommit: head,
  });
  f.maintainerMerge(head);
  brief.content += "\nNew required behavior.";
  await f.make(triage).recoverGraph("root");
  assert.equal(root.state, "open");
  assert.equal(workflow.observeGraph("root").finalization?.state, "stale");
});

test("interruption while preparing acceptance keeps the original Eve run pending", async (t) => {
  const f = integrationFixture(t, true);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const first = workflow.admissions()[0];
  await workflow.drive(first.runId);
  await workflow.drive(first.runId);
  const last = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(last);
  await workflow.drive(last.runId);
  f.failAcceptanceExport();
  await workflow.drive(last.runId);
  assert.equal(workflow.observe(last.runId).graphPending, true);
  assert.equal(workflow.observe(last.runId).acceptance, undefined);
  const restarted = f.make();
  await restarted.drive(last.runId);
  assert.ok(restarted.observe(last.runId).acceptance);
  await restarted.drive(last.runId);
  assert.equal(f.pulls[0].draft, false);
  assert.equal(f.events.filter((e) => e === "close:b").length, 1);
});

test("acceptance report cannot add unrelated automatic issue closure instructions", async (t) => {
  const f = await acceptanceReadyFixture(t);
  f.setTransform((candidate) => ({
    ...candidate,
    report: { title: "Whole graph", summary: "Closes #999", validation: "All checks pass." },
  }));
  await f.workflow.drive(f.last.runId);
  assert.equal(f.pulls[0].draft, true);
  assert.equal(f.workflow.observe(f.last.runId).status, "failed");
});

test("a fresh graph observation admits a new eligible child without replacing unchanged admitted work", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  f.issues[0].childIds.push("c", "human-owned");
  f.issues[0].revision = "root-membership-2";
  f.issues.push({ ...issue("c"), number: 4 });
  f.issues.push({ ...issue("human-owned"), number: 9, labels: ["ready-for-human"] });
  workflow = f.make();
  await workflow.reconcileGraph("root");
  assert.deepEqual(
    workflow
      .admissions()
      .map((r) => r.issue.issueId)
      .sort(),
    ["a", "c"],
  );
  assert.deepEqual(workflow.observe(original.runId).issue, original.issue);
  assert.deepEqual(workflow.observe(original.runId).session, original.session);
  await workflow.drive(original.runId);
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "closed");
  assert.equal(workflow.admissions().filter((r) => r.issue.issueId === "a").length, 1);
});

test("edited requirements during execution retain the candidate and need an exact new integration decision", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  f.setBeforeWorker(async () => {
    f.issues[1].body += "\nThe greeting must include a salutation.";
    f.issues[1].revision = "a-2";
    f.issues[1].contentRevision = "a-content-2";
  });
  await workflow.drive(original.runId);
  const retained = workflow.observe(original.runId);
  assert.ok(retained.candidate);
  assert.equal(f.pulls.length, 0);
  assert.ok(workflow.observeGraph("root").reconciliation?.holds[original.runId]);
  workflow = f.make();
  f.setBeforeWorker(async () => {});
  const observation = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", { revision: "stale", continueRunIds: [original.runId] });
  assert.equal(workflow.observe(original.runId).integration, undefined);
  const graph = await workflow.reconcileGraph("root", {
    revision: observation.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  assert.deepEqual(graph.reconciliation?.holds, {});
  const revised = workflow.observe(original.runId);
  assert.equal(revised.integration?.reevaluation?.issue.revision, "a-2");
  assert.equal(revised.integration?.candidate.commit, retained.candidate.commit);
  assert.deepEqual(revised.issue, original.issue);
  assert.deepEqual(revised.resources, original.resources);
  assert.deepEqual(revised.session, original.session);
  assert.equal(revised.execution?.consumedMs, 100);
  assert.equal(revised.graphPhaseHistory?.[0].candidate?.commit, retained.candidate.commit);
  await workflow.drive(original.runId);
  assert.equal(
    f.issues[1].state,
    "closed",
    JSON.stringify({ graph: workflow.observeGraph("root"), run: workflow.observe(original.runId) }),
  );
  assert.equal(f.requests.length, 2);
  assert.equal(workflow.admissions().filter((r) => r.issue.issueId === "a").length, 1);
});

test("a reopened delivered child keeps an explicit hold through unrelated progress and resumes only after re-evaluation", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  await workflow.drive(original.runId);
  await workflow.drive(original.runId);
  const delivered = workflow.observeGraph("root").deliveries.a;
  f.issues[1].state = "open";
  f.issues[1].stateReason = null;
  f.issues[1].revision = "a-reopened";
  f.issues[0].childIds.push("c");
  f.issues.push({ ...issue("c"), number: 4 });
  await workflow.reconcileGraph("root");
  const sibling = workflow.admissions().find((r) => r.issue.issueId === "c");
  assert.ok(sibling);
  assert.ok(sibling);
  await workflow.drive(sibling.runId);
  await workflow.drive(sibling.runId);
  assert.equal(f.issues[3].state, "closed");
  assert.equal(workflow.observeGraph("root").state, "reconciliation");
  assert.ok(workflow.observeGraph("root").reconciliation?.holds[original.runId]);
  const dependent = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(dependent);
  await workflow.drive(dependent.runId);
  assert.equal(workflow.observe(dependent.runId).status, "paused");
  workflow = f.make();
  await workflow.resume(original.runId);
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "open");
  const observed = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "closed", workflow.observeGraph("root").reason);
  assert.deepEqual(workflow.observeGraph("root").deliveryHistory?.[0], delivered);
  assert.deepEqual(workflow.observe(original.runId).session, original.session);
  assert.equal(
    f.requests.filter((r) => !r.integration && !r.acceptance && r.runId === original.runId).length,
    1,
  );
  assert.equal(f.events.filter((e) => e === "close:a").length, 2);
});

test("moving an admitted leaf cannot start a second implementation and original membership restoration requires a decision", async (t) => {
  const f = integrationFixture(t);
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  await workflow.drive(original.runId);
  f.issues[0].childIds = ["b"];
  f.issues[1].parentIds = ["other"];
  f.issues[1].revision = "a-moved";
  f.issues.push({ ...issue("other", ["a", "c"]), parentIds: [], number: 6 });
  f.issues.push({ ...issue("c"), parentIds: ["other"], number: 4 });
  await workflow.reconcileGraph("root");
  await workflow.admitGraph("other");
  await workflow.reconcileGraph("other");
  assert.equal(workflow.admissions().filter((r) => r.issue.issueId === "a").length, 1);
  const independent = workflow.admissions().find((r) => r.issue.issueId === "c");
  assert.ok(independent);
  await workflow.drive(independent.runId);
  assert.equal(f.requests.filter((r) => r.runId === independent.runId).length, 1);
  workflow = f.make();
  f.issues[0].childIds = ["a", "b"];
  f.issues[1].parentIds = ["root"];
  f.issues[1].revision = "a-restored";
  f.issues[3].childIds = ["c"];
  await workflow.resume(original.runId);
  await workflow.drive(original.runId);
  assert.equal(f.requests.filter((r) => r.runId === original.runId).length, 1);
  const observed = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "closed", workflow.observeGraph("root").reason);
  assert.deepEqual(workflow.observe(original.runId).session, original.session);
  assert.equal(workflow.admissions().filter((r) => r.issue.issueId === "a").length, 1);
});

test("new membership withdraws readiness durably and replaces acceptance without changing its original evidence", async (t) => {
  for (const failure of ["before", "after"] as const) {
    await t.test(failure, async (t) => {
      const f = await acceptanceReadyFixture(t);
      await f.workflow.drive(f.last.runId);
      const original = f.workflow.observeGraph("root").finalization;
      assert.ok(original);
      f.issues[0].childIds.push("c");
      f.issues[0].revision = "root-new-child";
      f.issues.push({ ...issue("c"), number: 4 });
      f.failWithdraw(failure);
      await f.workflow.reconcileGraph("root");
      assert.equal(f.workflow.observeGraph("root").finalization?.state, "stale");
      const workflow = f.make();
      await workflow.reconcileGraph("root");
      assert.equal(f.pulls[0].draft, true);
      assert.equal(f.events.filter((e) => e === "withdraw").length, 1);
      const preserved = workflow.observeGraph("root").finalizationHistory?.[0];
      assert.deepEqual(preserved?.input, original.input);
      assert.deepEqual(preserved?.evidence, original.evidence);
      const child = workflow.admissions().find((r) => r.issue.issueId === "c");
      assert.ok(child);
      assert.ok(child);
      await workflow.drive(child.runId);
      await workflow.drive(child.runId);
      const newInput = workflow.observeGraph("root").finalization?.input;
      assert.ok(newInput);
      assert.notEqual(newInput.id, original.input.id);
      assert.equal(newInput.members.length, 4);
      assert.equal(f.pulls[0].draft, true);
      await workflow.drive(child.runId);
      assert.equal(f.pulls[0].draft, false);
      assert.equal(f.requests.filter((r) => r.acceptance).length, 2);
      assert.equal(f.events.filter((e) => e === "ready").length, 2);
    });
  }
});

test("changed internal prerequisites require delivered code before retained work can be re-evaluated", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  await workflow.drive(original.runId);
  f.issues[1].dependencyIds = ["b"];
  f.issues[1].revision = "a-dependency-2";
  f.issues[2].dependencyIds = [];
  f.issues[2].revision = "b-independent";
  let observed = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  assert.ok(workflow.observeGraph("root").reconciliation?.holds[original.runId]);
  const prerequisite = workflow.admissions().find((r) => r.issue.issueId === "b");
  assert.ok(prerequisite);
  assert.ok(prerequisite);
  await workflow.drive(prerequisite.runId);
  await workflow.drive(prerequisite.runId);
  observed = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  f.setBeforeWorker(async (request) => {
    assert.equal(f.git("show", `${request.integration?.expectedHead}:part-b`), "b");
  });
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "closed", workflow.observeGraph("root").reason);
  assert.equal(workflow.observe(original.runId).issue.dependencyIds?.length, 0);
  assert.deepEqual(
    workflow.observe(original.runId).integration?.reevaluation?.issue.dependencyIds,
    ["b"],
  );
});

test("no-change and unusual closure remain explicit decisions without manufactured delivery", async (t) => {
  for (const outcome of ["no-change", "not-planned"] as const) {
    await t.test(outcome, async (t) => {
      const f = integrationFixture(t);
      let workflow = f.make();
      await workflow.admitGraph("root");
      const run = workflow.admissions()[0];
      if (outcome === "no-change") {
        f.setNoChange();
        await workflow.drive(run.runId);
      } else {
        f.issues[1].state = "closed";
        f.issues[1].stateReason = "not_planned";
        f.issues[1].revision = "a-unusual-closure";
        await workflow.reconcileGraph("root");
      }
      workflow = f.make();
      const observation = await workflow.reconcileGraph("root");
      assert.ok(observation.reconciliation?.holds[run.runId]);
      await workflow.reconcileGraph("root", {
        revision: observation.reconciliation?.revision ?? "",
        continueRunIds: [run.runId],
      });
      assert.ok(workflow.observeGraph("root").reconciliation?.holds[run.runId]);
      assert.equal(workflow.observeGraph("root").integrations.length, 0);
      assert.equal(f.pulls.length, 0);
      assert.deepEqual(workflow.observe(run.runId).session, run.session);
    });
  }
});

test("a reopened issue on an already merged graph preserves delivery and refuses reuse of the closed PR", async (t) => {
  const f = await acceptanceReadyFixture(t);
  await f.workflow.drive(f.last.runId);
  const graph = f.workflow.observeGraph("root");
  f.pulls[0].state = "closed";
  f.pulls[0].mergedAt = "2026-09-15T02:00:00Z";
  f.pulls[0].mergeCommit = graph.head;
  f.maintainerMerge(graph.head);
  await f.workflow.recoverGraph("root");
  const before = f.workflow.observe(f.last.runId);
  f.issues[2].state = "open";
  f.issues[2].stateReason = null;
  f.issues[2].revision = "b-reopened-after-merge";
  const observation = await f.workflow.reconcileGraph("root");
  await f.workflow.reconcileGraph("root", {
    revision: observation.reconciliation?.revision ?? "",
    continueRunIds: [f.last.runId],
  });
  assert.equal(f.workflow.observe(f.last.runId).phase, before.phase);
  assert.ok(f.workflow.observeGraph("root").reconciliation?.holds[f.last.runId]);
  assert.equal(f.requests.length, 5);
  assert.equal(f.pulls.length, 1);
  assert.equal(f.issues[2].state, "open");
});

test("an edited unstarted revision receives normal admission only after an explicit decision and keeps its old snapshot", async (t) => {
  const f = integrationFixture(t);
  const workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  f.issues[1].revision = "a-new-before-start";
  f.issues[1].body += "\nAdd the revised greeting.";
  f.issues[1].contentRevision = "a-new-body";
  await workflow.drive(original.runId);
  assert.equal(f.requests.length, 0);
  const observed = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  const old = workflow.observe(original.runId);
  assert.ok(old.supersededBy);
  assert.deepEqual(old.resources, original.resources);
  assert.deepEqual(old.session, original.session);
  assert.deepEqual(old.issue, original.issue);
  const current = workflow.observe(old.supersededBy);
  assert.equal(current.issue.revision, "a-new-before-start");
  assert.notEqual(current.resources?.id, original.resources?.id);
  await assert.rejects(workflow.retry(original.runId), /superseded/);
  await workflow.drive(current.runId);
  await workflow.drive(current.runId);
  assert.equal(f.issues[1].state, "closed", workflow.observeGraph("root").reason);
  assert.equal(f.requests.filter((r) => !r.integration).length, 1);
});

test("an observed descendant head requires explicit adoption and fresh acceptance of its actual tree", async (t) => {
  const f = await acceptanceReadyFixture(t);
  await f.workflow.drive(f.last.runId);
  const graph = f.workflow.observeGraph("root");
  assert.ok(graph.finalization);
  const accepted = graph.finalization;
  const head = f.maintainerAdvance(graph.branch, graph.head);
  let workflow = f.make();
  const observed = await workflow.reconcileGraph("root");
  assert.equal(f.pulls[0].draft, true);
  assert.equal(observed.head, graph.head);
  assert.equal(f.requests.filter((r) => r.acceptance).length, 1);
  await workflow.reconcileGraph("root", {
    revision: observed.reconciliation?.revision ?? "",
    continueRunIds: [],
  });
  const next = workflow.observeGraph("root").finalization;
  assert.ok(next);
  assert.equal(next.input.head, head);
  assert.notEqual(next.input.tree, accepted.input.tree);
  assert.deepEqual(
    workflow.observeGraph("root").finalizationHistory?.[0].evidence,
    accepted.evidence,
  );
  workflow = f.make();
  await workflow.drive(next.runId);
  assert.equal(f.pulls[0].draft, false, workflow.observeGraph("root").reason);
  assert.equal(f.requests.filter((r) => r.acceptance).length, 2);
  assert.equal(
    workflow.observe(next.runId).graphPhaseHistory?.at(-1)?.acceptance?.id,
    accepted.input.id,
  );
});

test("changed external delivery evidence gets a fresh decision binding and ambiguity cannot authorize continuation", async (t) => {
  const f = integrationFixture(t);
  f.issues[1].dependencyIds = ["external"];
  f.issues.push({
    ...issue("external"),
    parentIds: [],
    number: 8,
    state: "closed",
    stateReason: "completed",
  });
  f.externalPulls.push({
    id: "native-closing-pr",
    url: "https://github.com/owner/repo/pull/8",
    repository: "owner/repo",
    revision: "pr-v1",
    state: "MERGED",
    baseRef: "main",
    mergeCommit: f.base,
    mergedAt: "2026-09-15T00:00:00Z",
  });
  let workflow = f.make();
  await workflow.admitGraph("root");
  const original = workflow.admissions()[0];
  assert.equal(original.issue.externalDeliveries?.[0].revision, "pr-v1");
  await workflow.drive(original.runId);
  const first = await workflow.reconcileGraph("root");
  f.externalPulls[0].revision = "pr-v2";
  await workflow.drive(original.runId);
  const observation = await workflow.reconcileGraph("root");
  assert.notEqual(observation.reconciliation?.revision, first.reconciliation?.revision);
  assert.ok(observation.reconciliation?.holds[original.runId]);
  f.externalPulls.push({ ...f.externalPulls[0], id: "ambiguous-second-pr" });
  workflow = f.make();
  const blocked = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: blocked.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  assert.equal(f.requests.length, 1);
  assert.ok(workflow.observeGraph("root").reconciliation?.holds[original.runId]);
  f.externalPulls.pop();
  const current = await workflow.reconcileGraph("root");
  await workflow.reconcileGraph("root", {
    revision: current.reconciliation?.revision ?? "",
    continueRunIds: [original.runId],
  });
  const phase = workflow.observe(original.runId).integration;
  assert.equal(phase?.reevaluation?.issue.externalDeliveries?.[0].revision, "pr-v2");
  assert.equal(workflow.observe(original.runId).issue.externalDeliveries?.[0].revision, "pr-v1");
  await workflow.drive(original.runId);
  assert.equal(f.issues[1].state, "closed", workflow.observeGraph("root").reason);
});
