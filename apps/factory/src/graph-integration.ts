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
import type { Candidate, IssueSnapshot, RunSnapshot } from "./workflow-contracts.ts";

export interface BundleReference {
  kind: "git-bundle";
  path: string;
  sha256: string;
}
export interface IntegrationInput {
  reevaluation?: { id: string; issue: IssueSnapshot; reason: string };
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
  reconciliation?: GraphReconciliation;
  finalizationHistory?: GraphFinalization[];
  deliveryHistory?: GraphRecord["deliveries"][string][];
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
  tree?(commit: string): Promise<string>;
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

export interface GraphReconciliation {
  revision: string;
  holds: Record<string, { reason: string; kind: "changed" | "reopened" | "moved" | "outcome" }>;
}
export interface ReconcileGraphDecision {
  /** The exact observation approved by the operator; stale decisions never clear holds. */
  revision: string;
  continueRunIds: string[];
}

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
  private applyReevaluation(id: string, runId: string, input: IntegrationInput) {
    const key = `reevaluate:${runId}:${input.reevaluation?.id}`;
    if (this.observe(id).operations[key]?.state === "done") return;
    this.workflow.replaceIntegration(runId, input);
    const issueId = this.workflow.observe(runId).issue.issueId;
    this.options.store.change(id, (g) => {
      const previous = g.deliveries[issueId];
      if (previous) {
        g.deliveryHistory ??= [];
        g.deliveryHistory.push(previous);
        delete g.deliveries[issueId];
      }
      g.integrations = g.integrations.filter((i) => i.issueId !== issueId);
      g.activeRunId = runId;
      if (g.reconciliation) delete g.reconciliation.holds[runId];
      g.operations[key] = { state: "done", receipt: { runId, input } };
    });
  }
  async reconcile(id: string, decision?: ReconcileGraphDecision) {
    await this.locked(id, async () => {
      this.workflow.assertLiveAction();
      let graph = this.observe(id);
      await this.workflow.scan();
      const scan = await this.workflow.graphDiscovery();
      const raw = planIssueGraph(scan, id);
      const memberIds = [...raw.specificationIds, ...raw.leaves.map((l) => l.issue.issueId)];
      let runs = this.workflow
        .admissions()
        .filter((r) => r.issue.graphId === id && !r.supersededBy);
      const relevantIds = new Set([...memberIds, ...runs.map((r) => r.issue.issueId)]);
      for (const issue of scan.snapshot.issues)
        if (relevantIds.has(issue.issueId))
          for (const dependency of issue.dependencyIds) relevantIds.add(dependency);
      const sources = scan.snapshot.issues
        .filter((i) => relevantIds.has(i.issueId))
        .sort((a, b) => a.issueId.localeCompare(b.issueId));
      const head = await this.options.git.branchHead(graph.branch);
      const contained: string[] = [];
      if (head)
        for (const item of graph.integrations)
          if (await this.options.git.contains(head, item.commit)) contained.push(item.commit);
      const plan = await this.workflow.verifyGraph(id, {
        ...graph,
        head: head ?? graph.head,
        graphRevision: raw.graphRevision,
        containedCommits: contained,
      });
      const revision = createHash("sha256")
        .update(
          JSON.stringify({
            head,
            sources,
            deliveries: plan.leaves.map((leaf) => ({
              issueId: leaf.issue.issueId,
              deliveries: leaf.externalDeliveries.map((d) => ({
                issueId: d.issueId,
                issueRevision: d.issueRevision,
                id: d.id,
                revision: d.revision,
                mergeCommit: d.mergeCommit,
                reviewBase: d.reviewBase,
                startingRevision: d.startingRevision,
              })),
              prerequisites: leaf.prerequisiteIds,
            })),
            briefs: scan.briefs?.filter((b) => relevantIds.has(b.issueId)),
          }),
        )
        .digest("hex");
      for (const [key, operation] of Object.entries(graph.operations)) {
        if (!key.startsWith("reevaluate:") || operation.state === "done") continue;
        const saved = operation.receipt as { runId: string; input: IntegrationInput };
        if (!saved?.runId || saved.input?.graphId !== id || !saved.input.reevaluation)
          throw Error("Malformed retained reconciliation decision");
        if (saved.input.reevaluation.id === revision && saved.input.expectedHead === head)
          this.applyReevaluation(id, saved.runId, saved.input);
      }
      graph = this.observe(id);
      runs = this.workflow.admissions().filter((r) => r.issue.graphId === id && !r.supersededBy);
      const holds = { ...graph.reconciliation?.holds };
      for (const run of runs) {
        const fresh = sources.find((i) => i.issueId === run.issue.issueId);
        const comparison = discoverWork(
          {
            ...scan.snapshot,
            issues: scan.snapshot.issues.map((i) =>
              i.issueId === run.issue.issueId ? { ...i, state: "open" as const } : i,
            ),
          },
          [],
          scan.briefs,
        );
        const current = comparison.decisions.find((d) => d.issue.issueId === run.issue.issueId);
        const delivery = graph.deliveries[run.issue.issueId];
        const admitted = run.integration?.reevaluation?.issue ?? run.issue;
        const historicalClosure =
          !!run.integration?.reevaluation &&
          fresh?.state === "closed" &&
          fresh.stateReason === "completed" &&
          graph.deliveryHistory?.some(
            (d) =>
              d.source.issueId === fresh.issueId &&
              d.closedRevision === fresh.revision &&
              d.published,
          );
        const closeKey = `close:${run.runId}${run.integration?.reevaluation ? `:${run.integration.reevaluation.id}` : ""}`;
        const ownedClosure =
          !!delivery?.published &&
          !!graph.operations[closeKey] &&
          fresh?.state === "closed" &&
          fresh.stateReason === "completed" &&
          same(closureIdentity(fresh), closureIdentity(delivery.source));
        if (
          !fresh ||
          !memberIds.includes(run.issue.issueId) ||
          !same(fresh.parentIds, admitted.parentIds)
        )
          holds[run.runId] = {
            kind: "moved",
            reason: "Moved work requires explicit reconciliation in its original graph",
          };
        else if (
          delivery?.closedRevision &&
          (fresh.state !== "closed" || fresh.revision !== delivery.closedRevision)
        )
          holds[run.runId] = {
            kind: "reopened",
            reason: "Integrated prerequisite reopened or changed; prior delivery is retained",
          };
        else if (
          run.noChange ||
          (fresh.state === "closed" &&
            !delivery?.closedRevision &&
            !ownedClosure &&
            !historicalClosure)
        )
          holds[run.runId] = {
            kind: "outcome",
            reason:
              "No-change or unverified closure requires triage; no integration evidence was created",
          };
        else if (
          current?.route !== "implementation" ||
          !current.admission ||
          !same(current.admission.sourceContent, admitted.sourceContent) ||
          (!delivery?.closedRevision && !ownedClosure && fresh.revision !== admitted.revision)
        )
          holds[run.runId] = {
            kind: "changed",
            reason: "Graph child authorization, requirements or prerequisites changed",
          };
      }
      // Prevent moved work being admitted a second time in another graph, even when the old run is settled.
      for (const run of this.workflow.admissions())
        if (
          !run.supersededBy &&
          run.issue.graphId &&
          run.issue.graphId !== id &&
          memberIds.includes(run.issue.issueId)
        )
          holds[run.runId] = {
            kind: "moved",
            reason:
              "Issue belongs to an existing run in another graph; restore membership before continuing",
          };
      this.options.store.change(id, (g) => {
        g.reconciliation = { revision, holds };
        if (g.activeRunId && holds[g.activeRunId]) delete g.activeRunId;
      });
      const changed =
        graph.graphRevision !== raw.graphRevision ||
        graph.head !== head ||
        Object.keys(holds).length > 0;
      if (changed || graph.finalization?.state === "stale")
        await this.acceptance.invalidate(
          id,
          "Graph observation changed; current requirements must be re-evaluated",
        );
      if (!head) throw Error("Graph branch is inaccessible");
      if (head !== graph.head) {
        const published = Object.values(graph.deliveries).find(
          (d) => d.candidate.commit === head && d.expectedHead === graph.head,
        );
        if (published) {
          // Exact retained publication intent plus remote head recovers our own lost response.
          this.options.store.change(id, (g) => {
            g.head = head;
            g.deliveries[published.source.issueId].published = true;
          });
        } else {
          if (!decision || decision.revision !== revision)
            throw Error("Graph head changed; explicit reconciliation is required");
          if (!(await this.options.git.contains(head, graph.head)))
            throw Error("Changed graph head does not retain the previous published work");
        }
      }
      if (scan.decisions.find((d) => d.issue.issueId === id)?.route !== "coordinator")
        throw Error("Graph specification is not currently authorized");
      if (decision && decision.revision !== revision)
        throw Error("Graph reconciliation decision is stale");
      this.options.store.change(id, (g) => {
        g.graphRevision = raw.graphRevision;
        g.head = head;
        g.containedCommits = contained;
      });
      if (plan.graphRevision !== raw.graphRevision)
        throw Error("Graph changed during prerequisite verification");
      if (contained.length !== graph.integrations.length)
        throw Error("Published prerequisite is missing from current graph head");
      for (const run of runs) {
        const admitted = run.integration?.reevaluation?.issue ?? run.issue;
        const leaf = plan.leaves.find((l) => l.issue.issueId === run.issue.issueId);
        if (
          (admitted.externalDeliveries ?? []).some(
            (old) =>
              !leaf?.externalDeliveries.some(
                (fresh) =>
                  fresh.issueId === old.issueId &&
                  fresh.issueRevision === old.issueRevision &&
                  fresh.id === old.id &&
                  fresh.revision === old.revision &&
                  fresh.mergeCommit === old.mergeCommit,
              ),
          )
        )
          holds[run.runId] = {
            kind: "changed",
            reason: "External prerequisite delivery evidence changed; re-evaluation is required",
          };
        if (
          run.integration &&
          !run.acceptance &&
          !this.observe(id).deliveries[run.issue.issueId]?.published &&
          (run.integration.expectedHead !== head ||
            run.integration.graphRevision !== raw.graphRevision)
        )
          holds[run.runId] ??= {
            kind: "changed",
            reason: "Integration head or graph inputs changed; repeat assembled validation",
          };
      }
      this.options.store.change(id, (g) => {
        g.reconciliation = { revision, holds };
      });
      if (Object.keys(holds).length)
        await this.acceptance.invalidate(id, Object.values(holds)[0].reason);
      if (decision && graph.pullRequest) {
        const pulls = await this.options.github.findPullRequests(graph.repository, graph.branch);
        if (pulls.length !== 1 || pulls[0].state !== "open")
          throw Error(
            "A closed or delivered graph PR cannot be reused; create a follow-up issue for new work",
          );
      }
      for (const runId of decision?.continueRunIds ?? []) {
        const run = this.workflow.observe(runId);
        if (run.issue.graphId !== id) {
          const original = planIssueGraph(scan, run.issue.graphId ?? "");
          if (
            memberIds.includes(run.issue.issueId) ||
            !original.leaves.some((l) => l.issue.issueId === run.issue.issueId)
          )
            throw Error("Moved work must be reconciled in its original graph");
          delete holds[runId];
          this.options.store.change(id, (g) => {
            g.reconciliation = { revision, holds: { ...holds } };
          });
          continue;
        }
        if (!holds[runId]) continue;
        if (run.operatorPaused || run.execution?.operationId)
          throw Error(
            "Wait for the original worker to settle and release operator pause before reconciliation",
          );
        const leaf = plan.leaves.find((l) => l.issue.issueId === run.issue.issueId);
        const previousDelivery = graph.deliveries[run.issue.issueId];
        const delivered =
          !!previousDelivery?.closedRevision &&
          previousDelivery.closedRevision === leaf?.issue.revision &&
          leaf?.issue.state === "closed" &&
          leaf.issue.stateReason === "completed";
        const current = discoverWork(
          {
            ...scan.snapshot,
            issues: scan.snapshot.issues.map((i) =>
              delivered && i.issueId === run.issue.issueId ? { ...i, state: "open" as const } : i,
            ),
          },
          [],
          scan.briefs,
        ).decisions.find((d) => d.issue.issueId === run.issue.issueId);
        if (!leaf || !same(leaf.issue.parentIds, run.issue.parentIds))
          throw Error("Restore original graph membership before continuing moved work");
        if (
          current?.route !== "implementation" ||
          !current.admission ||
          leaf.problems.some(
            (p) =>
              !p.startsWith("Discovery route: already-admitted") &&
              p !== "An earlier issue revision is still active",
          )
        )
          throw Error(
            "Current authorization and prerequisite delivery must be restored before continuation",
          );
        if (run.noChange)
          throw Error("No-change requires triage before another implementation decision");
        for (const dependency of leaf.prerequisiteIds)
          if (
            !this.observe(id).integrations.some(
              (record) =>
                record.issueId === dependency &&
                record.issueRevision ===
                  scan.snapshot.issues.find((i) => i.issueId === dependency)?.revision &&
                this.observe(id).containedCommits.includes(record.commit),
            )
          )
            throw Error(
              "Current internal prerequisite delivery must be contained before continuation",
            );
        const issue = {
          ...current.admission,
          graphId: id,
          startingRevision: head,
          reviewBase: graph.reviewBase,
          ...(leaf.externalDeliveries.length
            ? { externalDeliveries: leaf.externalDeliveries }
            : {}),
        };
        const candidate = run.integration?.candidate ?? run.candidate;
        if (candidate) {
          if (this.observe(id).activeRunId && this.observe(id).activeRunId !== runId)
            throw Error("Another integration owns this graph; continue after it settles");
          const input: IntegrationInput = {
            graphId: id,
            graphRevision: raw.graphRevision,
            branch: graph.branch,
            expectedHead: head,
            reviewBase: head,
            candidate,
            source: await this.options.git.exportBundle(head),
            entry: this.options.entry,
            reevaluation: { id: revision, issue, reason: holds[runId].reason },
          };
          const key = `reevaluate:${runId}:${input.reevaluation?.id}`;
          this.options.store.change(id, (g) => {
            g.operations[key] ??= { state: "pending", receipt: { runId, input } };
          });
          this.applyReevaluation(id, runId, input);
        } else {
          if (current.issue.revision !== run.issue.revision && !run.execution && run.phase === 0)
            await this.workflow.supersedeUnstartedGraphRun(runId, issue);
          else {
            if (
              !same(current.admission.sourceContent, run.issue.sourceContent) ||
              current.issue.revision !== run.issue.revision
            )
              throw Error(
                "Changed work has no settled candidate yet; retain it until its original worker settles or requirements are restored",
              );
            this.workflow.continueGraphRun(runId);
          }
        }
        delete holds[runId];
        this.options.store.change(id, (g) => {
          g.reconciliation = { revision, holds: { ...holds } };
        });
      }
      this.options.store.change(id, (g) => {
        if (Object.keys(holds).length) {
          g.state = "reconciliation";
          g.reason = Object.values(holds)[0].reason;
        } else {
          g.state = "active";
          delete g.reason;
          if (g.finalization?.state === "stale") {
            g.finalizationHistory ??= [];
            g.finalizationHistory.push(g.finalization);
            delete g.finalization;
          }
        }
      });
      await this.frontier(id);
      if (!Object.keys(holds).length) await this.acceptance.advance(id);
    });
    return this.observe(id);
  }
  private assertReconciled(id: string, run?: RunSnapshot) {
    const holds = this.observe(id).reconciliation?.holds ?? {};
    if (!run && Object.keys(holds).length)
      throw Error("Graph has unresolved reconciliation decisions");
    if (run && holds[run.runId]) throw Error(holds[run.runId].reason);
  }
  async frontier(id: string) {
    this.workflow.assertLiveAction();
    const plan = await this.verified(id);
    for (const leaf of plan.eligibleLeaves) {
      if (!leaf.admission) continue;
      if (
        this.workflow
          .admissions()
          .some(
            (r) =>
              r.issue.issueId === leaf.issue.issueId &&
              !r.supersededBy &&
              r.issue.route !== "triage",
          )
      )
        continue;
      if (
        (await this.options.git.branchHead(this.observe(id).branch)) !==
        leaf.admission.startingRevision
      )
        throw Error("Graph changed before dependent admission");
      await this.workflow.admit({ ...leaf.admission, graphId: id });
    }
  }
  async finalize(id: string) {
    await this.locked(id, async () => {
      this.assertReconciled(id);
      await this.acceptance.advance(id);
    });
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
    await this.reconcile(id);
    this.assertReconciled(id, run);
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
    await this.reconcile(id);
    await this.locked(id, async () => {
      let graph = this.observe(id);
      if (graph.activeRunId && graph.activeRunId !== runId) return;
      if (run.status !== "completed") return;
      this.workflow.assertLiveAction(runId);
      this.assertReconciled(id, run);
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
      const key = `publish:${runId}${input.reevaluation ? `:${input.reevaluation.id}` : ""}`;
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
      const closeKey = `close:${runId}${input.reevaluation ? `:${input.reevaluation.id}` : ""}`;
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
        if (!Object.keys(g.reconciliation?.holds ?? {}).length) {
          g.state = "active";
          delete g.reason;
        }
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
    const admitted = run.integration?.reevaluation?.issue ?? run.issue;
    const scan = await this.workflow.graphDiscovery();
    const source = scan.snapshot.issues.find((i) => i.issueId === run.issue.issueId);
    const record = this.observe(run.issue.graphId ?? "");
    const delivered =
      !!run.integration?.reevaluation &&
      source?.state === "closed" &&
      source.stateReason === "completed" &&
      [...Object.values(record.deliveries), ...(record.deliveryHistory ?? [])].some(
        (d) =>
          d.source.issueId === source.issueId &&
          d.closedRevision === source.revision &&
          d.published,
      );
    const decision = discoverWork(
      {
        ...scan.snapshot,
        issues: scan.snapshot.issues.map((i) =>
          delivered && i.issueId === run.issue.issueId ? { ...i, state: "open" as const } : i,
        ),
      },
      [],
      scan.briefs,
    ).decisions.find((item) => item.issue.issueId === run.issue.issueId);
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
      decision.issue.revision !== admitted.revision ||
      !same(decision.admission.sourceContent, admitted.sourceContent) ||
      !leaf ||
      leaf.problems.some(
        (p) =>
          !p.startsWith("Discovery route: already-admitted") &&
          p !== "An earlier issue revision is still active",
      )
    )
      throw Error("Graph child authorization, requirements or prerequisites changed");
    for (const previous of admitted.externalDeliveries ?? []) {
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
    if (!source) throw Error("Graph child is inaccessible");
    return source;
  }
}
