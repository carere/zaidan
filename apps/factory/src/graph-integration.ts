import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { type DiscoveredIssue, discoverWork } from "./discovery.ts";
import {
  GraphAcceptance,
  type GraphAcceptanceOptions,
  type GraphFinalization,
} from "./graph-acceptance.ts";
import { type GraphIntegrationState, planIssueGraph } from "./graph-planning.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { PublicationGit } from "./publication-git.ts";
import type { PublicationGitHub, PublishedPullRequest } from "./standalone-publication.ts";
import type { Candidate, RunSnapshot } from "./workflow-contracts.ts";

export interface BundleReference {
  kind: "git-bundle";
  path: string;
  sha256: string;
}
export interface IntegrationInput {
  graphId: string;
  graphRevision: string;
  branch: string;
  expectedHead: string;
  reviewBase: string;
  candidate: Candidate;
  source: BundleReference;
  entry: string;
}
export interface GraphRecord extends GraphIntegrationState {
  repository: string;
  number: number;
  branch: string;
  marker: string;
  state: "active" | "reconciliation" | "reviewable" | "delivered";
  finalization?: GraphFinalization;
  reason?: string;
  activeRunId?: string;
  pullRequest?: PublishedPullRequest;
  operations: Record<string, { state: "pending" | "attempted" | "done"; receipt?: unknown }>;
  deliveries: Record<
    string,
    {
      runId: string;
      source: DiscoveredIssue;
      candidate: Candidate;
      expectedHead: string;
      published?: boolean;
      closedRevision?: string;
    }
  >;
  lock?: { owner: string; pid: number };
}
/** Persistent graph coordination is distinct from issue attempt capacity. */
export class SqliteGraphStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (!isAbsolute(path)) throw Error("Graph state requires an absolute persistent path");
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS graphs(id TEXT PRIMARY KEY,data TEXT NOT NULL)",
    );
  }
  close() {
    this.db.close();
  }
  read(id: string): GraphRecord | undefined {
    const row = this.db.prepare("SELECT data FROM graphs WHERE id=?").get(id);
    return row ? JSON.parse(row.data as string) : undefined;
  }
  list(): GraphRecord[] {
    return this.db
      .prepare("SELECT data FROM graphs ORDER BY id")
      .all()
      .map((row) => JSON.parse(row.data as string));
  }
  create(graph: GraphRecord) {
    this.db
      .prepare("INSERT OR IGNORE INTO graphs VALUES(?,?)")
      .run(graph.graphId, JSON.stringify(graph));
    const saved = this.read(graph.graphId);
    if (!saved) throw Error("Graph admission was not saved");
    return saved;
  }
  change<T>(id: string, fn: (graph: GraphRecord) => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const graph = this.read(id);
      if (!graph) throw Error("Unknown graph");
      const value = fn(graph);
      this.db.prepare("UPDATE graphs SET data=? WHERE id=?").run(JSON.stringify(graph), id);
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
export interface GraphPublicationGit extends PublicationGit {
  contains(head: string, commit: string): Promise<boolean>;
  exportBundle(commit: string): Promise<BundleReference>;
}
export interface GraphOptions {
  acceptance?: GraphAcceptanceOptions;
  store: SqliteGraphStore;
  git: GraphPublicationGit;
  github: PublicationGitHub;
  entry: string;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const closureIdentity = (issue: DiscoveredIssue) => ({
  ...issue,
  state: undefined,
  stateReason: undefined,
  revision: undefined,
  updatedAt: undefined,
});

export class GraphCoordinator {
  private workflow: IssueWorkflow;
  private options: GraphOptions;
  private acceptance: GraphAcceptance;
  constructor(workflow: IssueWorkflow, options: GraphOptions) {
    this.workflow = workflow;
    this.options = options;
    this.acceptance = new GraphAcceptance(workflow, options, (id) => this.verified(id));
  }
  observe(id: string) {
    const graph = this.options.store.read(id);
    if (!graph) throw Error("Unknown admitted graph");
    return graph;
  }
  async admit(id: string) {
    await this.workflow.scan();
    const plan = this.workflow.planGraph(id);
    if (!plan.specificationIds.includes(id))
      throw Error("Graph admission requires a readable top-level specification");
    const snapshot = await this.workflow.graphDiscovery();
    const root = snapshot.snapshot.issues.find((issue) => issue.issueId === id);
    if (!root || root.parentIds.length)
      throw Error("Graph root is inaccessible or is not top-level");
    if (snapshot.decisions.find((item) => item.issue.issueId === id)?.route !== "coordinator")
      throw Error("Graph is not authorized");
    let graph = this.options.store.read(id);
    if (!graph) {
      const head = await this.options.git.branchHead("main");
      if (!head) throw Error("Missing main head");
      const identity = createHash("sha256")
        .update(`${root.repository}:${id}`)
        .digest("hex")
        .slice(0, 20);
      graph = this.options.store.create({
        graphId: id,
        graphRevision: plan.graphRevision,
        repository: root.repository,
        number: root.number,
        branch: `codex/graph-${root.number}-${identity}`,
        marker: `<!-- zaidan-factory:graph:${identity} -->`,
        head,
        reviewBase: head,
        integrations: [],
        containedCommits: [],
        deliveries: {},
        operations: {},
        state: "active",
      });
    }
    const admitted = graph;
    await this.locked(id, async () => {
      const branch = this.intent(id, "branch");
      const head = await this.options.git.branchHead(admitted.branch);
      if (head !== admitted.head) {
        if (head) throw Error("Graph branch changed before admission");
        if (branch.state === "done") throw Error("Admitted graph branch disappeared");
        this.workflow.assertLiveAction();
        this.attempt(id, "branch");
        await this.options.git.publishBranch(admitted.branch, admitted.head);
      }
      this.done(id, "branch", admitted.head);
      await this.frontier(id);
    });
    return this.observe(id);
  }
  private intent(id: string, key: string) {
    return this.options.store.change(id, (g) => (g.operations[key] ??= { state: "pending" }));
  }
  private attempt(id: string, key: string) {
    this.options.store.change(id, (g) => {
      g.operations[key] = { ...g.operations[key], state: "attempted" };
    });
  }
  private done(id: string, key: string, receipt: unknown) {
    this.options.store.change(id, (g) => {
      g.operations[key] = { state: "done", receipt };
    });
  }
  private async locked(id: string, action: () => Promise<void>) {
    const owner = randomUUID();
    const acquired = this.options.store.change(id, (g) => {
      if (g.lock) {
        try {
          process.kill(g.lock.pid, 0);
          return false;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") return false;
        }
      }
      g.lock = { owner, pid: process.pid };
      return true;
    });
    if (!acquired) return;
    try {
      await action();
    } catch (error) {
      this.options.store.change(id, (g) => {
        g.state = "reconciliation";
        g.reason = error instanceof Error ? error.message : "Graph requires reconciliation";
      });
    } finally {
      this.options.store.change(id, (g) => {
        if (g.lock?.owner === owner) delete g.lock;
      });
    }
  }
  private async verified(id: string) {
    const graph = this.observe(id);
    await this.workflow.scan();
    if ((await this.options.git.branchHead(graph.branch)) !== graph.head)
      throw Error("Graph head changed; assembled validation must be reconciled");
    const contained: string[] = [];
    for (const item of graph.integrations) {
      if (!(await this.options.git.contains(graph.head, item.commit)))
        throw Error("Published prerequisite is missing from graph head");
      contained.push(item.commit);
    }
    this.options.store.change(id, (g) => {
      g.containedCommits = contained;
    });
    const current = await this.workflow.graphDiscovery();
    if (current.decisions.find((item) => item.issue.issueId === id)?.route !== "coordinator")
      throw Error("Graph specification is not currently authorized");
    const plan = await this.workflow.verifyGraph(id, { ...graph, containedCommits: contained });
    if (plan.graphRevision !== graph.graphRevision)
      throw Error("Graph membership or requirements changed");
    return plan;
  }
  async frontier(id: string) {
    this.workflow.assertLiveAction();
    const plan = await this.verified(id);
    for (const leaf of plan.eligibleLeaves) {
      if (!leaf.admission) continue;
      if (
        (await this.options.git.branchHead(this.observe(id).branch)) !==
        leaf.admission.startingRevision
      )
        throw Error("Graph changed before dependent admission");
      await this.workflow.admit({ ...leaf.admission, graphId: id });
    }
  }
  async finalize(id: string) {
    await this.locked(id, () => this.acceptance.advance(id));
    return this.observe(id);
  }
  async invalidate(id: string, reason: string) {
    await this.locked(id, () => this.acceptance.invalidate(id, reason));
    return this.observe(id);
  }
  async authorizeDispatch(run: RunSnapshot) {
    this.workflow.assertLiveAction(run.runId);
    const id = run.issue.graphId;
    if (!id) return;
    const plan = await this.verified(id);
    if (run.acceptance) {
      await this.acceptance.current(run.acceptance);
      if (
        run.acceptance.head !== this.observe(id).head ||
        run.acceptance.graphRevision !== plan.graphRevision
      )
        throw Error("Acceptance inputs changed before dispatch");
      return;
    }
    await this.authorized(run, plan);
    if (run.integration && run.integration.expectedHead !== this.observe(id).head)
      throw Error("Integration head changed before dispatch");
  }
  async advance(runId: string) {
    const run = this.workflow.observe(runId);
    const id = run.issue.graphId;
    if (!id) return;
    if (run.acceptance) {
      await this.finalize(id);
      return;
    }
    await this.locked(id, async () => {
      let graph = this.observe(id);
      if (graph.activeRunId && graph.activeRunId !== runId) return;
      if (run.status !== "completed") return;
      this.workflow.assertLiveAction(runId);
      if (!run.candidate) {
        if (run.noChange)
          throw Error("No-change graph child requires triage; no delivery recorded");
        return;
      }
      const settled = graph.deliveries[run.issue.issueId];
      if (settled?.closedRevision) {
        if (!run.graphPending) return;
        const source = await this.current(run.issue.issueId);
        if (
          source.revision !== settled.closedRevision ||
          source.state !== "closed" ||
          source.stateReason !== "completed"
        )
          throw Error("Integrated issue changed before frontier recovery");
        await this.frontier(id);
        await this.settleChild(id, runId);
        return;
      }
      if (!run.integration) {
        const plan = await this.verified(id);
        await this.authorized(run, plan);
        this.options.store.change(id, (g) => {
          g.activeRunId = runId;
        });
        this.workflow.validateCandidate(runId);
        await this.options.git.importCandidate(
          run.candidate,
          run.issue.reviewBase,
          run.issue.startingRevision,
        );
        const source = await this.options.git.exportBundle(graph.head);
        this.workflow.beginIntegration(runId, {
          graphId: id,
          graphRevision: graph.graphRevision,
          branch: graph.branch,
          expectedHead: graph.head,
          reviewBase: graph.head,
          candidate: run.candidate,
          source,
          entry: this.options.entry,
        });
        return;
      }
      const input = run.integration;
      let delivery = graph.deliveries[run.issue.issueId];
      if (!delivery) {
        const plan = await this.verified(id);
        const source = await this.authorized(run, plan);
        if (input.expectedHead !== graph.head || input.graphRevision !== graph.graphRevision)
          throw Error("Integration inputs became stale; repeat affected assembly validation");
        await this.workflow.validateIntegration(runId);
        await this.options.git.importCandidate(run.candidate, input.reviewBase, input.expectedHead);
        if (!(await this.options.git.contains(run.candidate.commit, input.candidate.commit)))
          throw Error("Assembled result does not contain child candidate");
        delivery = { runId, source, candidate: run.candidate, expectedHead: input.expectedHead };
        this.options.store.change(id, (g) => {
          g.deliveries[run.issue.issueId] = {
            runId,
            source,
            candidate: run.candidate as Candidate,
            expectedHead: input.expectedHead,
          };
        });
      }
      if (delivery.candidate.commit !== run.candidate.commit)
        throw Error("Reviewed integration candidate changed after publication intent");
      const covered = delivery;
      const key = `publish:${runId}`;
      const publication = this.intent(id, key);
      const head = await this.options.git.branchHead(graph.branch);
      const beforePulls = await this.options.github.findPullRequests(
        graph.repository,
        graph.branch,
      );
      if (beforePulls.length > 1) throw Error("Multiple graph PRs require reconciliation");
      const beforePull = beforePulls[0];
      if (
        beforePull &&
        (beforePull.repository !== graph.repository ||
          beforePull.marker !== graph.marker ||
          beforePull.headRef !== graph.branch ||
          beforePull.headCommit !== head ||
          beforePull.baseRef !== "main" ||
          beforePull.state !== "open" ||
          !beforePull.draft)
      )
        throw Error("Graph PR authorization changed before publication");
      if (!beforePull && graph.operations.draft?.state === "done")
        throw Error("Existing graph PR is inaccessible");
      if (head !== delivery.candidate.commit) {
        if (delivery.published || publication.state === "done" || head !== delivery.expectedHead)
          throw Error("Graph publication head raced; reconciliation required");
        const plan = await this.verified(id);
        await this.authorized(run, plan);
        this.workflow.assertLiveAction(runId);
        this.attempt(id, key);
        await this.options.git.publishBranch(
          graph.branch,
          delivery.candidate.commit,
          delivery.expectedHead,
        );
      }
      if ((await this.options.git.branchHead(graph.branch)) !== delivery.candidate.commit)
        throw Error("Graph publication not confirmed");
      this.done(id, key, delivery.candidate.commit);
      this.options.store.change(id, (g) => {
        g.head = covered.candidate.commit;
        g.deliveries[run.issue.issueId].published = true;
      });
      graph = this.observe(id);
      const prs = await this.options.github.findPullRequests(graph.repository, graph.branch);
      if (prs.length > 1) throw Error("Multiple graph PRs require reconciliation");
      let pr = prs[0];
      const create = this.intent(id, "draft");
      if (!pr) {
        if (create.state !== "pending")
          throw Error("Uncertain graph draft creation; reconcile before retry");
        await this.authorized(run, await this.verified(id));
        this.workflow.assertLiveAction(runId);
        this.attempt(id, "draft");
        pr = await this.options.github.createPullRequest({
          repository: graph.repository,
          branch: graph.branch,
          commit: graph.head,
          title: `Implement #${graph.number}`,
          body: `Implements graph #${graph.number}.\n\n${graph.marker}`,
          marker: graph.marker,
          draft: true,
        });
      }
      if (
        pr.repository !== graph.repository ||
        pr.marker !== graph.marker ||
        pr.headRef !== graph.branch ||
        pr.headCommit !== graph.head ||
        pr.baseRef !== "main" ||
        pr.state !== "open" ||
        !pr.draft
      )
        throw Error("Graph PR changed or is not draft");
      this.done(id, "draft", pr);
      this.options.store.change(id, (g) => {
        g.pullRequest = pr;
      });
      const closeKey = `close:${runId}`;
      const close = this.intent(id, closeKey);
      let source = await this.current(run.issue.issueId);
      if (!same(closureIdentity(source), closureIdentity(delivery.source)))
        throw Error("Published child changed before closure");
      if (source.state !== "closed") {
        if (close.state === "done")
          throw Error("Integrated issue reopened; reconciliation required");
        if (source.revision !== delivery.source.revision)
          throw Error("Published child revision changed");
        await this.authorized(run, await this.verified(id));
        this.workflow.assertLiveAction(runId);
        this.attempt(id, closeKey);
        await this.options.github.closeIssue(graph.repository, run.issue.number);
        source = await this.current(run.issue.issueId);
      }
      if (
        source.state !== "closed" ||
        source.stateReason !== "completed" ||
        !same(closureIdentity(source), closureIdentity(delivery.source))
      )
        throw Error("Completed closure not confirmed or source changed");
      this.done(id, closeKey, { revision: source.revision });
      this.options.store.change(id, (g) => {
        g.deliveries[run.issue.issueId].closedRevision = source.revision;
        g.integrations.push({
          issueId: run.issue.issueId,
          issueRevision: source.revision,
          commit: covered.candidate.commit,
        });
        delete g.activeRunId;
        g.state = "active";
        delete g.reason;
      });
      await this.frontier(id);
      await this.settleChild(id, runId);
    });
  }
  private async settleChild(id: string, runId: string) {
    // Keep the original Eve workflow alive until acceptance intent and phase are durable.
    await this.acceptance.advance(id);
    const graph = this.observe(id);
    if (
      !this.workflow.observe(runId).acceptance &&
      !(
        this.options.acceptance &&
        (graph.finalization?.runId === runId ||
          (!graph.finalization && graph.state === "reconciliation"))
      )
    )
      this.workflow.finishIntegration(runId);
  }
  private async current(issueId: string) {
    const scan = await this.workflow.graphDiscovery();
    const issue = scan.snapshot.issues.find((item) => item.issueId === issueId);
    if (!issue) throw Error("Issue is inaccessible");
    return issue;
  }
  private async authorized(
    run: RunSnapshot,
    plan: Awaited<ReturnType<IssueWorkflow["verifyGraph"]>>,
  ) {
    const scan = await this.workflow.graphDiscovery();
    const decision = discoverWork(scan.snapshot, [], scan.briefs).decisions.find(
      (item) => item.issue.issueId === run.issue.issueId,
    );
    const freshGraph = planIssueGraph(
      discoverWork(scan.snapshot, [], scan.briefs),
      run.issue.graphId ?? "",
    );
    if (freshGraph.graphRevision !== plan.graphRevision)
      throw Error("Graph membership or requirements changed during authorization");
    const leaf = plan.leaves.find((item) => item.issue.issueId === run.issue.issueId);
    if (
      decision?.route !== "implementation" ||
      !decision.admission ||
      decision.issue.revision !== run.issue.revision ||
      !same(decision.admission.sourceContent, run.issue.sourceContent) ||
      !leaf ||
      leaf.problems.some((p) => !p.startsWith("Discovery route: already-admitted"))
    )
      throw Error("Graph child authorization, requirements or prerequisites changed");
    for (const previous of run.issue.externalDeliveries ?? []) {
      const current = leaf.externalDeliveries.find((item) => item.issueId === previous.issueId);
      if (
        !current ||
        current.issueRevision !== previous.issueRevision ||
        current.id !== previous.id ||
        current.revision !== previous.revision ||
        current.mergeCommit !== previous.mergeCommit
      )
        throw Error("External prerequisite delivery evidence changed after admission");
    }
    if (!run.issue.graphId) throw Error("Missing graph identity");
    const graph = this.observe(run.issue.graphId);
    for (const dependency of leaf.prerequisiteIds)
      if (
        !graph.integrations.some(
          (item) =>
            item.issueId === dependency &&
            item.issueRevision ===
              scan.snapshot.issues.find((source) => source.issueId === dependency)?.revision &&
            graph.containedCommits.includes(item.commit),
        )
      )
        throw Error("Internal prerequisite lacks published containment");
    return decision.issue;
  }
}
