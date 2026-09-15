import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createGitHubDiscovery } from "../src/github-discovery.ts";

async function github(t: { after(fn: () => Promise<void>): void }) {
  const requests: { path: string; method?: string; authorization?: string }[] = [];
  let base = "";
  const issue = (number: number, repository = "carere/zaidan") => ({
    id: 1000 + number,
    node_id: `I_${number}`,
    number,
    title: `Issue ${number}`,
    body: "## What to build\nA feature.\n## Acceptance criteria\nIt works.",
    state: "open",
    state_reason: null,
    updated_at: "2026-09-15T12:00:00Z",
    labels: [{ name: "ready-for-agent" }],
    html_url: `https://github.com/${repository}/issues/${number}`,
    url: `${base}/repos/${repository}/issues/${number}`,
    repository_url: `${base}/repos/${repository}`,
  });
  const pages = new Map<string, { body: unknown; next?: string; status?: number }>();
  const server = createServer((request, response) => {
    const path = request.url ?? "/";
    requests.push({ path, method: request.method, authorization: request.headers.authorization });
    const entry =
      pages.get(path) ??
      (path.endsWith("/parent") ? { status: 404, body: { message: "Not Found" } } : { body: [] });
    response.statusCode = entry.status ?? 200;
    response.setHeader("content-type", "application/json");
    if (entry.next) response.setHeader("link", `<${base}${entry.next}>; rel="next"`);
    response.end(JSON.stringify(entry.body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  return { base, pages, requests, issue };
}

test("GitHub discovery reads every native issue, child and dependency page and excludes PRs", async (t) => {
  const f = await github(t);
  const root = "/repos/carere/zaidan/issues";
  const parent = f.issue(1);
  const child = f.issue(2);
  const otherChild = f.issue(3);
  const external = f.issue(4, "elsewhere/library");
  const external2 = f.issue(5, "elsewhere/library");
  f.pages.set(`${root}?state=all&per_page=100`, { body: [parent], next: `${root}?page=2` });
  f.pages.set(`${root}?page=2`, { body: [child, { ...f.issue(9), pull_request: {} }] });
  f.pages.set(`${root}/1/sub_issues?per_page=100`, {
    body: [child],
    next: `${root}/1/sub_issues?page=2`,
  });
  f.pages.set(`${root}/1/sub_issues?page=2`, { body: [otherChild] });
  f.pages.set(`${root}/2/parent`, { body: parent });
  f.pages.set(`${root}/3/parent`, { body: parent });
  f.pages.set(`${root}/2/dependencies/blocked_by?per_page=100`, {
    body: [external],
    next: `${root}/2/dependencies/blocked_by?page=2`,
  });
  f.pages.set(`${root}/2/dependencies/blocked_by?page=2`, { body: [external2] });
  const adapter = createGitHubDiscovery({
    repository: "carere/zaidan",
    apiBase: f.base,
    token: "fixture-token",
  });
  const result = await adapter.read();
  assert.deepEqual(
    result.issues.map((issue) => issue.issueId),
    ["I_1", "I_2", "I_3", "I_4", "I_5"],
  );
  assert.deepEqual(result.issues[0].childIds, ["I_2", "I_3"]);
  assert.deepEqual(result.issues[1].dependencyIds, ["I_4", "I_5"]);
  assert.deepEqual(result.issues[2].parentIds, ["I_1"]);
  assert.equal(result.issues[3].repository, "elsewhere/library");
  assert.equal(result.issues[0].databaseId, 1001);
  assert.ok(
    f.requests.every(
      (request) => request.method === "GET" && request.authorization === "Bearer fixture-token",
    ),
  );
  assert.ok(!f.requests.some((request) => request.path.includes("/9/")));
  const again = await adapter.read();
  assert.equal(result.revision, again.revision);
  child.body = "## What to build\nDifferent scope.\n## Acceptance criteria\nDifferent checks.";
  const edited = await adapter.read();
  assert.notEqual(edited.issues[1].revision, result.issues[1].revision);
  assert.notEqual(edited.issues[1].contentRevision, result.issues[1].contentRevision);
  assert.equal(edited.issues[1].issueId, result.issues[1].issueId);
  assert.notEqual(edited.revision, result.revision);
});

test("inconsistent native snapshots fail closed instead of authorizing a mixed revision", async (t) => {
  const f = await github(t);
  const root = "/repos/carere/zaidan/issues";
  const parent = f.issue(1);
  const child = f.issue(2);
  f.pages.set(`${root}?state=all&per_page=100`, { body: [parent, child] });
  f.pages.set(`${root}/1/sub_issues?per_page=100`, {
    body: [{ ...child, body: "Edited while pages were read" }],
  });
  const adapter = createGitHubDiscovery({ repository: "carere/zaidan", apiBase: f.base });
  await assert.rejects(adapter.read(), /changed during discovery/);
});

test("unreadable pages, pagination loops and off-origin links never produce partial work", async (t) => {
  const f = await github(t);
  const root = "/repos/carere/zaidan/issues";
  const adapter = createGitHubDiscovery({
    repository: "carere/zaidan",
    apiBase: f.base,
    token: "private-fixture-token",
  });
  f.pages.set(`${root}?state=all&per_page=100`, { body: [f.issue(1)] });
  f.pages.set(`${root}/1/dependencies/blocked_by?per_page=100`, {
    body: { message: "Forbidden" },
    status: 403,
  });
  await assert.rejects(adapter.read(), /failed \(403\)/);
  f.pages.delete(`${root}/1/dependencies/blocked_by?per_page=100`);
  f.pages.set(`${root}?state=all&per_page=100`, {
    body: [f.issue(1)],
    next: `${root}?state=all&per_page=100`,
  });
  await assert.rejects(adapter.read(), /repeated a page/);
  f.pages.set(`${root}?state=all&per_page=100`, {
    body: [{ ...f.issue(1), url: "https://example.invalid/credential-sink" }],
  });
  await assert.rejects(adapter.read(), /untrusted API URL/);
  f.pages.set(`${root}?state=all&per_page=100`, { body: [{ title: "No stable identity" }] });
  await assert.rejects(adapter.read(), /Malformed GitHub issue response/);
});

test("relation edits revise snapshots while list ordering does not", async (t) => {
  const f = await github(t);
  const root = "/repos/carere/zaidan/issues";
  const one = f.issue(1);
  const two = { ...f.issue(2), labels: [{ name: "ready-for-agent" }, { name: "bug" }] };
  f.pages.set(`${root}?state=all&per_page=100`, { body: [one, two] });
  const adapter = createGitHubDiscovery({ repository: "carere/zaidan", apiBase: f.base });
  const original = await adapter.read();
  two.labels.reverse();
  f.pages.set(`${root}?state=all&per_page=100`, { body: [two, one] });
  assert.equal((await adapter.read()).revision, original.revision);
  f.pages.set(`${root}/2/dependencies/blocked_by?per_page=100`, { body: [one] });
  const edited = await adapter.read();
  assert.notEqual(edited.issues[1].revision, original.issues[1].revision);
  assert.equal(edited.issues[1].contentRevision, original.issues[1].contentRevision);
  assert.notEqual(edited.revision, original.revision);
});

test("known but unreadable parents and incomplete native relation counts block discovery", async (t) => {
  const f = await github(t);
  const root = "/repos/carere/zaidan/issues";
  f.pages.set(`${root}?state=all&per_page=100`, {
    body: [{ ...f.issue(2), parent_issue_url: `${f.base}${root}/1` }],
  });
  const adapter = createGitHubDiscovery({ repository: "carere/zaidan", apiBase: f.base });
  await assert.rejects(adapter.read(), /failed \(404\)/);
  f.pages.set(`${root}?state=all&per_page=100`, {
    body: [{ ...f.issue(1), sub_issues_summary: { total: 2 } }],
  });
  await assert.rejects(adapter.read(), /Incomplete native sub-issues/);
  f.pages.set(`${root}?state=all&per_page=100`, {
    body: [{ ...f.issue(1), issue_dependencies_summary: { total_blocked_by: 1 } }],
  });
  await assert.rejects(adapter.read(), /Incomplete native dependencies/);
});
