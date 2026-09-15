import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fixtureGitHubToken } from "./github.ts";

test("offline preparation retains full skill hashes and accepts a later credential path without reading credentials", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-live-prepare-"));
  try {
    const skill = join(root, "fixture-skill");
    mkdirSync(skill);
    writeFileSync(join(skill, "SKILL.md"), "---\nname: fixture\n---\nfixture source\n");
    writeFileSync(join(skill, "support.md"), "original support");
    const runtime = join(root, "runtime.json");
    writeFileSync(
      runtime,
      JSON.stringify({
        version: 1,
        mode: "fixture",
        image: "fixture:local",
        authFile: join(root, "not-read-auth.json"),
        skills: [{ path: skill }],
        checks: ["node --test"],
      }),
    );
    const state = join(root, "state");
    const cli = (...args: string[]) =>
      spawnSync(process.execPath, [resolve("tests/live-factory.ts"), ...args, "--state", state], {
        encoding: "utf8",
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
      });
    const prepared = cli("prepare", "--runtime-config", runtime);
    assert.equal(prepared.status, 0, prepared.stderr);
    const first = JSON.parse(prepared.stdout);
    const inventory = JSON.parse(readFileSync(join(state, "payload-inventory.json"), "utf8"));
    assert.equal(inventory[0].files.length, 2);
    const attached = cli("prepare", "--credential-file", join(root, "not-yet-created.env"));
    assert.equal(attached.status, 0, attached.stderr);
    assert.equal(JSON.parse(attached.stdout).payloadHash, first.payloadHash);
    const dry = cli("setup");
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).state, "dry-run");
    writeFileSync(join(skill, "support.md"), "changed support");
    const changed = cli("run", "--approved-payload", first.payloadHash);
    assert.equal(changed.status, 1);
    assert.match(changed.stderr, /Reviewed fixture payload changed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fixture credentials combine existing GitHub authorization with a Telegram-only private file and reject duplicate keys", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-fixture-credentials-"));
  const file = join(root, "telegram.env");
  try {
    writeFileSync(
      file,
      "FACTORY_TELEGRAM_TOKEN=synthetic-bot\nFACTORY_TELEGRAM_MAINTAINER_ID=42\n",
      { mode: 0o600 },
    );
    assert.equal(fixtureGitHubToken(file, { FACTORY_GITHUB_TOKEN: "existing-gh" }), "existing-gh");
    assert.equal(
      fixtureGitHubToken(undefined, { FACTORY_GITHUB_TOKEN: "existing-gh" }),
      "existing-gh",
    );
    writeFileSync(file, "FACTORY_GITHUB_TOKEN=duplicate\n");
    assert.throws(
      () => fixtureGitHubToken(file, { FACTORY_GITHUB_TOKEN: "existing-gh" }),
      /conflicting/,
    );
    assert.throws(() => fixtureGitHubToken(undefined, {}), /GitHub authorization/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
