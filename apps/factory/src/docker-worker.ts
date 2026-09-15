import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import lockfile from "proper-lockfile";
import { readResourceSnapshot } from "./captured-resources.ts";
import type { WorkerAdapter, WorkerOutcome, WorkerRequest } from "./workflow-contracts.ts";

export interface DockerWorkerOptions {
  directory: string;
  repositoryPath: string;
  image?: string;
  network?: "none";
  /** Selected native Pi auth file, containing only openai-codex OAuth. Never a home mount. */
  auth: { sourceFile: string; lockDirectory: string };
  onEvent?: (event: { operationId: string; type: string; event: unknown }) => void;
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const authOwners = new Map<
  string,
  { users: number; ready: Promise<() => Promise<void>>; compromised?: boolean }
>();
async function acquireAuth(source: string) {
  let entry = authOwners.get(source);
  if (!entry) {
    const current = { users: 0, ready: Promise.resolve(async () => {}), compromised: false };
    current.ready = lockfile.lock(source, {
      realpath: false,
      retries: 0,
      stale: 30000,
      onCompromised: () => {
        current.compromised = true;
      },
    });
    entry = current;
    authOwners.set(source, entry);
  }
  entry.users++;
  let release: () => Promise<void>;
  try {
    release = await entry.ready;
  } catch (error) {
    entry.users--;
    if (!entry.users) authOwners.delete(source);
    throw error;
  }
  const lease = entry;
  return {
    valid: () => !lease.compromised,
    async release() {
      if (--lease.users === 0) {
        authOwners.delete(source);
        await release();
      }
    },
  };
}
const run = async (command: string, args: string[], cwd?: string): Promise<string> => {
  const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 60000);
  let stdout = "";
  child.stdout.on("data", (data) => {
    stdout += data;
  });
  child.stderr.resume();
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  clearTimeout(timeout);
  if (code !== 0) throw new Error(`${command} operation failed (${code}); details withheld`);
  return stdout.trim();
};
const atomic = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, JSON.stringify(value), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
};

