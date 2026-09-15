import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fixtureGitHub, type NativeIssue, type NativePull } from "./github.ts";
import { FixtureJournal } from "./journal.ts";
import { advanceFixture, evidenceReport, type Progress, recordProgress, stages } from "./runner.ts";
import { externalFiles, repository } from "./scenario.ts";
import type { SetupState } from "./setup.ts";

const sha = (n: number) => n.toString(16).padStart(40, "0");

test("native PR data drives three persistent maintainer waits; wrong merge mode and identity never count", async () => {
  const directory = mkdtempSync(join(tmpdir(), "factory-live-merges-"));
  const merged = new Set<number>();
  const methods: string[] = [];
  let wrongMode = false;
  const pr = (n: number): NativePull => ({
    id: n,
    node_id: `PR${n}`,
    number: n,
    html_url: `https://github.com/${repository}/pull/${n}`,
    body: "fixture",
    state: merged.has(n) ? "closed" : "open",
    draft: false,
    merged: merged.has(n),
    merge_commit_sha: sha(n + 10),
    head: { sha: sha(n), ref: `codex/${n}`, repo: { full_name: repository } },
    base: { ref: "main", repo: { full_name: repository } },
    user: { id: 42 },
  });
  const issue = (number: number, key: string): NativeIssue => ({
    id: number,
    node_id: key,
    number,
    html_url: `https://github.com/${repository}/issues/${number}`,
    title: key,
    body: "fixture",
    updated_at: "revision",
    state: "closed",
    state_reason: "completed",
    labels: [],
    user: { id: 42 },
  });
  const server = createServer((req, res) => {
    methods.push(req.method ?? "");
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    let result: unknown;
    if (path.includes("/pulls/")) result = pr(Number(path.split("/").at(-1)));
    else if (path.includes("/commits/"))
      result = {
        parents: Array.from({ length: path.endsWith(sha(12)) && !wrongMode ? 1 : 2 }, () => ({
          sha: sha(99),
        })),
      };
    else if (path.includes("/compare/"))
      result = { status: path.includes(`${sha(2)}...`) ? "diverged" : "ahead" };
    else if (path.includes("/contents/"))
      result = {
        encoding: "base64",
        content: Buffer.from(externalFiles["src/format.mjs"]).toString("base64"),
      };
    else if (path.includes("/issues/")) {
      const number = Number(path.split("/").at(-1));
      result = issue(
        number,
        ({ 1: "E1", 2: "E2", 3: "R", 4: "P" } as Record<number, string>)[number],
      );
    }
    res.writeHead(result ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify(result ?? {}));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const github = fixtureGitHub("synthetic-test-token", `http://127.0.0.1:${address.port}`);
  const setup: SetupState = {
    version: 1,
    scenario: "scenario",
    repository,
    timestamp: "time",
    sourceHash: sha(1),
    main: sha(0),
    external: sha(2),
    externalBranch: "codex/e2",
    repositoryId: "REPO",
    activated: true,
    issues: { E1: issue(1, "E1"), E2: issue(2, "E2"), R: issue(3, "R"), P: issue(4, "P") },
    externalPull: pr(2),
  };
  const progress: Progress = {
    service: {
      mode: "fixture",
      ready: true,
      instanceId: "owner1",
      rollout: {
        enabled: true,
        binding: { runtime: "runtime", configuration: "configuration", repositoryId: "REPO" },
      },
    },
    evidence: { tier: "native-production", image: "sha256:fixture" },
    runs: [
      {
        runId: "run1",
        issueId: "E1",
        issueNumber: 1,
        issueRevision: "revision",
        route: "implementation",
        status: "completed",
        phase: 1,
        sessionId: "session",
        snapshotId: "snapshot",
        startingRevision: sha(0),
        candidate: sha(1),
        publication: { state: "reviewable", pullRequest: pr(1).html_url },
      },
    ],
    graphs: [
      {
        graphId: "R",
        head: sha(3),
        revision: "graph-revision",
        state: "reviewable",
        pullRequest: pr(3).html_url,
        acceptance: { id: "acceptance", state: "reviewable", head: sha(3), tree: sha(4) },
      },
    ],
  };
  try {
    let journal = new FixtureJournal(directory);
    recordProgress(journal, progress);
    assert.equal((await advanceFixture(journal, setup, progress, github)).state, stages[0]);
    merged.add(1);
    journal = new FixtureJournal(directory);
    assert.equal((await advanceFixture(journal, setup, progress, github)).state, stages[1]);
    merged.add(2);
    wrongMode = true;
    await assert.rejects(advanceFixture(journal, setup, progress, github), /distinct squash/);
    wrongMode = false;
    assert.equal((await advanceFixture(journal, setup, progress, github)).state, stages[2]);
    merged.add(3);
    assert.equal(
      (await advanceFixture(new FixtureJournal(directory), setup, progress, github)).state,
      "delivery-observed-evidence-review-required",
    );
    assert.equal(evidenceReport(journal, setup).completed, false);
    assert.ok(methods.every((method) => method === "GET"));
    const changed = structuredClone(progress);
    assert.ok(changed.service.rollout?.binding);
    changed.service.rollout.binding.repositoryId = "OTHER";
    await assert.rejects(advanceFixture(journal, setup, changed, github), /does not match/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("GitHub transport handles verified empty repository, all collection pages, and uncertain response recovery", async () => {
  const directory = mkdtempSync(join(tmpdir(), "factory-live-http-"));
  let creates = 0;
  let stored: { id: number; node_id: string } | undefined;
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname.endsWith("git/ref/heads/main")) {
      res.writeHead(409, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "Git Repository is empty." }));
      return;
    }
    if (req.method === "POST") {
      creates++;
      stored = { id: 123, node_id: "I123" };
      req.socket.destroy();
      return;
    }
    const page = Number(url.searchParams.get("page") ?? 1);
    const result = url.pathname.endsWith("/issues")
      ? stored
        ? [stored]
        : []
      : page === 1
        ? Array.from({ length: 100 }, (_, id) => ({ id }))
        : [{ id: 100 }];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(result));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const github = fixtureGitHub("synthetic", `http://127.0.0.1:${address.port}`);
  try {
    assert.equal(await github.request(`${github.path}/git/ref/heads/main`), undefined);
    assert.equal((await github.list(`${github.path}/labels`)).length, 101);
    const find = async () =>
      (await github.list<{ id: number; node_id: string }>(`${github.path}/issues`))[0];
    await assert.rejects(
      new FixtureJournal(directory).effect("issue", { title: "fixed" }, find, async () =>
        github.request(`${github.path}/issues`, "POST", { title: "fixed" }),
      ),
    );
    assert.deepEqual(
      await new FixtureJournal(directory).effect("issue", { title: "fixed" }, find, async () => {
        throw Error("duplicate");
      }),
      stored,
    );
    assert.equal(creates, 1);
    await assert.rejects(github.request(`${github.path}/pulls/1/merge`, "PUT", {}), /never merges/);
    await assert.rejects(
      github.request("repos/carere/zaidan/issues", "POST", {}),
      /outside repository/,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
