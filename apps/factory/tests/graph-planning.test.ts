import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  type ApprovedBrief,
  type DiscoveredIssue,
  IssueWorkflow,
  SqliteWorkflowStore,
} from "../src/index.ts";

function fixture(t: { after(fn: () => void): void }) {
  const path = mkdtempSync(join(tmpdir(), "factory-graph-"));
  const store = new SqliteWorkflowStore(join(path, "state.sqlite"));
  t.after(() => {
    store.close();
    rmSync(path, { recursive: true, force: true });
  });
  const issues: DiscoveredIssue[] = [];
  let reads = 0;
  let failScan = false;
  let beforeRead = async () => {};
  let beforeVerify = async () => {};
  const briefs: ApprovedBrief[] = [];
  const workflow = new IssueWorkflow({
    store,
    discovery: {
      async approvedBriefs() {
        return structuredClone(briefs);
      },
      async read() {
        reads++;
        await beforeRead();
        if (failScan) throw new Error("Snapshot unavailable");
        return {
          repository: "carere/zaidan",
          revision: `scan-${reads}`,
          issues: structuredClone(issues),
        };
      },
    },
    externalDelivery: {
      async verify() {
        await beforeVerify();
        return { status: "waiting", problem: "Awaiting delivery" };
      },
    },
    engine: {
      async find() {
        return undefined;
      },
      async start() {
        throw new Error("Planning must not start work");
      },
      async wake() {
        throw new Error("Planning must not wake work");
      },
    },
    worker: {
      async reconcile() {
        return undefined;
      },
      async dispatch() {
        throw new Error("Planning must not dispatch work");
      },
      async resume() {
        throw new Error("Planning must not resume work");
      },
    },
    notifications: {
      async reconcile() {
        return undefined;
      },
      async send() {
        throw new Error("Planning must not send notifications");
      },
    },
  });
  function issue(id: string, parentId?: string, dependencies: string[] = []) {
    const item: DiscoveredIssue = {
      issueId: id,
      revision: `${id}-v1`,
      contentRevision: `${id}-body1`,
      repository: "carere/zaidan",
      number: issues.length + 1,
      title: id,
      body: "## What to build\nImplement this scope.\n## Acceptance criteria\nThe scope works.",
      state: "open",
      stateReason: null,
      labels: ["ready-for-agent"],
      parentIds: parentId ? [parentId] : [],
      childIds: [],
      dependencyIds: dependencies,
      sourceRef: `https://github.com/carere/zaidan/issues/${issues.length + 1}`,
      updatedAt: "2026-09-15T12:00:00Z",
    };
    issues.push(item);
    if (parentId) issues.find((parent) => parent.issueId === parentId)?.childIds.push(id);
    return item;
  }
  return {
    workflow,
    issue,
    issues,
    briefs,
    onRead(fn: () => Promise<void>) {
      beforeRead = fn;
    },
    onVerify(fn: () => Promise<void>) {
      beforeVerify = fn;
    },
    reads: () => reads,
    failScan: () => {
      failScan = true;
    },
  };
}

test("nested specifications coordinate one graph and expose independent leaves at its verified head", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("nested", "root");
  f.issue("a", "nested");
  f.issue("b", "nested");
  f.issue("c", "root");
  await f.workflow.scan();
  const pending = f.workflow.planGraph("root");
  assert.deepEqual(pending.specificationIds, ["nested", "root"]);
  assert.deepEqual(
    pending.leaves.map((leaf) => leaf.issue.issueId),
    ["a", "b", "c"],
  );
  assert.equal(pending.eligibleLeaves.length, 0);
  const plan = f.workflow.planGraph("root", {
    graphId: "root",
    graphRevision: pending.graphRevision,
    head: "graph-start",
    reviewBase: "main-base",
    integrations: [],
    containedCommits: [],
  });
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["a", "b", "c"],
  );
  for (const leaf of plan.eligibleLeaves) {
    assert.equal(leaf.startingRevision, "graph-start");
    assert.equal(leaf.admission?.startingRevision, "graph-start");
    assert.equal(leaf.admission?.reviewBase, "main-base");
  }
  assert.equal(f.workflow.admissions().length, 0);
  assert.equal(f.reads(), 1);
});

