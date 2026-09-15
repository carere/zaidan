import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureResources } from "../src/captured-resources.ts";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { createExternalDelivery, type DeliveryPullRequest } from "../src/external-delivery.ts";
import { SqliteGraphStore } from "../src/graph-integration.ts";
import { IssueWorkflow } from "../src/issue-workflow.ts";
import { createPublicationGit } from "../src/publication-git.ts";
import type { PublishedPullRequest } from "../src/standalone-publication.ts";
import type { TriageAdapter } from "../src/triage.ts";
import type { WorkerRequest, WorkflowEngine } from "../src/workflow-contracts.ts";
import { SqliteWorkflowStore } from "../src/workflow-store.ts";

export const issue = (
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
export function integrationFixture(t: { after(fn: () => void): void }, acceptance = false) {
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
  const reviewSkill = join(directory, "skills", "code-review");
  mkdirSync(reviewSkill, { recursive: true });
  writeFileSync(
    join(reviewSkill, "SKILL.md"),
    "---\nname: code-review\n---\nReview standards and the complete specification graph.",
  );
  const issues = [issue("root", ["a", "b"]), issue("a"), issue("b", [], ["a"])];
  const requests: WorkerRequest[] = [];
  const pulls: PublishedPullRequest[] = [];
  const externalPulls: DeliveryPullRequest[] = [];
  const events: string[] = [];
  let clock = 100;
  let description: { title: string; body: string } | undefined;
  let failAcceptanceExport = false;
  let failWithdraw: "before" | "after" | undefined;
  let loseReady = false,
    loseNotify = false;
  let losePush = false,
    loseCreate = false,
    loseClose = false;
  let beforePublish: () => void = () => {};
  let failCapture = false;
  let noChange = false;
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
              ...(request.integration.reevaluation
                ? { reevaluationId: request.integration.reevaluation.id }
                : {}),
            },
          }
        : {}),
    };
    return {
      ...binding,
      ...(request.acceptance
        ? {
            report: {
              title: "Add the complete greeting feature",
              summary:
                "The greeting was incomplete. The assembled implementation now greets the world and supplies both required parts.",
              validation:
                "The required greeting check and independent standards and specification reviews passed.",
            },
          }
        : {}),
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
  const make = (triage?: TriageAdapter, engine?: WorkflowEngine) => {
    const store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
    const graphStore = new SqliteGraphStore(join(directory, "graphs.sqlite"));
    stores.push(store);
    graphs.push(graphStore);
    return new IssueWorkflow({
      triage,
      store,
      externalDelivery: createExternalDelivery({
        trustedGitDirectory: bare,
        github: {
          async read(input) {
            const fresh = issues.find((i) => i.issueId === input.issueId);
            if (!fresh) throw Error("External issue is inaccessible");
            return { issue: structuredClone(fresh), pullRequests: structuredClone(externalPulls) };
          },
        },
      }),
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
          skills: [{ path: skill }, { path: reviewSkill }],
          checks: ["true"],
        });
      },
      engine: engine ?? {
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
          if (noChange)
            return { type: "no-change", reason: "Already implemented; triage the request" };
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
                entry: "code-review",
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
          async exportBundle(commit) {
            if (
              failAcceptanceExport &&
              issues.filter((i) => !i.childIds.length).every((i) => i.state === "closed")
            ) {
              failAcceptanceExport = false;
              throw Error("Acceptance bundle storage unavailable");
            }
            return transport.exportBundle(commit);
          },
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
            if (draft && failWithdraw === "before") {
              failWithdraw = undefined;
              throw Error("interrupted before draft");
            }
            pr.draft = draft;
            events.push(draft ? "withdraw" : "ready");
            if (draft && failWithdraw === "after") {
              failWithdraw = undefined;
              throw Error("lost draft reply");
            }
            if (loseReady && !draft) {
              loseReady = false;
              throw Error("lost ready reply");
            }
          },
          async updatePullRequest(_repo, _number, input) {
            description = input;
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
    externalPulls,
    events,
    git,
    base,
    transport,
    maintainerAdvance(branch: string, head: string) {
      git("checkout", "-B", "maintainer-change", head);
      writeFileSync(join(source, "maintainer-change"), "retained extra change\n");
      git("add", ".");
      git("commit", "-m", "maintainer change");
      const next = git("rev-parse", "HEAD");
      git("push", remote, `HEAD:refs/heads/${branch}`);
      git("--git-dir", bare, "fetch", remote, `refs/heads/${branch}:refs/heads/${branch}`);
      return next;
    },
    maintainerMerge(head: string) {
      git("--git-dir", remote, "update-ref", "refs/heads/main", head, base);
    },
    description() {
      return description;
    },
    failWithdraw(when: "before" | "after") {
      failWithdraw = when;
    },
    failAcceptanceExport() {
      failAcceptanceExport = true;
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
    setNoChange() {
      noChange = true;
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
