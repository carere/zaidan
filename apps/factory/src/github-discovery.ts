import { createHash } from "node:crypto";
import type { DiscoveredIssue, DiscoveryAdapter, DiscoverySnapshot } from "./discovery.ts";

export interface GitHubDiscoveryOptions {
  repository: string;
  token?: string;
  apiBase?: string;
  timeoutMs?: number;
}
interface NativeIssue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  state_reason?: string | null;
  updated_at: string;
  labels: (string | { name: string })[];
  html_url: string;
  url: string;
  repository_url: string;
  pull_request?: unknown;
  parent_issue_url?: string | null;
  sub_issues_summary?: { total: number };
  issue_dependencies_summary?: { total_blocked_by: number };
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sortedIds = (issues: NativeIssue[]) =>
  [...new Set(issues.map((issue) => issue.node_id))].sort();

/** GET-only native GitHub transport; eligibility and admission remain in IssueWorkflow. */
export function createGitHubDiscovery(options: GitHubDiscoveryOptions): DiscoveryAdapter {
  const base = new URL(`${(options.apiBase ?? "https://api.github.com").replace(/\/$/, "")}/`);
  if (!/^[\w.-]+\/[\w.-]+$/.test(options.repository)) throw new Error("Invalid GitHub repository");
  function trusted(url: string) {
    const target = new URL(url, base);
    if (
      target.origin !== base.origin ||
      !target.pathname.startsWith(base.pathname) ||
      target.username ||
      target.password
    )
      throw new Error("GitHub response referenced an untrusted API URL");
    return target;
  }
  async function get(url: string, missingParent = false) {
    const target = trusted(url);
    const response = await fetch(target, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    });
    if (response.status === 404 && missingParent) return { body: null, next: undefined };
    if (!response.ok)
      throw new Error(`GitHub discovery GET ${target.pathname} failed (${response.status})`);
    const link = response.headers.get("link") ?? "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    return { body: (await response.json()) as unknown, next };
  }
  function issue(value: unknown): NativeIssue {
    const item = value as NativeIssue;
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isSafeInteger(item.id) ||
      typeof item.node_id !== "string" ||
      !item.node_id ||
      !Number.isSafeInteger(item.number) ||
      typeof item.title !== "string" ||
      !(item.body === null || typeof item.body === "string") ||
      !["open", "closed"].includes(item.state) ||
      typeof item.updated_at !== "string" ||
      !Array.isArray(item.labels) ||
      item.labels.some(
        (label) => typeof label !== "string" && (!label || typeof label.name !== "string"),
      ) ||
      typeof item.url !== "string" ||
      typeof item.repository_url !== "string" ||
      typeof item.html_url !== "string"
    )
      throw new Error("Malformed GitHub issue response; discovery is incomplete");
    trusted(item.url);
    trusted(item.repository_url);
    return item;
  }
  async function pages(url: string): Promise<NativeIssue[]> {
    const result: NativeIssue[] = [];
    const seen = new Set<string>();
    let next: string | undefined = url;
    while (next) {
      const key = trusted(next).href;
      if (seen.has(key)) throw new Error("GitHub pagination repeated a page");
      seen.add(key);
      const response = await get(key);
      if (!Array.isArray(response.body))
        throw new Error("Malformed GitHub issue page; discovery is incomplete");
      for (const value of response.body) {
        const parsed = issue(value);
        if (!parsed.pull_request) result.push(parsed);
      }
      next = response.next;
    }
    return result;
  }
  return {
    async read(): Promise<DiscoverySnapshot> {
      const pending = new Map<string, NativeIssue>();
      const add = (items: NativeIssue[]) => {
        const fingerprint = (item: NativeIssue) =>
          hash([
            item.id,
            item.node_id,
            item.number,
            item.title,
            item.body ?? "",
            item.state,
            item.state_reason ?? null,
            item.updated_at,
            [
              ...new Set(
                item.labels.map((label) => (typeof label === "string" ? label : label.name)),
              ),
            ].sort(),
            item.repository_url,
            item.html_url,
          ]);
        for (const item of items) {
          const existing = pending.get(item.node_id);
          if (existing && fingerprint(existing) !== fingerprint(item))
            throw new Error(`Issue ${item.node_id} changed during discovery; scan again`);
          if (!existing) pending.set(item.node_id, item);
        }
      };
      add(
        await pages(
          new URL(`repos/${options.repository}/issues?state=all&per_page=100`, base).href,
        ),
      );
      const issues: DiscoveredIssue[] = [];
      // Native links can cross repositories; recursively capture their closure, including closed prerequisites.
      for (const native of pending.values()) {
        const children = await pages(`${native.url}/sub_issues?per_page=100`);
        const dependencies = await pages(`${native.url}/dependencies/blocked_by?per_page=100`);
        if (
          native.sub_issues_summary &&
          sortedIds(children).length !== native.sub_issues_summary.total
        )
          throw new Error(`Incomplete native sub-issues for ${native.node_id}; scan again`);
        if (
          native.issue_dependencies_summary &&
          sortedIds(dependencies).length !== native.issue_dependencies_summary.total_blocked_by
        )
          throw new Error(`Incomplete native dependencies for ${native.node_id}; scan again`);
        const response = await get(`${native.url}/parent`, !native.parent_issue_url);
        const parents = response.body === null ? [] : [issue(response.body)];
        if (parents.some((parent) => parent.pull_request))
          throw new Error("Native parent is a pull request");
        if (
          native.parent_issue_url &&
          (!parents[0] || trusted(native.parent_issue_url).href !== trusted(parents[0].url).href)
        )
          throw new Error(
            `Native parent changed during discovery for ${native.node_id}; scan again`,
          );
        add([...children, ...dependencies, ...parents]);
        const repositoryPath = trusted(native.repository_url).pathname.slice(base.pathname.length);
        const repository = repositoryPath.match(/^repos\/([\w.-]+\/[\w.-]+)$/)?.[1];
        if (!repository) throw new Error("Malformed GitHub repository identity");
        const content = { title: native.title, body: native.body ?? "" };
        const snapshot = {
          issueId: native.node_id,
          databaseId: native.id,
          contentRevision: hash(content),
          repository,
          number: native.number,
          ...content,
          state: native.state,
          stateReason: native.state_reason ?? null,
          labels: [
            ...new Set(
              native.labels.map((label) => (typeof label === "string" ? label : label.name)),
            ),
          ].sort(),
          parentIds: sortedIds(parents),
          childIds: sortedIds(children),
          dependencyIds: sortedIds(dependencies),
          sourceRef: native.html_url,
          updatedAt: native.updated_at,
        };
        issues.push({ ...snapshot, revision: hash(snapshot) });
      }
      issues.sort((a, b) => a.issueId.localeCompare(b.issueId));
      return {
        repository: options.repository,
        issues,
        revision: hash(issues.map((item) => [item.issueId, item.revision])),
      };
    },
  };
}