test("specification prerequisites expand and inherit; only recorded commits at the current head unlock dependents immediately", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("foundation", "root");
  const a = f.issue("a", "foundation");
  a.state = "closed";
  a.stateReason = "completed";
  f.issue("b", "foundation");
  f.issue("feature", "root", ["foundation"]);
  f.issue("c", "feature");
  f.issue("d", "feature");
  await f.workflow.scan();
  const initial = f.workflow.planGraph("root");
  const evidence = {
    graphId: "root",
    graphRevision: initial.graphRevision,
    head: "head-0",
    reviewBase: "main",
    integrations: [] as { issueId: string; issueRevision: string; commit: string }[],
    containedCommits: [] as string[],
  };
  let plan = f.workflow.planGraph("root", evidence);
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["b"],
  );
  assert.deepEqual(plan.leaves.find((leaf) => leaf.issue.issueId === "c")?.prerequisiteIds, [
    "a",
    "b",
  ]);
  evidence.integrations.push({ issueId: "a", issueRevision: "a-v1", commit: "commit-a" });
  evidence.containedCommits.push("commit-a");
  evidence.head = "head-a";
  plan = f.workflow.planGraph("root", evidence);
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["b"],
  );
  evidence.integrations.push({ issueId: "b", issueRevision: "b-v1", commit: "commit-b" });
  // A recorded integration whose commit is absent from the selected head is insufficient.
  assert.deepEqual(
    f.workflow.planGraph("root", evidence).eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["b"],
  );
  evidence.containedCommits.push("commit-b");
  evidence.head = "head-ab";
  plan = f.workflow.planGraph("root", evidence);
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["c", "d"],
  );
  assert.equal(plan.leaves.find((leaf) => leaf.issue.issueId === "a")?.status, "integrated");
  assert.equal(plan.eligibleLeaves[0].admission?.startingRevision, "head-ab");
  assert.equal(f.reads(), 1);
});

test("expanded dependency cycles pause affected descendants and their dependents while independent work remains eligible", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("left", "root", ["right"]);
  f.issue("a", "left");
  f.issue("right", "root", ["left"]);
  f.issue("b", "right");
  f.issue("dependent", "root", ["a"]);
  f.issue("independent", "root");
  await f.workflow.scan();
  const plan = f.workflow.planGraph("root", {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head-ab",
    reviewBase: "main",
    containedCommits: ["commit-a", "commit-b"],
    integrations: [
      { issueId: "a", issueRevision: "a-v1", commit: "commit-a" },
      { issueId: "b", issueRevision: "b-v1", commit: "commit-b" },
    ],
  });
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["independent"],
  );
  for (const id of ["a", "b", "dependent"]) {
    const leaf = plan.leaves.find((item) => item.issue.issueId === id);
    assert.equal(leaf?.status, "blocked");
    assert.match(leaf?.problems.join(" ") ?? "", /cycle/i);
  }
});

test("unreadable prerequisites and ambiguous native membership pause affected work instead of satisfying it", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("bad-spec", "root", ["missing"]);
  f.issue("a", "bad-spec");
  f.issue("b", "root", ["bad-spec"]);
  f.issue("c", "root");
  await f.workflow.scan();
  const evidence = () => ({
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head",
    reviewBase: "main",
    integrations: [],
    containedCommits: [],
  });
  let plan = f.workflow.planGraph("root", evidence());
  assert.deepEqual(
    plan.eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["c"],
  );
  assert.equal(plan.leaves.find((leaf) => leaf.issue.issueId === "a")?.status, "blocked");
  assert.match(
    plan.leaves.find((leaf) => leaf.issue.issueId === "b")?.problems.join(" ") ?? "",
    /unreadable/i,
  );
  const orphan = f.issue("orphan", "root");
  orphan.parentIds = ["bad-spec", "root"];
  await f.workflow.scan();
  plan = f.workflow.planGraph("root", evidence());
  assert.equal(plan.leaves.find((leaf) => leaf.issue.issueId === "orphan")?.status, "blocked");
  assert.match(plan.problems.join(" "), /membership|parent/i);
});

