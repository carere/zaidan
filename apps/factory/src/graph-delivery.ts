import { createHash } from "node:crypto";
import { type DiscoveredIssue, type DiscoveryAdapter, discoverWork } from "./discovery.ts";
import type { DeliveryPullRequest, DeliverySourceAdapter } from "./external-delivery.ts";
import type { GraphRecord, SqliteGraphStore } from "./graph-integration.ts";
import { planIssueGraph } from "./graph-planning.ts";
import type { PublicationGitHub } from "./standalone-publication.ts";

export interface GraphDeliveryOptions {
  source: DeliverySourceAdapter;
  graphs: SqliteGraphStore;
  github: Pick<PublicationGitHub, "findPullRequests">;
  discovery: DiscoveryAdapter;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sourceIdentity = (issue: DiscoveredIssue) => ({
  ...issue,
  revision: undefined,
  updatedAt: undefined,
  state: undefined,
  stateReason: undefined,
});
function accepted(graph: GraphRecord) {
  const final = graph.finalization;
  return (
    ["reviewable", "delivered"].includes(graph.state) &&
    final &&
    ["passed", "reviewable", "delivered"].includes(final.state) &&
    final.evidence?.commit === final.input.head &&
    final.evidence.tree === final.input.tree &&
    graph.head === final.input.head &&
    graph.graphRevision === final.input.graphRevision &&
    graph.graphId === final.input.graphId &&
    graph.branch === final.input.branch
  );
}
/** Local coordinator receipts associate graph members with their PR; GitHub still proves merge.
 * Never infer an association from issue closure, PR prose, old finalizations or worker output.
 */
export function createGraphDeliverySource(options: GraphDeliveryOptions): DeliverySourceAdapter {
  return {
    async read(issue) {
      const source = await options.source.read(issue);
      const records = options.graphs.list();
      // A native closing link does not override withdrawn graph acceptance. This also
      // covers reconciled records whose previous finalization now lives only in history.
      for (const graph of records) {
        if (!source.pullRequests.some((pr) => pr.id === graph.pullRequest?.id)) continue;
        if (
          !accepted(graph) ||
          !graph.finalization?.input.members.some((member) => member.issueId === issue.issueId)
        )
          throw Error("Native graph closing reference lacks current accepted member evidence");
      }
      const candidates = records.filter(
        (graph) =>
          graph.repository === issue.repository &&
          accepted(graph) &&
          graph.finalization?.input.members.some((member) => member.issueId === issue.issueId),
      );
      if (!candidates.length) return source;
      if (candidates.length !== 1) throw Error("Ambiguous retained graph delivery association");
      const graph = candidates[0];
      const final = graph.finalization;
      if (!final || !graph.pullRequest) throw Error("Missing accepted graph PR receipt");
      const prs = await options.github.findPullRequests(graph.repository, graph.branch);
      const pr = prs[0];
      if (
        prs.length !== 1 ||
        !pr ||
        pr.id !== graph.pullRequest.id ||
        pr.number !== graph.pullRequest.number ||
        pr.url !== graph.pullRequest.url ||
        pr.repository !== graph.repository ||
        pr.headRef !== graph.branch ||
        pr.headCommit !== final.input.head ||
        pr.baseRef !== "main" ||
        pr.marker !== graph.marker
      )
        throw Error("Native graph PR differs from the retained accepted delivery association");
      const snapshot = await options.discovery.read();
      const briefs = (await options.discovery.approvedBriefs?.()) ?? [];
      const plan = planIssueGraph(discoverWork(snapshot, [], briefs), graph.graphId);
      const members = [
        ...plan.specificationIds,
        ...plan.leaves.map((leaf) => leaf.issue.issueId),
      ].sort();
      if (
        plan.graphRevision !== final.input.graphRevision ||
        members.some(
          (id) => snapshot.issues.filter((member) => member.issueId === id).length !== 1,
        ) ||
        !same(
          members,
          final.input.members.map((member) => member.issueId),
        ) ||
        !same(
          briefs
            .filter((brief) => members.includes(brief.issueId))
            .sort((a, b) => a.issueId.localeCompare(b.issueId)),
          final.input.briefs,
        )
      )
        throw Error("Accepted graph membership or approved briefs changed before delivery");
      for (const original of final.input.members) {
        const current = snapshot.issues.find((member) => member.issueId === original.issueId);
        if (!current || !same(sourceIdentity(current), sourceIdentity(original)))
          throw Error("Accepted graph sources changed before delivery");
        if (same(current, original)) continue;
        const operation = graph.operations[`parent:${final.input.id}:${original.issueId}`];
        const receipt = operation?.receipt as { revision?: unknown } | undefined;
        if (
          !final.input.specificationIds.includes(original.issueId) ||
          current.state !== "closed" ||
          current.stateReason !== "completed" ||
          operation?.state !== "done" ||
          receipt?.revision !== current.revision
        )
          throw Error("Graph member closure changed or reopened after acceptance");
      }
      if (
        !same(
          snapshot.issues.find((member) => member.issueId === issue.issueId),
          issue,
        )
      )
        throw Error("Prerequisite source changed; scan again before graph delivery");
      if (!same(options.graphs.read(graph.graphId), graph))
        throw Error("Retained graph acceptance changed during delivery verification");
      const delivery: DeliveryPullRequest = {
        id: pr.id,
        url: pr.url,
        repository: pr.repository,
        baseRef: pr.baseRef,
        state: pr.mergedAt && pr.mergeCommit ? "MERGED" : pr.state === "open" ? "OPEN" : "CLOSED",
        mergeCommit: pr.mergeCommit,
        mergedAt: pr.mergedAt,
        revision: createHash("sha256").update(JSON.stringify(pr)).digest("hex"),
        graph: {
          id: graph.graphId,
          revision: final.input.graphRevision,
          acceptance: final.input.id,
          head: final.input.head,
        },
      };
      const native = source.pullRequests.find((pull) => pull.id === delivery.id);
      if (native) {
        for (const key of [
          "url",
          "repository",
          "baseRef",
          "state",
          "mergeCommit",
          "mergedAt",
        ] as const)
          if (native[key] !== delivery[key])
            throw Error("Native delivery PR changed between reads");
      }
      return {
        issue: source.issue,
        pullRequests: [...source.pullRequests.filter((pull) => pull.id !== delivery.id), delivery],
      };
    },
  };
}
