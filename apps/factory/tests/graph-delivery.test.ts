import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import type { ApprovedBrief, DiscoveredIssue } from "../src/discovery.ts";
import { createExternalDelivery } from "../src/external-delivery.ts";
import { createGitHubDeliverySource } from "../src/github-delivery.ts";
import { createGitHubPublication } from "../src/github-publication.ts";
import { createGraphDeliverySource } from "../src/graph-delivery.ts";
import { SqliteGraphStore } from "../src/graph-integration.ts";
import { ProductionWork } from "../src/production-work.ts";
import { integrationFixture } from "./graph-fixture.ts";

for (const strategy of ["normal", "squash"] as const) {
  test(`native ${strategy} graph delivery resolves retained children and parents without closing links after restart`, async (t) => {
    const f = integrationFixture(t, true);
    let workflow = f.make();
    const work = new ProductionWork({
      workflow,
      git: f.transport,
      enabled: () => true,
      attention: async () => "attention",
    });
    await work.onScan(await workflow.scan());
    const first = workflow.admissions()[0];
    await workflow.drive(first.runId);
    await workflow.drive(first.runId);
    const last = workflow.admissions().find((run) => run.issue.issueId === "b");
    assert.ok(last);
    await workflow.drive(last.runId);
    await workflow.drive(last.runId);
    await workflow.drive(last.runId);
    const graph = workflow.observeGraph("root");
    assert.equal(graph.state, "reviewable");
    f.pulls[0].headCommit = graph.head;
    assert.equal(f.issues[1].state, "closed");
    assert.ok(f.description()?.body.includes("Integrated implementation issues: #2, #3"));
    const requests: string[] = [];
    let closingReferences: unknown[] = [];
    let briefs: ApprovedBrief[] = [];
    let onDiscovery = () => {};
    const server = createServer(async (request, response) => {
      requests.push(`${request.method} ${request.url}`);
      response.setHeader("content-type", "application/json");
      if (request.url === "/graphql") {
        let body = "";
        for await (const chunk of request) body += chunk;
        const input = JSON.parse(body);
        const issue = f.issues.find((item) => item.issueId === input.variables.issueId);
        assert.ok(issue);
        response.end(
          JSON.stringify({
            data: {
              node: {
                __typename: "Issue",
                id: issue.issueId,
                number: issue.number,
                repository: { nameWithOwner: issue.repository },
                title: issue.title,
                body: issue.body,
                state: issue.state.toUpperCase(),
                stateReason: issue.stateReason?.toUpperCase() ?? null,
                updatedAt: issue.updatedAt,
                closedByPullRequestsReferences: {
                  nodes: closingReferences,
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          }),
        );
        return;
      }
      assert.equal(request.method, "GET");
      const pr = f.pulls[0];
      if (request.url?.includes("/pulls?")) {
        response.end(JSON.stringify([{ number: pr.number, node_id: pr.id }]));
        return;
      }
      response.end(
        JSON.stringify({
          node_id: pr.id,
          number: pr.number,
          html_url: pr.url,
          head: { ref: pr.headRef, sha: pr.headCommit, repo: { full_name: pr.repository } },
          base: { ref: pr.baseRef, repo: { full_name: pr.repository } },
          state: pr.state,
          draft: pr.draft,
          merged_at: pr.mergedAt,
          merged: Boolean(pr.mergedAt),
          merge_commit_sha: pr.mergeCommit,
          body: pr.marker,
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    let store = new SqliteGraphStore(f.graphDatabase);
    t.after(() => store.close());
    const source = () =>
      createGraphDeliverySource({
        source: createGitHubDeliverySource({ graphqlUrl: `${url}/graphql` }),
        graphs: store,
        github: createGitHubPublication({ apiBase: url }),
        discovery: {
          async approvedBriefs() {
            return structuredClone(briefs);
          },
          async read() {
            onDiscovery();
            return {
              repository: "owner/repo",
              revision: "fresh",
              issues: structuredClone(f.issues),
            };
          },
        },
      });
    const verify = async (issue: DiscoveredIssue, base: string, head = base) =>
      createExternalDelivery({ trustedGitDirectory: f.bare, github: source() }).verify({
        issue: structuredClone(issue),
        repository: "owner/repo",
        snapshotRevision: "receiving-scan",
        integration: {
          graphId: "downstream",
          graphRevision: "downstream-v1",
          reviewBase: base,
          head,
          integrations: [],
          containedCommits: [],
        },
      });
    assert.equal(
      (await verify(f.issues[1], graph.head)).status,
      "waiting",
      "unmerged graph is not delivery",
    );
    // The external maintainer supplies either a two-parent merge or a real squash commit.
    const merge =
      strategy === "normal" ? f.maintainerNormalMerge(graph.head) : f.maintainerSquash(graph.head);
    f.pulls[0].headCommit = graph.head;
    Object.assign(f.pulls[0], {
      state: "closed",
      mergedAt: "2026-09-16T00:00:00Z",
      mergeCommit: merge,
    });
    await f.transport.branchHead("main"); // Fetch the actual delivered objects into the trusted store.
    assert.equal((await verify(f.issues[1], f.base, merge)).status, "waiting");
    assert.equal((await verify(f.issues[1], merge, f.base)).status, "waiting");
    const delivered = await verify(f.issues[1], merge);
    assert.equal(delivered.status, "verified", JSON.stringify(delivered));
    if (delivered.status === "verified") {
      assert.equal(delivered.evidence.mergeCommit, merge);
      assert.equal(delivered.evidence.graph?.acceptance, graph.finalization?.input.id);
      assert.equal(delivered.evidence.graph?.head, graph.head);
    }
    if (strategy === "squash")
      assert.throws(() => f.git("merge-base", "--is-ancestor", graph.head, merge));
    // Parent closure is produced by the coordinator, then both stores are reopened.
    await workflow.recoverGraph("root");
    assert.equal(workflow.observeGraph("root").state, "delivered");
    workflow = f.restart();
    store.close();
    store = new SqliteGraphStore(f.graphDatabase);
    for (const member of f.issues) {
      assert.equal(
        (await verify(member, merge)).status,
        "verified",
        `persisted delivery for ${member.issueId}`,
      );
    }
    const nativeReference = {
      id: f.pulls[0].id,
      url: f.pulls[0].url,
      repository: { nameWithOwner: "owner/repo" },
      state: "MERGED",
      baseRefName: "main",
      mergeCommit: { oid: merge },
      mergedAt: f.pulls[0].mergedAt,
      updatedAt: "2026-09-16T00:00:00Z",
    };
    closingReferences = [nativeReference];
    assert.equal(
      (await verify(f.issues[1], merge)).status,
      "verified",
      "same native reference deduplicates",
    );
    closingReferences = [
      { ...nativeReference, id: "other-pr", url: "https://github.com/owner/repo/pull/6" },
    ];
    assert.equal(
      (await verify(f.issues[1], merge)).status,
      "clarification",
      "conflicting native reference stays ambiguous",
    );
    closingReferences = [];
    briefs = [
      {
        issueId: "a",
        contentRevision: f.issues[1].contentRevision,
        ref: "new-brief",
        content: "Changed approved scope",
      },
    ];
    assert.equal((await verify(f.issues[1], merge)).status, "clarification");
    briefs = [];
    const original = structuredClone(f.issues[1]);
    for (const changed of [
      { state: "open" as const, stateReason: null, revision: "reopened" },
      { revision: "reclosed", updatedAt: "2026-09-17T00:00:00Z" },
      { body: "Changed requirements" },
      { parentIds: ["another-graph"] },
    ]) {
      Object.assign(f.issues[1], changed);
      assert.notEqual((await verify(f.issues[1], merge)).status, "verified");
      Object.assign(f.issues[1], structuredClone(original));
    }
    const pr = structuredClone(f.pulls[0]);
    for (const changed of [
      { baseRef: "release" },
      { headCommit: f.base },
      { marker: "" },
      { id: "different-pr" },
      { state: "closed" as const, mergedAt: null, mergeCommit: null },
    ]) {
      Object.assign(f.pulls[0], changed);
      assert.notEqual((await verify(f.issues[1], merge)).status, "verified");
      Object.assign(f.pulls[0], pr);
    }
    const originalParent = structuredClone(f.issues[0]);
    f.issues[0].revision = "parent-reopened-and-reclosed";
    assert.notEqual((await verify(f.issues[0], merge)).status, "verified");
    Object.assign(f.issues[0], originalParent);
    const accepted = store.read("root");
    assert.ok(accepted);
    onDiscovery = () =>
      store.change("root", (value) => {
        value.state = "reconciliation";
      });
    assert.equal(
      (await verify(f.issues[1], merge)).status,
      "clarification",
      "concurrent reconciliation invalidates the owned receipt",
    );
    onDiscovery = () => {};
    store.change("root", (value) => Object.assign(value, accepted));
    closingReferences = [nativeReference];
    store.change("root", (value) => {
      value.state = "reconciliation";
    });
    assert.notEqual((await verify(f.issues[1], merge)).status, "verified");
    store.change("root", (value) => Object.assign(value, accepted));
    store.change("root", (value) => {
      if (value.finalization) value.finalization.state = "stale";
    });
    assert.notEqual((await verify(f.issues[1], merge)).status, "verified");
    store.change("root", (value) => {
      value.finalizationHistory = value.finalization ? [value.finalization] : [];
      delete value.finalization;
    });
    assert.notEqual(
      (await verify(f.issues[1], merge)).status,
      "verified",
      "historical acceptance cannot bypass through a native reference",
    );
    store.change("root", (value) => Object.assign(value, accepted));
    f.issues[1].revision = "new-closed-revision";
    assert.notEqual(
      (await verify(f.issues[1], merge)).status,
      "verified",
      "changed member cannot bypass through a native reference",
    );
    assert.ok(requests.some((value) => value.startsWith("GET /repos/owner/repo/pulls?")));
  });
}