test("external prerequisites remain explicit delivery waits even when closed", async (t) => {
  const f = fixture(t);
  f.issue("root", undefined, ["external"]);
  f.issue("a", "root");
  const external = f.issue("external");
  external.state = "closed";
  external.repository = "another/project";
  await f.workflow.scan();
  const plan = f.workflow.planGraph("root", {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head",
    reviewBase: "main",
    integrations: [],
    containedCommits: [],
  });
  assert.equal(plan.eligibleLeaves.length, 0);
  assert.deepEqual(plan.leaves[0].externalPrerequisiteIds, ["external"]);
  assert.equal(plan.leaves[0].status, "waiting-external");
});

test("dependent starts require the whole prerequisite chain, exact source revisions, and unambiguous current-graph evidence", async (t) => {
  const f = fixture(t);
  f.issue("root");
  const a = f.issue("a", "root");
  f.issue("b", "root", ["a"]);
  f.issue("c", "root", ["b"]);
  await f.workflow.scan();
  const evidence = {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head-b",
    reviewBase: "main",
    containedCommits: ["commit-b", "commit-a"],
    integrations: [{ issueId: "b", issueRevision: "b-v1", commit: "commit-b" }],
  };
  assert.equal(
    f.workflow.planGraph("root", evidence).leaves.find((leaf) => leaf.issue.issueId === "c")
      ?.status,
    "waiting-integration",
  );
  evidence.integrations.push({ issueId: "a", issueRevision: "a-old", commit: "commit-a" });
  assert.equal(
    f.workflow.planGraph("root", evidence).leaves.find((leaf) => leaf.issue.issueId === "c")
      ?.status,
    "waiting-integration",
  );
  evidence.integrations[1].issueRevision = "a-v1";
  assert.deepEqual(
    f.workflow.planGraph("root", evidence).eligibleLeaves.map((leaf) => leaf.issue.issueId),
    ["c"],
  );
  evidence.graphId = "other-graph";
  assert.equal(f.workflow.planGraph("root", evidence).eligibleLeaves.length, 0);
  evidence.graphId = "root";
  evidence.integrations.push({
    issueId: "a",
    issueRevision: "a-v1",
    commit: "contradictory-commit",
  });
  assert.equal(
    f.workflow.planGraph("root", evidence).leaves.find((leaf) => leaf.issue.issueId === "c")
      ?.status,
    "blocked",
  );
  evidence.integrations.pop();
  a.contentRevision = "a-body2";
  a.revision = "a-v2";
  await f.workflow.scan();
  assert.equal(f.workflow.planGraph("root", evidence).eligibleLeaves.length, 0);
});

test("plans retain captured source and refuse stale planning after a failed refresh", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("a", "root");
  assert.throws(() => f.workflow.planGraph("root"), /complete discovery scan/i);
  const scan = await f.workflow.scan();
  scan.snapshot.issues[1].dependencyIds.push("not-captured");
  const first = f.workflow.planGraph("root");
  first.leaves[0].issue.dependencyIds.push("also-not-captured");
  const next = f.workflow.planGraph("root");
  assert.equal(next.graphRevision, first.graphRevision);
  assert.deepEqual(next.leaves[0].issue.dependencyIds, []);
  f.failScan();
  await assert.rejects(f.workflow.scan(), /unavailable/);
  assert.throws(() => f.workflow.planGraph("root"), /complete discovery scan/i);
});

