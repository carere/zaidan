import { createHash } from "node:crypto";
import type { DiscoveredIssue, ScanResult } from "./discovery.ts";
import type { IssueSnapshot } from "./workflow-contracts.ts";

/** Recorded delivery state supplied by integration, never inferred from issue closure. */
export interface GraphIntegrationState {
  graphId: string;
  /** GraphPlan.graphRevision captured by integration for this head. */
  graphRevision: string;
  /** Published graph head whose commit containment has been verified. */
  head: string;
  reviewBase: string;
  integrations: { issueId: string; issueRevision: string; commit: string }[];
  /** Commits verified reachable from this exact head by the integration adapter. */
  containedCommits: string[];
}
export interface PlannedLeaf {
  issue: DiscoveredIssue;
  prerequisiteIds: string[];
  externalPrerequisiteIds: string[];
  status:
    | "eligible"
    | "waiting-integration"
    | "waiting-external"
    | "blocked"
    | "integrated"
    | "unavailable";
  problems: string[];
  startingRevision?: string;
  admission?: IssueSnapshot;
}
export interface GraphPlan {
  mode: "read-only";
  graphId: string;
  graphRevision: string;
  snapshotRevision: string;
  specificationIds: string[];
  leaves: PlannedLeaf[];
  eligibleLeaves: PlannedLeaf[];
  problems: string[];
}

