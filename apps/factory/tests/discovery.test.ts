import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { DiscoveredIssue, DiscoveryAdapter } from "../src/discovery.ts";
import { IssueWorkflow, type IssueWorkflowOptions } from "../src/issue-workflow.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

function fixture(t: { after(fn: () => void): void }) {
  const root = mkdtempSync(join(tmpdir(), "factory-discovery-"));
  const store = new SqliteWorkflowStore(join(root, "state.sqlite"));
  t.after(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });
  let reads = 0;
  const issue: DiscoveredIssue = {
    issueId: "I_42",
    revision: "revision-1",
    contentRevision: "body-1",
    repository: "carere/zaidan",
    number: 42,
    title: "Fix the button",
    body: "The approved requirements",
    state: "open" as const,
    stateReason: null,
    labels: ["needs-triage"],
    parentIds: [],
    childIds: [],
    dependencyIds: [],
    sourceRef: "https://github.com/carere/zaidan/issues/42",
    updatedAt: "2026-09-15T12:00:00Z",
  };
  const discovery: DiscoveryAdapter = {
    async read() {
      reads++;
      return { repository: "carere/zaidan", revision: "scan-1", issues: [issue] };
    },
    async approvedBriefs() {
      return [];
    },
  };
  const options: IssueWorkflowOptions = {
    store,
    discovery,
    engine: {
      async find() {
        return undefined;
      },
      async start() {
        return "eve-1";
      },
      async wake() {},
    },
    worker: {
      async reconcile() {
        return undefined;
      },
      async dispatch() {
        throw new Error("Scan must not dispatch");
      },
      async resume() {
        throw new Error("Scan must not resume");
      },
    },
    notifications: {
      async reconcile() {
        return undefined;
      },
      async send() {
        return "notice";
      },
    },
  };
  const workflow = new IssueWorkflow(options);
  return { workflow, issue, discovery, options, reads: () => reads };
}

test("overlapping read-only scans propose triage once and suppress an already admitted revision", async (t) => {
  const f = fixture(t);
  const [a, b] = await Promise.all([f.workflow.scan(), f.workflow.scan()]);
  assert.equal(f.reads(), 1);
  assert.deepEqual(a, b);
  assert.equal(a.decisions[0].route, "triage");
  assert.equal(f.workflow.admissions().length, 0);
  const admitted = await f.workflow.admit({
    ...f.issue,
    startingRevision: "graph-head",
    reviewBase: "main-head",
  });
  const next = await f.workflow.scan();
  assert.equal(next.decisions[0].route, "already-admitted");
  assert.equal(next.decisions[0].runId, admitted.runId);
});

test("canonical labels route approved implementation briefs and expose conflicts without guessing", async (t) => {
  const f = fixture(t);
  f.issue.body =
    "## What to build\nFix button keyboard focus.\n## Acceptance criteria\n- Enter activates the button.";
  const cases = [
    { labels: ["ready-for-agent"], route: "implementation" },
    { labels: ["ready-for-human"], route: "ignored" },
    { labels: ["needs-info"], route: "ignored" },
    { labels: ["wontfix"], route: "ignored" },
    { labels: ["ready-for-agent", "needs-triage"], route: "conflict" },
    { labels: ["ready-for-agent", "needs-info"], route: "conflict" },
    { labels: ["enhancement", "needs-triage"], route: "triage" },
  ];
  for (const { labels, route } of cases) {
    f.issue.labels = labels;
    assert.equal((await f.workflow.scan()).decisions[0].route, route);
  }
  f.issue.labels = ["ready-for-agent"];
  f.issue.body = "   ";
  assert.equal((await f.workflow.scan()).decisions[0].route, "blocked");
  f.issue.body = "<!-- ## What to build\nPlaceholder\n## Acceptance criteria\nTODO -->";
  assert.equal((await f.workflow.scan()).decisions[0].route, "blocked");
});

