import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { SqliteGraphStore } from "../src/graph-integration.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

const issue = (
  id: string,
  children: string[] = [],
  dependencies: string[] = [],
): DiscoveredIssue => ({
  issueId: id,
  revision: `${id}-1`,
  contentRevision: `${id}-content`,
  repository: "owner/repo",
  number: id === "root" ? 1 : id === "a" ? 2 : 3,
  title: id,
  body: "## What to build\nImplement greeting.\n## Acceptance criteria\nGreeting works.",
  state: "open",
  stateReason: null,
  labels: ["ready-for-agent"],
  parentIds: id === "root" ? [] : ["root"],
  childIds: children,
  dependencyIds: dependencies,
  sourceRef: `https://github.com/owner/repo/issues/${id}`,
  updatedAt: "2026-09-15T00:00:00Z",
});
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

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { captureResources } from "../src/captured-resources.ts";
import { createPublicationGit } from "../src/publication-git.ts";
import type { PublishedPullRequest } from "../src/standalone-publication.ts";
import type { WorkerRequest } from "../src/workflow-contracts.ts";

function integrationFixture(t: { after(fn: () => void): void }) {
  const directory = mkdtempSync(join(tmpdir(), "factory-graph-git-"));
  const source = join(directory, "source");
  mkdirSync(source);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: source,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.test");
  writeFileSync(join(source, "greeting"), "hello\n");
  git("add", ".");
  git("commit", "-m", "initial");
  const base = git("rev-parse", "HEAD");
  const bare = join(directory, "trusted.git"),
    remote = join(directory, "remote.git");
  git("clone", "--bare", source, bare);
  git("clone", "--bare", source, remote);
  const transport = createPublicationGit({ trustedGitDirectory: bare, remote });
  const skill = join(directory, "skills", "resolving-merge-conflicts");
  mkdirSync(skill, { recursive: true });
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: resolving-merge-conflicts\n---\nResolve and review.",
  );
  const issues = [issue("root", ["a", "b"]), issue("a"), issue("b", [], ["a"])];
  const requests: WorkerRequest[] = [];
  const pulls: PublishedPullRequest[] = [];
  const events: string[] = [];
  let clock = 100;
  let losePush = false,
    loseCreate = false,
    loseClose = false;
  let beforePublish: () => void = () => {};
  let failCapture = false;
  let beforeWorker: (request: WorkerRequest) => Promise<void> = async () => {};
  let transform: (candidate: ReturnType<typeof makeCandidate>) => ReturnType<typeof makeCandidate> =
    (candidate) => candidate;
  const makeCandidate = (request: WorkerRequest) => {
    if (!request.integration) {
      git("checkout", "-B", `work-${request.runId}`, request.issue.startingRevision);
      writeFileSync(join(source, "greeting"), "hello world\n");
      writeFileSync(join(source, `part-${request.issue.issueId}`), request.issue.issueId);
      git("add", ".");
      git("commit", "-m", "implementation");
    } else {
      git("checkout", "-B", `integration-${request.runId}`, request.integration.expectedHead);
      git("merge", "--no-ff", request.integration.candidate.commit, "-m", "integrate");
    }
    const commit = git("rev-parse", "HEAD"),
      tree = git("rev-parse", "HEAD^{tree}");
    const path = join(directory, `${commit}.bundle`);
    git("bundle", "create", path, "HEAD");
    const binding = {
      commit,
      tree,
      reviewBase: request.integration?.reviewBase ?? request.issue.reviewBase,
      snapshot: request.resources?.id,
      issueRevision: request.issue.revision,
      ...(request.integration
        ? {
            integration: {
              graphId: request.integration.graphId,
              graphRevision: request.integration.graphRevision,
              expectedHead: request.integration.expectedHead,
              candidateCommit: request.integration.candidate.commit,
            },
          }
        : {}),
    };
    return {
      ...binding,
      checks: [{ ...binding, command: "true", exitCode: 0 }],
      reviews: ["standards", "spec"].map((axis) => ({
        ...binding,
        axis,
        delegateSession: axis,
        passed: true,
        findings: [],
      })),
      artifact: {
        kind: "git-bundle",
        path,
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      },
    };
  };
  const stores: SqliteWorkflowStore[] = [],
    graphs: SqliteGraphStore[] = [];
  const make = () => {
    const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
    const graphStore = new SqliteGraphStore(join(directory, "graphs.sqlite"));
    stores.push(store);
    graphs.push(graphStore);
    return new IssueWorkflow({
      store,
      clock: { now: () => clock },
      execution: { budgetMs: 1000 },
      captureResources: (input) => {
        if (failCapture && input.issueId === "b") {
          failCapture = false;
          throw Error("Snapshot storage unavailable");
        }
        return captureResources({
          directory: join(directory, "resources"),
          issue: input,
          entry: "resolving-merge-conflicts",
          skills: [{ path: skill }],
          checks: ["true"],
        });
      },
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
        async dispatch(request) {
          requests.push(request);
          await beforeWorker(request);
          clock += 100;
          const candidate = transform(makeCandidate(request));
          return { type: "completed", candidate };
        },
        async resume() {
          throw Error("unused");
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
            revision: `snapshot-${clock}`,
            issues: structuredClone(issues),
          };
        },
      },
      graph: {
        store: graphStore,
        entry: "resolving-merge-conflicts",
        git: {
          ...transport,
          async publishBranch(branch, commit, expected) {
            beforePublish();
            await transport.publishBranch(branch, commit, expected);
            events.push(`publish:${commit}`);
            if (losePush && expected) {
              losePush = false;
              throw Error("lost push reply");
            }
          },
        },
        github: {
          async findPullRequests(_repo, branch) {
            const head = await transport.branchHead(branch);
            return pulls
              .filter((pr) => pr.headRef === branch)
              .map((pr) => ({ ...pr, headCommit: head ?? "" }));
          },
          async createPullRequest(input) {
            const pr: PublishedPullRequest = {
              id: "pr1",
              number: 5,
              url: "https://github.com/owner/repo/pull/5",
              repository: input.repository,
              headRef: input.branch,
              headCommit: input.commit,
              baseRef: "main",
              state: "open",
              draft: input.draft ?? false,
              mergedAt: null,
              mergeCommit: null,
              marker: input.marker,
            };
            pulls.push(pr);
            events.push("draft");
            if (loseCreate) {
              loseCreate = false;
              throw Error("lost create reply");
            }
            return pr;
          },
          async closeIssue(_repo, number) {
            const child = issues.find((i) => i.number === number);
            assert.ok(child);
            child.state = "closed";
            child.stateReason = "completed";
            child.revision += "-closed";
            child.updatedAt = "2026-09-15T01:00:00Z";
            events.push(`close:${child.issueId}`);
            if (loseClose) {
              loseClose = false;
              throw Error("lost close reply");
            }
          },
        },
      },
    });
  };
  t.after(() => {
    for (const s of stores) s.close();
    for (const s of graphs) s.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    make,
    issues,
    requests,
    pulls,
    events,
    git,
    base,
    transport,
    setLosePush() {
      losePush = true;
    },
    setLoseCreate() {
      loseCreate = true;
    },
    setLoseClose() {
      loseClose = true;
    },
    setClock(value: number) {
      clock = value;
    },
    failNextDependentCapture() {
      failCapture = true;
    },
    setBeforeWorker(fn: (request: WorkerRequest) => Promise<void>) {
      beforeWorker = fn;
    },
    setTransform(fn: typeof transform) {
      transform = fn;
    },
    setBeforePublish(fn: () => void) {
      beforePublish = fn;
    },
  };
}
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
