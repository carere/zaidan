import { randomUUID } from "node:crypto";
import type { ResourceSnapshotReference } from "./captured-resources.ts";
import {
  type ApprovedBrief,
  type DiscoveryAdapter,
  discoverWork,
  type ScanResult,
} from "./discovery.ts";
import type { ExternalDeliveryAdapter, ExternalDeliveryResult } from "./external-delivery.ts";
import type { GraphAcceptanceInput } from "./graph-acceptance.ts";
import { GraphCoordinator, type GraphOptions, type IntegrationInput } from "./graph-integration.ts";
import { type GraphIntegrationState, planIssueGraph } from "./graph-planning.ts";
import {
  publishStandaloneRun,
  refreshStandalone,
  type StandalonePublicationOptions,
  validateCoverage,
} from "./standalone-publication.ts";
import { type TriageAdapter, type TriageReceipt, triageApproval } from "./triage.ts";
import type {
  AnswerInput,
  Clock,
  IssueSnapshot,
  NotificationAdapter,
  RunSnapshot,
  WorkerAdapter,
  WorkerOutcome,
  WorkflowEngine,
} from "./workflow-contracts.ts";
import type { Operation, WorkflowStore } from "./workflow-store.ts";

export interface IssueWorkflowOptions {
  store: WorkflowStore;
  graph?: GraphOptions;
  publication?: StandalonePublicationOptions;
  discovery?: DiscoveryAdapter;
  triage?: TriageAdapter;
  externalDelivery?: ExternalDeliveryAdapter;
  engine: WorkflowEngine;
  worker: WorkerAdapter;
  notifications: NotificationAdapter;
  clock?: Clock;
  leaseMs?: number;
  execution?: { workers?: number; modelCalls?: number; budgetMs?: number; permitUrl?: string };
  captureResources?: (
    issue: IssueSnapshot,
  ) => Promise<ResourceSnapshotReference> | ResourceSnapshotReference;
}
/** The single policy boundary. Transports supply snapshots/answers; only workers run models/tools. */
export class IssueWorkflow {
  private options: IssueWorkflowOptions;
  private owner = randomUUID();
  private graphs?: GraphCoordinator;
  private scanning?: Promise<ScanResult>;
  private latestScan?: ScanResult;
  private latestBriefs?: ApprovedBrief[];
  private clock: Clock;
  private stopping = new Map<string, Promise<void>>();
  constructor(options: IssueWorkflowOptions) {
    this.options = options;
    if (options.graph) this.graphs = new GraphCoordinator(this, options.graph);
    this.clock = options.clock ?? { now: Date.now };
    if (options.execution?.permitUrl) this.configureModelPermits(options.execution.permitUrl);
    for (const limit of [
      options.execution?.workers ?? 4,
      options.execution?.modelCalls ?? 4,
      options.execution?.budgetMs ?? 7200000,
    ])
      if (!Number.isSafeInteger(limit) || limit < 1)
        throw new Error("Execution limits must be positive integers");
  }
  async graphDiscovery() {
    const discovery = this.discoveryWithBriefs();
    if (!discovery) throw Error("Discovery is not configured");
    const snapshot = await discovery.read();
    const briefs = await discovery.approvedBriefs?.();
    return { ...discoverWork(snapshot, [], briefs), briefs };
  }
  assertLiveAction(runId?: string) {
    if (runId && ["failed", "cancelled"].includes(this.observe(runId).status))
      throw Error("Issue execution is stopped");
  }
  async admitGraph(id: string) {
    this.assertLiveAction();
    if (!this.graphs) throw Error("Graph adapters are not configured");
    return this.graphs.admit(id);
  }
  admittedGraphs() {
    return this.options.graph?.store.list() ?? [];
  }
  async recoverGraph(id: string) {
    this.assertLiveAction();
    if (!this.graphs) throw Error("Graph adapters are not configured");
    if (this.observeGraph(id).finalization) return this.graphs.finalize(id);
    await this.graphs.admit(id);
    for (const run of this.admissions().filter(
      (run) => run.issue.graphId === id && run.graphPending && run.status === "completed",
    ))
      await this.graphs.advance(run.runId);
    await this.graphs.finalize(id);
    return this.graphs.observe(id);
  }
  observeGraph(id: string) {
    if (!this.graphs) throw Error("Graph adapters are not configured");
    return this.graphs.observe(id);
  }
  async finalizeGraph(id: string) {
    if (!this.graphs) throw Error("Graph adapters are not configured");
    return this.graphs.finalize(id);
  }
  async invalidateGraphAcceptance(id: string, reason: string) {
    if (!this.graphs) throw Error("Graph adapters are not configured");
    return this.graphs.invalidate(id, reason);
  }
  rejectAcceptance(runId: string, reason: string) {
    this.options.store.change(runId, (run) => {
      if (!run.acceptance || run.execution?.operationId) throw Error("Acceptance is not settled");
      run.status = "failed";
      run.reason = reason;
      delete run.acceptanceResult;
    });
  }
  beginAcceptance(runId: string, input: GraphAcceptanceInput) {
    this.options.store.change(runId, (run) => {
      if (run.acceptance) {
        if (JSON.stringify(run.acceptance) !== JSON.stringify(input))
          throw Error("Acceptance inputs changed");
        return;
      }
      if (run.status !== "completed" || run.execution?.operationId)
        throw Error("Integration is not settled");
      run.acceptance = input;
      run.graphPending = true;
      run.phase++;
      run.status = "admitted";
      delete run.checkpoint;
    });
  }
  beginIntegration(runId: string, input: IntegrationInput) {
    this.options.store.change(runId, (run) => {
      if (run.integration) {
        if (JSON.stringify(run.integration) !== JSON.stringify(input))
          throw Error("Integration inputs changed");
        return;
      }
      if (run.status !== "completed" || run.execution?.operationId)
        throw Error("Implementation is not settled");
      run.integration = input;
      run.graphPending = true;
      run.phase++;
      run.status = "admitted";
      delete run.candidate;
    });
  }
  finishIntegration(runId: string) {
    this.options.store.change(runId, (run) => {
      run.graphPending = false;
    });
  }
  validateCandidate(runId: string) {
    validateCoverage(this.observe(runId));
  }
  async validateIntegration(runId: string) {
    const run = this.observe(runId);
    if (!run.integration) throw Error("Missing integration phase");
    validateCoverage(run, run.integration.reviewBase);
  }
  observe(runId: string) {
    return this.options.store.read(runId);
  }
  configureModelPermits(url: string) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "http:" ||
      parsed.hostname !== "host.docker.internal" ||
      !parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password
    )
      throw new Error("Model permits require the local Docker host bridge");
    this.options.execution = { ...this.options.execution, permitUrl: parsed.origin };
  }
  /** Scoped worker capability; model owners include the parent and every delegate. */
  modelPermit(runId: string, token: string, owner: string, action: "acquire" | "release") {
    return this.options.store.change(runId, (run) => {
      const execution = run.execution;
      if (
        !execution?.operationId ||
        execution.stop ||
        execution.token !== token ||
        !owner ||
        owner.length > 200
      )
        return "denied" as const;
      if (action === "release") {
        execution.models = execution.models.filter((item) => item !== owner);
        return "granted" as const;
      }
      if (
        execution.consumedMs +
          Math.max(0, this.clock.now() - (execution.startedAt ?? this.clock.now())) >=
        (this.options.execution?.budgetMs ?? 7200000)
      )
        return "denied" as const;
      if (execution.models.includes(owner)) return "granted" as const;
      if (
        this.admissions().reduce(
          (count, item) => count + (item.execution?.models.length ?? 0),
          0,
        ) >= (this.options.execution?.modelCalls ?? 4)
      )
        return "queued" as const;
      execution.models.push(owner);
      return "granted" as const;
    });
  }
  admissions() {
    return this.options.store.list();
  }
  scan(): Promise<ScanResult> {
    if (this.scanning) return this.scanning;
    this.scanning = this.scanOnce().finally(() => {
      this.scanning = undefined;
    });
    return this.scanning;
  }
  private async scanOnce(): Promise<ScanResult> {
    this.latestScan = undefined;
    this.latestBriefs = undefined;
    if (!this.options.discovery) throw new Error("Discovery adapter is not configured");
    await this.recover();
    const discovery = this.discoveryWithBriefs();
    if (!discovery) throw new Error("Discovery adapter is not configured");
    const snapshot = await discovery.read();
    const briefs = await discovery.approvedBriefs?.();
    const result = discoverWork(snapshot, this.admissions(), briefs);
    this.latestScan = structuredClone(result);
    this.latestBriefs = structuredClone(briefs);
    return result;
  }
  /** Recompute immediately from the last complete scan and current recorded integration evidence. */
  planGraph(rootIssueId: string, integration?: GraphIntegrationState) {
    if (!this.latestScan) throw new Error("A complete discovery scan is required before planning");
    return planIssueGraph(
      discoverWork(structuredClone(this.latestScan.snapshot), this.admissions(), this.latestBriefs),
      rootIssueId,
      integration,
    );
  }
  /** Fresh external evidence bound to this snapshot, receiving base and eventual starting head. */
  async verifyGraph(rootIssueId: string, integration: GraphIntegrationState) {
    const captured = this.latestScan;
    const state = structuredClone(integration);
    const initial = this.planGraph(rootIssueId, state);
    if (
      !captured ||
      !this.options.externalDelivery ||
      initial.graphRevision !== state.graphRevision ||
      state.graphId !== rootIssueId
    )
      return initial;
    const results = new Map<string, ExternalDeliveryResult>();
    const ids = new Set(initial.leaves.flatMap((leaf) => leaf.externalPrerequisiteIds));
    for (const id of ids) {
      const issue = captured.snapshot.issues.find((item) => item.issueId === id);
      if (issue)
        results.set(
          id,
          await this.options.externalDelivery.verify({
            issue: structuredClone(issue),
            repository: captured.snapshot.repository,
            snapshotRevision: captured.snapshot.revision,
            integration: state,
          }),
        );
    }
    if (this.latestScan !== captured)
      throw new Error("Discovery changed during delivery verification; plan again");
    return planIssueGraph(
      discoverWork(structuredClone(captured.snapshot), this.admissions(), this.latestBriefs),
      rootIssueId,
      state,
      results,
    );
  }
  async admitStandalone(
    issueId: string,
    revisions: { startingRevision: string; reviewBase: string },
  ) {
    if (!this.options.discovery || !this.options.publication)
      throw new Error("Standalone adapters are not configured");
    const discovery = this.discoveryWithBriefs();
    if (!discovery) throw new Error("Discovery adapter is not configured");
    const snapshot = await discovery.read();
    const briefs = await discovery.approvedBriefs?.();
    const decision = discoverWork(snapshot, [], briefs).decisions.find(
      (item) => item.issue.issueId === issueId,
    );
    if (
      decision?.route !== "implementation" ||
      !decision.admission ||
      decision.issue.parentIds.length ||
      decision.issue.childIds.length
    )
      throw new Error("Issue is not authorized standalone implementation");
    const active = this.admissions().find(
      (run) =>
        run.issue.issueId === issueId &&
        run.issue.revision !== decision.issue.revision &&
        run.status !== "cancelled" &&
        run.status !== "failed",
    );
    if (active) throw new Error("An earlier revision requires reconciliation before admission");
    const existing = this.admissions().find(
      (run) => run.issue.issueId === issueId && run.issue.revision === decision.issue.revision,
    );
    if (existing) {
      await this.authorizeStandalone(existing.issue);
      return existing;
    }
    const main = await this.options.publication.git.branchHead("main");
    if (!main || main !== revisions.startingRevision || main !== revisions.reviewBase)
      throw new Error("Standalone admission must start from the observed main head");
    const issue = { ...decision.admission, ...revisions };
    await this.authorizeStandalone(issue);
    return this.admit(issue);
  }
  private discoveryWithBriefs(): DiscoveryAdapter | undefined {
    const discovery = this.options.discovery;
    if (!discovery) return undefined;
    return {
      read: () => discovery.read(),
      approvedBriefs: async () => [
        ...((await discovery.approvedBriefs?.()) ?? []),
        ...((await this.options.triage?.approvedBriefs?.()) ?? []),
      ],
    };
  }
  private async authorizeStandalone(issue: IssueSnapshot) {
    await refreshStandalone(this.discoveryWithBriefs(), issue);
    if (issue.dependencyIds?.length) {
      if (!this.options.publication?.verifyPrerequisites)
        throw new Error("Fresh prerequisite delivery verification is required");
      await this.options.publication.verifyPrerequisites(issue);
    }
  }
  async publishStandalone(runId: string) {
    if (!this.options.publication) throw new Error("Publication adapter is not configured");
    return publishStandaloneRun(
      this.options.store,
      this.discoveryWithBriefs(),
      this.options.publication,
      runId,
    );
  }
  async admit(issue: IssueSnapshot) {
    if (!issue.issueId || !issue.revision || !issue.startingRevision || !issue.reviewBase)
      throw new Error("Admission requires stable identity and explicit revisions");
    if (
      issue.externalDeliveries?.some(
        (evidence) =>
          evidence.startingRevision !== issue.startingRevision ||
          evidence.reviewBase !== issue.reviewBase,
      )
    )
      throw new Error(
        "External delivery evidence does not match admission revisions; verify the graph again",
      );
    const existing = this.admissions().find(
      (run) => run.issue.issueId === issue.issueId && run.issue.revision === issue.revision,
    );
    if (!existing && issue.route === "triage" && this.options.triage)
      issue = await this.options.triage.prepare(structuredClone(issue));
    const resources =
      existing?.resources ?? (!existing ? await this.options.captureResources?.(issue) : undefined);
    const run = this.options.store.admit(issue, resources);
    if (issue.graphId)
      this.options.store.change(run.runId, (current) => {
        current.graphPending ??= true;
      });
    await this.start(run.runId);
    return this.observe(run.runId);
  }
  private async start(runId: string) {
    if (this.observe(runId).eveRunId) return;
    // Reconciliation is safe even while a start's owner is alive. Starting again is not.
    const existing = await this.options.engine.find(runId);
    if (existing) {
      this.options.store.change(runId, (run, ops) => {
        run.eveRunId = existing;
        const op = ops.find((item) => item.id === `${runId}:start`);
        if (!op) throw new Error("Missing start intent");
        op.state = "done";
        op.receipt = existing;
      });
      return;
    }
    await this.perform(
      runId,
      `${runId}:start`,
      async () =>
        (await this.options.engine.find(runId)) ?? (await this.options.engine.start({ runId })),
      (run, receipt) => {
        run.eveRunId = receipt as string;
      },
    );
  }
  async drive(runId: string): Promise<RunSnapshot> {
    await this.reconcileWorkers();
    await this.enforceBudgets();
    const run = this.observe(runId);
    if (
      run.status === "waiting-human" &&
      run.triage &&
      run.triage.checkpointId === run.checkpoint?.id &&
      run.checkpoint?.answer?.optionId === "apply"
    ) {
      if (!this.options.triage) throw new Error("Triage publication adapter is not configured");
      const adapter = this.options.triage;
      const id = `${run.checkpoint.id}:triage`;
      const request = { operationId: id, runId, issue: run.issue, proposal: run.triage.proposal };
      this.options.store.change(runId, (_current, ops) => {
        if (!ops.some((op) => op.id === id))
          ops.push({ id, runId, phase: run.phase, kind: "triage", state: "pending" });
      });
      await this.perform(
        runId,
        id,
        async () => (await adapter.reconcile(request)) ?? (await adapter.apply(request)),
        (current, receipt) => {
          if (!current.triage) throw new Error("Missing retained triage proposal");
          current.triage.receipt = receipt as TriageReceipt;
          current.status = "completed";
        },
      );
      const settled = this.observe(runId);
      // The answer was already consumed; Eve polls the authorized publication instead of reusing its human hook.
      return settled.status === "waiting-human"
        ? { ...settled, status: "running" as const }
        : settled;
    }
    if (
      ["admitted", "running", "waiting-human"].includes(run.status) &&
      run.issue.route === "triage" &&
      this.options.triage?.current &&
      !(await this.options.triage.current(run.issue))
    )
      throw new Error(
        "Triage source changed before worker continuation; reconcile the admitted revision",
      );
    if (
      run.status === "admitted" ||
      run.status === "running" ||
      (run.status === "waiting-human" && run.checkpoint?.answer)
    ) {
      if (
        this.options.publication &&
        run.issue.route === "implementation" &&
        !run.issue.parentIds?.length
      )
        await this.authorizeStandalone(run.issue);
      if (run.issue.graphId) {
        try {
          await this.graphs?.authorizeDispatch(run);
        } catch (error) {
          this.options.store.change(runId, (current) => {
            if (!current.execution?.operationId) {
              current.status = "paused";
              current.reason =
                error instanceof Error
                  ? error.message
                  : "Graph authorization requires reconciliation";
            }
          });
          return this.observe(runId);
        }
      }
      const resuming = run.status === "waiting-human";
      const phase = resuming ? run.phase + 1 : run.phase;
      const id = `${runId}:worker:${phase}`;
      const acquired = this.options.store.change(runId, (current) => {
        current.execution ??= {
          consumedMs: 0,
          attempt: 0,
          retries: 0,
          models: [],
        };
        const execution = current.execution;
        if (execution.stop) return false;
        if (execution.operationId) return execution.operationId === id;
        if (execution.consumedMs >= (this.options.execution?.budgetMs ?? 7200000)) {
          current.status = "failed";
          current.reason = "Active execution budget exhausted";
          return false;
        }
        if (
          this.admissions().filter((item) => item.execution?.operationId).length >=
          (this.options.execution?.workers ?? 4)
        )
          return false;
        execution.operationId = id;
        execution.startedAt = this.clock.now();
        execution.token = randomUUID();
        return true;
      });
      if (!acquired) return this.observe(runId);
      this.options.store.change(runId, (current, ops) => {
        if (!ops.some((op) => op.id === id))
          ops.push({ id, kind: resuming ? "resume" : "dispatch", runId, phase, state: "pending" });
        if (!resuming) current.status = "running";
      });
      await this.perform(
        runId,
        id,
        async () => {
          const token = this.observe(runId).execution?.token;
          if (!token) throw new Error("Missing active execution capability");
          const request = {
            operationId: id,
            runId,
            issue: run.issue,
            ...(run.acceptance
              ? { acceptance: run.acceptance }
              : run.integration
                ? { integration: run.integration }
                : {}),
            session: run.session,
            phase,
            ...(this.options.execution?.permitUrl
              ? {
                  permits: {
                    url: this.options.execution.permitUrl,
                    token,
                  },
                }
              : {}),
            ...(run.resources ? { resources: run.resources } : {}),
            ...(resuming ? { answer: run.checkpoint?.answer, checkpoint: run.checkpoint } : {}),
          };
          const timer = setInterval(() => {
            this.enforceBudgets().catch(() => {});
          }, 250);
          timer.unref();
          try {
            return (
              (await this.options.worker.reconcile(id)) ??
              (await (resuming
                ? this.options.worker.resume(request)
                : this.options.worker.dispatch(request)))
            );
          } finally {
            clearInterval(timer);
          }
        },
        (current, receipt, ops) => {
          this.applyWorkerOutcome(current, receipt as WorkerOutcome, phase, ops);
        },
      );
    }
    await this.notify(runId);
    if (this.observe(runId).issue.graphId) await this.graphs?.advance(runId);
    return this.observe(runId);
  }
  private applyWorkerOutcome(
    current: RunSnapshot,
    outcome: WorkerOutcome,
    phase: number,
    ops: Operation[],
  ) {
    const execution = current.execution;
    const stop = execution?.stop;
    if (execution) {
      execution.consumedMs += Math.max(
        0,
        Math.min(outcome.finishedAt ?? this.clock.now(), this.clock.now()) -
          (execution.startedAt ?? this.clock.now()),
      );
      delete execution.startedAt;
      delete execution.operationId;
      delete execution.token;
      execution.models = [];
    }
    current.phase = phase;
    if (stop) {
      current.status = stop.status;
      current.reason = stop.reason;
      return;
    }
    if (
      current.acceptance &&
      ["completed", "no-change", "triage-proposed"].includes(outcome.type)
    ) {
      current.status = "failed";
      current.reason = "Acceptance requires an explicit whole-graph evidence outcome";
      return;
    }
    if (outcome.type === "graph-accepted") {
      if (!current.acceptance) {
        current.status = "failed";
        current.reason = "Unexpected graph acceptance outcome";
      } else {
        current.status = "completed";
        current.acceptanceResult = outcome.evidence;
      }
      return;
    }
    if (outcome.type === "triage-proposed") {
      try {
        if (current.issue.route !== "triage" || !current.checkpoint?.answer)
          throw new Error("Triage proposal requires the original recommendation decision");
        const question = triageApproval(outcome.proposal);
        current.triage = {
          proposal: outcome.proposal,
          checkpointId: `${current.runId}:checkpoint:${phase}`,
        };
        outcome = { type: "checkpoint", question };
      } catch {
        outcome = {
          type: "failed",
          reason: "Invalid triage proposal or missing original recommendation decision",
        };
      }
    }
    if (outcome.type === "checkpoint") {
      current.status = "waiting-human";
      current.checkpoint = {
        id: `${current.runId}:checkpoint:${phase}`,
        phase,
        question: outcome.question,
      };
      ops.push({
        id: `${current.checkpoint.id}:notify`,
        kind: "notify",
        runId: current.runId,
        phase,
        state: "pending",
      });
    } else if (outcome.type === "no-change") {
      current.status = "completed";
      current.noChange = { reason: outcome.reason };
      current.reason = outcome.reason;
    } else if (
      outcome.type === "subscription-paused" ||
      outcome.type === "reauthentication-required"
    ) {
      current.status =
        outcome.type === "subscription-paused" ? "waiting-subscription" : "waiting-authentication";
      current.reason = outcome.reason;
      current.checkpoint = {
        id: `${current.runId}:${current.status}:${phase}`,
        phase,
        question: { prompt: outcome.reason },
      };
      ops.push({
        id: `${current.checkpoint.id}:notify`,
        kind: "notify",
        runId: current.runId,
        phase,
        state: "pending",
      });
    } else if (
      outcome.type === "failed" &&
      outcome.category === "transient" &&
      execution &&
      execution.retries < 1
    ) {
      execution.retries++;
      execution.attempt++;
      execution.consumedMs = 0;
      current.phase++;
      current.status = "admitted";
      current.reason = "Retrying transient infrastructure failure once";
    } else {
      current.status = outcome.type;
      if (outcome.type === "completed") current.candidate = outcome.candidate;
      else current.reason = outcome.reason;
    }
  }
  /** Called by drive and service recovery; a cancelled sandbox must be confirmed before release. */
  async enforceBudgets() {
    const unconfirmed: string[] = [];
    for (const run of this.admissions()) {
      const execution = run.execution;
      if (!execution?.operationId) continue;
      try {
        if (execution.stop)
          await this.stopExecution(run.runId, execution.stop.status, execution.stop.reason);
        else if (
          execution.consumedMs +
            Math.max(0, this.clock.now() - (execution.startedAt ?? this.clock.now())) >=
          (this.options.execution?.budgetMs ?? 7200000)
        )
          await this.stopExecution(run.runId, "failed", "Active execution budget exhausted");
      } catch {
        unconfirmed.push(run.runId);
      }
    }
    return { unconfirmed };
  }
  async cancel(runId: string, reason = "Cancelled by operator") {
    await this.stopExecution(runId, "cancelled", reason);
    return this.observe(runId);
  }
  async pause(runId: string, reason = "Paused by operator") {
    await this.stopExecution(runId, "paused", reason);
    return this.observe(runId);
  }
  /** An operator/service-availability signal resumes the preserved attempt, never changes provider. */
  async resume(runId: string, options: { reauthenticated?: boolean } = {}) {
    this.options.store.change(runId, (run) => {
      if (
        (run.status === "waiting-authentication" || run.pausedFrom === "waiting-authentication") &&
        !options.reauthenticated
      )
        throw new Error("Explicit reauthentication is required");
      if (!["paused", "waiting-subscription", "waiting-authentication"].includes(run.status))
        return;
      if (run.execution?.operationId) throw new Error("Worker stop is still pending");
      if (run.execution) delete run.execution.stop;
      if (run.pausedFrom) {
        run.status = run.pausedFrom;
        delete run.pausedFrom;
        delete run.reason;
        return;
      }
      run.phase++;
      run.status = "admitted";
      delete run.reason;
      delete run.checkpoint;
    });
    return this.observe(runId);
  }
  /** Explicit operator retry starts a fresh bounded attempt in the retained workspace/session. */
  async retry(runId: string) {
    this.options.store.change(runId, (run) => {
      if (!["failed", "cancelled"].includes(run.status))
        throw new Error("Only failed or cancelled work can be retried");
      if (run.execution?.operationId) throw new Error("Worker stop is still pending");
      run.execution = {
        consumedMs: 0,
        attempt: (run.execution?.attempt ?? 0) + 1,
        retries: 0,
        models: [],
      };
      run.phase++;
      run.status = "admitted";
      delete run.reason;
      delete run.checkpoint;
      delete run.pausedFrom;
    });
    return this.observe(runId);
  }
  private stopExecution(
    runId: string,
    status: "failed" | "cancelled" | "paused",
    reason: string,
  ): Promise<void> {
    const pending = this.stopping.get(runId);
    if (pending) return pending;
    const action = this.stopOnce(runId, status, reason).finally(() => this.stopping.delete(runId));
    this.stopping.set(runId, action);
    return action;
  }
  private async stopOnce(runId: string, status: "failed" | "cancelled" | "paused", reason: string) {
    const operationId = this.options.store.change(runId, (run) => {
      const execution = run.execution;
      if (!execution?.operationId) {
        if (status === "paused") {
          if (
            ![
              "admitted",
              "waiting-human",
              "waiting-subscription",
              "waiting-authentication",
            ].includes(run.status)
          )
            return;
          run.pausedFrom = run.status as NonNullable<RunSnapshot["pausedFrom"]>;
        }
        run.status = status;
        run.reason = reason;
        return;
      }
      execution.stop ??= { status, reason };
      return execution.operationId;
    });
    if (!operationId) return;
    if (!this.options.worker.cancel) throw new Error("Worker cannot confirm cancellation");
    const receipt = await this.options.worker.cancel(operationId, reason);
    this.options.store.change(runId, (run, ops) => {
      const op = ops.find((item) => item.id === operationId);
      if (!op) throw new Error("Missing worker operation");
      if (run.execution?.operationId === operationId)
        this.applyWorkerOutcome(run, receipt, op.phase, ops);
      op.state = "done";
      op.receipt = receipt;
    });
  }
  /** Read known operation receipts without starting or resuming any worker. */
  private async reconcileWorkers() {
    for (const run of this.admissions()) {
      const pending = this.options.store.change(run.runId, (_current, ops) =>
        ops.filter((op) => (op.kind === "dispatch" || op.kind === "resume") && op.state !== "done"),
      );
      for (const intent of pending) {
        const outcome = await this.options.worker.reconcile(intent.id);
        if (!outcome) continue;
        this.options.store.change(run.runId, (current, ops) => {
          const op = ops.find((item) => item.id === intent.id);
          if (!op || op.state === "done") return;
          op.state = "done";
          op.receipt = outcome;
          this.applyWorkerOutcome(current, outcome, op.phase, ops);
        });
      }
    }
  }
  private async notify(runId: string) {
    const run = this.observe(runId);
    if (!run.checkpoint) return;
    const checkpoint = run.checkpoint;
    const id = `${checkpoint.id}:notify`;
    await this.perform(
      runId,
      id,
      async () =>
        (await this.options.notifications.reconcile(id)) ??
        (await this.options.notifications.send({
          operationId: id,
          runId,
          issue: run.issue,
          checkpoint,
        })),
      () => {},
    );
  }
  async answer(input: AnswerInput): Promise<"accepted" | "already-answered" | "stale" | "invalid"> {
    const observed = this.observe(input.runId);
    if (
      !observed.checkpoint?.answer &&
      observed.issue.route === "triage" &&
      this.options.triage?.current &&
      !(await this.options.triage.current(observed.issue))
    )
      return "stale";
    const result = this.options.store.change(input.runId, (run, ops) => {
      if (
        run.issue.issueId !== input.issueId ||
        run.issue.revision !== input.revision ||
        run.checkpoint?.id !== input.checkpointId
      )
        return "stale" as const;
      if (run.checkpoint.answer) return "already-answered" as const;
      if (run.status !== "waiting-human") return "stale" as const;
      const question = run.checkpoint.question;
      const optionValid =
        input.answer.optionId !== undefined &&
        question.options?.some((option) => option.id === input.answer.optionId);
      const textValid =
        typeof input.answer.text === "string" &&
        input.answer.text.trim().length > 0 &&
        (question.allowFreeform ?? !question.options?.length);
      if (
        !input.answerId ||
        (!optionValid && !textValid) ||
        (input.answer.optionId !== undefined && input.answer.text !== undefined)
      )
        return "invalid" as const;
      run.checkpoint.answer = input.answer;
      run.checkpoint.answerId = input.answerId;
      ops.push({
        id: `${input.checkpointId}:wake`,
        kind: "wake",
        runId: run.runId,
        phase: run.phase,
        state: "pending",
      });
      return "accepted" as const;
    });
    if (result === "accepted") await this.recoverWake(input.runId);
    return result;
  }
  async recoverWake(runId: string) {
    const run = this.observe(runId);
    if (!run.checkpoint?.answer) return;
    const checkpoint = run.checkpoint;
    await this.perform(
      runId,
      `${checkpoint.id}:wake`,
      async () => {
        await this.options.engine.wake(checkpoint.id, {
          answerId: checkpoint.answerId,
          answer: checkpoint.answer,
        });
        return true;
      },
      () => {},
    );
  }
  async recover() {
    await this.reconcileWorkers();
    await this.enforceBudgets();
    for (const run of this.admissions()) {
      await this.start(run.runId);
      await this.notify(run.runId);
      await this.recoverWake(run.runId);
      const pendingTriage = this.options.store.change(run.runId, (_current, ops) =>
        ops.some((op) => op.kind === "triage" && op.state !== "done"),
      );
      if (
        pendingTriage &&
        run.status === "waiting-human" &&
        run.triage?.checkpointId === run.checkpoint?.id &&
        run.checkpoint?.answer?.optionId === "apply"
      )
        await this.drive(run.runId);
    }
    return this.admissions();
  }
  private async perform(
    runId: string,
    id: string,
    action: () => Promise<unknown>,
    apply: (run: RunSnapshot, receipt: unknown, ops: Operation[]) => void,
  ) {
    const claimed = this.options.store.change(runId, (_run, ops) => {
      const op = ops.find((item) => item.id === id);
      if (!op || op.state === "done") return false;
      if (
        op.state === "claimed" &&
        ((op.leaseUntil ?? 0) > this.clock.now() ||
          (op.kind === "start" && this.alive(op.ownerPid ?? process.pid)))
      )
        return false;
      op.state = "claimed";
      op.owner = this.owner;
      op.ownerPid = process.pid;
      op.leaseUntil = this.clock.now() + (this.options.leaseMs ?? 30000);
      return true;
    });
    if (!claimed) return;
    try {
      const receipt = await action();
      this.options.store.change(runId, (run, ops) => {
        const op = ops.find((item) => item.id === id);
        if (!op) throw new Error("Missing operation intent");
        if (op.owner !== this.owner || op.state !== "claimed") return;
        op.state = "done";
        op.receipt = receipt;
        apply(run, receipt, ops);
      });
    } catch {
      // A lost response is not failure evidence. Keep intent; reconcile on recovery.
      this.options.store.change(runId, (_run, ops) => {
        const op = ops.find((item) => item.id === id);
        if (!op) throw new Error("Missing operation intent");
        if (op.owner === this.owner && op.state === "claimed" && op.kind !== "start") {
          op.state = "pending";
          delete op.owner;
        }
      });
    }
  }
  private alive(pid: number) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
  }
}
