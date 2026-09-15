import { randomUUID } from "node:crypto";
import type { ResourceSnapshotReference } from "./captured-resources.ts";
import {
  type ApprovedBrief,
  type DiscoveryAdapter,
  discoverWork,
  type ScanResult,
} from "./discovery.ts";
import type { ExternalDeliveryAdapter, ExternalDeliveryResult } from "./external-delivery.ts";
import { type GraphIntegrationState, planIssueGraph } from "./graph-planning.ts";
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
  discovery?: DiscoveryAdapter;
  externalDelivery?: ExternalDeliveryAdapter;
  engine: WorkflowEngine;
  worker: WorkerAdapter;
  notifications: NotificationAdapter;
  clock?: Clock;
  leaseMs?: number;
  captureResources?: (
    issue: IssueSnapshot,
  ) => Promise<ResourceSnapshotReference> | ResourceSnapshotReference;
}
/** The single policy boundary. Transports supply snapshots/answers; only workers run models/tools. */
export class IssueWorkflow {
  private options: IssueWorkflowOptions;
  private owner = randomUUID();
  private scanning?: Promise<ScanResult>;
  private latestScan?: ScanResult;
  private latestBriefs?: ApprovedBrief[];
  private clock: Clock;
  constructor(options: IssueWorkflowOptions) {
    this.options = options;
    this.clock = options.clock ?? { now: Date.now };
  }
  observe(runId: string) {
    return this.options.store.read(runId);
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
    await this.reconcileWorkers();
    await this.recover();
    const snapshot = await this.options.discovery.read();
    const briefs = await this.options.discovery.approvedBriefs?.();
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
    const resources =
      existing?.resources ?? (!existing ? await this.options.captureResources?.(issue) : undefined);
    const run = this.options.store.admit(issue, resources);
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
    const run = this.observe(runId);
    if (
      run.status === "admitted" ||
      run.status === "running" ||
      (run.status === "waiting-human" && run.checkpoint?.answer)
    ) {
      const resuming = run.status === "waiting-human";
      const phase = resuming ? run.phase + 1 : run.phase;
      const id = `${runId}:worker:${phase}`;
      this.options.store.change(runId, (current, ops) => {
        if (!ops.some((op) => op.id === id))
          ops.push({ id, kind: resuming ? "resume" : "dispatch", runId, phase, state: "pending" });
        if (!resuming) current.status = "running";
      });
      await this.perform(
        runId,
        id,
        async () => {
          const request = {
            operationId: id,
            runId,
            issue: run.issue,
            session: run.session,
            phase,
            ...(run.resources ? { resources: run.resources } : {}),
            ...(resuming ? { answer: run.checkpoint?.answer, checkpoint: run.checkpoint } : {}),
          };
          return (
            (await this.options.worker.reconcile(id)) ??
            (await (resuming
              ? this.options.worker.resume(request)
              : this.options.worker.dispatch(request)))
          );
        },
        (current, receipt, ops) => {
          this.applyWorkerOutcome(current, receipt as WorkerOutcome, phase, ops);
        },
      );
    }
    await this.notify(runId);
    return this.observe(runId);
  }
  private applyWorkerOutcome(
    current: RunSnapshot,
    outcome: WorkerOutcome,
    phase: number,
    ops: Operation[],
  ) {
    current.phase = phase;
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
    } else {
      current.status = outcome.type;
      if (outcome.type === "completed") current.candidate = outcome.candidate;
      else current.reason = outcome.reason;
    }
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
      if (!input.answerId || (!optionValid && !textValid)) return "invalid" as const;
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
    for (const run of this.admissions()) {
      await this.start(run.runId);
      await this.notify(run.runId);
      await this.recoverWake(run.runId);
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
