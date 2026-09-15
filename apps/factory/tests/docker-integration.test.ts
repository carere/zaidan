import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { captureResources, DockerPiWorker, type WorkerRequest } from "../src/index.ts";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

test("real Docker/Pi resolves a graph conflict with original provenance, retained session and exact assembled evidence", {
  timeout: 120000,
}, async () => {
  const directory = mkdtempSync(join(tmpdir(), "factory-docker-522-"));
  const runId = basename(directory);
  const repository = join(directory, "repository");
  mkdirSync(repository);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
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
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@localhost");
  writeFileSync(join(repository, "result.txt"), "base\n");
  git("add", ".");
  git("commit", "-m", "test: base");
  const base = git("rev-parse", "HEAD");
  const issue = {
    issueId: "I_11",
    number: 11,
    revision: "original-revision",
    repository: "fixture/local",
    startingRevision: base,
    reviewBase: base,
  };
  const skills = ["fixture", "resolving-merge-conflicts", "code-review"].map((name) => {
    const path = join(directory, name);
    mkdirSync(path);
    writeFileSync(
      join(path, "SKILL.md"),
      `---\nname: ${name}\ndescription: synthetic conflict fixture\ndisable-model-invocation: true\n---\n${name === "fixture" ? "Copy support.txt to result.txt." : "Resolve conflicting child and sibling changes, checkpoint, validate and independently review the assembled result."}\n`,
    );
    return { path };
  });
  writeFileSync(join(directory, "fixture", "support.txt"), "child\n");
  const resources = captureResources({
    directory: join(directory, "resources"),
    issue,
    entry: "fixture",
    skills,
    dependencies: {},
    checks: [
      'if test -f sibling.txt; then test "$(cat result.txt)" = \'child and sibling\' && test "$(cat sibling.txt)" = \'sibling preserved\'; else test "$(cat result.txt)" = child; fi',
    ],
  });
  let containment:
    | {
        Config: { User: string; Env: string[] };
        HostConfig: { NetworkMode: string; ReadonlyRootfs: boolean; Privileged: boolean };
        Mounts: { Source: string; Destination: string; RW: boolean }[];
      }
    | undefined;
  const options = {
    directory: join(directory, "workers"),
    repositoryPath: repository,
    image: process.env.FACTORY_DOCKER_TEST_IMAGE ?? "zaidan-factory-integration-test-522:0.85.1",
    network: "none" as const,
    auth: { sourceFile: auth, lockDirectory: join(directory, "auth-locks") },
    onEvent: (event: { operationId: string; type: string; event: unknown }) => {
      if (event.type === "factory.integration") {
        const observed = event.event as { conflicts: string };
        assert.equal(observed.conflicts, "result.txt");
        const name = `zaidan-worker-${hash(event.operationId).slice(0, 32)}`;
        [containment] = JSON.parse(execFileSync("docker", ["inspect", name], { encoding: "utf8" }));
      }
    },
  };
  const worker = new DockerPiWorker(options);
  const request: WorkerRequest = {
    operationId: `${runId}:implementation:0`,
    runId,
    phase: 0,
    issue,
    resources,
    session: { id: "original-session", path: join(directory, "sessions") },
  };
  try {
    const waiting = await worker.dispatch(request);
    assert.equal(waiting.type, "checkpoint", JSON.stringify(waiting));
    assert.ok(waiting.type === "checkpoint");
    const implemented = await worker.resume({
      ...request,
      operationId: `${runId}:implementation:1`,
      phase: 1,
      answer: { text: "Implement" },
      checkpoint: {
        id: "initial-question",
        phase: 0,
        question: waiting.question,
        answerId: "answer-1",
      },
    });
    assert.equal(implemented.type, "completed", JSON.stringify(implemented));
    assert.ok(implemented.type === "completed");
    const originalArtifact = implemented.candidate.artifact as { path: string; sha256: string };
    const originalBundle = readFileSync(originalArtifact.path);
    const originalSession = readFileSync(
      join(request.session.path, "original-session.jsonl"),
      "utf8",
    );
    writeFileSync(join(repository, "result.txt"), "sibling\n");
    writeFileSync(join(repository, "sibling.txt"), "sibling preserved\n");
    git("add", ".");
    git("commit", "-m", "feat: independently integrated sibling");
    const head = git("rev-parse", "HEAD");
    const sourcePath = join(directory, "graph.bundle");
    git("bundle", "create", sourcePath, "HEAD");
    const integration = {
      graphId: "graph-11",
      graphRevision: "membership-r1",
      branch: "codex/graph-11",
      expectedHead: head,
      reviewBase: head,
      candidate: implemented.candidate,
      source: {
        kind: "git-bundle" as const,
        path: sourcePath,
        sha256: hash(readFileSync(sourcePath)),
      },
      entry: "resolving-merge-conflicts",
    };
    const mergeRequest: WorkerRequest = {
      ...request,
      operationId: `${runId}:integration:2`,
      phase: 2,
      integration,
    };
    const mergeWaiting = await worker.dispatch(mergeRequest);
    assert.equal(mergeWaiting.type, "checkpoint", JSON.stringify(mergeWaiting));
    assert.ok(mergeWaiting.type === "checkpoint");
    assert.ok(containment);
    assert.equal(containment.Config.User, "1000:1000");
    assert.equal(containment.HostConfig.NetworkMode, "none");
    assert.equal(containment.HostConfig.ReadonlyRootfs, true);
    assert.equal(containment.HostConfig.Privileged, false);
    for (const path of ["/source", "/input", "/resources", "/runtime"])
      assert.equal(containment.Mounts.find((mount) => mount.Destination === path)?.RW, false);
    const stateMount = containment.Mounts.find((mount) => mount.Destination === "/state");
    assert.ok(stateMount);
    assert.ok(stateMount.Source.includes("/integrations/"));
    const sourceMount = containment.Mounts.find((mount) => mount.Destination === "/source");
    assert.ok(sourceMount && !sourceMount.Source.startsWith(`${stateMount.Source}/`));
    assert.ok(
      containment.Mounts.every(
        (mount) => !mount.Destination.includes("docker.sock") && mount.Destination !== "/home",
      ),
    );
    assert.ok(
      containment.Config.Env.every((env) => !/^(GH_|GITHUB_|TELEGRAM_|OPENAI_API_KEY)/.test(env)),
    );
    rmSync(sourcePath); // Resume must use the retained immutable integration input.
    const resumed = {
      ...mergeRequest,
      operationId: `${runId}:integration:3`,
      phase: 3,
      answer: { text: "Resolve retaining both" },
      checkpoint: {
        id: "merge-question",
        phase: 2,
        question: mergeWaiting.question,
        answerId: "answer-2",
      },
    };
    const result = await new DockerPiWorker(options).resume(resumed);
    assert.equal(result.type, "completed", JSON.stringify(result));
    assert.ok(result.type === "completed");
    const evidence = {
      graphId: "graph-11",
      graphRevision: "membership-r1",
      expectedHead: head,
      candidateCommit: implemented.candidate.commit,
    };
    assert.deepEqual(result.candidate.integration, evidence);
    assert.equal(result.candidate.reviewBase, head);
    assert.equal(result.candidate.snapshot, resources.id);
    assert.equal(result.candidate.issueRevision, "original-revision");
    for (const item of [
      ...(result.candidate.checks as Record<string, unknown>[]),
      ...(result.candidate.reviews as Record<string, unknown>[]),
    ]) {
      assert.deepEqual(item.integration, evidence);
      assert.equal(item.reviewBase, head);
      assert.equal(item.commit, result.candidate.commit);
    }
    assert.deepEqual(readFileSync(originalArtifact.path), originalBundle);
    const originalReviews = implemented.candidate.reviews as { delegateSession: string }[];
    const mergedReviews = result.candidate.reviews as { delegateSession: string }[];
    assert.ok(
      mergedReviews.every((review) =>
        originalReviews.every((original) => original.delegateSession !== review.delegateSession),
      ),
    );
    assert.equal(
      readFileSync(
        join(directory, "workers", "runs", hash(runId), "checkout", "result.txt"),
        "utf8",
      ),
      "child\n",
    );
    const session = readFileSync(join(request.session.path, "original-session.jsonl"), "utf8");
    assert.ok(session.startsWith(originalSession));
    const messages = session
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.ok(
      messages.some((entry) =>
        entry.message?.content?.some((part: { text?: string }) =>
          part.text?.includes('<skill name="resolving-merge-conflicts"'),
        ),
      ),
    );
    const artifact = result.candidate.artifact as { path: string; sha256: string };
    assert.equal(hash(readFileSync(artifact.path)), artifact.sha256);
    // Import only the immutable sandbox bundle into this trusted fixture repository.
    git("fetch", artifact.path, "HEAD");
    assert.equal(git("show", `${result.candidate.commit}:result.txt`), "child and sibling");
    assert.equal(git("show", `${result.candidate.commit}:sibling.txt`), "sibling preserved");
    git("merge-base", "--is-ancestor", head, result.candidate.commit);
    git("merge-base", "--is-ancestor", implemented.candidate.commit, result.candidate.commit);
    const receipt = join(
      options.directory,
      "operations",
      hash(resumed.operationId),
      "output",
      "outcome.json",
    );
    const altered = JSON.parse(readFileSync(receipt, "utf8"));
    altered.candidate.checks[0].integration.expectedHead = base;
    writeFileSync(receipt, JSON.stringify(altered));
    await assert.rejects(
      new DockerPiWorker(options).reconcile(resumed.operationId),
      /docker operation failed/,
    );
    const invalid = {
      ...mergeRequest,
      operationId: `${runId}:invalid`,
      integration: { ...integration, entry: "uncaptured-resolver" },
    };
    assert.equal((await worker.dispatch(invalid)).type, "failed");
    assert.equal(
      existsSync(
        join(options.directory, "operations", hash(invalid.operationId), "output", "events.jsonl"),
      ),
      false,
    );
  } finally {
    if (process.env.FACTORY_KEEP_FIXTURES !== "1")
      rmSync(directory, { recursive: true, force: true });
  }
});