export function planIssueGraph(
  scan: ScanResult,
  rootIssueId: string,
  integration?: GraphIntegrationState,
): GraphPlan {
  const byId = new Map(scan.snapshot.issues.map((issue) => [issue.issueId, issue]));
  const members = new Map<string, DiscoveredIssue>();
  const problems = new Map<string, Set<string>>();
  const report = (id: string, problem: string) => {
    if (!problems.has(id)) problems.set(id, new Set());
    problems.get(id)?.add(problem);
  };
  const visit = (id: string) => {
    if (members.has(id)) return;
    const issue = byId.get(id);
    if (!issue) {
      report(id, `Issue ${id} is unreadable`);
      return;
    }
    members.set(id, issue);
    for (const child of issue.childIds) visit(child);
    // Include either side of native membership so an incomplete edge cannot hide a leaf.
    for (const child of byId.values()) {
      if (child.parentIds.includes(id)) visit(child.issueId);
    }
  };
  visit(rootIssueId);
  const ordered = [...members.values()].sort((a, b) => a.issueId.localeCompare(b.issueId));
  const children = new Map(
    ordered.map((issue) => [
      issue.issueId,
      [
        ...new Set([
          ...issue.childIds,
          ...ordered
            .filter((child) => child.parentIds.includes(issue.issueId))
            .map((child) => child.issueId),
        ]),
      ],
    ]),
  );
  const isSpecification = (issue: DiscoveredIssue) => !!children.get(issue.issueId)?.length;
  const root = byId.get(rootIssueId);
  if (!root) report(rootIssueId, `Graph root ${rootIssueId} is unreadable`);
  if (root?.parentIds.length)
    report(rootIssueId, "Graph root has parent membership; select its top-level specification");
  const duplicateIds = scan.snapshot.issues
    .filter(
      (issue, index, all) => all.findIndex((item) => item.issueId === issue.issueId) !== index,
    )
    .map((issue) => issue.issueId);
  if (duplicateIds.length)
    report(
      rootIssueId,
      `Ambiguous duplicate issue snapshots: ${[...new Set(duplicateIds)].sort().join(", ")}`,
    );
  for (const issue of ordered) {
    if (issue.parentIds.length > 1)
      report(issue.issueId, `Ambiguous parent membership for ${issue.issueId}`);
    if (issue.repository !== scan.snapshot.repository)
      report(issue.issueId, `Graph member ${issue.issueId} belongs to another repository`);
    for (const parentId of issue.parentIds) {
      const parent = byId.get(parentId);
      if (!parent) report(issue.issueId, `Parent ${parentId} is unreadable`);
      else if (!parent.childIds.includes(issue.issueId))
        report(
          issue.issueId,
          `Inconsistent native membership: ${parentId} does not list ${issue.issueId}`,
        );
    }
    for (const childId of issue.childIds) {
      const child = byId.get(childId);
      if (!child) report(issue.issueId, `Child ${childId} is unreadable`);
      else if (!child.parentIds.includes(issue.issueId)) {
        report(
          issue.issueId,
          `Inconsistent native membership: ${childId} does not name parent ${issue.issueId}`,
        );
        report(
          childId,
          `Inconsistent native membership: ${childId} does not name parent ${issue.issueId}`,
        );
      }
    }
    for (const dependencyId of issue.dependencyIds) {
      if (!byId.has(dependencyId))
        report(issue.issueId, `Prerequisite ${dependencyId} is unreadable`);
    }
  }
  const ancestry = (id: string, path: string[] = []): string[] => {
    if (path.includes(id)) {
      const cycle = [...path.slice(path.indexOf(id)), id];
      for (const member of cycle) report(member, `Native membership cycle: ${cycle.join(" -> ")}`);
      return [];
    }
    return [
      id,
      ...(members.get(id)?.parentIds ?? []).flatMap((parent) => ancestry(parent, [...path, id])),
    ];
  };
  // Collect cycles before computing inherited problems, including graphs with no leaves.
  for (const issue of ordered) ancestry(issue.issueId);
  const graphRevision = createHash("sha256")
    .update(
      JSON.stringify(
        ordered.map((issue) => ({
          issueId: issue.issueId,
          contentRevision: issue.contentRevision,
          parentIds: [...issue.parentIds].sort(),
          childIds: [...issue.childIds].sort(),
          dependencyIds: [...issue.dependencyIds].sort(),
        })),
      ),
    )
    .digest("hex");
  const validHead =
    integration?.graphId === rootIssueId &&
    integration.graphRevision === graphRevision &&
    !!integration.head &&
    !!integration.reviewBase;
  const implementationDescendants = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [];
    const issue = members.get(id);
    if (!issue) return [];
    if (!isSpecification(issue)) return [id];
    return (children.get(id) ?? []).flatMap((child) =>
      implementationDescendants(child, new Set([...seen, id])),
    );
  };
  const inheritedDependencies = (issue: DiscoveredIssue, seen = new Set<string>()): string[] => {
    if (seen.has(issue.issueId)) return [];
    const ancestors = new Set([...seen, issue.issueId]);
    return [
      ...issue.dependencyIds,
      ...issue.parentIds.flatMap((id) => {
        const parent = members.get(id);
        return parent ? inheritedDependencies(parent, ancestors) : [];
      }),
    ];
  };
  const integrated = (issue: DiscoveredIssue | undefined) =>
    !!issue &&
    validHead &&
    integration?.integrations.some(
      (record) =>
        record.issueId === issue.issueId &&
        record.issueRevision === issue.revision &&
        !!record.commit &&
        integration.containedCommits.includes(record.commit),
    );
  const inheritedProblems = (id: string): string[] =>
    ancestry(id).flatMap((ancestor) => [...(problems.get(ancestor) ?? [])]);
  const descendantProblems = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [];
    return [
      ...inheritedProblems(id),
      ...(members.get(id)?.childIds ?? []).flatMap((child) =>
        descendantProblems(child, new Set([...seen, id])),
      ),
    ];
  };
  const leafProblems = new Map(
    ordered
      .filter((issue) => !isSpecification(issue))
      .map((issue) => [
        issue.issueId,
        [
          ...inheritedProblems(issue.issueId),
          ...inheritedDependencies(issue).flatMap((id) =>
            members.has(id) ? descendantProblems(id) : [],
          ),
        ],
      ]),
  );
  if (validHead && integration) {
    for (const issue of ordered) {
      const commits = new Set(
        integration.integrations
          .filter(
            (record) => record.issueId === issue.issueId && record.issueRevision === issue.revision,
          )
          .map((record) => record.commit),
      );
      if (commits.size > 1)
        leafProblems
          .get(issue.issueId)
          ?.push(`Ambiguous integration evidence for ${issue.issueId}`);
    }
  }
  const edges = new Map(
    ordered
      .filter((issue) => !isSpecification(issue))
      .map((issue) => [
        issue.issueId,
        [
          ...new Set(inheritedDependencies(issue).flatMap((id) => implementationDescendants(id))),
        ].sort(),
      ]),
  );
  const cycleProblem = (id: string, path: string[] = []): string | undefined => {
    if (path.includes(id))
      return `Expanded dependency cycle: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`;
    for (const prerequisite of edges.get(id) ?? []) {
      const problem = cycleProblem(prerequisite, [...path, id]);
      if (problem) return problem;
    }
    return undefined;
  };
  const prerequisiteProblems = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [];
    return [
      ...(leafProblems.get(id) ?? []),
      ...(edges.get(id) ?? []).flatMap((dependency) =>
        prerequisiteProblems(dependency, new Set([...seen, id])),
      ),
    ];
  };
  const allPrerequisites = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [];
    const dependencies = edges.get(id) ?? [];
    return [
      ...dependencies,
      ...dependencies.flatMap((dependency) => allPrerequisites(dependency, new Set([...seen, id]))),
    ];
  };
  const leaves = ordered
    .filter((issue) => !isSpecification(issue))
    .map((issue): PlannedLeaf => {
      const prerequisites = [...new Set(allPrerequisites(issue.issueId))].sort();
      const base = {
        issue,
        prerequisiteIds: prerequisites,
        externalPrerequisiteIds: [
          ...new Set(
            [issue.issueId, ...prerequisites]
              .flatMap((id) => {
                const source = members.get(id);
                return source ? inheritedDependencies(source) : [];
              })
              .filter((id) => !members.has(id) && byId.has(id)),
          ),
        ].sort(),
      };
      const cycle = cycleProblem(issue.issueId);
      const blockers = [
        ...new Set([
          ...(problems.get(rootIssueId) ?? []),
          ...prerequisiteProblems(issue.issueId),
          ...(cycle ? [cycle] : []),
        ]),
      ];
      if (blockers.length) return { ...base, status: "blocked", problems: blockers };
      if (base.externalPrerequisiteIds.length)
        return {
          ...base,
          status: "waiting-external",
          problems: base.externalPrerequisiteIds.map(
            (id) => `External prerequisite ${id} requires delivery evidence in the receiving base`,
          ),
        };
      if (integrated(issue)) return { ...base, status: "integrated", problems: [] };
      const decision = scan.decisions.find((item) => item.issue.issueId === issue.issueId);
      if (decision?.route !== "implementation" || !decision.admission) {
        return {
          ...base,
          status: "unavailable",
          problems: [decision?.reason ?? `Discovery route: ${decision?.route}`],
        };
      }
      if (!validHead || !integration) {
        return {
          ...base,
          status: "waiting-integration",
          problems: ["A verified head for the current graph is required"],
        };
      }
      const missing = prerequisites.filter((id) => !integrated(members.get(id)));
      if (missing.length)
        return {
          ...base,
          status: "waiting-integration",
          problems: missing.map(
            (id) => `Prerequisite ${id} has no current integration contained in the graph head`,
          ),
        };
      return {
        ...base,
        status: "eligible",
        problems: [],
        startingRevision: integration.head,
        admission: {
          ...decision.admission,
          startingRevision: integration.head,
          reviewBase: integration.reviewBase,
        },
      };
    });
  return {
    mode: "read-only",
    graphId: rootIssueId,
    graphRevision,
    snapshotRevision: scan.snapshot.revision,
    specificationIds: ordered
      .filter((issue) => isSpecification(issue))
      .map((issue) => issue.issueId),
    leaves,
    eligibleLeaves: leaves.filter((leaf) => leaf.status === "eligible"),
    problems: [
      ...new Set(
        [...problems.values()]
          .flatMap((items) => [...items])
          .concat(
            leaves.filter((leaf) => leaf.status === "blocked").flatMap((leaf) => leaf.problems),
          ),
      ),
    ],
  };
}
