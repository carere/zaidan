import lockfile from "proper-lockfile";
import { spawn, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  existsSync,
  realpathSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Hold the same native host Pi lock while containers share a separate native lock.
// Bind the selected auth FILE directly: refreshed tokens persist without copy-back.
const authPath = realpathSync(process.argv[2]);
const root = mkdtempSync(join(tmpdir(), "zaidan-pi-refresh-512-"));
chmodSync(root, 0o700);
mkdirSync(join(root, "auth"), { mode: 0o700 });
const children = [],
  names = [];
let compromised;
const release = await lockfile.lock(authPath, {
  realpath: false,
  retries: 0,
  stale: 30000,
  onCompromised(error) {
    compromised = error;
  },
});
try {
  const stored = JSON.parse(readFileSync(authPath, "utf8"));
  assert.deepEqual(
    Object.keys(stored),
    ["openai-codex"],
    "Source file must contain only the selected subscription credential",
  );
  assert.equal(stored["openai-codex"].type, "oauth");
  const beforeExpiry = stored["openai-codex"].expires;
  stored["openai-codex"].expires = 0;
  writeFileSync(authPath, JSON.stringify(stored), { mode: 0o600 });
  for (let index = 0; index < 2; index++) {
    const name = `zaidan-refresh-512-${process.pid}-${index}`;
    names.push(name);
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        name,
        "--user",
        "1000:1000",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--read-only",
        "--pids-limit",
        "64",
        "--tmpfs",
        "/tmp:rw,nosuid,nodev",
        "--mount",
        `type=bind,src=${root}/auth,dst=/auth`,
        "--mount",
        `type=bind,src=${authPath},dst=/auth/auth.json`,
        "--mount",
        `type=bind,src=${root},dst=/probe`,
        "--mount",
        `type=bind,src=${join(dirname(fileURLToPath(import.meta.url)), "worker")},dst=/fixture,readonly`,
        "zaidan-pi-compat:0.85.1",
        "node",
        "/fixture/refresh.mjs",
        String(index),
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.resume();
    children.push(
      new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code) => {
          try {
            if (code !== 0) throw new Error("Refresh worker failed");
            resolve(JSON.parse(stdout));
          } catch {
            reject(new Error("Refresh worker failed (details withheld)"));
          }
        });
      }),
    );
  }
  const all = Promise.allSettled(children);
  const start = Date.now();
  while (!existsSync(join(root, "ready-0")) || !existsSync(join(root, "ready-1"))) {
    if (Date.now() - start > 30000) throw new Error("Refresh workers did not start");
    await new Promise((r) => setTimeout(r, 25));
  }
  writeFileSync(join(root, "start"), "start");
  const results = await all;
  assert.ok(!compromised, "Source auth lock was compromised");
  assert.ok(
    results.every((r) => r.status === "fulfilled"),
    "Concurrent refresh failed",
  );
  const refreshEvents = readFileSync(join(root, "refresh-events.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(refreshEvents.length, 1, "Native lock must permit exactly one refresh request");
  const persisted = JSON.parse(readFileSync(authPath, "utf8"))["openai-codex"];
  assert.ok(persisted.expires > Date.now() + 300000);
  const evidence = {
    concurrentRefreshProcesses: 2,
    refreshRequests: refreshEvents.length,
    sourcePersisted: true,
    beforeExpiry,
    afterExpiry: persisted.expires,
    results: results.map((r) => r.value),
  };
  writeFileSync(join(root, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ root, ...evidence }));
} catch {
  console.error(
    "Refresh gate failed; source credentials remain persisted in place. Inspect sanitized probe evidence.",
  );
  process.exitCode = 1;
} finally {
  for (const name of names) spawnSync("docker", ["rm", "--force", name], { stdio: "ignore" });
  await release();
}
