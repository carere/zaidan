import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { createGitHubTriage } from "../src/github-triage.ts";
import { TRIAGE_DISCLAIMER } from "../src/triage.ts";

test("native triage captures all comments, applies approved roles with disclaimer, and reconciles a lost comment response without duplicate writes", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "github-triage-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const body = "Request a missing greeting component.";
  const contentRevision = createHash("sha256")
    .update(JSON.stringify({ title: "Greeting", body }))
    .digest("hex");
  const native = {
    node_id: "I1",
    title: "Greeting",
    body,
    state: "open",
    labels: [{ name: "needs-triage" }, { name: "keep-me" }],
    user: { login: "reporter" },
    created_at: "2026-01-01",
    updated_at: "2026-01-02",
  };
  const comments = [
    {
      id: 1,
      body: "Prior resolved answer",
      user: { login: "reporter", id: 1 },
      created_at: "d1",
      updated_at: "d1",
      html_url: "https://github.com/fixture/local/issues/1#issuecomment-1",
    },
  ];
  let writes = 0;
  let lost = false;
  const server = createServer(async (req, res) => {
    let input = "";
    for await (const chunk of req) input += chunk;
    const data = input ? JSON.parse(input) : undefined;
    let result: unknown = native;
    if (req.url === "/user") result = { id: 99, login: "maintainer" };
    else if (req.url?.includes("/comments")) {
      if (req.method === "POST") {
        writes++;
        const comment = {
          id: 2,
          body: data.body,
          user: { id: 99, login: "maintainer" },
          created_at: "d2",
          updated_at: "d2",
          html_url: "https://github.com/fixture/local/issues/1#issuecomment-2",
        };
        comments.push(comment);
        result = comment;
        if (!lost) {
          lost = true;
          req.socket.destroy();
          return;
        }
      } else result = comments;
    } else if (req.method === "PATCH") {
      writes++;
      native.labels = data.labels.map((name: string) => ({ name }));
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(result));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const discovered: DiscoveredIssue = {
    issueId: "I1",
    revision: "r1",
    contentRevision,
    repository: "fixture/local",
    number: 1,
    title: native.title,
    body,
    state: "open",
    labels: ["needs-triage", "keep-me"],
    parentIds: [],
    dependencyIds: [],
    childIds: [],
    stateReason: null,
    sourceRef: "https://github.com/fixture/local/issues/1",
    updatedAt: "2026-01-02",
  };
  const options = {
    database: join(directory, "triage.sqlite"),
    repository: "fixture/local",
    token: "fixture-token",
    apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    discovery: {
      read: async () => ({ repository: "fixture/local", revision: "s1", issues: [discovered] }),
    },
  };
  let triage = createGitHubTriage(options);
  t.after(() => triage.close());
  const issue = await triage.prepare({
    issueId: "I1",
    revision: "r1",
    repository: "fixture/local",
    number: 1,
    startingRevision: "base",
    reviewBase: "base",
    route: "triage",
    sourceContent: { body },
    labels: ["needs-triage", "keep-me"],
    parentIds: [],
    dependencyIds: [],
  });
  assert.equal(issue.triageContext?.comments[0]?.body, "Prior resolved answer");
  const request = {
    operationId: "triage:I1:r1",
    runId: "run",
    issue,
    proposal: {
      category: "enhancement" as const,
      state: "ready-for-agent" as const,
      investigation: "Searched components and prior rejection records",
      recommendation: "Implement",
      verification: "Missing component confirmed",
      comment: `${TRIAGE_DISCLAIMER}\n\n## Agent brief\nCreate the greeting.\n\n## Acceptance criteria\nA greeting renders.`,
    },
  };
  triage.configureActionGuard?.(() => {
    throw new Error("Factory paused");
  });
  await assert.rejects(triage.apply(request), /Factory paused/);
  assert.equal(writes, 0);
  triage.configureActionGuard?.(() => {});
  await assert.rejects(triage.apply(request));
  assert.equal(comments.length, 2);
  assert.equal(triage.pending()[0]?.operationId, request.operationId);
  triage.close();
  triage = createGitHubTriage(options);
  const receipt = await triage.apply(request);
  assert.equal(receipt.commentRef, comments[1]?.html_url);
  assert.deepEqual(
    native.labels.map((label: { name: string }) => label.name),
    ["keep-me", "enhancement", "ready-for-agent"],
  );
  assert.equal(writes, 2);
  assert.deepEqual(triage.pending(), []);
  await assert.rejects(triage.retryUncertain(request, "comment"), /unresolved/);
  await triage.apply(request);
  assert.equal(writes, 2);
  assert.equal((await triage.approvedBriefs())[0]?.content, request.proposal.comment);
  native.body = "Changed requirement";
  await assert.rejects(triage.apply(request), /changed/);
});

test("an approved rejected enhancement publishes its knowledge as a draft PR before closing without merging main", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "triage-knowledge-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const contentRevision = createHash("sha256")
    .update(JSON.stringify({ title: "Rejected feature", body: "Request" }))
    .digest("hex");
  const native = {
    node_id: "I2",
    title: "Rejected feature",
    body: "Request",
    state: "open",
    state_reason: null as string | null,
    labels: [{ name: "needs-triage" }],
    user: { login: "reporter" },
    created_at: "d",
    updated_at: "d",
  };
  const discovered: DiscoveredIssue = {
    issueId: "I2",
    revision: "r",
    contentRevision,
    repository: "fixture/local",
    number: 2,
    title: native.title,
    body: native.body,
    state: "open",
    stateReason: null,
    labels: ["needs-triage"],
    parentIds: [],
    dependencyIds: [],
    childIds: [],
    sourceRef: "https://github.com/fixture/local/issues/2",
    updatedAt: "d",
  };
  const comments: {
    id: number;
    body: string;
    user: { id: number; login: string };
    created_at: string;
    updated_at: string;
    html_url: string;
  }[] = [];
  let branch: string | undefined;
  let file: { content: string; sha: string } | undefined;
  let pr:
    | {
        body: string;
        draft: boolean;
        html_url: string;
        user: { id: number };
        base: { ref: string };
      }
    | undefined;
  const writes: string[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const data = text ? JSON.parse(text) : undefined;
    const url = new URL(req.url ?? "", "http://fixture");
    let result: unknown = native;
    const missing = () => {
      res.statusCode = 404;
      return {};
    };
    if (req.method !== "GET") writes.push(`${req.method} ${url.pathname}`);
    if (url.pathname === "/user") result = { id: 99 };
    else if (url.pathname.endsWith("/comments")) {
      if (req.method === "POST") {
        const comment = {
          id: 1,
          body: data.body,
          user: { id: 99, login: "maintainer" },
          created_at: "d",
          updated_at: "d",
          html_url: "https://github.com/fixture/local/issues/2#issuecomment-1",
        };
        comments.push(comment);
        result = comment;
      } else result = comments;
    } else if (url.pathname.endsWith("/git/ref/heads/main")) result = { object: { sha: "base" } };
    else if (url.pathname.includes("/git/ref/heads/"))
      result = branch ? { object: { sha: "branch" } } : missing();
    else if (url.pathname.endsWith("/git/refs")) {
      branch = data.ref.slice("refs/heads/".length);
      result = { ref: data.ref };
    } else if (url.pathname.includes("/contents/")) {
      if (req.method === "PUT") {
        assert.equal(data.branch, branch);
        file = { content: data.content, sha: "doc" };
        result = { content: file };
      } else result = url.searchParams.get("ref") === branch && file ? file : missing();
    } else if (url.pathname.includes("/compare/"))
      result = {
        status: "ahead",
        total_commits: 1,
        files: [{ filename: ".out-of-scope/rejected.md", status: "added" }],
      };
    else if (url.pathname.endsWith("/pulls")) {
      if (req.method === "POST") {
        assert.equal(data.base, "main");
        assert.equal(data.head, branch);
        pr = {
          body: data.body,
          draft: data.draft,
          html_url: "https://github.com/fixture/local/pull/3",
          user: { id: 99 },
          base: { ref: "main" },
        };
        result = pr;
      } else result = pr ? [pr] : [];
    } else if (req.method === "PATCH") {
      if (data.labels) native.labels = data.labels.map((name: string) => ({ name }));
      if (data.state) {
        assert.ok(pr?.draft);
        assert.equal(comments.length, 1);
        native.state = data.state;
        native.state_reason = data.state_reason;
      }
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(result));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const triage = createGitHubTriage({
    database: join(directory, "actions.sqlite"),
    repository: "fixture/local",
    token: "fake",
    apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    discovery: {
      read: async () => ({ repository: "fixture/local", revision: "s", issues: [discovered] }),
    },
  });
  t.after(() => triage.close());
  const issue = await triage.prepare({
    issueId: "I2",
    revision: "r",
    repository: "fixture/local",
    number: 2,
    startingRevision: "base",
    reviewBase: "base",
    route: "triage",
    labels: ["needs-triage"],
  });
  const request = {
    operationId: "reject-I2",
    runId: "run",
    issue,
    proposal: {
      category: "enhancement" as const,
      state: "wontfix" as const,
      wontfixReason: "rejected" as const,
      investigation: "Searched existing behavior and rejection knowledge",
      recommendation: "Decline this extension",
      verification: "Request understood",
      comment: `${TRIAGE_DISCLAIMER}\n\nThis enhancement falls outside the agreed product scope.`,
      knowledge: {
        path: ".out-of-scope/rejected.md",
        content: "# Rejected extension\n\nScope decision and reasoning.\n",
      },
    },
  };
  const receipt = await triage.apply(request);
  assert.equal(receipt.knowledgeRef, "https://github.com/fixture/local/pull/3");
  assert.equal(native.state, "closed");
  assert.equal(native.state_reason, "not_planned");
  assert.ok(pr?.body.startsWith(TRIAGE_DISCLAIMER));
  assert.ok(comments[0]?.body.includes(receipt.knowledgeRef));
  const count = writes.length;
  await triage.apply(request);
  assert.equal(writes.length, count);
  assert.ok(writes.every((write) => !write.includes("/merge")));
});