test("parents coordinate approved descendants, while parent triage ignores implementation prerequisites", async (t) => {
  const f = fixture(t);
  const body = "## What to build\nFix focus.\n## Acceptance criteria\nKeyboard works.";
  const parent: DiscoveredIssue = {
    ...f.issue,
    issueId: "I_parent",
    number: 40,
    body,
    childIds: [f.issue.issueId],
    dependencyIds: ["I_unreadable"],
    labels: ["needs-triage"],
  };
  f.issue.parentIds = [parent.issueId];
  f.issue.labels = ["ready-for-agent"];
  f.issue.body = body;
  const issues = [parent, f.issue];
  f.discovery.read = async () => ({ repository: "carere/zaidan", revision: "scan", issues });
  let result = await f.workflow.scan();
  assert.deepEqual(
    result.decisions.map((decision) => decision.route),
    ["triage", "blocked"],
  );
  parent.labels = ["ready-for-agent"];
  result = await f.workflow.scan();
  assert.deepEqual(
    result.decisions.map((decision) => decision.route),
    ["coordinator", "implementation"],
  );
  parent.body = "";
  assert.equal((await f.workflow.scan()).decisions[1].route, "blocked");
  parent.body = body;
  parent.labels = ["ready-for-agent", "needs-info"];
  assert.equal((await f.workflow.scan()).decisions[1].route, "blocked");
  parent.labels = ["ready-for-agent"];
  parent.parentIds = [f.issue.issueId];
  assert.equal((await f.workflow.scan()).decisions[1].route, "blocked");
});

test("scan reconciles lost worker receipts before reporting an edited issue, without dispatching", async (t) => {
  const f = fixture(t);
  const run = await f.workflow.admit({
    ...f.issue,
    startingRevision: "graph-head",
    reviewBase: "main-head",
  });
  await f.workflow.drive(run.runId);
  f.issue.revision = "revision-2";
  assert.equal((await f.workflow.scan()).decisions[0].route, "blocked");
  f.options.worker.reconcile = async () => ({
    type: "completed" as const,
    candidate: { commit: "candidate-sha" },
  });
  const result = await f.workflow.scan();
  assert.equal(f.workflow.observe(run.runId).status, "completed");
  assert.equal(result.decisions[0].route, "triage");
  f.options.worker.reconcile = async () => {
    throw new Error("receipt unavailable");
  };
  const second = await f.workflow.admit({
    ...f.issue,
    startingRevision: "graph-head",
    reviewBase: "main-head",
  });
  await f.workflow.drive(second.runId);
  await assert.rejects(f.workflow.scan(), /receipt unavailable/);
  f.options.worker.reconcile = async () => undefined;
  assert.equal((await f.workflow.scan()).decisions[0].route, "already-admitted");
});

test("external approved briefs are revision-bound and a restarted scan reuses durable admissions", async (t) => {
  const f = fixture(t);
  f.issue.labels = ["ready-for-agent"];
  f.issue.body = "See the agent brief";
  const brief = {
    issueId: f.issue.issueId,
    contentRevision: "old",
    ref: "github-comment:123",
    content: "Approved AGENT-BRIEF.md contents",
  };
  f.discovery.approvedBriefs = async () => [brief];
  assert.equal((await f.workflow.scan()).decisions[0].route, "blocked");
  brief.contentRevision = f.issue.contentRevision;
  const proposal = (await f.workflow.scan()).decisions[0];
  assert.equal(proposal.route, "implementation");
  assert.equal(proposal.brief?.ref, "github-comment:123");
  const run = await f.workflow.admit({ ...f.issue, startingRevision: "sha", reviewBase: "base" });
  const restarted = new IssueWorkflow(f.options);
  assert.equal((await restarted.scan()).decisions[0].runId, run.runId);
});

test("a controlled worker receives the admitted brief and ancestor scope at explicit Git revisions", async (t) => {
  const f = fixture(t);
  const body =
    "## What to build\nImplement keyboard support.\n## Acceptance criteria\nEnter activates.";
  f.issue.body = body;
  f.issue.labels = ["ready-for-agent"];
  f.issue.parentIds = ["I_parent"];
  const parent = { ...f.issue, issueId: "I_parent", parentIds: [], childIds: [f.issue.issueId] };
  f.discovery.read = async () => ({
    repository: "carere/zaidan",
    revision: "graph",
    issues: [parent, f.issue],
  });
  const proposal = (await f.workflow.scan()).decisions[1];
  assert.ok(proposal.admission);
  const admitted = await f.workflow.admit({
    ...proposal.admission,
    startingRevision: "verified-graph-sha",
    reviewBase: "review-base-sha",
  });
  parent.body = "Changed after admission";
  f.issue.body = "Changed child after admission";
  f.options.worker.dispatch = async (request) => {
    assert.equal(request.issue.route, "implementation");
    assert.equal(request.issue.startingRevision, "verified-graph-sha");
    assert.equal(request.issue.sourceContent?.body, body);
    assert.equal(request.issue.sourceContent?.brief, body);
    assert.deepEqual(request.issue.sourceContent?.specifications, [
      { issueId: "I_parent", body, brief: body },
    ]);
    return { type: "completed", candidate: { commit: "candidate" } };
  };
  assert.equal((await f.workflow.drive(admitted.runId)).status, "completed");
});
