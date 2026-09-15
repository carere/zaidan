import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadPrivateEnvironment,
  readProductionConfig,
  runtimeSourceIdentity,
} from "../src/production-config.ts";

test("private configuration reads literal credentials without evaluating shell code or accepting ambient conflicts", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-private-config-"));
  const path = join(root, "operator.env");
  try {
    writeFileSync(
      path,
      'FACTORY_GITHUB_TOKEN="$(touch ignored);literal"\nFACTORY_TELEGRAM_TOKEN=fake\nFACTORY_TELEGRAM_MAINTAINER_ID=42\n',
      { mode: 0o600 },
    );
    const env = loadPrivateEnvironment(path, {});
    assert.equal(env.FACTORY_GITHUB_TOKEN, "$(touch ignored);literal");
    assert.equal(env.FACTORY_TELEGRAM_MAINTAINER_ID, "42");
    assert.throws(
      () => loadPrivateEnvironment(path, { FACTORY_GITHUB_TOKEN: "ambient" }),
      /conflicting/,
    );
    writeFileSync(path, "PATH=/untrusted\n");
    assert.throws(() => loadPrivateEnvironment(path, {}), /Invalid/);
    chmodSync(path, 0o644);
    assert.throws(() => loadPrivateEnvironment(path, {}), /private file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("native runtime requires explicit valid source selection and a bounded supported mode", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-runtime-config-"));
  const path = join(root, "runtime.json");
  try {
    const config = {
      version: 1,
      mode: "fixture",
      image: "zaidan-factory-worker:0.85.1",
      authFile: "/selected/auth.json",
      skills: [{ path: "/selected/implement" }],
      checks: ["node --test"],
    };
    writeFileSync(path, JSON.stringify(config));
    assert.deepEqual(readProductionConfig(path), config);
    writeFileSync(path, JSON.stringify({ ...config, mode: "unrestricted" }));
    assert.throws(() => readProductionConfig(path), /Invalid factory runtime/);
    writeFileSync(path, JSON.stringify({ ...config, checks: [] }));
    assert.throws(() => readProductionConfig(path), /Invalid factory runtime/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a locked dependency change invalidates the runtime identity even with unchanged source and manifests", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-locked-runtime-"));
  const factory = join(root, "apps/factory");
  try {
    for (const name of ["src", "agent", "worker"]) {
      mkdirSync(join(factory, name), { recursive: true });
      writeFileSync(join(factory, name, "source.txt"), "unchanged");
    }
    writeFileSync(join(factory, "package.json"), '{"dependencies":{"eve":"0.54.3"}}');
    const lock = join(root, "bun.lock");
    writeFileSync(lock, "locked Eve dependency resolution A");
    const before = runtimeSourceIdentity(factory);
    assert.equal(runtimeSourceIdentity(factory), before);
    writeFileSync(lock, "locked Eve dependency resolution B");
    assert.notEqual(runtimeSourceIdentity(factory), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
