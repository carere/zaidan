import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { SqliteGraphStore } from "../src/graph-integration.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import type { TriageAdapter } from "../src/triage.ts";
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

function integrationFixture(t: { after(fn: () => void): void }, acceptance = false) {
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
  let loseReady = false,
    loseNotify = false;
  let losePush = false,
    loseCreate = false,
    loseClose = false;
  let beforePublish: () => void = () => {};
  let failCapture = false;
  let beforeWorker: (request: WorkerRequest) => Promise<void> = async () => {};
  let transform: (candidate: ReturnType<typeof makeCandidate>) => ReturnType<typeof makeCandidate> =
    (candidate) => candidate;
  const makeCandidate = (request: WorkerRequest) => {
    if (request.acceptance) {
      git("checkout", "-B", `acceptance-${request.runId}`, request.acceptance.head);
    } else if (!request.integration) {
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
      reviewBase:
        request.acceptance?.reviewBase ??
        request.integration?.reviewBase ??
        request.issue.reviewBase,
      snapshot: request.resources?.id,
      issueRevision: request.issue.revision,
      ...(request.acceptance
        ? {
            acceptance: {
              id: request.acceptance.id,
              graphId: request.acceptance.graphId,
              graphRevision: request.acceptance.graphRevision,
              head: request.acceptance.head,
            },
          }
        : {}),
      ...(!request.acceptance && request.integration
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
        findings: [] as string[],
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
  const make = (triage?: TriageAdapter) => {
    const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
    const graphStore = new SqliteGraphStore(join(directory, "graphs.sqlite"));
    stores.push(store);
    graphs.push(graphStore);
    return new IssueWorkflow({
      triage,
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
          return request.acceptance
            ? { type: "graph-accepted", evidence: candidate }
            : { type: "completed", candidate };
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
        ...(acceptance
          ? {
              acceptance: {
                entry: "resolving-merge-conflicts",
                async notify(input: { operationId: string }) {
                  if (!events.includes(input.operationId)) events.push(input.operationId);
                  if (loseNotify) {
                    loseNotify = false;
                    throw Error("lost notify reply");
                  }
                  return input.operationId;
                },
              },
            }
          : {}),
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
          async setDraft(_repo, id, draft) {
            const pr = pulls.find((p) => p.id === id);
            assert.ok(pr);
            pr.draft = draft;
            events.push(draft ? "withdraw" : "ready");
            if (loseReady && !draft) {
              loseReady = false;
              throw Error("lost ready reply");
            }
          },
          async updatePullRequest() {},
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
    maintainerMerge(head: string) {
      git("--git-dir", remote, "update-ref", "refs/heads/main", head, base);
    },
    setLoseReady() {
      loseReady = true;
    },
    setLoseNotify() {
      loseNotify = true;
    },
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
