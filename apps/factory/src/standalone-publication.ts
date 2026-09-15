import { createHash, randomUUID } from "node:crypto";
import { readResourceSnapshot } from "./captured-resources.ts";
import { type DiscoveryAdapter, discoverWork } from "./discovery.ts";
import type { PublicationGit } from "./publication-git.ts";
import type { IssueSnapshot, RunSnapshot } from "./workflow-contracts.ts";
import type { Operation, WorkflowStore } from "./workflow-store.ts";

export interface PublishedPullRequest {
  id: string;
  number: number;
  url: string;
  repository: string;
  headRef: string;
  headCommit: string;
  baseRef: string;
  state: "open" | "closed";
  draft: boolean;
  mergedAt: string | null;
  mergeCommit: string | null;
  marker: string;
}
export interface PullRequestInput {
  draft?: boolean;
  repository: string;
  branch: string;
  commit: string;
  title: string;
  body: string;
  marker: string;
}
export interface PublicationGitHub {
  findPullRequests(repository: string, branch: string): Promise<PublishedPullRequest[]>;
  createPullRequest(input: PullRequestInput): Promise<PublishedPullRequest>;
  closeIssue(repository: string, number: number): Promise<void>;
}
export interface PublicationState {
  state: "pending" | "reviewable" | "delivered" | "triage" | "reconciliation";
  branch: string;
  commit: string;
  marker: string;
  reason?: string;
  pullRequest?: PublishedPullRequest;
}
export interface StandalonePublicationOptions {
  git: PublicationGit;
  github: PublicationGitHub;
  /** Idempotent by operationId; publication receipt persists outside worker containers. */
  notify(input: {
    operationId: string;
    runId: string;
    issue: IssueSnapshot;
    pullRequest: PublishedPullRequest;
  }): Promise<string>;
  /** Required for standalone issues with native external dependencies. Must refresh delivery evidence. */
  verifyPrerequisites?(issue: IssueSnapshot): Promise<void>;
}
export async function refreshStandalone(
  discovery: DiscoveryAdapter | undefined,
  issue: IssueSnapshot,
  allowDeliveredClosure = false,
) {
  if (!discovery) throw new Error("Standalone publication requires fresh discovery");
  const snapshot = await discovery.read();
  const briefs = await discovery.approvedBriefs?.();
  const current = snapshot.issues.find((item) => item.issueId === issue.issueId);
  if (!current || current.repository !== issue.repository || current.number !== issue.number)
    throw new Error("Issue identity is inaccessible or changed");
  if (current.parentIds.length || current.childIds.length)
    throw new Error("Standalone membership changed");
  const closed = current.state === "closed";
  if (closed && (!allowDeliveredClosure || current.stateReason !== "completed"))
    throw new Error("Issue closure requires reconciliation");
  if (closed) current.state = "open";
  const decision = discoverWork(snapshot, [], briefs).decisions.find(
    (item) => item.issue.issueId === issue.issueId,
  );
  if (decision?.route !== "implementation" || !decision.admission)
    throw new Error("Current readiness or approved brief does not authorize implementation");
  const fresh = decision.admission;
  if (
    (!allowDeliveredClosure && fresh.revision !== issue.revision) ||
    fresh.sourceContent?.body !== issue.sourceContent?.body ||
    fresh.sourceContent?.brief !== issue.sourceContent?.brief ||
    fresh.briefRef !== issue.briefRef ||
    JSON.stringify([...(fresh.dependencyIds ?? [])].sort()) !==
      JSON.stringify([...(issue.dependencyIds ?? [])].sort())
  )
    throw new Error("Issue requirements, brief or relationships changed");
  return { current, closed };
}
export function validateCoverage(run: RunSnapshot, reviewBase = run.issue.reviewBase) {
  const candidate = run.candidate;
  if (!candidate || !run.resources)
    throw new Error("Missing committed candidate or resource snapshot");
  const manifest = readResourceSnapshot(run.resources);
  if (JSON.stringify(manifest.issue) !== JSON.stringify(run.issue))
    throw Error("Captured admission inputs changed");
  const binding = {
    commit: candidate.commit,
    tree: candidate.tree,
    reviewBase,
    snapshot: run.resources.id,
    issueRevision: run.issue.revision,
  };
  const matches = (value: Record<string, unknown>) =>
    Object.entries(binding).every(([key, expected]) => value[key] === expected);
  if (!matches(candidate) || typeof candidate.tree !== "string")
    throw new Error("Candidate evidence names different admitted inputs");
  const checks = candidate.checks as Record<string, unknown>[] | undefined;
  if (
    !manifest.checks.length ||
    !Array.isArray(checks) ||
    checks.length !== manifest.checks.length ||
    checks.some(
      (check, index) =>
        check.command !== manifest.checks[index] || check.exitCode !== 0 || !matches(check),
    )
  )
    throw new Error("Required validation does not cover candidate");
  const reviews = candidate.reviews as Record<string, unknown>[] | undefined;
  if (
    !Array.isArray(reviews) ||
    reviews.length !== 2 ||
    reviews.some(
      (review) =>
        !matches(review) ||
        review.passed !== true ||
        !Array.isArray(review.findings) ||
        review.findings.length ||
        typeof review.delegateSession !== "string" ||
        !review.delegateSession,
    ) ||
    reviews[0].delegateSession === reviews[1].delegateSession ||
    !["standards", "spec"].every((axis) => reviews.some((review) => review.axis === axis))
  )
    throw new Error("Independent standards and spec reviews do not cover candidate");
}

