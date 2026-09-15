import type { IssueSnapshot, RunSnapshot } from "./workflow-contracts.ts";

/** A complete native issue snapshot. No Git revision is guessed by discovery. */
export interface DiscoveredIssue {
  issueId: string;
  databaseId?: number;
  revision: string;
  contentRevision: string;
  repository: string;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  stateReason: string | null;
  labels: string[];
  parentIds: string[];
  childIds: string[];
  dependencyIds: string[];
  sourceRef: string;
  updatedAt: string;
}
export interface DiscoverySnapshot {
  repository: string;
  revision: string;
  issues: DiscoveredIssue[];
}
export interface ApprovedBrief {
  issueId: string;
  contentRevision: string;
  ref: string;
  content: string;
}
export interface DiscoveryAdapter {
  read(): Promise<DiscoverySnapshot>;
  approvedBriefs?(): Promise<ApprovedBrief[]>;
}
export interface DiscoveryDecision {
  issue: DiscoveredIssue;
  route:
    | "triage"
    | "implementation"
    | "coordinator"
    | "ignored"
    | "conflict"
    | "blocked"
    | "already-admitted";
  reason?: string;
  runId?: string;
  brief?: ApprovedBrief;
  /** Captured input only; caller must verify and supply Git revisions before admission. */
  admission?: Omit<IssueSnapshot, "startingRevision" | "reviewBase">;
}
export interface ScanResult {
  snapshot: DiscoverySnapshot;
  decisions: DiscoveryDecision[];
  /** Proposals only: publication and live dispatch require later rollout gates. */
  mode: "read-only";
}
const workflowLabels = new Set([
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
]);

/** Existing GitHub ready-for-agent is the approval; no second local approval step. */
function bodyBrief(issue: DiscoveredIssue): ApprovedBrief | undefined {
  const body = issue.body.replace(/<!--[\s\S]*?-->/g, "").trim();
  const sections = [...body.matchAll(/^#{1,6}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/gm)];
  const scope = sections.some(
    (match) =>
      /^(what to build|problem statement|specification|agent brief|scope|solution)$/i.test(
        match[1].trim(),
      ) && match[2].trim().length > 0,
  );
  const acceptance = sections.some(
    (match) =>
      /^(acceptance criteria|testing decisions|validation|testing|test plan)$/i.test(
        match[1].trim(),
      ) && match[2].trim().length > 0,
  );
  if (!scope || !acceptance) return undefined;
  return {
    issueId: issue.issueId,
    contentRevision: issue.contentRevision,
    ref: issue.sourceRef,
    content: body,
  };
}
export function discoverWork(
  snapshot: DiscoverySnapshot,
  runs: RunSnapshot[],
  briefs: ApprovedBrief[] = [],
): ScanResult {
  const byId = new Map(snapshot.issues.map((issue) => [issue.issueId, issue]));
  const approved = (issue: DiscoveredIssue) =>
    briefs.find(
      (item) =>
        item.issueId === issue.issueId &&
        item.contentRevision === issue.contentRevision &&
        item.content.trim() &&
        item.ref.trim(),
    ) ?? bodyBrief(issue);
  const admission = (
    issue: DiscoveredIssue,
    route: "triage" | "implementation",
    brief?: ApprovedBrief,
  ): DiscoveryDecision["admission"] => {
    const specifications: { issueId: string; body: string; brief?: string }[] = [];
    const seen = new Set([issue.issueId]);
    const visit = (current: DiscoveredIssue) => {
      for (const id of current.parentIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        const parent = byId.get(id);
        if (!parent) continue;
        specifications.push({
          issueId: id,
          body: parent.body,
          ...(approved(parent) ? { brief: approved(parent)?.content } : {}),
        });
        visit(parent);
      }
    };
    visit(issue);
    return {
      issueId: issue.issueId,
      revision: issue.revision,
      repository: issue.repository,
      number: issue.number,
      labels: [...issue.labels],
      parentIds: [...issue.parentIds],
      dependencyIds: [...issue.dependencyIds],
      sourceRef: issue.sourceRef,
      ...(brief ? { briefRef: brief.ref } : {}),
      route,
      sourceContent: {
        body: issue.body,
        ...(brief ? { brief: brief.content } : {}),
        specifications,
      },
    };
  };
  const parentProblem = (issue: DiscoveredIssue, seen = new Set<string>()): string | undefined => {
    if (seen.has(issue.issueId)) return "Native parent membership contains a cycle";
    const ancestors = new Set([...seen, issue.issueId]);
    for (const id of issue.parentIds) {
      const parent = byId.get(id);
      if (!parent) return `Parent ${id} is unreadable`;
      const labels = [...new Set(parent.labels.filter((label) => workflowLabels.has(label)))];
      if (labels.length !== 1 || labels[0] !== "ready-for-agent" || !approved(parent))
        return `Parent ${id} requires an approved brief and ready-for-agent`;
      const problem = parentProblem(parent, ancestors);
      if (problem) return problem;
    }
    return undefined;
  };
  return {
    mode: "read-only",
    snapshot,
    decisions: snapshot.issues.map((issue): DiscoveryDecision => {
      if (issue.repository !== snapshot.repository || issue.state !== "open")
        return { issue, route: "ignored" };
      const labels = [...new Set(issue.labels.filter((label) => workflowLabels.has(label)))];
      if (labels.length > 1)
        return {
          issue,
          route: "conflict",
          reason: `Conflicting workflow labels: ${labels.sort().join(", ")}`,
        };
      const existing = runs.find(
        (run) => run.issue.issueId === issue.issueId && run.issue.revision === issue.revision,
      );
      if (existing) return { issue, route: "already-admitted", runId: existing.runId };
      const active = runs.find(
        (run) =>
          run.issue.issueId === issue.issueId &&
          ["admitted", "running", "waiting-human"].includes(run.status),
      );
      if (active)
        return {
          issue,
          route: "blocked",
          runId: active.runId,
          reason: "An earlier issue revision is still active",
        };
      if (labels[0] === "needs-triage")
        return { issue, route: "triage", admission: admission(issue, "triage") };
      if (labels[0] !== "ready-for-agent") return { issue, route: "ignored" };
      const brief = approved(issue);
      if (!brief)
        return { issue, route: "blocked", reason: "A usable approved agent brief is required" };
      const problem = parentProblem(issue);
      if (problem) return { issue, route: "blocked", reason: problem };
      if (issue.childIds.length) return { issue, route: "coordinator", brief };
      return {
        issue,
        route: "implementation",
        brief,
        admission: admission(issue, "implementation", brief),
      };
    }),
  };
}