test("an internal receipt cannot hide an unresolved external prerequisite of its dependent", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("a", "root", ["external"]);
  f.issue("b", "root", ["a"]);
  const external = f.issue("external");
  external.state = "closed";
  await f.workflow.scan();
  const plan = f.workflow.planGraph("root", {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head-a",
    reviewBase: "main",
    containedCommits: ["commit-a"],
    integrations: [{ issueId: "a", issueRevision: "a-v1", commit: "commit-a" }],
  });
  assert.equal(plan.eligibleLeaves.length, 0);
  assert.deepEqual(
    plan.leaves.find((leaf) => leaf.issue.issueId === "b")?.externalPrerequisiteIds,
    ["external"],
  );
});

test("a missing side of native membership cannot turn a specification into duplicate implementation", async (t) => {
  const f = fixture(t);
  const root = f.issue("root");
  f.issue("a", "root");
  root.childIds = [];
  await f.workflow.scan();
  const plan = f.workflow.planGraph("root", {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head",
    reviewBase: "main",
    integrations: [],
    containedCommits: [],
  });
  assert.deepEqual(plan.specificationIds, ["root"]);
  assert.deepEqual(
    plan.leaves.map((leaf) => leaf.issue.issueId),
    ["a"],
  );
  assert.equal(plan.eligibleLeaves.length, 0);
  assert.match(plan.problems.join(" "), /membership/i);
});

test("graph verification owns its source while a concurrent scan clears the planning cache", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("a", "root");
  await f.workflow.scan();
  const observed = await f.workflow.graphDiscovery();
  const state = {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head",
    reviewBase: "base",
    integrations: [],
    containedCommits: [],
  };
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  let first = true;
  f.onRead(async () => {
    if (first) {
      first = false;
      entered.resolve();
      await release.promise;
    }
  });
  const other = f.workflow.scan();
  await entered.promise;
  try {
    const result = await f.workflow.verifyGraph("root", state, observed);
    assert.deepEqual(
      result.eligibleLeaves.map((l) => l.issue.issueId),
      ["a"],
    );
  } finally {
    release.resolve();
    await other;
  }
});

test("external verification tolerates unchanged overlapping scans and unrelated issue changes", async (t) => {
  const f = fixture(t);
  f.issue("root");
  f.issue("a", "root", ["external"]);
  f.issue("external");
  const unrelated = f.issue("unrelated");
  await f.workflow.scan();
  const state = {
    graphId: "root",
    graphRevision: f.workflow.planGraph("root").graphRevision,
    head: "head",
    reviewBase: "base",
    integrations: [],
    containedCommits: [],
  };
  f.onVerify(async () => {
    unrelated.revision = "changed";
    await f.workflow.scan();
  });
  const result = await f.workflow.verifyGraph("root", state);
  assert.equal(result.leaves[0].status, "waiting-external");
});

test("external verification refuses changes to members, authorization briefs, membership or prerequisite sources", async (t) => {
  for (const change of ["member", "brief", "membership", "external", "duplicate"]) {
    const f = fixture(t);
    const root = f.issue("root");
    const member = f.issue("a", "root", ["external"]);
    const external = f.issue("external");
    f.briefs.push({
      issueId: "a",
      contentRevision: member.contentRevision,
      ref: "approved",
      content: "Original approval",
    });
    await f.workflow.scan();
    const state = {
      graphId: "root",
      graphRevision: f.workflow.planGraph("root").graphRevision,
      head: "head",
      reviewBase: "base",
      integrations: [],
      containedCommits: [],
    };
    f.onVerify(async () => {
      if (change === "member") member.labels = ["ready-for-human"];
      if (change === "brief") f.briefs[0].content = "Changed approval";
      if (change === "membership") root.childIds = [];
      if (change === "external") external.revision = "changed";
      if (change === "duplicate") f.issues.push(structuredClone(external));
    });
    await assert.rejects(
      f.workflow.verifyGraph("root", state),
      /Discovery changed during delivery verification/,
      change,
    );
  }
});
