import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("run.mjs", import.meta.url));
for (const [name, value] of [
  ["PI_COMPAT_PROVIDER", "openai"],
  ["PI_COMPAT_MODEL", "unsupported"],
  ["PI_COMPAT_REASONING", "unsupported"],
]) {
  test(`rejects ${name} before touching credentials or Docker`, () => {
    const result = spawnSync(process.execPath, [runner, "worker", "/does-not-exist", "first"], {
      encoding: "utf8",
      env: { PATH: "/does-not-exist", [name]: value },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unsupported compatibility settings/);
    assert.doesNotMatch(result.stderr, /ENOENT|Docker/);
  });
}
test("API credentials fail explicitly without exposing the key", () => {
  const root = mkdtempSync(join(tmpdir(), "zaidan-preflight-test-"));
  try {
    const auth = join(root, "auth.json");
    writeFileSync(
      auth,
      JSON.stringify({ "openai-codex": { type: "api_key", key: "SECRET_TEST_SENTINEL" } }),
    );
    const result = spawnSync(process.execPath, [runner, "prepare", auth], {
      encoding: "utf8",
      env: { PATH: "/does-not-exist" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /subscription login is required/);
    assert.doesNotMatch(result.stdout + result.stderr, /SECRET_TEST_SENTINEL/);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test("malformed auth never echoes credential material", () => {
  const root = mkdtempSync(join(tmpdir(), "zaidan-preflight-test-"));
  try {
    const auth = join(root, "auth.json");
    writeFileSync(auth, "SECRET_TEST_SENTINEL");
    const result = spawnSync(process.execPath, [runner, "prepare", auth], {
      encoding: "utf8",
      env: { PATH: "/does-not-exist" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /credential file is unreadable or invalid/);
    assert.doesNotMatch(result.stdout + result.stderr, /SECRET_TEST_SENTINEL/);
  } finally {
    rmSync(root, { recursive: true });
  }
});