/** Policy is invoked through IssueWorkflow. Store intents survive uncertain network outcomes. */
export async function publishStandaloneRun(
  store: WorkflowStore,
  discovery: DiscoveryAdapter | undefined,
  options: StandalonePublicationOptions,
  runId: string,
) {
  const initial = store.read(runId);
  if (initial.noChange) {
    const noChange = initial.noChange;
    await refreshStandalone(discovery, initial.issue);
    store.change(runId, (run) => {
      run.publication = {
        state: "triage",
        branch: "",
        commit: "",
        marker: "",
        reason: noChange.reason,
      };
    });
    return store.read(runId);
  }
  const owner = randomUUID();
  const lockId = `${runId}:publication-lock`;
  const claimed = store.change(runId, (run, ops) => {
    if (run.status !== "completed" || !run.candidate)
      throw new Error("Standalone publication requires completed worker candidate");
    let op = ops.find((item) => item.id === lockId);
    if (op?.state === "claimed" && op.ownerPid) {
      try {
        process.kill(op.ownerPid, 0);
        return false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") return false;
      }
    }
    if (!op) {
      op = { id: lockId, kind: "publication", runId, phase: run.phase, state: "pending" };
      ops.push(op);
    }
    op.state = "claimed";
    op.owner = owner;
    op.ownerPid = process.pid;
    return true;
  });
  if (!claimed) return store.read(runId);
  const change = (fn: (run: RunSnapshot, ops: Operation[]) => void) => store.change(runId, fn);
  const intent = (step: string) =>
    store.change(runId, (run, ops) => {
      const id = `${runId}:publication:${step}`;
      let op = ops.find((item) => item.id === id);
      if (!op) {
        op = { id, kind: "publication", runId, phase: run.phase, state: "pending" };
        ops.push(op);
      }
      return op;
    });
  const done = (id: string, receipt: unknown) =>
    change((_run, ops) => {
      const op = ops.find((item) => item.id === id);
      if (!op) throw Error("Missing publication intent");
      op.state = "done";
      op.receipt = receipt;
    });
  const attempted = (id: string) =>
    change((_run, ops) => {
      const op = ops.find((item) => item.id === id);
      if (op) op.state = "claimed";
    });
  try {
    const run = store.read(runId);
    const candidate = run.candidate;
    if (!candidate) throw new Error("Missing completed candidate");
    const identity = createHash("sha256")
      .update(`${run.issue.repository}:${run.issue.issueId}:${run.issue.revision}`)
      .digest("hex")
      .slice(0, 20);
    const publication = run.publication ?? {
      state: "pending" as const,
      branch: `codex/issue-${run.issue.number}-${identity}`,
      commit: candidate.commit,
      marker: `<!-- zaidan-factory:${run.runId}:${candidate.commit} -->`,
    };
    change((current) => {
      current.publication = publication;
    });
    if (publication.commit !== candidate.commit)
      throw Error("Candidate changed after publication intent");
    // Always discover remote results first: uncertainty is not permission to repeat a successful write.
    const pulls = await options.github.findPullRequests(run.issue.repository, publication.branch);
    if (pulls.length > 1) throw Error("Multiple PRs require reconciliation");
    let pr = pulls[0];
    if (
      pr &&
      (pr.marker !== publication.marker ||
        pr.repository !== run.issue.repository ||
        pr.headRef !== publication.branch ||
        pr.repository !== run.issue.repository ||
        pr.headCommit !== candidate.commit ||
        pr.baseRef !== "main")
    )
      throw Error("Remote PR no longer identifies the covered candidate");
    const merged = Boolean(pr?.state === "closed" && pr.mergedAt && pr.mergeCommit);
    const fresh = await refreshStandalone(discovery, run.issue, merged);
    if (pr?.state === "closed" && !merged)
      throw Error("Unmerged PR closure requires reconciliation");
    if (pr?.draft) throw Error("Unexpected draft PR requires reconciliation");
    if (merged) {
      const op = intent("close");
      if (op.state === "done" && !fresh.closed)
        throw Error("Delivered issue reopened; maintainer reconciliation is required");
      if (!fresh.closed) {
        attempted(op.id);
        await options.github.closeIssue(run.issue.repository, run.issue.number);
      }
      done(op.id, { issueId: run.issue.issueId, pullRequest: pr });
      change((current) => {
        current.publication = { ...publication, state: "delivered", pullRequest: pr };
      });
      return store.read(runId);
    }
    validateCoverage(run);
    if (run.issue.dependencyIds?.length) {
      if (!options.verifyPrerequisites)
        throw Error("Fresh prerequisite delivery verification is required");
      await options.verifyPrerequisites(run.issue);
    }
    const imported = await options.git.importCandidate(
      candidate,
      run.issue.reviewBase,
      run.issue.startingRevision,
    );
    if (!imported.meaningful) {
      if (pr) throw Error("Published candidate has no meaningful diff");
      change((current) => {
        current.publication = {
          ...publication,
          state: "triage",
          reason: "No meaningful implementation diff; triage required",
        };
      });
      return store.read(runId);
    }
    const branch = intent("branch");
    const head = await options.git.branchHead(publication.branch);
    if (head !== candidate.commit) {
      if (head) throw Error("Remote branch moved; candidate must be re-evaluated");
      await refreshStandalone(discovery, run.issue);
      attempted(branch.id);
      await options.git.publishBranch(publication.branch, candidate.commit);
      if ((await options.git.branchHead(publication.branch)) !== candidate.commit)
        throw Error("Branch publication is not confirmed");
    }
    done(branch.id, { branch: publication.branch, commit: candidate.commit });
    const create = intent("pr");
    if (!pr) {
      if (create.state !== "pending")
        throw Error("Uncertain PR creation has no visible result; reconcile before retrying");
      await refreshStandalone(discovery, run.issue);
      if ((await options.git.branchHead(publication.branch)) !== candidate.commit)
        throw Error("Branch changed before PR publication");
      attempted(create.id);
      pr = await options.github.createPullRequest({
        repository: run.issue.repository,
        branch: publication.branch,
        commit: candidate.commit,
        title: `Resolve #${run.issue.number}: ${fresh.current.title}`,
        body: `Implements #${run.issue.number}.\n\nCandidate: ${candidate.commit}\nReview base: ${run.issue.reviewBase}\n\nRequired checks and independent standards/spec reviews cover this commit.\n\nCloses #${run.issue.number}\n\n${publication.marker}`,
        marker: publication.marker,
      });
      if (
        pr.repository !== run.issue.repository ||
        pr.headCommit !== candidate.commit ||
        pr.headRef !== publication.branch ||
        pr.baseRef !== "main" ||
        pr.marker !== publication.marker ||
        pr.draft ||
        pr.state !== "open"
      )
        throw Error("Created PR does not match publication intent");
    }
    done(create.id, pr);
    await refreshStandalone(discovery, run.issue);
    const notification = intent("notify");
    if (notification.state !== "done") {
      attempted(notification.id);
      done(
        notification.id,
        await options.notify({
          operationId: notification.id,
          runId,
          issue: run.issue,
          pullRequest: pr,
        }),
      );
    }
    change((current) => {
      current.publication = { ...publication, state: "reviewable", pullRequest: pr };
    });
  } catch (error) {
    change((run) => {
      if (run.publication) {
        run.publication.state = "reconciliation";
        run.publication.reason =
          error instanceof Error ? error.message : "Publication requires reconciliation";
      }
    });
  } finally {
    change((_run, ops) => {
      const op = ops.find((item) => item.id === lockId);
      if (op?.owner === owner) {
        op.state = "done";
        delete op.ownerPid;
      }
    });
  }
  return store.read(runId);
}
