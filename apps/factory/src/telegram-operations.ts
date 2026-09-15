import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GraphReconciliation } from "./graph-integration.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { LocalService } from "./local-service.ts";
import type { StandalonePublicationOptions } from "./standalone-publication.ts";
import type { TelegramCommand, TelegramControl } from "./telegram.ts";
import type { TriageReceipt, TriageRequest } from "./triage.ts";
import type { RunSnapshot } from "./workflow-contracts.ts";

export interface OperatorGraphStatus {
  graphId: string;
  repository: string;
  issueNumber: number;
  head: string;
  state: "active" | "waiting" | "reconciliation" | "reviewable" | "delivered";
  integrated: number;
  total: number;
  pullRequestUrl?: string;
  reconciliation?: GraphReconciliation;
}
export interface TelegramOperationsOptions {
  database: string;
  workflow: IssueWorkflow;
  service: LocalService;
  telegram: TelegramControl;
  graphs?: () => OperatorGraphStatus[];
  triageRecovery?: {
    pending(): { operationId: string; attempted: string[] }[];
    retryUncertain(request: TriageRequest, step: string): Promise<TriageReceipt>;
  };
}
interface CommandReceipt {
  graphDecision?: { graphId: string; revision: string; continueRunIds: string[] };
  command: TelegramCommand;
  targets: string[];
  factory?: boolean;
  factoryAlreadyPaused?: boolean;
  reauthenticated?: boolean;
  state: "pending" | "done";
  result?: string;
  recovery?: {
    kind: "notification" | "triage";
    operationId: string;
    step?: string;
    confirmation?: string;
  };
}
interface Confirmation {
  recovery: NonNullable<CommandReceipt["recovery"]>;
  state: "offered" | "attempted" | "done";
  commandId?: string;
}
const help =
  "Use /scan factory, /status factory, /pause|resume|cancel|retry factory, or /status|pause|resume|cancel|retry run <run-id>. Authentication resume requires the suffix reauthenticated. Factory retry selects current failed/cancelled runs and retains any factory pause; it never re-admits a new snapshot. For uncertain external delivery use /retry notification <operation-id> or /retry triage <operation-id> <step>.";

