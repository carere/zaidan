import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readResourceSnapshot } from "../src/captured-resources.ts";
import { createProductionResources } from "../src/production-resources.ts";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "factory-production-resources-"));
  const remote = join(directory, "remote");
  mkdirSync(remote);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: remote,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  const write = (path: string, text: string) => {
    const target = join(remote, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, text);
  };
  write("AGENTS.md", "original tracked instructions");
  write("README.md", "original readme");
  write("docs/agents/rules.md", "original rules");
  write(
    ".agents/skills/fixture/SKILL.md",
    "---\nname: fixture\n---\nRead [support](support.txt).\n",
  );
  write(".agents/skills/fixture/support.txt", "original support");
  write(".agents/skills/fixture/AGENTS.md", "nested tracked instructions");
  write("app.ts", "export const secret = 'irrelevant application source';");
  git("add", ".");
  git("commit", "-m", "fixture source");
  const head = git("rev-parse", "HEAD");
  const trustedGitDirectory = join(directory, "trusted.git");
  const resources = createProductionResources({
    trustedGitDirectory,
    remote,
    directory: join(directory, "resources"),
  });
  const issue = {
    issueId: "I_fixture",
    revision: "revision-1",
    repository: "fixture/repo",
    number: 1,
    startingRevision: head,
    reviewBase: head,
  };
  const settings = {
    entry: "fixture",
    skills: [{ path: ".agents/skills/fixture" }],
    checks: ["node --test"],
    dependencies: {},
    requiredResources: {},
  };
  return { directory, remote, git, write, head, resources, trustedGitDirectory, issue, settings };
}

