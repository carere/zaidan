import type { PublicationGitHub, PublishedPullRequest } from "./standalone-publication.ts";

export interface GitHubPublicationOptions {
  token?: string;
  apiBase?: string;
  timeoutMs?: number;
}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Malformed GitHub publication response");
  return value as Record<string, unknown>;
};
const text = (value: unknown) => {
  if (typeof value !== "string" || !value) throw Error("Missing GitHub publication identity");
  return value;
};
const sha = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value))
    throw Error("Invalid GitHub commit identity");
  return value;
};
/** Native REST transport. No endpoint merges PRs; final delivery is observed only. */
export function createGitHubPublication(options: GitHubPublicationOptions = {}): PublicationGitHub {
  const base = new URL(options.apiBase ?? "https://api.github.com");
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(base.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)))
  )
    throw Error("Unsafe GitHub API origin");
  const prefix = base.pathname.replace(/\/$/, "");
  const request = async (path: string, method = "GET", body?: unknown) => {
    const url = new URL(path, base);
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(`${prefix}/`) ||
      url.username ||
      url.password
    )
      throw Error("Refusing off-origin GitHub publication request");
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw Error("GitHub publication response is uncertain; reconcile before retrying");
    }
    if (!response.ok) throw Error(`GitHub publication returned HTTP ${response.status}`);
    return { response, body: (await response.json()) as unknown };
  };
  const repositoryPath = (repository: string) => {
    if (
      !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
      repository.split("/").some((part) => part === "." || part === "..")
    )
      throw Error("Invalid GitHub repository");
    return `${prefix}/repos/${repository}`;
  };
  const parse = (value: unknown, repository: string): PublishedPullRequest => {
    const pr = record(value);
    const head = record(pr.head);
    const target = record(pr.base);
    if (record(head.repo).full_name !== repository || record(target.repo).full_name !== repository)
      throw Error("PR repository identity changed");
    if (
      !Number.isSafeInteger(pr.number) ||
      Number(pr.number) <= 0 ||
      !["open", "closed"].includes(String(pr.state)) ||
      typeof pr.draft !== "boolean" ||
      typeof pr.body !== "string"
    )
      throw Error("Incomplete PR publication state");
    if (
      pr.merged_at !== null &&
      (typeof pr.merged_at !== "string" || Number.isNaN(Date.parse(pr.merged_at)))
    )
      throw Error("Invalid merged PR evidence");
    if ((pr.merged_at !== null) !== (pr.merged === true))
      throw Error("Inconsistent merged PR evidence");
    const markers = pr.body.match(/<!-- zaidan-factory:[^\r\n]*? -->/g) ?? [];
    if (markers.length > 1) throw Error("Ambiguous PR publication markers");
    const url = text(pr.html_url);
    if (url !== `https://github.com/${repository}/pull/${pr.number}`)
      throw Error("Unexpected PR URL");
    return {
      id: text(pr.node_id),
      number: Number(pr.number),
      url,
      repository,
      headRef: text(head.ref),
      headCommit: sha(head.sha),
      baseRef: text(target.ref),
      state: pr.state as "open" | "closed",
      draft: pr.draft,
      mergedAt: pr.merged_at as string | null,
      mergeCommit: pr.merged_at ? sha(pr.merge_commit_sha) : null,
      marker: markers[0] ?? "",
    };
  };
  return {
    async findPullRequests(repository, branch) {
      const path = repositoryPath(repository);
      const search = new URLSearchParams({
        state: "all",
        head: `${repository.split("/")[0]}:${branch}`,
        per_page: "100",
      });
      let next: string | undefined = `${path}/pulls?${search}`;
      const seen = new Set<string>();
      const pulls = new Map<string, PublishedPullRequest>();
      while (next) {
        const absolute = new URL(next, base).href;
        if (seen.has(absolute)) throw Error("GitHub PR pagination loop");
        seen.add(absolute);
        const { response, body } = await request(next);
        if (!Array.isArray(body)) throw Error("Incomplete PR listing");
        for (const value of body) {
          const row = record(value);
          if (!Number.isSafeInteger(row.number) || Number(row.number) <= 0)
            throw Error("Missing PR number");
          const detail = parse((await request(`${path}/pulls/${row.number}`)).body, repository);
          if (detail.headRef !== branch || detail.id !== row.node_id)
            throw Error("PR listing changed during reconciliation");
          const previous = pulls.get(detail.id);
          if (previous && JSON.stringify(previous) !== JSON.stringify(detail))
            throw Error("PR changed during pagination");
          pulls.set(detail.id, detail);
        }
        const links = response.headers.get("link") ?? "";
        const matches = [...links.matchAll(/<([^>]+)>;\s*rel="next"/g)];
        if (matches.length > 1) throw Error("Ambiguous GitHub PR pagination");
        next = matches[0]?.[1];
      }
      return [...pulls.values()];
    },
    async createPullRequest(input) {
      const { body } = await request(`${repositoryPath(input.repository)}/pulls`, "POST", {
        title: input.title,
        head: input.branch,
        base: "main",
        body: input.body,
        draft: input.draft ?? false,
        maintainer_can_modify: false,
      });
      return parse(body, input.repository);
    },
    async closeIssue(repository, number) {
      if (!Number.isSafeInteger(number) || number <= 0) throw Error("Invalid issue number");
      const result = record(
        (
          await request(`${repositoryPath(repository)}/issues/${number}`, "PATCH", {
            state: "closed",
            state_reason: "completed",
          })
        ).body,
      );
      if (result.state !== "closed" || result.state_reason !== "completed")
        throw Error("Issue closure is not confirmed");
    },
  };
}
