import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  createExternalDelivery,
  type DeliverySource,
  type DiscoveredIssue,
  IssueWorkflow,
  SqliteWorkflowStore,
} from "../src/index.ts";

function fixture(t: { after(fn: () => void): void }) {
  const path = mkdtempSync(join(tmpdir(), "factory-delivery-"));
  const repository = join(path, "trusted.git");
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.test",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.test",
  };
  execFileSync("git", ["init", "--bare", repository], { env, stdio: "pipe" });
  const git = (args: string[], input?: string) =>
    execFileSync("git", ["--git-dir", repository, ...args], {
      env,
      input,
      encoding: "utf8",
    }).trim();
  const commit = (text: string, parents: string[] = []) => {
    const blob = git(["hash-object", "-w", "--stdin"], text);
    const tree = git(["mktree"], `100644 blob ${blob}\tfeature.txt\n`);
    return git(["commit-tree", tree, ...parents.flatMap((parent) => ["-p", parent])], text);
  };
  const base = commit("Before feature");
  const implementation = commit("Delivered feature", [base]);
  const squash = commit("Delivered feature", [base]);
  // Different metadata ensures squash does not share the original implementation identity.
  const delivered = git(
    ["commit-tree", git(["rev-parse", `${squash}^{tree}`]), "-p", base],
    "Squash delivery",
  );
  const store = new SqliteWorkflowStore(join(path, "state.sqlite"));
  t.after(() => {
    store.close();
    rmSync(path, { recursive: true, force: true });
  });
  const issue = (id: string, number: number): DiscoveredIssue => ({
    issueId: id,
    revision: `${id}-v1`,
    contentRevision: `${id}-body1`,
    repository: "carere/zaidan",
    number,
    title: id,
    body: "## What to build\nDeliver a feature.\n## Acceptance criteria\nFeature works.",
    state: "open",
    stateReason: null,
    labels: ["ready-for-agent"],
    parentIds: [],
    childIds: [],
    dependencyIds: [],
    sourceRef: `https://github.com/carere/zaidan/issues/${number}`,
    updatedAt: "2026-09-15T12:00:00Z",
  });
  const dependent = issue("dependent", 1);
  dependent.dependencyIds = ["external"];
  const external = issue("external", 2);
  external.state = "closed";
  external.stateReason = "completed";
  let allowWork = false;
  let source: DeliverySource | Error = { issue: structuredClone(external), pullRequests: [] };
  const workflow = new IssueWorkflow({
    store,
    discovery: {
      async read() {
        return { repository: "carere/zaidan", revision: "scan-1", issues: [dependent, external] };
      },
    },
    externalDelivery: createExternalDelivery({
      trustedGitDirectory: repository,
      github: {
        async read() {
          if (source instanceof Error) throw source;
          return structuredClone(source);
        },
      },
    }),
    engine: {
      async find() {
        return undefined;
      },
      async start() {
        if (allowWork) return "fixture-eve-run";
        throw new Error("Read-only planning started work");
      },
      async wake() {
        throw new Error("Read-only planning woke work");
      },
    },
    worker: {
      async reconcile() {
        return undefined;
      },
      async dispatch(request) {
        if (allowWork)
          return {
            type: "completed",
            candidate: {
              commit: request.issue.startingRevision,
              feature: git(["show", `${request.issue.startingRevision}:feature.txt`]),
            },
          };
        throw new Error("Read-only planning dispatched work");
      },
      async resume() {
        throw new Error("Read-only planning resumed work");
      },
    },
    notifications: {
      async reconcile() {
        return undefined;
      },
      async send() {
        throw new Error("Read-only planning notified");
      },
    },
  });
  const integration = () => ({
    graphId: dependent.issueId,
    graphRevision: workflow.planGraph(dependent.issueId).graphRevision,
    head: base,
    reviewBase: base,
    integrations: [],
    containedCommits: [],
  });
  const pullRequest = (mergeCommit = delivered) => ({
    id: "PR_1",
    url: "https://github.com/carere/zaidan/pull/3",
    repository: "carere/zaidan",
    revision: "pr-v1",
    state: "MERGED" as const,
    baseRef: "main",
    mergeCommit,
    mergedAt: "2026-09-15T11:00:00Z",
  });
  return {
    workflow,
    external,
    integration,
    base,
    implementation,
    delivered,
    git,
    pullRequest,
    allowWork() {
      allowWork = true;
    },
    setSource(value: DeliverySource | Error) {
      source = value;
    },
  };
}

test("closed external children wait until verified PR delivery reaches both receiving base and starting head", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  const state = f.integration();
  let plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.leaves[0].status, "waiting-external");
  f.setSource({ issue: f.external, pullRequests: [f.pullRequest(f.implementation)] });
  plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.leaves[0].status, "waiting-external");
  state.reviewBase = f.implementation;
  plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.leaves[0].status, "waiting-external");
  state.head = f.implementation;
  plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.eligibleLeaves.length, 1);
  assert.equal(plan.eligibleLeaves[0].admission?.startingRevision, f.implementation);
  assert.equal(plan.eligibleLeaves[0].externalDeliveries[0].mergeCommit, f.implementation);
  assert.equal(plan.eligibleLeaves[0].externalDeliveries[0].issueRevision, "external-v1");
  assert.equal(f.workflow.admissions().length, 0);
});