/** Durable container/outcome identity, separate from workflow admission and dispatch claims. */
export class DockerPiWorker implements WorkerAdapter {
  private options: DockerWorkerOptions;
  private active = new Map<string, Promise<WorkerOutcome>>();
  private launching = new Map<string, Promise<string>>();
  constructor(options: DockerWorkerOptions) {
    if (
      ![
        options.directory,
        options.repositoryPath,
        options.auth.sourceFile,
        options.auth.lockDirectory,
      ].every(isAbsolute)
    )
      throw new Error("Worker storage and selected resources require absolute paths");
    const home = resolve(homedir());
    for (const path of [options.directory, options.auth.lockDirectory]) {
      const selected = resolve(path);
      if (home === selected || home.startsWith(`${selected}/`) || selected === "/")
        throw new Error(
          "A worker may mount selected state directories, never the host home or its ancestors",
        );
    }
    this.options = options;
    mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  }
  private phase(operationId: string) {
    return join(this.options.directory, "operations", digest(operationId));
  }
  private name(operationId: string) {
    return `zaidan-worker-${digest(operationId).slice(0, 32)}`;
  }
  async reconcile(operationId: string): Promise<WorkerOutcome | undefined> {
    const path = join(this.phase(operationId), "output", "outcome.json");
    if (!existsSync(path)) return undefined;
    const outcome = JSON.parse(readFileSync(path, "utf8")) as WorkerOutcome;
    if (
      ![
        "checkpoint",
        "completed",
        "no-change",
        "failed",
        "cancelled",
        "subscription-paused",
        "reauthentication-required",
      ].includes(outcome.type)
    )
      throw new Error("Malformed durable worker outcome");
    const stopped = join(this.phase(operationId), "input", "settled.json");
    const container = await this.container(operationId);
    if (container) {
      if (!container.running && !existsSync(stopped))
        atomic(stopped, { finishedAt: container.finishedAt ?? Date.now() });
      await run("docker", ["rm", "--force", this.name(operationId)]);
      if (!existsSync(stopped)) atomic(stopped, { finishedAt: Date.now() });
    }
    // The timestamp comes from Docker/coordinator-owned input, never worker output.
    delete outcome.finishedAt;
    if (existsSync(stopped))
      outcome.finishedAt = JSON.parse(readFileSync(stopped, "utf8")).finishedAt;
    if (outcome.type === "completed") {
      const request = JSON.parse(
        readFileSync(join(this.phase(operationId), "input", "request.json"), "utf8"),
      ) as WorkerRequest;
      await this.verifyCandidate(request, outcome);
    }
    if (outcome.type === "checkpoint") {
      const question = outcome.question;
      if (
        typeof question?.prompt !== "string" ||
        !question.prompt.trim() ||
        (question.allowFreeform !== undefined && typeof question.allowFreeform !== "boolean") ||
        (question.options !== undefined &&
          (!Array.isArray(question.options) ||
            question.options.some(
              (option) => typeof option.id !== "string" || typeof option.label !== "string",
            )))
      )
        throw new Error("Malformed durable worker checkpoint");
    }
    if (
      (outcome.type === "failed" ||
        outcome.type === "no-change" ||
        outcome.type === "cancelled" ||
        outcome.type === "subscription-paused" ||
        outcome.type === "reauthentication-required") &&
      typeof outcome.reason !== "string"
    )
      throw new Error("Malformed durable worker failure");
    return outcome;
  }
  dispatch(request: WorkerRequest) {
    let promise = this.active.get(request.operationId);
    if (!promise) {
      promise = this.execute(request).finally(() => this.active.delete(request.operationId));
      this.active.set(request.operationId, promise);
    }
    return promise;
  }
  resume(request: WorkerRequest) {
    if (!request.answer || !request.checkpoint?.answerId)
      throw new Error("Resume requires a persisted answer and original checkpoint");
    return this.dispatch(request);
  }
  async cancel(operationId: string, reason = "Cancelled by coordinator"): Promise<WorkerOutcome> {
    const phase = this.phase(operationId);
    mkdirSync(join(phase, "output"), { recursive: true, mode: 0o700 });
    mkdirSync(join(phase, "input"), { recursive: true, mode: 0o700 });
    atomic(join(phase, "cancel.json"), { reason });
    await this.launching.get(operationId)?.catch(() => {});
    await run("docker", ["rm", "--force", this.name(operationId)]).catch(async () => {
      if (await this.container(operationId))
        throw new Error("Worker cancellation could not confirm descendants stopped");
    });
    const outcome: WorkerOutcome = { type: "cancelled", reason, finishedAt: Date.now() };
    atomic(join(phase, "input", "settled.json"), { finishedAt: outcome.finishedAt });
    atomic(join(phase, "output", "outcome.json"), outcome);
    return outcome;
  }
  private async container(
    operationId: string,
  ): Promise<{ running: boolean; finishedAt?: number } | undefined> {
    // docker ps errors are unknown, never absence; names are deterministic and exact.
    const ids = await run("docker", [
      "ps",
      "--all",
      "--filter",
      `name=^/${this.name(operationId)}$`,
      "--format",
      "{{.ID}}",
    ]);
    if (!ids) return undefined;
    try {
      const data = JSON.parse(await run("docker", ["inspect", this.name(operationId)]));
      const finishedAt = Date.parse(data[0].State.FinishedAt);
      return {
        running: data[0].State.Running,
        ...(Number.isFinite(finishedAt) && finishedAt > 0 ? { finishedAt } : {}),
      };
    } catch (error) {
      // Removal may race the list/inspect pair. Confirm absence with a fresh successful list.
      const remaining = await run("docker", [
        "ps",
        "--all",
        "--filter",
        `name=^/${this.name(operationId)}$`,
        "--format",
        "{{.ID}}",
      ]);
      if (!remaining) return undefined;
      throw error;
    }
  }
  private async execute(request: WorkerRequest): Promise<WorkerOutcome> {
    const originalInput = join(this.phase(request.operationId), "input", "request.json");
    if (
      existsSync(originalInput) &&
      JSON.stringify(JSON.parse(readFileSync(originalInput, "utf8"))) !== JSON.stringify(request)
    )
      throw new Error("Worker operation identity reused with different inputs");
    if (existsSync(join(this.phase(request.operationId), "cancel.json"))) {
      const cancellation = JSON.parse(
        readFileSync(join(this.phase(request.operationId), "cancel.json"), "utf8"),
      );
      return this.cancel(request.operationId, cancellation.reason);
    }
    const existing = await this.reconcile(request.operationId);
    if (existing) return existing;
    if (!request.permits && this.options.network !== "none")
      return { type: "failed", reason: "Networked Pi workers require scoped model permits" };
    if (!request.resources) return { type: "failed", reason: "Missing admitted resource snapshot" };
    const manifest = readResourceSnapshot(request.resources);
    if (
      manifest.issue.issueId !== request.issue.issueId ||
      manifest.issue.revision !== request.issue.revision
    )
      return { type: "failed", reason: "Snapshot belongs to another issue revision" };
    const phase = this.phase(request.operationId);
    mkdirSync(join(phase, "input"), { recursive: true, mode: 0o700 });
    mkdirSync(join(phase, "output"), { recursive: true, mode: 0o700 });
    const requestPath = join(phase, "input", "request.json");
    if (existsSync(requestPath)) {
      if (JSON.stringify(JSON.parse(readFileSync(requestPath, "utf8"))) !== JSON.stringify(request))
        throw new Error("Worker operation identity reused with different inputs");
    } else atomic(requestPath, request);
    const workspace = join(this.options.directory, "runs", digest(request.runId));
    mkdirSync(workspace, { recursive: true, mode: 0o700 });
    mkdirSync(request.session.path, { recursive: true, mode: 0o700 });
    const bundleDirectory = join(workspace, "source");
    mkdirSync(bundleDirectory, { recursive: true });
    const bundle = join(bundleDirectory, "repository.bundle");
    if (!existsSync(bundle)) {
      await run("git", ["bundle", "create", `${bundle}.tmp`, "--all"], this.options.repositoryPath);
      renameSync(`${bundle}.tmp`, bundle);
    }
    let source: string;
    try {
      source = realpathSync(this.options.auth.sourceFile);
      const credential = JSON.parse(readFileSync(source, "utf8"));
      if (Object.keys(credential).length !== 1 || credential["openai-codex"]?.type !== "oauth")
        throw new Error("Invalid selected subscription authentication");
    } catch {
      const outcome: WorkerOutcome = {
        type: "reauthentication-required",
        reason: "Select valid native openai-codex OAuth credentials; billed fallback is forbidden",
      };
      atomic(join(phase, "output", "outcome.json"), outcome);
      return outcome;
    }
    mkdirSync(this.options.auth.lockDirectory, { recursive: true, mode: 0o700 });
    const lease = await acquireAuth(source);
    try {
      const previous = await this.container(request.operationId);
      if (previous && !previous.running) {
        const receipt = await this.reconcile(request.operationId);
        if (receipt) return receipt;
        const interrupted: WorkerOutcome = {
          type: "failed",
          category: "transient",
          reason:
            "Worker stopped without receipt; retained original session and checkout for explicit retry",
        };
        atomic(join(phase, "output", "outcome.json"), interrupted);
        return interrupted;
      }
      if (!previous) {
        const mount = (source: string, target: string, readonly = false) => {
          if (source.includes(",")) throw new Error("Docker bind paths cannot contain commas");
          return ["--mount", `type=bind,src=${source},dst=${target}${readonly ? ",readonly" : ""}`];
        };
        const args = [
          "run",
          "--detach",
          "--name",
          this.name(request.operationId),
          "--user",
          "1000:1000",
          "--cap-drop",
          "ALL",
          "--security-opt",
          "no-new-privileges",
          "--read-only",
          "--pids-limit",
          "256",
          "--tmpfs",
          "/tmp:rw,nosuid,nodev",
          "--env",
          "HOME=/tmp/home",
          "--env",
          "PI_CODING_AGENT_DIR=/auth",
          "--env",
          "FACTORY_REQUEST=/input/request.json",
          "--env",
          "FACTORY_PHASE=/phase",
          ...mount(workspace, "/state"),
          ...mount(join(phase, "output"), "/phase"),
          ...mount(join(phase, "input"), "/input", true),
          ...mount(request.session.path, "/sessions"),
          ...mount(request.resources.path, "/resources", true),
          ...mount(bundleDirectory, "/source", true),
          ...mount(fileURLToPath(new URL("../worker", import.meta.url)), "/runtime", true),
          ...mount(this.options.auth.lockDirectory, "/auth"),
          ...mount(source, "/auth/auth.json"),
        ];
        if (this.options.network) args.push("--network", this.options.network);
        if (request.permits) {
          const url = new URL(request.permits.url);
          if (
            url.protocol !== "http:" ||
            url.hostname !== "host.docker.internal" ||
            !url.port ||
            url.pathname !== "/" ||
            url.search ||
            url.hash ||
            url.username ||
            url.password ||
            !request.permits.token ||
            this.options.network === "none"
          )
            throw new Error("Invalid scoped local model permit bridge");
        }
        args.push(
          this.options.image ?? "zaidan-factory-worker:0.85.1",
          "node",
          "/runtime/runner.mjs",
        );
        if (existsSync(join(phase, "cancel.json"))) return this.cancel(request.operationId);
        const launching = run("docker", args);
        this.launching.set(request.operationId, launching);
        try {
          await launching;
        } finally {
          this.launching.delete(request.operationId);
        }
      }
      let delivered = 0;
      while (true) {
        if (!lease.valid()) {
          await this.cancel(request.operationId, "Subscription credential lock compromised");
          throw new Error("Subscription credential lock compromised");
        }
        const events = join(phase, "output", "events.jsonl");
        if (existsSync(events)) {
          const lines = readFileSync(events, "utf8").split("\n");
          for (; delivered < lines.length - 1; delivered++) {
            const event = JSON.parse(lines[delivered] ?? "null");
            this.options.onEvent?.({ operationId: request.operationId, type: event.type, event });
          }
        }
        const outcome = await this.reconcile(request.operationId);
        if (outcome) {
          // Keep receipt/workspace/session but remove all worker descendants before releasing auth.
          await run("docker", ["rm", "--force", this.name(request.operationId)]).catch(async () => {
            if (await this.container(request.operationId))
              throw new Error("Cannot stop worker descendants");
          });
          return outcome;
        }
        const status = await this.container(request.operationId);
        if (!status?.running) {
          // The worker may publish its receipt while the Docker status request is in flight.
          // Once exit is observed, reconcile that final receipt before recording failure.
          const finalOutcome = await this.reconcile(request.operationId);
          if (finalOutcome) return finalOutcome;
          if (existsSync(join(phase, "cancel.json"))) {
            await delay(25);
            continue;
          }
          const failed: WorkerOutcome = {
            type: "failed",
            category: "transient",
            reason: "Worker stopped without a typed outcome",
          };
          atomic(join(phase, "output", "outcome.json"), failed);
          return failed;
        }
        await delay(100);
      }
    } finally {
      await lease.release();
    }
  }
  private async verifyCandidate(
    request: WorkerRequest,
    outcome: Extract<WorkerOutcome, { type: "completed" }>,
  ) {
    if (!request.resources) throw new Error("Missing candidate snapshot");
    readResourceSnapshot(request.resources);
    const workspace = join(this.options.directory, "runs", digest(request.runId));
    const phase = this.phase(request.operationId);
    const mount = (source: string, target: string) => [
      "--mount",
      `type=bind,src=${source},dst=${target},readonly`,
    ];
    await run("docker", [
      "run",
      "--rm",
      "--network",
      "none",
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
      ...mount(workspace, "/state"),
      ...mount(join(phase, "input"), "/input"),
      ...mount(join(phase, "output"), "/phase"),
      ...mount(request.resources.path, "/resources"),
      ...mount(fileURLToPath(new URL("../worker", import.meta.url)), "/runtime"),
      this.options.image ?? "zaidan-factory-worker:0.85.1",
      "node",
      "/runtime/verify.mjs",
    ]);
    const artifact = outcome.candidate.artifact as {
      relativePath: string;
      sha256: string;
      path?: string;
    };
    if (artifact.relativePath !== `candidates/${outcome.candidate.commit}.bundle`)
      throw new Error("Unsafe candidate artifact");
    artifact.path = join(workspace, artifact.relativePath);
  }
}
