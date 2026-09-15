import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createGitHubDeliverySource, type DiscoveredIssue } from "../src/index.ts";

async function github(t: { after(fn: () => Promise<void>): void }) {
  const requests: {
    method?: string;
    authorization?: string;
    query: string;
    variables: { issueId: string; after: string | null };
  }[] = [];
  const issue = { issueId: "I_1", repository: "carere/zaidan", number: 1 } as DiscoveredIssue;
  const native = {
    __typename: "Issue",
    id: "I_1",
    number: 1,
    repository: { nameWithOwner: "carere/zaidan" },
    title: "Prerequisite",
    body: "Scope",
    state: "CLOSED",
    stateReason: "COMPLETED",
    updatedAt: "2026-09-15T12:00:00Z",
  };
  const pr = (id: string) => ({
    id,
    url: `https://github.com/carere/zaidan/pull/${id === "PR_1" ? 3 : 4}`,
    repository: { nameWithOwner: "carere/zaidan" },
    state: "MERGED",
    baseRefName: "main",
    mergeCommit: { oid: "a".repeat(40) },
    mergedAt: "2026-09-15T11:00:00Z",
    updatedAt: "2026-09-15T12:00:00Z",
  });
  const pages = new Map<string | null, unknown>();
  const page = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) => ({
    data: {
      node: {
        ...native,
        closedByPullRequestsReferences: { nodes, pageInfo: { hasNextPage, endCursor } },
      },
    },
  });
  let status = 200;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    requests.push({
      ...payload,
      method: request.method,
      authorization: request.headers.authorization,
    });
    response.statusCode = status;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(pages.get(payload.variables.after) ?? { data: { node: null } }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const adapter = createGitHubDeliverySource({
    graphqlUrl: `http://127.0.0.1:${address.port}/graphql`,
    token: "fixture-token",
  });
  return {
    requests,
    issue,
    pages,
    page,
    pr,
    adapter,
    setStatus(value: number) {
      status = value;
    },
  };
}

test("GitHub delivery reads all native closing references including merged PRs with their squash commit", async (t) => {
  const f = await github(t);
  f.pages.set(null, f.page([f.pr("PR_1")], true, "next-page"));
  f.pages.set("next-page", f.page([f.pr("PR_2")]));
  const evidence = await f.adapter.read(f.issue);
  assert.equal(evidence.issue.stateReason, "completed");
  assert.equal(evidence.issue.issueId, "I_1");
  assert.equal(evidence.pullRequests.length, 2);
  assert.equal(evidence.pullRequests[0].mergeCommit, "a".repeat(40));
  assert.deepEqual(
    f.requests.map((request) => request.variables.after),
    [null, "next-page"],
  );
  assert.ok(
    f.requests.every(
      (request) =>
        request.method === "POST" &&
        request.authorization === "Bearer fixture-token" &&
        /^query\s/.test(request.query) &&
        request.query.includes("includeClosedPrs: true"),
    ),
  );
});

test("GitHub delivery rejects inaccessible or incomplete source, pagination loops and changed issue evidence", async (t) => {
  const f = await github(t);
  await assert.rejects(f.adapter.read(f.issue));
  f.pages.set(null, { errors: [{ message: "Private issue unavailable" }], data: { node: null } });
  await assert.rejects(f.adapter.read(f.issue), /incomplete|inaccessible/i);
  f.pages.set(null, f.page([f.pr("PR_1")], true, "same-page"));
  f.pages.set("same-page", f.page([f.pr("PR_1")], true, "same-page"));
  await assert.rejects(f.adapter.read(f.issue), /repeated/i);
  const changed = f.page([f.pr("PR_2")]);
  changed.data.node.updatedAt = "2026-09-15T13:00:00Z";
  f.pages.set("same-page", changed);
  await assert.rejects(f.adapter.read(f.issue), /changed/i);
  f.setStatus(403);
  await assert.rejects(f.adapter.read(f.issue), /unavailable.*403/i);
  f.setStatus(200);
  f.pages.set(null, f.page([{ ...f.pr("PR_1"), mergeCommit: null }]));
  await assert.rejects(f.adapter.read(f.issue), /incomplete/i);
});
