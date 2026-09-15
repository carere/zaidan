import { loadPrivateEnvironment } from "../../src/production-config.ts";
import { repository } from "./scenario.ts";

export function fixtureGitHub(token: string, apiBase = "https://api.github.com") {
  const base = new URL(apiBase);
  if (
    base.origin !== "https://api.github.com" &&
    !(base.protocol === "http:" && ["127.0.0.1", "localhost"].includes(base.hostname))
  )
    throw Error("Fixture API must be GitHub or a loopback test server");
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T | undefined> {
    if (
      !(
        path === "user" ||
        path === `repos/${repository}` ||
        path.startsWith(`repos/${repository}/`)
      ) ||
      /(^|\/)\.\.($|\/)/.test(path) ||
      path.includes("://")
    )
      throw Error("Fixture request outside repository authority");
    if (path.includes("/merge") && method !== "GET")
      throw Error("Fixture runner never merges main");
    let response: Response;
    try {
      response = await fetch(new URL(path, `${base.origin}/`), {
        method,
        redirect: "error",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw Error("Fixture API transport outcome uncertain");
    }
    if (response.status === 404 && method === "GET") return undefined;
    if (
      response.status === 409 &&
      method === "GET" &&
      path === `repos/${repository}/git/ref/heads/main`
    ) {
      const detail = (await response.json()) as { message?: string };
      if (detail.message === "Git Repository is empty.") return undefined;
      throw Error("Fixture repository conflict requires reconciliation");
    }
    if (!response.ok) throw Error(`Fixture API operation failed (${response.status})`);
    return response.status === 204 ? undefined : ((await response.json()) as T);
  }
  async function list<T>(path: string) {
    const rows: T[] = [];
    const pages = new Set<string>();
    for (let page = 1; page <= 10000; page++) {
      const result = await request<T[]>(
        `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      );
      if (!Array.isArray(result)) throw Error("Incomplete fixture API collection");
      const signature = JSON.stringify(result);
      if (result.length && pages.has(signature))
        throw Error("Fixture API pagination repeated a page");
      pages.add(signature);
      rows.push(...result);
      if (result.length < 100) return rows;
    }
    throw Error("Fixture API pagination did not terminate");
  }
  return { request, list, path: `repos/${repository}` };
}
export type FixtureGitHub = ReturnType<typeof fixtureGitHub>;
export interface NativeIssue {
  id: number;
  node_id: string;
  number: number;
  html_url: string;
  title: string;
  body: string | null;
  updated_at: string;
  state: string;
  state_reason?: string;
  labels: { name: string }[];
  user: { id: number };
  pull_request?: unknown;
}
export interface NativePull {
  id: number;
  node_id: string;
  number: number;
  html_url: string;
  body: string;
  state: string;
  draft: boolean;
  merged: boolean;
  merge_commit_sha?: string;
  head: { sha: string; ref: string; repo: { full_name: string } };
  base: { ref: string; repo: { full_name: string } };
  user: { id: number };
}

export function fixtureGitHubToken(path?: string, environment: NodeJS.ProcessEnv = process.env) {
  const selected = path ? loadPrivateEnvironment(path, environment) : environment;
  if (!selected.FACTORY_GITHUB_TOKEN)
    throw Error(
      "Provide existing GitHub authorization through the environment or selected private file",
    );
  return selected.FACTORY_GITHUB_TOKEN;
}