test("ambiguous closing PRs and non-completion closures pause for maintainer clarification", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  const state = { ...f.integration(), head: f.delivered, reviewBase: f.delivered };
  f.setSource({
    issue: f.external,
    pullRequests: [f.pullRequest(), { ...f.pullRequest(f.implementation), id: "PR_2" }],
  });
  let plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.leaves[0].status, "blocked");
  assert.match(plan.problems.join(" "), /ambiguous.*clarification|clarification.*ambiguous/i);
  for (const reason of ["not_planned", "duplicate", "custom-reason", null]) {
    f.external.stateReason = reason;
    f.external.revision = `external-${reason}`;
    f.setSource({ issue: f.external, pullRequests: [f.pullRequest()] });
    await f.workflow.scan();
    plan = await f.workflow.verifyGraph("dependent", state);
    assert.equal(plan.leaves[0].status, "blocked");
    assert.match(plan.problems.join(" "), /completion|closure/i);
  }
});

test("squash delivery preserves the verified merge receipt without requiring original child ancestry and is recomputed on every plan", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  const state = { ...f.integration(), head: f.delivered, reviewBase: f.delivered };
  assert.throws(() => f.git(["merge-base", "--is-ancestor", f.implementation, f.delivered]));
  f.setSource({ issue: f.external, pullRequests: [f.pullRequest()] });
  const first = await f.workflow.verifyGraph("dependent", state);
  const admission = first.eligibleLeaves[0].admission;
  assert.ok(admission);
  assert.equal(admission.startingRevision, f.delivered);
  assert.deepEqual(admission.externalDeliveries, [
    {
      ...f.pullRequest(),
      issueId: "external",
      issueRevision: "external-v1",
      graphId: "dependent",
      graphRevision: first.graphRevision,
      snapshotRevision: "scan-1",
      reviewBase: f.delivered,
      startingRevision: f.delivered,
    },
  ]);
  assert.equal(f.workflow.planGraph("dependent", state).eligibleLeaves.length, 0);
  const moved = await f.workflow.verifyGraph("dependent", { ...state, reviewBase: f.base });
  assert.equal(moved.eligibleLeaves.length, 0);
  f.setSource({
    issue: f.external,
    pullRequests: [{ ...f.pullRequest(), state: "OPEN", mergedAt: null, mergeCommit: null }],
  });
  assert.equal((await f.workflow.verifyGraph("dependent", state)).eligibleLeaves.length, 0);
  f.setSource({
    issue: { ...f.external, updatedAt: "2026-09-15T13:00:00Z" },
    pullRequests: [f.pullRequest()],
  });
  const drift = await f.workflow.verifyGraph("dependent", state);
  assert.equal(drift.leaves[0].status, "blocked");
  assert.match(drift.problems.join(" "), /changed.*scan again/i);
});

test("missing Git objects and cross-repository delivery require clarification, never inferred success", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  const state = { ...f.integration(), head: f.delivered, reviewBase: f.delivered };
  f.setSource({ issue: f.external, pullRequests: [f.pullRequest("a".repeat(40))] });
  assert.equal((await f.workflow.verifyGraph("dependent", state)).leaves[0].status, "blocked");
  f.setSource({
    issue: f.external,
    pullRequests: [{ ...f.pullRequest(), repository: "another/project" }],
  });
  const plan = await f.workflow.verifyGraph("dependent", state);
  assert.equal(plan.leaves[0].status, "blocked");
  assert.match(plan.problems.join(" "), /maintainer.*mapping/i);
});

test("admission refuses an external delivery plan whose worker start or receiving base was changed", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  f.setSource({ issue: f.external, pullRequests: [f.pullRequest()] });
  const plan = await f.workflow.verifyGraph("dependent", {
    ...f.integration(),
    head: f.delivered,
    reviewBase: f.delivered,
  });
  const admission = plan.eligibleLeaves[0].admission;
  assert.ok(admission);
  await assert.rejects(
    f.workflow.admit({ ...admission, startingRevision: f.base }),
    /external delivery evidence.*revision/i,
  );
  await assert.rejects(
    f.workflow.admit({ ...admission, reviewBase: f.base }),
    /external delivery evidence.*revision/i,
  );
  assert.equal(f.workflow.admissions().length, 0);
});

test("verified admission retains delivery evidence and the eventual worker reads prerequisite code from its starting commit", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  f.setSource({ issue: f.external, pullRequests: [f.pullRequest()] });
  const plan = await f.workflow.verifyGraph("dependent", {
    ...f.integration(),
    head: f.delivered,
    reviewBase: f.delivered,
  });
  const admission = plan.eligibleLeaves[0].admission;
  assert.ok(admission);
  f.allowWork();
  const admitted = await f.workflow.admit(admission);
  const finished = await f.workflow.drive(admitted.runId);
  assert.equal(finished.status, "completed");
  assert.equal(finished.candidate?.feature, "Delivered feature");
  assert.equal(finished.candidate?.commit, f.delivered);
  assert.deepEqual(finished.issue.externalDeliveries, admission.externalDeliveries);
});

test("inaccessible external prerequisite evidence pauses the affected plan for clarification", async (t) => {
  const f = fixture(t);
  await f.workflow.scan();
  f.setSource(new Error("GitHub prerequisite inaccessible (404)"));
  const plan = await f.workflow.verifyGraph("dependent", f.integration());
  assert.equal(plan.leaves[0].status, "blocked");
  assert.match(plan.problems.join(" "), /maintainer clarification.*inaccessible/i);
  assert.equal(f.workflow.admissions().length, 0);
});