test("fresh trusted store fetches observed heads and retains exact external objects without a checkout", async () => {
  const f = fixture();
  try {
    assert.equal(await f.resources.git.branchHead("main"), f.head);
    f.write("delivery.txt", "external implementation");
    f.git("add", ".");
    f.git("commit", "-m", "external delivery");
    const delivered = f.git("rev-parse", "HEAD");
    f.git("branch", "codex/graph");
    f.git("update-ref", "refs/pull/12/head", delivered);
    await f.resources.prepare([{ ref: "refs/pull/12/head", commit: delivered }]);
    assert.equal(await f.resources.git.contains(delivered, f.head), true);
    assert.equal(await f.resources.git.branchHead("codex/graph"), delivered);
    const bundle = await f.resources.git.exportBundle(delivered);
    assert.ok(readFileSync(bundle.path).length > 0);
    await assert.rejects(
      f.resources.prepare([{ ref: "refs/heads/main", commit: f.head }]),
      /changed/,
    );
    await f.resources.prepare([{ ref: f.head, commit: f.head }]);
    assert.equal(
      execFileSync(
        "git",
        [`--git-dir=${f.trustedGitDirectory}`, "rev-parse", "--is-bare-repository"],
        { encoding: "utf8" },
      ).trim(),
      "true",
    );
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("capture binds exact tracked source, selected complete skill trees and checks despite host edits", async () => {
  const f = fixture();
  try {
    await f.resources.prepare([{ ref: "refs/heads/main", commit: f.head }]);
    f.write("AGENTS.md", "uncommitted instructions must not be captured");
    f.write("docs/context/secret.md", "untracked document must not be captured");
    f.write(".agents/skills/fixture/support.txt", "uncommitted skill edits");
    const snapshot = await f.resources.capture(f.issue, f.settings);
    const manifest = readResourceSnapshot(snapshot);
    assert.equal(
      readFileSync(join(snapshot.path, "repository/AGENTS.md"), "utf8"),
      "original tracked instructions",
    );
    assert.equal(
      readFileSync(join(snapshot.path, "repository/.agents/skills/fixture/support.txt"), "utf8"),
      "original support",
    );
    assert.deepEqual(manifest.checks, ["node --test"]);
    assert.deepEqual(manifest.issue, f.issue);
    assert.ok(manifest.instructions.includes("repository/docs/agents/rules.md"));
    assert.ok(manifest.instructions.includes("repository/.agents/skills/fixture/AGENTS.md"));
    assert.equal(
      manifest.files.some((file) => /secret|app\.ts/.test(file.path)),
      false,
    );
    assert.ok(manifest.files.every((file) => file.source.includes(f.head)));
    rmSync(f.remote, { recursive: true, force: true });
    assert.deepEqual(readResourceSnapshot(snapshot), manifest);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("route capture rejects missing closure and checks, and resolves only tracked contained symlinks", async () => {
  const f = fixture();
  try {
    symlinkSync("support.txt", join(f.remote, ".agents/skills/fixture/linked.txt"));
    f.git("add", ".");
    f.git("commit", "-m", "tracked link");
    const head = f.git("rev-parse", "HEAD");
    await f.resources.prepare([{ ref: "refs/heads/main", commit: head }]);
    const issue = { ...f.issue, startingRevision: head, reviewBase: head };
    await assert.rejects(f.resources.capture(issue, { ...f.settings, checks: [] }), /checks/);
    await assert.rejects(
      f.resources.capture(issue, { ...f.settings, dependencies: { fixture: ["missing"] } }),
      /Missing dependency/,
    );
    const snapshot = await f.resources.capture(issue, f.settings);
    assert.equal(
      readFileSync(join(snapshot.path, "repository/.agents/skills/fixture/linked.txt"), "utf8"),
      "original support",
    );
    symlinkSync("/etc/passwd", join(f.remote, ".agents/skills/fixture/escape.txt"));
    f.git("add", ".");
    f.git("commit", "-m", "unsafe link");
    const unsafe = f.git("rev-parse", "HEAD");
    await f.resources.prepare([{ ref: "refs/heads/main", commit: unsafe }]);
    await assert.rejects(
      f.resources.capture({ ...issue, startingRevision: unsafe }, f.settings),
      /symlink/,
    );
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("route closure selects original home resources and graph phase entries, excluding unrelated catalog skills", async () => {
  const f = fixture();
  try {
    const skills = [
      "implement",
      "triage",
      "tdd",
      "codebase-design",
      "code-review",
      "resolving-merge-conflicts",
      "grilling",
      "domain-modeling",
    ].map((name) => {
      const path = join(f.directory, "home-skills", name);
      mkdirSync(path, { recursive: true });
      writeFileSync(
        join(path, "SKILL.md"),
        `---\nname: ${name}\n---\nRead [support](support.md).\n`,
      );
      writeFileSync(join(path, "support.md"), `original ${name} supporting resource`);
      return { path };
    });
    await f.resources.git.branchHead("main");
    const settings = { skills, requiredResources: {}, checks: ["node --test"] };
    const implementation = await f.resources.capture(
      { ...f.issue, graphId: "graph" },
      { ...settings, entry: "implement", extraEntries: ["resolving-merge-conflicts"] },
    );
    const implementationManifest = readResourceSnapshot(implementation);
    assert.deepEqual(implementationManifest.skills.map((skill) => skill.name).sort(), [
      "code-review",
      "codebase-design",
      "implement",
      "resolving-merge-conflicts",
      "tdd",
    ]);
    const triage = await f.resources.capture(
      { ...f.issue, route: "triage" },
      { ...settings, checks: [], entry: "triage" },
    );
    assert.deepEqual(
      readResourceSnapshot(triage)
        .skills.map((skill) => skill.name)
        .sort(),
      ["domain-modeling", "grilling", "triage"],
    );
    assert.ok(
      implementationManifest.skills.every((skill) =>
        skill.source.startsWith(join(f.directory, "home-skills")),
      ),
    );
    rmSync(join(f.directory, "home-skills"), { recursive: true, force: true });
    assert.equal(
      readFileSync(join(implementation.path, "skills/tdd/support.md"), "utf8"),
      "original tdd supporting resource",
    );
    assert.deepEqual(readResourceSnapshot(implementation), implementationManifest);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("repository skill links are checked and foreign Git environment cannot redirect source capture", async () => {
  const f = fixture();
  const previous = process.env.GIT_CONFIG_GLOBAL;
  try {
    const config = join(f.directory, "ambient.gitconfig");
    writeFileSync(
      config,
      "[alias]\n ls-tree = !touch should-never-run\n[core]\n hooksPath = /not-a-real-hook-directory\n",
    );
    process.env.GIT_CONFIG_GLOBAL = config;
    await f.resources.git.branchHead("main");
    f.write(
      ".agents/skills/fixture/SKILL.md",
      "---\nname: fixture\n---\nRead [missing](missing.md).\n",
    );
    f.git("add", ".");
    f.git("commit", "-m", "broken repo skill reference");
    const head = f.git("rev-parse", "HEAD");
    await f.resources.prepare([{ ref: "refs/heads/main", commit: head }]);
    await assert.rejects(
      f.resources.capture({ ...f.issue, startingRevision: head }, f.settings),
      /Missing referenced resource missing.md/,
    );
    await assert.rejects(
      f.resources.prepare([{ ref: "--upload-pack=evil", commit: head }]),
      /exact observed/,
    );
  } finally {
    if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = previous;
    rmSync(f.directory, { recursive: true, force: true });
  }
});
