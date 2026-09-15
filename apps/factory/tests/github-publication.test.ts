import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createGitHubPublication } from "../src/github-publication.ts";

test("GitHub publication reconciles all PR states and pages, creates only main PRs and closes issues as completed", async (t) => {
  const requests: { method: string; path: string; body: unknown }[] = [];
  const sha = "a".repeat(40);
  const raw = {
    node_id: "PR_one",
    number: 10,
    html_url: "https://github.com/owner/repo/pull/10",
    head: { ref: "codex/issue-1", sha, repo: { full_name: "owner/repo" } },
    base: { ref: "main", repo: { full_name: "owner/repo" } },
    state: "open",
    draft: false,
    merged: false,
    merged_at: null,
    merge_commit_sha: null,
    body: "Text\n<!-- zaidan-factory:run:commit -->",
  };
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({
      method: request.method ?? "",
      path: request.url ?? "",
      body: body ? JSON.parse(body) : null,
    });
    assert.equal(request.headers.authorization, "Bearer fixture-token");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "PATCH") {
      response.end(JSON.stringify({ state: "closed", state_reason: "completed" }));
      return;
    }
    if (request.method === "POST") {
      response.statusCode = 201;
      response.end(JSON.stringify(raw));
      return;
    }
    if (request.url?.startsWith("/repos/owner/repo/pulls?")) {
      if (!request.url.includes("page=2")) {
        response.setHeader("Link", `<${url}/repos/owner/repo/pulls?page=2>; rel="next"`);
        response.end("[]");
      } else response.end(JSON.stringify([raw]));
    } else response.end(JSON.stringify(raw));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  if (!address || typeof address === "string") throw Error("address");
  const url = `http://127.0.0.1:${address.port}`;
  const github = createGitHubPublication({ apiBase: url, token: "fixture-token" });
  const pulls = await github.findPullRequests("owner/repo", "codex/issue-1");
  assert.equal(pulls.length, 1);
  assert.equal(pulls[0].mergeCommit, null);
  await github.createPullRequest({
    repository: "owner/repo",
    branch: "codex/issue-1",
    commit: sha,
    title: "Greeting",
    body: raw.body,
    marker: "<!-- zaidan-factory:run:commit -->",
  });
  await github.closeIssue("owner/repo", 1);
  assert.match(requests[0].path, /state=all/);
  assert.match(requests[0].path, /head=owner%3Acodex%2Fissue-1/);
  assert.deepEqual(requests.find((request) => request.method === "POST")?.body, {
    title: "Greeting",
    head: "codex/issue-1",
    base: "main",
    body: raw.body,
    draft: false,
    maintainer_can_modify: false,
  });
  assert.deepEqual(requests.find((request) => request.method === "PATCH")?.body, {
    state: "closed",
    state_reason: "completed",
  });
});

test("GitHub publication rejects off-origin pagination and incomplete merged evidence without forwarding credentials", async (t) => {
  let mode = "off-origin";
  let leaked = 0;
  const other = createServer((_request, response) => {
    leaked++;
    response.end("[]");
  });
  await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
  const otherAddress = other.address();
  if (!otherAddress || typeof otherAddress === "string") throw Error("address");
  const raw = {
    node_id: "PR_one",
    number: 10,
    html_url: "https://github.com/owner/repo/pull/10",
    head: { ref: "codex/issue-1", sha: "a".repeat(40), repo: { full_name: "owner/repo" } },
    base: { ref: "main", repo: { full_name: "owner/repo" } },
    state: "closed",
    draft: false,
    merged: true,
    merged_at: "2026-09-15T00:00:00Z",
    merge_commit_sha: null,
    body: "<!-- zaidan-factory:run:commit -->",
  };
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (mode === "off-origin") {
      response.setHeader("Link", `<http://127.0.0.1:${otherAddress.port}/steal>; rel="next"`);
      response.end("[]");
    } else if (mode === "loop") {
      response.setHeader("Link", `<${url}${request.url}>; rel="next"`);
      response.end("[]");
    } else if (mode === "error") {
      response.statusCode = 403;
      response.end("{}");
    } else response.end(JSON.stringify(request.url?.includes("?") ? [raw] : raw));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.close();
    other.close();
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("address");
  const url = `http://127.0.0.1:${address.port}`;
  const github = createGitHubPublication({ apiBase: url, token: "secret-fixture" });
  await assert.rejects(github.findPullRequests("owner/repo", "codex/issue-1"), /off-origin/);
  assert.equal(leaked, 0);
  mode = "merged";
  await assert.rejects(github.findPullRequests("owner/repo", "codex/issue-1"), /commit identity/);
  mode = "loop";
  await assert.rejects(github.findPullRequests("owner/repo", "codex/issue-1"), /pagination loop/);
  mode = "error";
  await assert.rejects(github.findPullRequests("owner/repo", "codex/issue-1"), /HTTP 403/);
});