/** Durable administrative effects reuse the sole workflow's sessions, permits and receipts. */
export class TelegramOperations {
  private options: TelegramOperationsOptions;
  private db: DatabaseSync;
  private queue: Promise<void> = Promise.resolve();
  private polling?: Promise<void>;
  private interval?: ReturnType<typeof setInterval>;
  private sweeping?: Promise<void>;
  constructor(options: TelegramOperationsOptions) {
    if (!isAbsolute(options.database))
      throw new Error("Operator database requires an absolute path");
    this.options = options;
    mkdirSync(dirname(options.database), { recursive: true });
    this.db = new DatabaseSync(options.database);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS operator_commands (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operator_settings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operator_confirmations (id TEXT PRIMARY KEY, data TEXT NOT NULL);`);
  }
  close() {
    if (this.polling || this.sweeping)
      throw new Error("Stop operator polling before closing its store");
    this.db.close();
  }
  async start() {
    if (this.polling) throw new Error("Operator polling is already running");
    await this.recover();
    this.polling = this.options.telegram.run(this.options.workflow, (command) =>
      this.handle(command),
    );
    this.interval = setInterval(() => {
      void this.sweep().catch(() => {});
    }, 5000);
    await this.sweep();
  }
  async stop() {
    clearInterval(this.interval);
    this.options.telegram.stop();
    await this.polling;
    this.polling = undefined;
    await this.queue;
    await this.sweeping;
  }
  handle(command: TelegramCommand): Promise<void> {
    const result = this.queue.then(() => this.execute(command));
    this.queue = result.catch(() => {});
    return result;
  }
  /** Replay safe workflow controls only; uncertain external overrides are never replayed. */
  async recover() {
    for (const row of this.db.prepare("SELECT data FROM operator_commands ORDER BY rowid").all()) {
      const receipt: CommandReceipt = JSON.parse(row.data as string);
      if (receipt.state === "pending") await this.handle(receipt.command);
    }
  }
  private save(receipt: CommandReceipt) {
    this.db
      .prepare(
        "INSERT INTO operator_commands VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(receipt.command.id, JSON.stringify(receipt));
  }
  private prepare(command: TelegramCommand): CommandReceipt {
    const parts = command.argument.trim().split(/\s+/);
    const [kind, identity, step] = parts;
    const run =
      kind === "run"
        ? this.options.workflow.admissions().find((item) => item.runId === identity)
        : undefined;
    const factory = kind === "factory" && parts.length === 1;
    const reauthenticated = step === "reauthenticated" && command.name === "resume";
    const valid =
      factory ||
      (run &&
        (parts.length === 2 || (parts.length === 3 && reauthenticated)) &&
        command.name !== "scan");
    const receipt: CommandReceipt = {
      command,
      targets: run ? [run.runId] : [],
      factory,
      reauthenticated,
      state: valid ? "pending" : "done",
      ...(!valid ? { result: help } : {}),
    };
    if (command.name === "reconcile") {
      const [scope, graphId, revision, ...continueRunIds] = parts;
      const graph = this.options.graphs?.().find((item) => item.graphId === graphId);
      if (
        scope === "graph" &&
        graph?.reconciliation?.revision === revision &&
        continueRunIds.every((id) => id in (graph.reconciliation?.holds ?? {})) &&
        new Set(continueRunIds).size === continueRunIds.length
      ) {
        receipt.graphDecision = { graphId, revision, continueRunIds };
        receipt.state = "pending";
        delete receipt.result;
      } else {
        receipt.state = "done";
        receipt.result =
          "Inspect /status factory for the current graph revision and held run IDs. Use /reconcile graph <graph-id> <exact-revision> [run-id ...] to approve re-evaluation of only those retained runs.";
      }
      return receipt;
    }
    if (factory) {
      receipt.factoryAlreadyPaused = this.options.workflow.factoryPaused();
      const row = this.db
        .prepare("SELECT data FROM operator_settings WHERE id='factory-paused-runs'")
        .get();
      const owned: { runId: string; pauseId: string }[] = row ? JSON.parse(row.data as string) : [];
      receipt.targets =
        command.name === "resume"
          ? owned
              .filter(
                (item) =>
                  this.options.workflow.observe(item.runId).operatorPauseId === item.pauseId,
              )
              .map((item) => item.runId)
          : this.options.workflow
              .admissions()
              .filter((item) =>
                command.name === "retry"
                  ? ["failed", "cancelled"].includes(item.status)
                  : activeRun(item) && (command.name === "cancel" || !item.operatorPaused),
              )
              .map((item) => item.runId);
      if (command.name === "pause" && receipt.factoryAlreadyPaused) receipt.targets = [];
    }
    if (command.name === "retry" && identity && (kind === "notification" || kind === "triage")) {
      const baseLength = kind === "notification" ? 2 : 3;
      if (
        parts.length === baseLength ||
        (parts.length === baseLength + 2 && parts[baseLength] === "confirm")
      ) {
        receipt.recovery = {
          kind,
          operationId: identity,
          ...(kind === "triage" ? { step } : {}),
          ...(parts[baseLength + 1] ? { confirmation: parts[baseLength + 1] } : {}),
        };
        receipt.state = "pending";
        delete receipt.result;
      }
    }
    return receipt;
  }
  private async execute(command: TelegramCommand) {
    const row = this.db.prepare("SELECT data FROM operator_commands WHERE id=?").get(command.id);
    const receipt: CommandReceipt = row ? JSON.parse(row.data as string) : this.prepare(command);
    if (JSON.stringify(receipt.command) !== JSON.stringify(command))
      throw new Error("Operator update identity changed");
    this.save(receipt);
    if (receipt.state === "pending") {
      try {
        if (receipt.graphDecision) {
          const { graphId, revision, continueRunIds } = receipt.graphDecision;
          await this.options.workflow.reconcileGraph(graphId, { revision, continueRunIds });
          receipt.result = `Graph ${graphId}: the exact revision decision was reconciled; retained work will continue only where currently authorized.`;
        } else if (receipt.recovery) receipt.result = await this.recoverExternal(receipt);
        else if (command.name === "scan") {
          await this.options.service.trigger("manual");
          receipt.result = "Factory scan completed. Use /status factory for progress.";
        } else if (command.name === "status")
          receipt.result = this.statusText(receipt.factory ? [] : receipt.targets);
        else {
          if (receipt.factory && (command.name === "pause" || command.name === "cancel")) {
            this.options.workflow.factoryPaused(true);
            if (command.name === "pause" && !receipt.factoryAlreadyPaused)
              this.db
                .prepare(
                  "INSERT INTO operator_settings VALUES ('factory-paused-runs', ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                )
                .run(
                  JSON.stringify(receipt.targets.map((runId) => ({ runId, pauseId: command.id }))),
                );
          }
          // Each run persists its stop intent synchronously before any remote stop is awaited.
          const results = await Promise.allSettled(
            receipt.targets.map((runId) =>
              this.options.workflow.operate({
                id: command.id,
                runId,
                action: command.name as "pause" | "resume" | "cancel" | "retry",
                ...(receipt.reauthenticated ? { reauthenticated: true } : {}),
                ...(receipt.factory && command.name === "resume" ? { restoreOnly: true } : {}),
              }),
            ),
          );
          if (results.some((result) => result.status === "rejected"))
            throw new Error("Some selected runs need attention");
          if (receipt.factory && command.name === "resume")
            this.options.workflow.factoryPaused(false);
          receipt.result = `${command.name} completed for ${receipt.factory ? "factory" : receipt.targets.join(", ")}. ${receipt.targets.length} selected runs. Use /status factory for progress.`;
        }
        receipt.state = "done";
      } catch {
        // A fresh operator decision is needed for auth/classification errors. Persisted stop
        // intents remain the workflow's responsibility and are reconciled by normal recovery.
        receipt.state = "done";
        receipt.result =
          "Command needs attention. Inspect /status factory and resolve the current wait or authorization before issuing a new command. An uncertain external retry is never repeated automatically.";
      }
      this.save(receipt);
    }
    await this.options.telegram
      .sendMessage({
        operationId: `${command.id}:response`,
        text: receipt.result ?? "Command is pending.",
      })
      .catch(() => {});
  }
  private pendingRecovery(recovery: NonNullable<CommandReceipt["recovery"]>) {
    return recovery.kind === "notification"
      ? this.options.telegram.status().uncertain.includes(recovery.operationId)
      : this.options.triageRecovery
          ?.pending()
          .some(
            (item) =>
              item.operationId === recovery.operationId &&
              item.attempted.includes(recovery.step ?? ""),
          );
  }
  private async recoverExternal(receipt: CommandReceipt) {
    const recovery = receipt.recovery;
    if (!recovery) throw new Error("Missing retry identity");
    const exact = { ...recovery };
    delete exact.confirmation;
    if (!recovery.confirmation) {
      if (!this.pendingRecovery(recovery))
        return "No matching uncertain external action. Inspect /status factory.";
      const token = createHash("sha256").update(receipt.command.id).digest("hex").slice(0, 24);
      const confirmation: Confirmation = { recovery: exact, state: "offered" };
      this.db
        .prepare("INSERT OR IGNORE INTO operator_confirmations VALUES (?, ?)")
        .run(token, JSON.stringify(confirmation));
      return `Retrying ${recovery.kind} ${recovery.operationId}${recovery.step ? ` step ${recovery.step}` : ""} may duplicate an already delivered message or remote create. After checking the destination, authorize only this action with /retry ${recovery.kind} ${recovery.operationId}${recovery.step ? ` ${recovery.step}` : ""} confirm ${token}`;
    }
    const row = this.db
      .prepare("SELECT data FROM operator_confirmations WHERE id=?")
      .get(recovery.confirmation);
    const confirmation: Confirmation | undefined = row ? JSON.parse(row.data as string) : undefined;
    if (!confirmation || JSON.stringify(confirmation.recovery) !== JSON.stringify(exact))
      return "Confirmation does not match this exact action. Request a new recovery choice.";
    if (confirmation.state !== "offered")
      return "This confirmation was already attempted. Inspect the external destination; request a new recovery choice if still uncertain.";
    if (!this.pendingRecovery(recovery)) return "The external action no longer needs this retry.";
    let request: TriageRequest | undefined;
    if (recovery.kind === "triage") {
      const run = this.options.workflow
        .admissions()
        .find(
          (item) => item.triage && `${item.triage.checkpointId}:triage` === recovery.operationId,
        );
      if (!run?.triage || run.checkpoint?.answer?.optionId !== "apply")
        throw new Error("Missing original triage approval");
      this.options.workflow.assertLiveAction(run.runId);
      request = {
        operationId: recovery.operationId,
        runId: run.runId,
        issue: run.issue,
        proposal: run.triage.proposal,
      };
    }
    // Persist uncertainty BEFORE the external override. Restart must never repeat it.
    confirmation.state = "attempted";
    confirmation.commandId = receipt.command.id;
    this.db
      .prepare("UPDATE operator_confirmations SET data=? WHERE id=?")
      .run(JSON.stringify(confirmation), recovery.confirmation);
    if (recovery.kind === "notification")
      await this.options.telegram.retryUncertain(recovery.operationId);
    else if (request && recovery.step)
      await this.options.triageRecovery?.retryUncertain(request, recovery.step);
    confirmation.state = "done";
    this.db
      .prepare("UPDATE operator_confirmations SET data=? WHERE id=?")
      .run(JSON.stringify(confirmation), recovery.confirmation);
    return "The specifically authorized external retry completed. Original decision and run identities are retained.";
  }
  /** Called after controlled outcomes and periodically by the single service owner. */
  sweep(): Promise<void> {
    if (this.sweeping) return this.sweeping;
    this.sweeping = this.notifyChanges().finally(() => {
      this.sweeping = undefined;
    });
    return this.sweeping;
  }
  private async notifyChanges() {
    for (const run of this.options.workflow.admissions()) {
      if (run.status === "failed")
        await this.options.telegram
          .sendMessage({
            operationId: `${run.runId}:failure:${run.phase}:${run.execution?.attempt ?? 0}`,
            text: `${runStatus(run)}\nWork stopped. Inspect retained validation/session evidence locally. After resolving the cause, explicitly start a new bounded attempt with /retry run ${run.runId}.`,
          })
          .catch(() => {});
      if (run.publication?.state === "reviewable" && run.publication.pullRequest)
        await this.notifyReviewable({
          operationId: `${run.runId}:publication:notify`,
          runId: run.runId,
          issue: run.issue,
          pullRequest: run.publication.pullRequest,
        }).catch(() => {});
    }
    for (const graph of this.options.graphs?.() ?? []) {
      if (graph.state === "reconciliation")
        await this.options.telegram
          .sendMessage({
            operationId: `graph:${graph.graphId}:reconciliation:${graph.head}`,
            text: `Graph #${graph.issueNumber} needs reconciliation; published work and evidence are retained. Inspect /status factory and the graph's current GitHub membership/authorization before continuing.`,
          })
          .catch(() => {});
      const url = safePullRequest(graph.pullRequestUrl, graph.repository);
      if (graph.state === "reviewable" && url)
        await this.options.telegram
          .sendMessage({
            operationId: `graph:${graph.graphId}:reviewable:${graph.head}:${url}`,
            text: `Graph #${graph.issueNumber} is reviewable: ${url}\nThe maintainer performs the final merge into main.`,
          })
          .catch(() => {});
    }
  }
  /** Wire directly to standalone publication's existing notification receipt. */
  notifyReviewable: StandalonePublicationOptions["notify"] = async (input) => {
    const url = safePullRequest(input.pullRequest.url, input.issue.repository);
    if (!url) throw new Error("Invalid reviewable pull request reference");
    return this.options.telegram.sendMessage({
      operationId: input.operationId,
      text: `Run ${input.runId}: ${input.issue.repository}#${input.issue.number} is reviewable: ${url}\nThe maintainer performs the final merge into main.`,
    });
  };
  private statusText(targets: string[]) {
    const service = this.options.service.status();
    const runs = this.options.workflow
      .admissions()
      .filter((run) => !targets.length || targets.includes(run.runId));
    return [
      `Factory: ${this.options.workflow.factoryPaused() ? "paused" : "active"}, ${service.mode}, ${service.ready ? "ready" : "reconciling"}.`,
      ...runs.map(runStatus),
      ...(targets.length
        ? []
        : (this.options.graphs?.() ?? []).map(
            (graph) =>
              `Graph ${graph.graphId} #${graph.issueNumber}: ${graph.state}; ${graph.integrated}/${graph.total} integrated.${safePullRequest(graph.pullRequestUrl, graph.repository) ? ` ${safePullRequest(graph.pullRequestUrl, graph.repository)}` : ""}${
                graph.reconciliation
                  ? `\nReconciliation revision: ${graph.reconciliation.revision}\n${Object.entries(
                      graph.reconciliation.holds,
                    )
                      .map(([id, hold]) => `${id}: ${hold.kind}: ${hold.reason}`)
                      .join(
                        "\n",
                      )}\nApprove only the listed runs you intend to re-evaluate: /reconcile graph ${graph.graphId} ${graph.reconciliation.revision} [run-id ...]`
                  : ""
              }`,
          )),
      ...this.options.telegram
        .status()
        .uncertain.map(
          (id) =>
            `Notification uncertain: ${id}. /retry notification ${id} explains duplicate risk.`,
        ),
      ...(this.options.triageRecovery?.pending() ?? []).flatMap((item) =>
        item.attempted.map(
          (step) =>
            `Triage action uncertain: ${item.operationId} step ${step}. /retry triage ${item.operationId} ${step} explains duplicate risk.`,
        ),
      ),
      "Reply to the original checkpoint message for decisions. Use /status run <run-id> to select one run.",
    ].join("\n");
  }
}
function safePullRequest(value: string | undefined, repository: string) {
  if (!value || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return undefined;
  try {
    const url = new URL(value);
    return url.origin === "https://github.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      new RegExp(`^/${repository.replace(/[.]/g, "\\.")}/pull/[1-9][0-9]*$`).test(url.pathname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function runStatus(run: RunSnapshot) {
  const pr = safePullRequest(run.publication?.pullRequest?.url, run.issue.repository);
  const wait = run.checkpoint && !run.checkpoint.answer ? `; checkpoint ${run.checkpoint.id}` : "";
  return `Run ${run.runId}: ${run.status}${run.operatorPaused ? " (operator paused)" : ""}; phase ${run.phase}; attempt ${run.execution?.attempt ?? 0}; active time ${Math.floor((run.execution?.consumedMs ?? 0) / 1000)}s${wait}.\n${run.issue.repository}#${run.issue.number}${run.publication ? `; publication ${run.publication.state}` : ""}${pr ? `; ${pr}` : ""}`;
}

function activeRun(run: RunSnapshot) {
  if (["failed", "cancelled"].includes(run.status)) return false;
  if (run.status !== "completed") return true;
  if (!run.candidate) return false;
  if (run.graphPending !== undefined) return run.graphPending;
  return !["reviewable", "delivered"].includes(run.publication?.state ?? "pending");
}
