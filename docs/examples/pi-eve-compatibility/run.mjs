import { spawn, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  cpSync,
  chmodSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const source = dirname(fileURLToPath(import.meta.url));
const image = "zaidan-pi-compat:0.85.1";
const provider = "openai-codex",
  model = "gpt-6-astra",
  reasoning = "high";
function configuredSettings() {
  const selected = {
    provider: process.env.PI_COMPAT_PROVIDER ?? provider,
    model: process.env.PI_COMPAT_MODEL ?? model,
    reasoning: process.env.PI_COMPAT_REASONING ?? reasoning,
  };
  if (
    selected.provider !== provider ||
    selected.model !== model ||
    selected.reasoning !== reasoning
  )
    throw new Error("Unsupported compatibility settings: expected openai-codex/gpt-6-astra/high");
}
function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed (output withheld)`);
  return result.stdout.trim();
}
function save(root, name, value) {
  writeFileSync(join(root, name), `${JSON.stringify(value, null, 2)}\n`);
}
function fixture(root) {
  assert.equal(readFileSync(join(root, ".fixture"), "utf8"), "zaidan-512\n");
  return resolve(root);
}
function subscriptionCredential(authPath) {
  let data;
  try {
    data = JSON.parse(readFileSync(authPath, "utf8"));
  } catch {
    throw new Error("Subscription credential file is unreadable or invalid");
  }
  const auth = data?.[provider];
  if (auth?.type !== "oauth" || typeof auth.access !== "string" || typeof auth.refresh !== "string")
    throw new Error("A Pi openai-codex subscription login is required");
  return auth;
}
export function prepare(authPath) {
  configuredSettings();
  const auth = subscriptionCredential(authPath);
  assert.ok(
    auth.expires > Date.now() + 15 * 60 * 1000,
    "Use a fresh login; this copy must not rotate the source token",
  );
  const root = mkdtempSync(join(tmpdir(), "zaidan-pi-eve-512-"));
  chmodSync(root, 0o700);
  mkdirSync(join(root, "auth"), { mode: 0o700 });
  mkdirSync(join(root, "workspace"));
  writeFileSync(join(root, ".fixture"), "zaidan-512\n");
  writeFileSync(join(root, "auth/auth.json"), JSON.stringify({ [provider]: auth }), {
    mode: 0o600,
  });
  cpSync(join(source, "skill"), join(root, "workspace/skill"), { recursive: true });
  cpSync(join(source, "worker/bridge.ts"), join(root, "workspace/bridge.ts"));
  save(root, "settings.json", {
    image,
    provider,
    model,
    reasoning,
    parallelAuthenticatedWorkers: false,
  });
  return root;
}
class Rpc {
  constructor(container) {
    this.events = [];
    this.pending = new Map();
    this.sequence = 0;
    this.process = spawn(
      "docker",
      [
        "exec",
        "-i",
        container,
        "pi",
        "--mode",
        "rpc",
        "--provider",
        provider,
        "--model",
        model,
        "--thinking",
        reasoning,
        "--no-skills",
        "--skill",
        "/workspace/skill/SKILL.md",
        "--no-extensions",
        "--extension",
        "/workspace/bridge.ts",
        "--session",
        "/workspace/session.jsonl",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let buffer = "";
    this.process.stderr.resume();
    this.process.stdout.on("data", (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i).replace(/\r$/, "");
        buffer = buffer.slice(i + 1);
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          this.fail(new Error("Non-JSON Pi RPC output"));
          continue;
        }
        this.events.push(event);
        if (event.type === "response" && this.pending.has(event.id)) {
          const { resolve, reject, timer } = this.pending.get(event.id);
          clearTimeout(timer);
          this.pending.delete(event.id);
          event.success
            ? resolve(event.data)
            : reject(new Error(`Pi RPC ${event.command} rejected`));
        }
      }
    });
    this.process.once("exit", () => this.fail(new Error("Pi RPC exited")));
    this.process.once("error", () => this.fail(new Error("Pi RPC failed to start")));
  }
  fail(error) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
  request(type, args = {}) {
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Pi RPC ${type} timed out`));
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${JSON.stringify({ id, type, ...args })}\n`);
    });
  }
  async until(predicate, timeout = 180000) {
    const started = Date.now();
    while (!predicate()) {
      if (Date.now() - started > timeout) throw new Error("Pi phase timed out");
      if (this.process.exitCode !== null) throw new Error("Pi exited during phase");
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
export async function worker(root, phase, answer) {
  configuredSettings();
  root = fixture(root);
  const receipt = join(root, `${phase}.json`);
  if (existsSync(receipt)) return JSON.parse(readFileSync(receipt, "utf8"));
  // A copied credential must stay fresh; forced/concurrent rotation uses a separate gate.
  const auth = subscriptionCredential(join(root, "auth/auth.json"));
  assert.ok(auth.expires > Date.now() + 10 * 60 * 1000, "Fixture auth needs safe renewal");
  const name = `zaidan-compat-512-${process.pid}-${phase}`;
  docker([
    "run",
    "--detach",
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
    "128",
    "--memory",
    "2g",
    "--cpus",
    "2",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev",
    "--mount",
    `type=bind,src=${root}/auth,dst=/home/node/.pi/agent`,
    "--mount",
    `type=bind,src=${root}/workspace,dst=/workspace`,
    image,
    "sleep",
    "infinity",
  ]);
  let rpc;
  let cancellationReceipt;
  try {
    const inspected = JSON.parse(docker(["inspect", name]))[0];
    assert.equal(inspected.Config.User, "1000:1000");
    assert.equal(inspected.HostConfig.Privileged, false);
    assert.deepEqual(inspected.HostConfig.CapDrop, ["ALL"]);
    assert.equal(inspected.Mounts.length, 2);
    assert.ok(inspected.Mounts.every((m) => m.Source.startsWith(root + "/")));
    assert.ok(!inspected.Config.Env.some((e) => /API_KEY|GH_TOKEN|GITHUB_TOKEN|TELEGRAM/.test(e)));
    save(root, `${phase}-containment.json`, {
      user: inspected.Config.User,
      privileged: false,
      capDrop: inspected.HostConfig.CapDrop,
      securityOpt: inspected.HostConfig.SecurityOpt,
      readonlyRootfs: inspected.HostConfig.ReadonlyRootfs,
      mounts: inspected.Mounts.map(({ Destination, RW }) => ({ Destination, RW })),
      imageId: inspected.Image,
    });
    rpc = new Rpc(name);
    const state = await rpc.request("get_state");
    assert.equal(state.model?.provider, provider);
    assert.equal(state.model?.id, model);
    assert.equal(state.thinkingLevel, reasoning);
    await assert.rejects(
      rpc.request("set_model", { provider, modelId: "unsupported-fixture-model-512" }),
    );
    const unchanged = await rpc.request("get_state");
    assert.equal(unchanged.model.id, model);
    assert.equal(unchanged.thinkingLevel, reasoning);
    const start = rpc.events.length;
    if (phase === "first") await rpc.request("prompt", { message: "/skill:compatibility-fixture" });
    else if (phase === "resume") {
      assert.equal(answer, "blue", "Fixture accepts only its intended test answer");
      const first = JSON.parse(readFileSync(join(root, "first.json"), "utf8"));
      assert.equal(state.sessionId, first.sessionId, "Worker must resume its original session");
      await rpc.request("prompt", {
        message:
          "Answer to durable question fixture-answer: blue. Continue the original skill from its human wait. Keep the completed implementation and review, write the answer, then complete the phase.",
      });
    } else if (phase === "cancel") {
      await rpc.request("prompt", {
        message:
          "Call delegate_review with cancellationProbe true now. This intentionally starts a long delegate for the cancellation test.",
      });
      await rpc.until(() =>
        rpc.events
          .slice(start)
          .some((e) => e.type === "tool_execution_start" && e.toolName === "delegate_review"),
      );
      await rpc.until(() =>
        docker(["top", name])
          .split("\n")
          .some((line) => /\bsleep 120$/.test(line.trim())),
      );
      await rpc.request("abort");
      const idle = await rpc.request("get_state");
      assert.equal(idle.isStreaming, false);
      const cancellationEvents = readFileSync(join(root, "workspace/events.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map(JSON.parse);
      assert.ok(
        cancellationEvents.some((e) => e.type === "phase.cancelled" && e.phase === "review"),
      );
      const result = {
        phase,
        workerIdle: true,
        delegateCancelled: true,
        container: name,
        allProcessesRemoved: true,
      };
      cancellationReceipt = result;
      return result;
    } else throw new Error("Unknown phase");
    await rpc.until(() => rpc.events.slice(start).some((e) => e.type === "agent_end"));
    const messages = rpc.events
      .slice(start)
      .filter((e) => e.type === "message_end" && e.message?.role === "assistant")
      .map((e) => e.message);
    assert.ok(messages.length > 0, "Actual inference must produce assistant messages");
    assert.ok(
      messages.every((m) => m.stopReason !== "error" && m.stopReason !== "aborted"),
      "Inference failed",
    );
    const events = readFileSync(join(root, "workspace/events.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(
      readFileSync(join(root, "workspace/result.txt"), "utf8"),
      readFileSync(join(source, "skill/resource.txt"), "utf8"),
    );
    assert.equal(
      events.filter((e) => e.type === "phase.completed" && e.phase === "review").length,
      1,
    );
    assert.equal(
      events.filter((e) => e.type === "checkpoint.requested" && e.questionId === "fixture-answer")
        .length,
      1,
    );
    if (phase === "resume")
      assert.equal(readFileSync(join(root, "workspace/answer.txt"), "utf8").trim(), "blue");
    const result = {
      phase,
      provider,
      model,
      reasoning,
      sessionId: state.sessionId,
      sessionFile: state.sessionFile,
      tools: rpc.events
        .slice(start)
        .filter((e) => e.type === "tool_execution_start")
        .map((e) => e.toolName),
      events,
    };
    save(root, `${phase}.json`, result);
    return result;
  } finally {
    if (rpc) {
      rpc.process.stdin.end();
      rpc.fail(new Error("Worker stopped"));
    }
    docker(["rm", "--force", name]);
    assert.ok(
      !docker(["ps", "--all", "--filter", `name=^${name}$`, "--format", "{{.Names}}"]).includes(
        name,
      ),
      "Worker container still exists",
    );
    if (cancellationReceipt) save(root, `${phase}.json`, cancellationReceipt);
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, root, phase, answer] = process.argv.slice(2);
    if (command === "prepare") console.log(prepare(root));
    else if (command === "worker") console.log(JSON.stringify(await worker(root, phase, answer)));
    else
      throw new Error(
        "Usage: node run.mjs prepare /absolute/pi/auth.json | worker /fixture first|resume [blue]",
      );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Compatibility fixture failed");
    process.exitCode = 1;
  }
}
