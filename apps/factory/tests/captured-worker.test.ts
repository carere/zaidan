import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { captureResources, readResourceSnapshot } from "../src/captured-resources.ts";
import { IssueWorkflow, SqliteWorkflowStore } from "../src/index.ts";

test("admission retains complete original skill resources through source edits and workflow restart", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-resources-"));
  try {
    const skill = join(root, "home", "implement");
    mkdirSync(skill, { recursive: true });
    writeFileSync(
      join(skill, "SKILL.md"),
      "---\nname: fixture\ndescription: fixture\ndisable-model-invocation: true\n---\nRead [support](support.txt).\n\n```md\n[Example context](./ordering.md)\n```\n",
    );
    writeFileSync(join(skill, "support.txt"), "original resource");
    const issue = {
      issueId: "I_1",
      revision: "revision-1",
      repository: "fixture/repo",
      number: 1,
      startingRevision: "abc",
      reviewBase: "abc",
    };
    const store = new SqliteWorkflowStore(join(root, "state", "workflow.db"));
    let captured = 0;
    const options = {
      store,
      engine: {
        async start() {
          return "eve-1";
        },
        async find() {
          return undefined;
        },
        async wake() {},
      },
      notifications: {
        async send() {
          return "receipt";
        },
        async reconcile() {
          return undefined;
        },
      },
      worker: {
        async dispatch() {
          return { type: "failed" as const, reason: "not started" };
        },
        async resume() {
          return { type: "failed" as const, reason: "not started" };
        },
        async reconcile() {
          return undefined;
        },
      },
      async captureResources(admittedIssue: typeof issue) {
        captured++;
        return captureResources({
          directory: join(root, "snapshots"),
          issue: admittedIssue,
          entry: "fixture",
          skills: [{ path: skill }],
          dependencies: {},
        });
      },
    };
    const admitted = await new IssueWorkflow(options).admit(issue);
    writeFileSync(join(skill, "support.txt"), "changed resource");
    const resumed = await new IssueWorkflow(options).admit(issue);
    assert.equal(captured, 1);
    assert.deepEqual(resumed.resources, admitted.resources);
    assert.ok(resumed.resources);
    const manifest = readResourceSnapshot(resumed.resources);
    assert.ok(manifest.skills[0]);
    assert.equal(
      readFileSync(
        join(resumed.resources.path, manifest.skills[0].relativePath, "support.txt"),
        "utf8",
      ),
      "original resource",
    );
    const newer = await new IssueWorkflow(options).admit({ ...issue, revision: "revision-2" });
    assert.notEqual(newer.resources?.id, resumed.resources.id);
    store.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("admission rejects ambiguous skill identities and missing resources before any workflow starts", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-preflight-"));
  try {
    const issue = {
      issueId: "I_1",
      revision: "1",
      repository: "fixture/repo",
      number: 1,
      startingRevision: "abc",
      reviewBase: "abc",
    };
    const home = join(root, "home"),
      repository = join(root, "repository");
    for (const directory of [home, repository]) {
      mkdirSync(directory);
      writeFileSync(
        join(directory, "SKILL.md"),
        "---\nname: implement\ndescription: fixture\n---\nRead [required](support.md).\n",
      );
      writeFileSync(join(directory, "support.md"), "support");
    }
    const options = {
      directory: join(root, "snapshots"),
      issue,
      entry: "implement",
      skills: [{ path: home }, { path: repository }],
      dependencies: {},
    };
    assert.throws(() => captureResources(options), /Ambiguous skill implement/);
    const selected = captureResources({
      ...options,
      skills: [{ path: home, selected: true }, { path: repository }],
    });
    assert.equal(readResourceSnapshot(selected).skills[0]?.source, home);
    assert.throws(
      () =>
        captureResources({
          ...options,
          skills: [{ path: home }],
          dependencies: { implement: ["tdd"] },
        }),
      /Missing dependency tdd/,
    );
    rmSync(join(home, "support.md"));
    assert.throws(
      () => captureResources({ ...options, skills: [{ path: home }] }),
      /Missing referenced resource support.md/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("selected symlink trees are materialized while dangling and unselected dependencies fail", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-symlink-"));
  try {
    const actual = join(root, "actual"),
      linked = join(root, "linked");
    mkdirSync(actual);
    writeFileSync(
      join(actual, "SKILL.md"),
      "---\nname: fixture\ndescription: fixture\n---\nRead [support](support.md).\n",
    );
    writeFileSync(join(actual, "original.md"), "captured symlink target");
    symlinkSync("original.md", join(actual, "support.md"));
    symlinkSync(actual, linked);
    const options = {
      directory: join(root, "snapshots"),
      issue: {
        issueId: "I",
        revision: "1",
        repository: "f/r",
        number: 1,
        startingRevision: "a",
        reviewBase: "a",
      },
      entry: "fixture",
      skills: [{ path: linked }],
      dependencies: {},
    };
    const captured = captureResources(options);
    const resolved = realpathSync(actual);
    rmSync(actual, { recursive: true });
    assert.equal(
      readFileSync(join(captured.path, "skills/fixture/support.md"), "utf8"),
      "captured symlink target",
    );
    assert.equal(readResourceSnapshot(captured).skills[0]?.resolvedSource, resolved);
    assert.throws(() => captureResources(options), /ENOENT/);
    mkdirSync(actual);
    writeFileSync(join(actual, "SKILL.md"), "---\nname: fixture\ndescription: fixture\n---\n");
    writeFileSync(join(root, "outside.md"), "unselected");
    symlinkSync(join(root, "outside.md"), join(actual, "support.md"));
    assert.throws(() => captureResources(options), /Unselected symlink dependency/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
