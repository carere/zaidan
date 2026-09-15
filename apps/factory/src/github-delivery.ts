import { createHash } from "node:crypto";
import type {
  DeliveryPullRequest,
  DeliverySource,
  DeliverySourceAdapter,
} from "./external-delivery.ts";

export interface GitHubDeliveryOptions {
  token?: string;
  graphqlUrl?: string;
  timeoutMs?: number;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const query = `query Delivery($issueId: ID!, $after: String) {
  node(id: $issueId) {
    __typename
    ... on Issue {
      id number title body state stateReason updatedAt repository { nameWithOwner }
      closedByPullRequestsReferences(first: 100, after: $after, includeClosedPrs: true) {
        nodes { id url state updatedAt baseRefName mergedAt mergeCommit { oid } repository { nameWithOwner } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Malformed GitHub delivery evidence");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Malformed GitHub delivery string");
  return value;
}
function repository(value: unknown) {
  const name = string(record(value).nameWithOwner);
  if (!/^[\w.-]+\/[\w.-]+$/.test(name)) throw new Error("Malformed GitHub delivery repository");
  return name;
}
/** Fixed GraphQL query only; no mutation or source-provided URL is executed. */
export function createGitHubDeliverySource(
  options: GitHubDeliveryOptions = {},
): DeliverySourceAdapter {
  const url = new URL(options.graphqlUrl ?? "https://api.github.com/graphql");
  if (url.username || url.password || !["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid GitHub GraphQL endpoint");
  return {
    async read(issue) {
      let after: string | null = null;
      const seen = new Set<string | null>();
      const prs = new Map<string, DeliveryPullRequest>();
      let source: DeliverySource["issue"] | undefined;
      do {
        if (seen.has(after)) throw new Error("GitHub delivery pagination repeated a cursor");
        seen.add(after);
        const response = await fetch(url, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          },
          body: JSON.stringify({ query, variables: { issueId: issue.issueId, after } }),
        });
        if (!response.ok) throw new Error(`GitHub delivery unavailable (${response.status})`);
        const payload = record(await response.json());
        if (payload.errors)
          throw new Error("GitHub delivery query failed; evidence is incomplete or inaccessible");
        const node = record(record(payload.data).node);
        if (
          node.__typename !== "Issue" ||
          node.id !== issue.issueId ||
          node.number !== issue.number ||
          repository(node.repository) !== issue.repository
        )
          throw new Error("GitHub delivery issue identity is inaccessible or mismatched");
        if (
          !["OPEN", "CLOSED"].includes(string(node.state)) ||
          typeof node.body !== "string" ||
          typeof node.title !== "string" ||
          !(node.stateReason === null || typeof node.stateReason === "string")
        )
          throw new Error("Malformed GitHub delivery issue");
        const nextSource: DeliverySource["issue"] = {
          issueId: issue.issueId,
          repository: issue.repository,
          number: issue.number,
          title: node.title,
          body: node.body,
          state: node.state === "OPEN" ? "open" : "closed",
          stateReason: typeof node.stateReason === "string" ? node.stateReason.toLowerCase() : null,
          updatedAt: string(node.updatedAt),
        };
        if (source && hash(source) !== hash(nextSource))
          throw new Error("Prerequisite changed during GitHub delivery pagination");
        source = nextSource;
        const connection = record(node.closedByPullRequestsReferences);
        if (!Array.isArray(connection.nodes))
          throw new Error("Malformed GitHub closing reference page");
        for (const raw of connection.nodes) {
          const pr = record(raw);
          const state = string(pr.state);
          if (!["OPEN", "CLOSED", "MERGED"].includes(state))
            throw new Error("Malformed GitHub PR state");
          const mergeCommit = pr.mergeCommit === null ? null : string(record(pr.mergeCommit).oid);
          const mergedAt = pr.mergedAt === null ? null : string(pr.mergedAt);
          if (state === "MERGED" && (!mergeCommit || !mergedAt))
            throw new Error("Merged PR has incomplete delivery evidence");
          const value: DeliveryPullRequest = {
            id: string(pr.id),
            url: string(pr.url),
            repository: repository(pr.repository),
            state: state as DeliveryPullRequest["state"],
            baseRef: string(pr.baseRefName),
            mergeCommit,
            mergedAt,
            revision: hash([
              pr.id,
              pr.url,
              pr.repository,
              state,
              pr.baseRefName,
              mergeCommit,
              mergedAt,
              string(pr.updatedAt),
            ]),
          };
          const prior = prs.get(value.id);
          if (prior && prior.revision !== value.revision)
            throw new Error("PR changed during GitHub delivery pagination");
          prs.set(value.id, value);
        }
        const pageInfo = record(connection.pageInfo);
        if (typeof pageInfo.hasNextPage !== "boolean")
          throw new Error("Malformed GitHub delivery pagination");
        after = pageInfo.hasNextPage ? string(pageInfo.endCursor) : null;
      } while (after !== null);
      if (!source) throw new Error("GitHub prerequisite is inaccessible");
      return {
        issue: source,
        pullRequests: [...prs.values()].sort((a, b) => a.id.localeCompare(b.id)),
      };
    },
  };
}
