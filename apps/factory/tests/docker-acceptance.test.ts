import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { DiscoveredIssue } from "../src/discovery.ts";
import { captureResources, DockerPiWorker, type WorkerRequest } from "../src/index.ts";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

test("real Docker/Pi accepts unchanged whole graph, preserves session across checkpoint, and rejects stale or modified evidence", {
  timeout: 120000,
}, async () => {
  const directory = mkdtempSync(join(tmpdir(), "factory-docker-523-"));
  const repository = join(directory, "repository");
  mkdirSync(repository);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@localhost");
  writeFileSync(join(repository, "result.txt"), "assembled graph\n");
  git("add", ".");
  git("commit", "-m", "test: assembled graph");
  const head = git("rev-parse", "HEAD"),
    tree = git("rev-parse", "HEAD^{tree}");
  const bundle = join(directory, "source.bundle");
  git("bundle", "create", bundle, "--all");
  const auth = join(directory, "auth.json");
  writeFileSync(
    auth,
    JSON.stringify({
      "openai-codex": {
        type: "oauth",
        access: "fixture",
        refresh: "fixture",
        expires: 9999999999999,
      },
    }),
  );
  const skill = join(directory, "code-review");
  mkdirSync(skill);
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: code-review\ndescription: synthetic whole graph review\ndisable-model-invocation: true\n---\nReview the root and intermediate specifications against the unchanged assembled graph.\n",
  );
  const options = {
    directory: join(directory, "workers"),
    repositoryPath: repository,
    image: process.env.FACTORY_DOCKER_TEST_IMAGE ?? "zaidan-factory-acceptance-test-523:0.85.1",
    network: "none" as const,
    auth: { sourceFile: auth, lockDirectory: join(directory, "auth-locks") },
  };
  const member = (issueId: string, number: number): DiscoveredIssue => ({
    issueId,
    number,
    repository: "fixture/local",
    revision: `revision-${number}`,
    contentRevision: `content-${number}`,
    stateReason: null,
    sourceRef: "fixture-source",
    updatedAt: "2026-09-15T00:00:00Z",
    title: `Specification ${number}`,
    body: "The assembled graph preserves the greeting",
    labels: ["ready-for-agent"],
    state: "open",
    parentIds: [],
    dependencyIds: [],
    childIds: [],
  });
  try {
    for (const number of [12, 13, 14, 15]) {
      const issue = {
        issueId: `leaf-${number}`,
        number,
        revision: "original-revision",
        repository: "fixture/local",
        startingRevision: head,
        reviewBase: head,
      };
      const resources = captureResources({
        directory: join(directory, `resources-${number}`),
        issue,
        entry: "code-review",
        skills: [{ path: skill }],
        dependencies: {},
        checks: ['test "$(cat result.txt)" = "assembled graph"'],
      });
      const request: WorkerRequest = {
        operationId: `${directory}:${number}:0`,
        runId: `run-${number}`,
        phase: 0,
        issue,
        resources,
        session: { id: `original-${number}`, path: join(directory, `sessions-${number}`) },
        acceptance: {
          id: `acceptance-${number}`,
          graphId: "root",
          graphRevision: "graph-revision",
          branch: "codex/fixture",
          head,
          tree,
          reviewBase: head,
          source: { kind: "git-bundle", path: bundle, sha256: hash(readFileSync(bundle)) },
          entry: "code-review",
          members: [member("root", 100), member("intermediate", 101)],
          briefs: [],
          specificationIds: ["root", "intermediate"],
        },
      };
      const worker = new DockerPiWorker(options);
      const waiting = await worker.dispatch(request);
      assert.equal(waiting.type, "checkpoint", JSON.stringify(waiting));
      assert.ok(waiting.type === "checkpoint");
      const sessionPath = join(request.session.path, `${request.session.id}.jsonl`);
      const originalSession = readFileSync(sessionPath, "utf8");
      const resumed: WorkerRequest = {
        ...request,
        operationId: `${directory}:${number}:1`,
        phase: 1,
        answer: { text: "Review all specifications" },
        checkpoint: { id: "question", phase: 0, question: waiting.question, answerId: "answer" },
      };
      const outcome = await new DockerPiWorker(options).resume(resumed);
      assert.ok(readFileSync(sessionPath, "utf8").startsWith(originalSession));
      if (number !== 12) {
        assert.equal(outcome.type, "failed", JSON.stringify(outcome));
        continue;
      }
      assert.equal(outcome.type, "graph-accepted", JSON.stringify(outcome));
      assert.ok(outcome.type === "graph-accepted");
      const evidence = outcome.evidence;
      assert.equal(evidence.commit, head); // No fabricated final commit or diff, even base == head.
      assert.equal(evidence.tree, tree);
      assert.equal(evidence.snapshot, resources.id);
      assert.equal(evidence.issueRevision, "original-revision");
      assert.deepEqual(evidence.report, {
        title: "Preserve the assembled greeting across the specification graph",
        summary:
          "The assembled implementation preserves the greeting required by the root and intermediate specifications.",
        validation:
          "The selected greeting check and independent standards/spec reviews passed on the unchanged graph.",
      });
      const binding = {
        id: request.acceptance?.id,
        graphId: "root",
        graphRevision: "graph-revision",
        head,
      };
      for (const item of [
        evidence,
        ...(evidence.checks as Record<string, unknown>[]),
        ...(evidence.reviews as Record<string, unknown>[]),
      ]) {
        assert.deepEqual(item.acceptance, binding);
        assert.equal(item.commit, head);
        assert.equal(item.reviewBase, head);
      }
      const output = join(options.directory, "operations", hash(resumed.operationId), "output");
      const context = readFileSync(join(output, "context.md"), "utf8");
      assert.match(context, /every specification's acceptance criteria/);
      const receipt = join(output, "outcome.json");
      const saved = readFileSync(receipt, "utf8");
      for (const alter of [
        (value: typeof outcome) => {
          const check = (value.evidence.checks as Record<string, unknown>[])[0];
          assert.ok(check);
          check.acceptance = { ...binding, graphRevision: "stale" };
        },
        (value: typeof outcome) => {
          value.evidence.commit = "a".repeat(40);
        },
        ...[
          "<!-- coordinator marker -->",
          "Fixes #123",
          "resolved other/repo#2",
          "Closed https://github.com/other/repo/issues/1",
          " ",
          "x".repeat(2401),
        ].map((summary) => (value: typeof outcome) => {
          const report = value.evidence.report as Record<string, unknown>;
          report.summary = summary;
        }),
        (value: typeof outcome) => {
          delete value.evidence.report;
        },
      ]) {
        const value = JSON.parse(saved);
        alter(value);
        writeFileSync(receipt, JSON.stringify(value));
        await assert.rejects(
          new DockerPiWorker(options).reconcile(resumed.operationId),
          /docker operation failed/,
        );
      }
      writeFileSync(receipt, saved);
      assert.equal(
        (await new DockerPiWorker(options).reconcile(resumed.operationId))?.type,
        "graph-accepted",
      );
    }
  } finally {
    if (process.env.FACTORY_KEEP_FIXTURES !== "1")
      rmSync(directory, { recursive: true, force: true });
  }
});
