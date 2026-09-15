import { createHash } from "node:crypto";
import { readResourceSnapshot } from "./captured-resources.ts";
import type { ApprovedBrief, DiscoveredIssue } from "./discovery.ts";
import type { BundleReference, GraphOptions, GraphRecord } from "./graph-integration.ts";
import { type GraphPlan, planIssueGraph } from "./graph-planning.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import { type PublishedPullRequest, validateCoverage } from "./standalone-publication.ts";
import type { Candidate } from "./workflow-contracts.ts";

/** Separate immutable phase inputs; the admitted issue/resources/session never change. */
export interface GraphAcceptanceInput {
  id: string;
  graphId: string;
  graphRevision: string;
  branch: string;
  head: string;
  tree: string;
  reviewBase: string;
  source: BundleReference;
  entry: string;
  members: DiscoveredIssue[];
  briefs: ApprovedBrief[];
  specificationIds: string[];
}
export interface GraphAcceptanceReport {
  title: string;
  summary: string;
  validation: string;
}
function acceptanceReport(value: unknown): GraphAcceptanceReport {
  if (!value || typeof value !== "object") throw new InvalidAcceptance("Missing acceptance report");
  const report = value as Record<string, unknown>;
  const unsafe =
    /<!--|-->|\b(?:close[sd]?|fix(?:es|ed)?|resolve[sd]?)\s+(?:#\d+|[\w.-]+\/[\w.-]+#\d+|https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+)/i;
  for (const [key, limit] of [
    ["title", 120],
    ["summary", 2400],
    ["validation", 1200],
  ] as const) {
    const text = report[key];
    if (typeof text !== "string" || !text.trim() || text.length > limit || unsafe.test(text))
      throw new InvalidAcceptance(
        "Acceptance report is missing, unbounded, or contains unsafe publication instructions",
      );
  }
  return report as unknown as GraphAcceptanceReport;
}
export interface GraphFinalization {
  runId: string;
  input: GraphAcceptanceInput;
  state: "running" | "passed" | "failed" | "stale" | "reviewable" | "delivered";
  evidence?: Candidate;
  reason?: string;
}
export interface GraphAcceptanceOptions {
  entry: string;
  /** Must reconcile uncertain sends by this stable operation ID. */
  notify(input: {
    operationId: string;
    graphId: string;
    runId: string;
    pullRequest: PublishedPullRequest;
  }): Promise<string>;
}
class InvalidAcceptance extends Error {}
class RejectedAcceptance extends InvalidAcceptance {}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sourceIdentity = (issue: DiscoveredIssue) => ({
  ...issue,
  revision: undefined,
  state: undefined,
  stateReason: undefined,
  updatedAt: undefined,
});

/** Called under the graph's existing serial owner; this owns no workers or second scheduler. */
export class GraphAcceptance {
  private workflow: IssueWorkflow;
  private options: GraphOptions;
  private verified: (id: string) => Promise<GraphPlan>;
  constructor(
    workflow: IssueWorkflow,
    options: GraphOptions,
    verified: (id: string) => Promise<GraphPlan>,
  ) {
    this.workflow = workflow;
    this.options = options;
    this.verified = verified;
  }
  private read(id: string) {
    const graph = this.options.store.read(id);
    if (!graph) throw new InvalidAcceptance("Unknown graph");
    return graph;
  }
  private async effect(id: string, key: string, action: () => Promise<unknown>) {
    const graph = this.read(id);
    if (graph.operations[key]?.state === "done") return;
    this.workflow.assertLiveAction(graph.finalization?.runId);
    this.options.store.change(id, (g) => {
      g.operations[key] = { state: "attempted" };
    });
    const receipt = await action();
    this.options.store.change(id, (g) => {
      g.operations[key] = { state: "done", receipt };
    });
  }
  private async pull(graph: GraphRecord) {
    const pulls = await this.options.github.findPullRequests(graph.repository, graph.branch);
    if (pulls.length !== 1) throw new InvalidAcceptance("Graph PR is inaccessible or ambiguous");
    const pr = pulls[0];
    if (
      pr.id !== graph.pullRequest?.id ||
      pr.repository !== graph.repository ||
      pr.marker !== graph.marker ||
      pr.headRef !== graph.branch ||
      pr.baseRef !== "main"
    )
      throw new InvalidAcceptance("Graph PR identity changed");
    return pr;
  }
  /** Draft withdrawal deliberately does not require now-revoked implementation authorization. */
  async invalidate(id: string, reason: string) {
    this.options.store.change(id, (g) => {
      g.state = "reconciliation";
      g.reason = reason;
      if (g.finalization) {
        g.finalization.state = "stale";
        g.finalization.reason = reason;
      }
    });
    const graph = this.read(id);
    if (!graph.pullRequest) return;
    const pr = await this.pull(graph);
    if (pr.state !== "open") return;
    if (pr.draft) {
      const key = `withdraw:${graph.finalization?.input.id ?? graph.graphRevision}:${pr.headCommit}`;
      this.options.store.change(id, (g) => {
        if (g.operations[key]) g.operations[key] = { state: "done", receipt: pr };
        g.pullRequest = pr;
      });
      return;
    }
    if (!this.options.github.setDraft)
      throw new InvalidAcceptance("Draft transition adapter is required");
    this.workflow.assertLiveAction();
    const key = `withdraw:${graph.finalization?.input.id ?? graph.graphRevision}:${pr.headCommit}`;
    // A maintainer may make the same PR ready again: fresh observed draft state wins over an old receipt.
    this.options.store.change(id, (g) => {
      g.operations[key] = { state: "attempted" };
    });
    await this.options.github.setDraft(graph.repository, pr.id, true);
    const confirmed = await this.pull(graph);
    if (confirmed.state !== "open" || !confirmed.draft)
      throw new InvalidAcceptance("Graph draft withdrawal is not confirmed");
    this.options.store.change(id, (g) => {
      g.operations[key] = { state: "done", receipt: confirmed };
      g.pullRequest = confirmed;
    });
  }
  async current(input: GraphAcceptanceInput) {
    const plan = await this.verified(input.graphId).catch((error) => {
      throw new InvalidAcceptance(error instanceof Error ? error.message : "Graph changed");
    });
    const snapshot = await this.workflow.graphDiscovery();
    const ids = [...plan.specificationIds, ...plan.leaves.map((l) => l.issue.issueId)].sort();
    const members = ids.map((id) => snapshot.snapshot.issues.find((i) => i.issueId === id));
    const briefs = (snapshot.briefs ?? [])
      .filter((b) => ids.includes(b.issueId))
      .sort((a, b) => a.issueId.localeCompare(b.issueId));
    if (
      plan.specificationIds.some(
        (id) => snapshot.decisions.find((d) => d.issue.issueId === id)?.route !== "coordinator",
      )
    )
      throw new InvalidAcceptance("Specification parent is not authorized");
    if (
      plan.graphRevision !== input.graphRevision ||
      !same(
        ids,
        input.members.map((i) => i.issueId),
      ) ||
      !same(members, input.members) ||
      !same(briefs, input.briefs) ||
      plan.leaves.some((l) => l.status !== "integrated")
    )
      throw new InvalidAcceptance("Whole-graph acceptance sources or membership became stale");
    if (this.read(input.graphId).head !== input.head)
      throw new InvalidAcceptance("Whole-graph acceptance head became stale");
  }
  async advance(id: string) {
    const acceptance = this.options.acceptance;
    if (!acceptance) return;
    try {
      let graph = this.read(id);
      if (!graph.finalization) {
        const plan = await this.verified(id);
        if (
          !plan.leaves.length ||
          plan.leaves.some((l) => l.status !== "integrated") ||
          graph.activeRunId
        )
          return;
        const snapshot = await this.workflow.graphDiscovery();
        const ids = [...plan.specificationIds, ...plan.leaves.map((l) => l.issue.issueId)].sort();
        const members = ids.map((id) => snapshot.snapshot.issues.find((i) => i.issueId === id));
        if (members.some((i) => !i))
          throw new InvalidAcceptance("Acceptance graph sources are inaccessible");
        for (const leaf of plan.leaves) {
          const delivery = graph.deliveries[leaf.issue.issueId];
          if (
            !delivery?.closedRevision ||
            !delivery.published ||
            leaf.issue.revision !== delivery.closedRevision ||
            leaf.issue.state !== "closed" ||
            leaf.issue.stateReason !== "completed"
          )
            throw new InvalidAcceptance(
              "Acceptance requires published and closed implementation leaves",
            );
        }
        if (
          plan.specificationIds.some(
            (id) => snapshot.decisions.find((d) => d.issue.issueId === id)?.route !== "coordinator",
          )
        )
          throw new InvalidAcceptance("Specification parent is not authorized");
        const delivery =
          Object.values(graph.deliveries).find((d) => d.candidate.commit === graph.head) ??
          Object.values(graph.deliveries).at(-1);
        const tree =
          delivery?.candidate.commit === graph.head
            ? delivery.candidate.tree
            : await this.options.git.tree?.(graph.head);
        if (!delivery || typeof tree !== "string")
          throw new InvalidAcceptance("Missing exact assembled tree evidence");
        const run = this.workflow.observe(delivery.runId);
        if (
          !run.resources ||
          !readResourceSnapshot(run.resources).skills.some(
            (s) => s.name === this.options.acceptance?.entry,
          )
        )
          throw new InvalidAcceptance(
            "Final acceptance entry is missing from the original resource snapshot",
          );
        const identity = {
          graphId: id,
          graphRevision: plan.graphRevision,
          branch: graph.branch,
          head: graph.head,
          tree,
          reviewBase: graph.reviewBase,
          entry: acceptance.entry,
          members: members as DiscoveredIssue[],
          briefs: (snapshot.briefs ?? [])
            .filter((b) => ids.includes(b.issueId))
            .sort((a, b) => a.issueId.localeCompare(b.issueId)),
          specificationIds: plan.specificationIds,
        };
        const input = {
          ...identity,
          id: createHash("sha256").update(JSON.stringify(identity)).digest("hex"),
          source: await this.options.git.exportBundle(graph.head),
        };
        this.options.store.change(id, (g) => {
          g.finalization = { runId: run.runId, input, state: "running" };
        });
        graph = this.read(id);
      }
      const finalization = graph.finalization;
      if (!finalization) throw new InvalidAcceptance("Missing graph acceptance intent");
      const { input, runId } = finalization;
      if (finalization.state === "stale") {
        await this.invalidate(id, finalization.reason ?? "Stale graph acceptance");
        return;
      }
      if (
        finalization.state === "failed" &&
        ["failed", "cancelled", "paused"].includes(this.workflow.observe(runId).status)
      )
        return;
      const pr = await this.pull(graph);
      if (pr.state === "closed") {
        if (!pr.mergedAt || !pr.mergeCommit)
          throw new InvalidAcceptance("Graph PR closed without main delivery");
        await this.closeParents(graph, pr);
        return;
      }
      await this.current(input);
      if (pr.headCommit !== input.head)
        throw new InvalidAcceptance("PR head differs from accepted graph");
      const previous = this.workflow.observe(runId);
      if (["failed", "cancelled"].includes(previous.status))
        throw new RejectedAcceptance(previous.reason ?? "Whole-spec acceptance failed");
      this.workflow.assertLiveAction(runId);
      this.workflow.beginAcceptance(runId, input);
      const run = this.workflow.observe(runId);
      if (!run.acceptanceResult) return;
      try {
        validateGraphAcceptance(run);
      } catch (error) {
        throw new RejectedAcceptance(
          error instanceof Error ? error.message : "Invalid graph evidence",
        );
      }
      this.options.store.change(id, (g) => {
        if (g.finalization) {
          g.finalization.evidence = run.acceptanceResult;
          g.finalization.state = "passed";
        }
      });
      if (!this.options.github.setDraft || !this.options.github.updatePullRequest)
        throw new InvalidAcceptance("Graph readiness adapters are required");
      const report = acceptanceReport(run.acceptanceResult.report);
      await this.effect(id, `describe:${input.id}`, async () => {
        await this.current(input);
        this.workflow.assertLiveAction(runId);
        await this.options.github.updatePullRequest?.(graph.repository, pr.number, {
          title: report.title,
          body: `${report.summary}\n\n## Validation\n\n${report.validation}\n\nSpecification parents: ${input.members
            .filter((i) => input.specificationIds.includes(i.issueId))
            .map((i) => `#${i.number}`)
            .join(", ")}.\nIntegrated implementation issues: ${input.members
            .filter((i) => !input.specificationIds.includes(i.issueId))
            .map((i) => `#${i.number}`)
            .join(
              ", ",
            )}.\n\nWhole-spec acceptance, required checks, and independent standards/spec reviews cover commit ${input.head}, tree ${input.tree}, graph revision ${input.graphRevision}.\n\nFinal merge into main remains the maintainer's decision. Specification parents are closed after that delivery is observed.\n\n${graph.marker}`,
        });
        return input.id;
      });
      await this.current(input);
      const before = await this.pull(graph);
      if (before.state !== "open" || before.headCommit !== input.head)
        throw new InvalidAcceptance("PR changed before readiness");
      if (before.draft) {
        this.workflow.assertLiveAction(runId);
        this.options.store.change(id, (g) => {
          g.operations[`ready:${input.id}`] = { state: "attempted" };
        });
        await this.options.github.setDraft(graph.repository, before.id, false);
      }
      const ready = await this.pull(graph);
      await this.current(input);
      if (ready.state !== "open" || ready.draft || ready.headCommit !== input.head)
        throw new InvalidAcceptance("PR readiness not confirmed");
      this.options.store.change(id, (g) => {
        g.operations[`ready:${input.id}`] = { state: "done", receipt: ready };
        g.pullRequest = ready;
      });
      await this.effect(id, `notify:${input.id}`, () =>
        acceptance.notify({
          operationId: `graph:${id}:reviewable:${input.id}`,
          graphId: id,
          runId,
          pullRequest: ready,
        }),
      );
      this.options.store.change(id, (g) => {
        g.state = "reviewable";
        delete g.reason;
        if (g.finalization) g.finalization.state = "reviewable";
      });
      this.workflow.finishIntegration(runId);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Graph acceptance requires reconciliation";
      if (error instanceof InvalidAcceptance) {
        await this.invalidate(id, reason);
        if (error instanceof RejectedAcceptance) {
          const finalization = this.read(id).finalization;
          if (finalization) {
            this.workflow.rejectAcceptance(finalization.runId, reason);
            this.options.store.change(id, (g) => {
              if (g.finalization) g.finalization.state = "failed";
            });
          }
        }
      } else
        this.options.store.change(id, (g) => {
          g.state = "reconciliation";
          g.reason = reason;
        });
    }
  }
  private async deliveredSources(input: GraphAcceptanceInput) {
    const snapshot = await this.workflow.graphDiscovery();
    const plan = planIssueGraph(snapshot, input.graphId);
    const ids = [...plan.specificationIds, ...plan.leaves.map((l) => l.issue.issueId)].sort();
    const briefs = (snapshot.briefs ?? [])
      .filter((b) => ids.includes(b.issueId))
      .sort((a, b) => a.issueId.localeCompare(b.issueId));
    if (
      plan.graphRevision !== input.graphRevision ||
      !same(
        ids,
        input.members.map((i) => i.issueId),
      ) ||
      !same(briefs, input.briefs)
    )
      throw new InvalidAcceptance(
        "Delivered graph membership or approved briefs changed before closure",
      );
    const current = new Map(snapshot.snapshot.issues.map((i) => [i.issueId, i]));
    for (const original of input.members) {
      const fresh = current.get(original.issueId);
      if (
        !fresh ||
        !same(sourceIdentity(fresh), sourceIdentity(original)) ||
        (!input.specificationIds.includes(original.issueId) && !same(fresh, original))
      )
        throw new InvalidAcceptance("Delivered graph sources changed before parent closure");
    }
    return current;
  }
  private async closeParents(graph: GraphRecord, pr: PublishedPullRequest) {
    const finalization = graph.finalization;
    if (
      !finalization?.evidence ||
      !["passed", "reviewable", "delivered"].includes(finalization.state) ||
      pr.headCommit !== finalization.input.head
    )
      throw new InvalidAcceptance("Observed merge lacks exact accepted graph evidence");
    const main = await this.options.git.branchHead("main");
    if (!main || !pr.mergeCommit || !(await this.options.git.contains(main, pr.mergeCommit)))
      throw Error("Observed graph merge is not delivered in current main");
    const input = finalization.input;
    for (const id of [...input.specificationIds].reverse()) {
      const original = input.members.find((i) => i.issueId === id);
      if (!original) throw new InvalidAcceptance("Missing captured specification");
      const key = `parent:${input.id}:${id}`;
      let fresh = (await this.deliveredSources(input)).get(id);
      if (!fresh || !same(sourceIdentity(fresh), sourceIdentity(original)))
        throw new InvalidAcceptance("Specification changed before closure");
      if (fresh.state !== "closed") {
        if (this.read(graph.graphId).operations[key]?.state === "done")
          throw new InvalidAcceptance("Delivered specification reopened");
        if (fresh.revision !== original.revision)
          throw new InvalidAcceptance("Specification revision changed");
        this.workflow.assertLiveAction(finalization.runId);
        this.options.store.change(graph.graphId, (g) => {
          g.operations[key] = { state: "attempted" };
        });
        await this.options.github.closeIssue(graph.repository, original.number);
        fresh = (await this.deliveredSources(input)).get(id);
      }
      if (
        fresh?.state !== "closed" ||
        fresh.stateReason !== "completed" ||
        !same(sourceIdentity(fresh), sourceIdentity(original))
      )
        throw new InvalidAcceptance("Specification closure not confirmed");
      this.options.store.change(graph.graphId, (g) => {
        g.operations[key] = {
          state: "done",
          receipt: { revision: fresh.revision, pullRequest: pr },
        };
      });
    }
    this.options.store.change(graph.graphId, (g) => {
      g.state = "delivered";
      g.pullRequest = pr;
      if (g.finalization) g.finalization.state = "delivered";
    });
    this.workflow.finishIntegration(finalization.runId);
  }
}
export function validateGraphAcceptance(run: ReturnType<IssueWorkflow["observe"]>) {
  const input = run.acceptance,
    evidence = run.acceptanceResult;
  if (!input || !evidence || evidence.commit !== input.head || evidence.tree !== input.tree)
    throw new InvalidAcceptance("Whole-graph acceptance does not cover exact assembled head/tree");
  acceptanceReport(evidence.report);
  validateCoverage({ ...run, candidate: evidence }, input.reviewBase);
}
