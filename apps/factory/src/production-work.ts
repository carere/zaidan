import { createHash } from "node:crypto";
import type { ScanResult } from "./discovery.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { PublicationGit } from "./publication-git.ts";

export interface ProductionWorkOptions {
  workflow: IssueWorkflow;
  git: PublicationGit;
  enabled(): boolean;
  attention(input: { operationId: string; text: string }): Promise<unknown>;
}

/** Routes already-normalized discovery decisions through the sole workflow boundary.
 * Eve drives phases; this lifecycle finishes standalone outcomes and observes delivery.
 */
export class ProductionWork {
  private options: ProductionWorkOptions;
  private pending?: Promise<void>;
  private triageRevisions = new Set<string>();
  private settledStandalone = new Set<string>();
  constructor(options: ProductionWorkOptions) {
    this.options = options;
  }
  onScan(result: ScanResult): Promise<void> {
    return this.serial(async () => {
      await this.settle(true);
      await this.route(result);
    });
  }
  tick(): Promise<void> {
    return this.serial(async () => {
      if (!this.options.enabled()) return;
      await this.settle(false);
      const changed = this.options.workflow
        .admissions()
        .filter(
          (run) =>
            run.issue.route === "triage" &&
            run.triage?.receipt &&
            run.status === "completed" &&
            !this.triageRevisions.has(run.runId),
        );
      if (changed.length) {
        await this.route(await this.options.workflow.scan());
        for (const run of changed) this.triageRevisions.add(run.runId);
      }
    });
  }
  private serial(action: () => Promise<void>) {
    // A second caller must not consume a discovery result without routing it.
    const next = (this.pending ?? Promise.resolve()).catch(() => {}).then(action);
    this.pending = next;
    return next.finally(() => {
      if (this.pending === next) this.pending = undefined;
    });
  }
  async stop() {
    await this.pending;
  }
  private async guard(id: string, action: () => Promise<unknown>) {
    try {
      await action();
    } catch {
      // Errors from remote adapters may contain secrets. Persist only a stable actionable code.
      await this.options
        .attention({
          operationId: `production:${id}:attention`,
          text: `Factory work ${id} needs reconciliation. Inspect /status factory and current issue authorization; independent work continues.`,
        })
        .catch(() => {});
    }
  }
  private async settle(observeDelivery: boolean) {
    if (!this.options.enabled()) return;
    const workflow = this.options.workflow;
    for (const graph of observeDelivery ? workflow.admittedGraphs() : [])
      if (graph.state !== "delivered")
        await this.guard(`graph:${graph.graphId}`, () => workflow.recoverGraph(graph.graphId));
    for (const run of workflow.admissions())
      if (
        !run.issue.graphId &&
        run.issue.route === "implementation" &&
        run.status === "completed" &&
        run.publication?.state !== "delivered" &&
        (observeDelivery || !this.settledStandalone.has(run.runId))
      )
        await this.guard(`run:${run.runId}`, async () => {
          const result = await workflow.publishStandalone(run.runId);
          if (
            ["reviewable", "delivered", "triage", "reconciliation"].includes(
              workflow.observe(run.runId).publication?.state ?? "",
            )
          )
            this.settledStandalone.add(run.runId);
          return result;
        });
  }
  private async route(result: ScanResult) {
    if (!this.options.enabled()) return;
    const workflow = this.options.workflow;
    for (const decision of result.decisions) {
      const issue = decision.issue;
      if (decision.route === "blocked" || decision.route === "conflict") {
        const identity = createHash("sha256")
          .update(`${issue.issueId}:${issue.revision}:${decision.reason}`)
          .digest("hex");
        await this.options
          .attention({
            operationId: `discovery:${identity}`,
            text: `${issue.repository}#${issue.number}: ${decision.reason ?? "Needs maintainer direction"}`,
          })
          .catch(() => {});
      }
      if (decision.route === "coordinator" && !issue.parentIds.length)
        await this.guard(`graph:${issue.issueId}`, async () => {
          if (!workflow.admittedGraphs().some((graph) => graph.graphId === issue.issueId)) {
            const preview = await workflow.previewGraphAdmission(issue.issueId);
            if (!preview.eligibleLeaves.length) {
              await this.options.attention({
                operationId: `graph:${issue.issueId}:waiting:${preview.graphRevision}`,
                text: `${issue.repository}#${issue.number} has no eligible implementation leaf at current main. Resolve the reported labels or prerequisite delivery, then /scan factory. No empty graph branch was frozen.`,
              });
              return;
            }
          }
          return workflow.admitGraph(issue.issueId);
        });
      const admission = decision.admission;
      if (decision.route === "triage" && admission)
        await this.guard(`triage:${issue.issueId}:${issue.revision}`, async () => {
          const head = await this.options.git.branchHead("main");
          if (!head) throw new Error("Repository main is unavailable");
          return workflow.admit({
            ...admission,
            startingRevision: head,
            reviewBase: head,
          });
        });
      if (decision.route === "implementation" && !issue.parentIds.length && !issue.childIds.length)
        await this.guard(`issue:${issue.issueId}:${issue.revision}`, async () => {
          const head = await this.options.git.branchHead("main");
          if (!head) throw new Error("Repository main is unavailable");
          return workflow.admitStandalone(issue.issueId, {
            startingRevision: head,
            reviewBase: head,
          });
        });
    }
  }
}
