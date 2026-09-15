import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DiscoveredIssue } from "./discovery.ts";
import type { GraphIntegrationState } from "./graph-planning.ts";

export interface DeliveryPullRequest {
  id: string;
  url: string;
  repository: string;
  revision: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  baseRef: string;
  mergeCommit: string | null;
  mergedAt: string | null;
}
export interface DeliverySource {
  issue: Pick<
    DiscoveredIssue,
    "issueId" | "repository" | "number" | "title" | "body" | "updatedAt" | "state" | "stateReason"
  >;
  /** Native closing references, never arbitrary mentions or agent-authored claims. */
  pullRequests: DeliveryPullRequest[];
}
export interface DeliverySourceAdapter {
  read(issue: DiscoveredIssue): Promise<DeliverySource>;
}
export interface ExternalDeliveryEvidence extends DeliveryPullRequest {
  issueId: string;
  issueRevision: string;
  graphId: string;
  graphRevision: string;
  snapshotRevision: string;
  reviewBase: string;
  startingRevision: string;
  mergeCommit: string;
}
export type ExternalDeliveryResult =
  | { status: "verified"; evidence: ExternalDeliveryEvidence }
  | { status: "waiting" | "clarification"; problem: string };
export interface ExternalDeliveryAdapter {
  verify(input: {
    issue: DiscoveredIssue;
    repository: string;
    snapshotRevision: string;
    integration: GraphIntegrationState;
  }): Promise<ExternalDeliveryResult>;
}
export interface ExternalDeliveryOptions {
  /** Coordinator-owned bare object store, outside every agent-writable mount. No worker checkout. */
  trustedGitDirectory: string;
  github: DeliverySourceAdapter;
}
const execute = promisify(execFile);
const oid = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** Read-only evidence checks. Object import/fetch belongs to trusted integration, not this verifier. */
export function createExternalDelivery(options: ExternalDeliveryOptions): ExternalDeliveryAdapter {
  async function git(args: string[]) {
    const { stdout } = await execute(
      "git",
      [
        "--no-replace-objects",
        "--git-dir",
        options.trustedGitDirectory,
        "-c",
        "core.hooksPath=/dev/null",
        ...args,
      ],
      {
        env: {
          PATH: process.env.PATH,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_TERMINAL_PROMPT: "0",
          GIT_NO_LAZY_FETCH: "1",
        },
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      },
    );
    return stdout.trim();
  }
  async function contains(head: string, commit: string) {
    if (!oid.test(head) || !oid.test(commit))
      throw new Error("Delivery requires full immutable Git commit IDs");
    await git(["cat-file", "-e", `${head}^{commit}`]);
    await git(["cat-file", "-e", `${commit}^{commit}`]);
    try {
      await git(["merge-base", "--is-ancestor", commit, head]);
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === 1) return false;
      throw error;
    }
  }
  return {
    async verify({ issue, repository, snapshotRevision, integration }) {
      try {
        const source = await options.github.read(issue);
        for (const key of [
          "issueId",
          "repository",
          "number",
          "title",
          "body",
          "updatedAt",
          "state",
          "stateReason",
        ] as const) {
          if (source.issue[key] !== issue[key])
            throw new Error("Prerequisite source changed; scan again before verifying delivery");
        }
        if (issue.state === "closed" && issue.stateReason !== "completed")
          throw new Error(
            `Closure reason ${issue.stateReason ?? "unknown"} does not prove completion`,
          );
        if (issue.state !== "closed")
          return {
            status: "waiting",
            problem: `External prerequisite ${issue.issueId} remains open`,
          };
        if (source.pullRequests.length > 1)
          throw new Error("Ambiguous closing PR delivery evidence");
        const pr = source.pullRequests[0];
        if (pr?.state !== "MERGED" || !pr.mergeCommit || !pr.mergedAt)
          return {
            status: "waiting",
            problem: `External prerequisite ${issue.issueId} has no verified merged closing PR`,
          };
        if (pr.repository !== repository)
          throw new Error(
            "Delivery PR targets another repository; maintainer delivery mapping required",
          );
        if ((await git(["rev-parse", "--is-bare-repository"])) !== "true")
          throw new Error("Delivery Git directory must be a coordinator-owned bare repository");
        if (!(await contains(integration.reviewBase, pr.mergeCommit)))
          return {
            status: "waiting",
            problem: `External prerequisite ${issue.issueId} delivery is absent from the receiving base`,
          };
        if (!(await contains(integration.head, pr.mergeCommit)))
          return {
            status: "waiting",
            problem: `External prerequisite ${issue.issueId} delivery is absent from the worker starting revision`,
          };
        return {
          status: "verified",
          evidence: {
            ...pr,
            mergeCommit: pr.mergeCommit,
            issueId: issue.issueId,
            issueRevision: issue.revision,
            graphId: integration.graphId,
            graphRevision: integration.graphRevision,
            snapshotRevision,
            reviewBase: integration.reviewBase,
            startingRevision: integration.head,
          },
        };
      } catch (error) {
        return {
          status: "clarification",
          problem: `External prerequisite ${issue.issueId} needs maintainer clarification: ${error instanceof Error ? error.message : "Delivery evidence unavailable"}`,
        };
      }
    },
  };
}
