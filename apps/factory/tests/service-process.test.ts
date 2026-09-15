import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ServiceStatus } from "../src/local-service.ts";
import { eventually } from "./eve-host-fixture.ts";

const factory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function freePort() {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

test("the real local service survives process death with the same external Eve world and coalesced read-only discovery", {
  timeout: 120000,
}, async (t) => {
  const root = mkdtempSync(join(tmpdir(), "factory-service-process-"));
  const modulePath = join(root, "adapters.mjs");
  const telegramMessages: string[] = [];
  const telegramUpdates: { update_id: number; message: unknown }[] = [];
  const telegramServer = createHttpServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    let result: unknown = true;
    if (req.url?.endsWith("sendMessage")) {
      telegramMessages.push(body.text);
      result = { message_id: telegramMessages.length, chat: { id: 42, type: "private" } };
    }
    if (req.url?.endsWith("getUpdates")) {
      result = telegramUpdates.filter((update) => update.update_id >= body.offset);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result }));
  });
  await new Promise<void>((resolve) => telegramServer.listen(0, "127.0.0.1", resolve));
  t.after(() => telegramServer.close());
  const telegramAddress = telegramServer.address();
  assert.ok(telegramAddress && typeof telegramAddress !== "string");
  const telegramApi = `http://127.0.0.1:${telegramAddress.port}`;
  const telegramCommand = (id: number, text: string) =>
    telegramUpdates.push({
      update_id: id,
      message: { message_id: id, from: { id: 42 }, chat: { id: 42, type: "private" }, text },
    });
  writeFileSync(
    modulePath,
    `
    import { appendFileSync } from 'node:fs';
    import { join } from 'node:path';
    import { TelegramControl } from ${JSON.stringify(pathToFileURL(join(factory, "src/telegram.ts")).href)};
    export function createServiceAdapters({ stateDirectory }) {
      const telegram = new TelegramControl({ database: join(stateDirectory, 'telegram.sqlite'), token: 'fixture-token', maintainerId: 42, apiBase: ${JSON.stringify(telegramApi)} });
      const forbidden = async () => { throw new Error('No worker in read-only fixture'); };
      return {
        worker: { dispatch: forbidden, resume: forbidden, reconcile: forbidden },
        notifications: telegram, telegram, close: async () => telegram.close(),
        attach: async () => {
          appendFileSync(join(stateDirectory, 'attaches.jsonl'), 'attach\\n');
          if (process.env.FACTORY_FIXTURE_ATTACH_FAIL) throw new Error('secret-attachment-error');
        },
        discovery: { read: async () => {
          appendFileSync(join(stateDirectory, 'scans.jsonl'), 'scan\\n');
          await new Promise(resolve => setTimeout(resolve, 150));
          return { repository: 'fixture/repo', revision: 'one', issues: [] };
        } }
      };
    }
  `,
  );
  const port = await freePort();
  const evePort = await freePort();
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    FACTORY_STATE_DIR: root,
    FACTORY_COORDINATOR_PORT: String(port),
    FACTORY_EVE_PORT: String(evePort),
    FACTORY_ADAPTER_MODULE: modulePath,
    FACTORY_REPOSITORY: "fixture/repo",
  };
  const cli = join(factory, "src/service-cli.ts");
  const build = spawnSync(process.execPath, [cli, "prepare"], {
    env,
    encoding: "utf8",
    timeout: 90000,
  });
  writeFileSync(join(root, "build.log"), `${build.stdout}\n${build.stderr}`);
  assert.equal(build.status, 0, `Build evidence: ${root}/build.log`);
  let child: ChildProcess | undefined;
  let logs = "";
  const url = `http://127.0.0.1:${port}`;
  const scans = () => readFileSync(join(root, "scans.jsonl"), "utf8").trim().split("\n").length;
  async function start(overrides: NodeJS.ProcessEnv = {}) {
    child = spawn(process.execPath, [cli, "serve"], {
      env: { ...env, ...overrides },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (data) => {
      logs += data;
    });
    child.stderr?.on("data", (data) => {
      logs += data;
    });
    await eventually(async () => {
      if (child?.exitCode !== null) throw new Error(`Service exited: ${logs}`);
      try {
        return (
          ((await (await fetch(`${url}/factory/status`)).json()) as ServiceStatus).ready === true
        );
      } catch {
        return false;
      }
    }, Boolean);
  }
  async function stop(signal: NodeJS.Signals) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill(signal);
    await exited;
  }
  let passed = false;
  try {
    await start();
    assert.equal(scans(), 1);
    telegramCommand(1, "/pause factory");
    telegramCommand(2, "/status factory");
    await eventually(
      async () => telegramMessages.some((text) => text.includes("Factory: paused")),
      Boolean,
    );
    const beforeRestartMessages = telegramMessages.length;
    const statuses = await Promise.all(
      Array.from({ length: 8 }, () => fetch(`${url}/factory/scan`, { method: "POST" })),
    );
    assert.ok(statuses.every((response) => response.ok));
    assert.equal(scans(), 2);
    assert.equal(
      (
        await fetch(`${url}/factory/scan`, {
          method: "POST",
          headers: { origin: "https://example.com" },
        })
      ).status,
      403,
    );
    assert.equal((await fetch(`${url}/factory/admit`, { method: "POST" })).status, 404);
    const started = (await (
      await fetch(`http://127.0.0.1:${evePort}/factory/engine/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: "persistent-service-fixture" }),
      })
    ).json()) as { runId: string };
    assert.ok(started.runId);
    // A crash must also close the IPC-supervised Eve child before the next writer starts.
    await stop("SIGKILL");
    await eventually(async () => {
      try {
        await fetch(`http://127.0.0.1:${evePort}/eve/v1/health`);
        return false;
      } catch {
        return true;
      }
    }, Boolean);
    await start();
    assert.equal(scans(), 3);
    telegramCommand(3, "/status factory");
    await eventually(async () => telegramMessages.length > beforeRestartMessages, Boolean);
    assert.match(telegramMessages.at(-1) ?? "", /Factory: paused/);
    assert.equal(telegramMessages.length, beforeRestartMessages + 1);
    const found = (await (
      await fetch(`http://127.0.0.1:${evePort}/factory/engine/find`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: "persistent-service-fixture" }),
      })
    ).json()) as { runId: string };
    assert.equal(found.runId, started.runId);
    const status = (await (await fetch(`${url}/factory/status`)).json()) as ServiceStatus;
    assert.equal(status.mode, "read-only");
    assert.equal(status.lastTrigger, "restart");
    await stop("SIGTERM");
    await start();
    assert.equal(scans(), 4);
    await stop("SIGTERM");
    const beforeAttachmentFailure = readFileSync(join(root, "attaches.jsonl"), "utf8")
      .trim()
      .split("\n").length;
    await assert.rejects(start({ FACTORY_FIXTURE_ATTACH_FAIL: "1" }), /Service exited/);
    assert.equal(
      readFileSync(join(root, "attaches.jsonl"), "utf8").trim().split("\n").length,
      beforeAttachmentFailure + 1,
    );
    assert.ok(!logs.includes("secret-attachment-error"));
    passed = true;
  } finally {
    await stop("SIGTERM");
    writeFileSync(join(root, "service.log"), logs);
    if (passed) rmSync(root, { recursive: true, force: true });
    else process.stderr.write(`Service fixture evidence: ${root}\n`);
  }
});
