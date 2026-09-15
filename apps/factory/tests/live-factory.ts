import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureGitHub, fixtureGitHubToken } from "../fixtures/live/github.ts";
import { digest } from "../fixtures/live/journal.ts";
import { skillInventory } from "../fixtures/live/payload.ts";
import {
  advanceFixture,
  evidenceReport,
  type Progress,
  recordProgress,
} from "../fixtures/live/runner.ts";
import { checks, repository, skillNames } from "../fixtures/live/scenario.ts";
import { applyFixture, prepareFixture } from "../fixtures/live/setup.ts";

const args = process.argv.slice(2);
const command = args.shift();
const allowed = new Set([
  "state",
  "image",
  "credential-file",
  "runtime-config",
  "service-state",
  "approved-payload",
  "apply",
  "activate",
]);
const flags = new Map<string, string>();
while (args.length) {
  const name = args.shift()?.replace(/^--/, "");
  if (!name || !allowed.has(name) || flags.has(name))
    throw Error("Unknown or duplicate fixture argument");
  const value = ["apply", "activate"].includes(name) ? "true" : args.shift();
  if (!value) throw Error("Fixture argument is missing a value");
  flags.set(name, value);
}
if (!command || !["prepare", "setup", "status", "run", "evidence"].includes(command))
  throw Error(
    "Usage: node apps/factory/tests/live-factory.ts prepare|setup|status|run|evidence --state /absolute/persistent/fixture [--apply] [--activate]",
  );
const directory = flags.get("state");
if (!directory || !isAbsolute(directory))
  throw Error("Choose an absolute persistent fixture state directory outside Git");
for (let path = directory; ; path = dirname(path)) {
  if (existsSync(join(path, ".git"))) throw Error("Fixture state must remain outside Git");
  if (dirname(path) === path) break;
}
process.umask(0o077);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const lock = join(directory, "runner.lock");
if (existsSync(lock)) {
  const pid = Number(readFileSync(lock, "utf8"));
  if (!Number.isSafeInteger(pid) || pid < 1)
    throw Error("Malformed fixture ownership lock; inspect it before recovery");
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false;
  }
  if (alive) throw Error("Another fixture runner owns this state");
  rmSync(lock);
}
const fd = openSync(lock, "wx", 0o600);
writeFileSync(fd, String(process.pid));
closeSync(fd);
try {
  await main();
} catch (error) {
  // Application errors are controlled codes; never serialize child output or native response bodies.
  process.stderr.write(`${error instanceof Error ? error.message : "Fixture operation failed"}\n`);
  process.exitCode = 1;
} finally {
  rmSync(lock, { force: true });
}

async function main() {
  const { journal, state } = prepareFixture(directory as string);
  let config = journal.read<{
    runtime: string;
    serviceState: string;
    envFile?: string;
    payloadHash: string;
    inventoryHash: string;
  }>("runner-config.json");
  if (!config) {
    if (command !== "prepare") throw Error("Prepare and review the persistent fixture first");
    const runtime =
      flags.get("runtime-config") ?? join(directory as string, "runtime.proposed.json");
    const serviceState = flags.get("service-state") ?? join(directory as string, "service");
    const envFile = flags.get("credential-file") ?? process.env.FACTORY_ENV_FILE;
    if (![runtime, serviceState, ...(envFile ? [envFile] : [])].every(isAbsolute))
      throw Error("Fixture configuration paths must be absolute");
    if (!existsSync(runtime))
      journal.save("runtime.proposed.json", {
        version: 1,
        mode: "fixture",
        image: flags.get("image") ?? "zaidan-factory-worker:0.85.1",
        authFile: "/Users/carere/.pi/agent/auth.json",
        skills: skillNames.map((name) => ({ path: `/Users/carere/.agents/skills/${name}` })),
        checks,
        faults: ["branch-publication.after"],
      });
    if (!existsSync(runtime))
      throw Error(
        "Selected runtime config does not exist; review the generated runtime.proposed.json",
      );
    const runtimeValue = JSON.parse(readFileSync(runtime, "utf8"));
    if (runtimeValue.mode !== "fixture") throw Error("Fixture runner accepts fixture mode only");
    const inventory = skillInventory(runtimeValue.skills);
    const inventoryHash = digest(inventory);
    journal.save("payload-inventory.json", inventory);
    config = {
      inventoryHash,
      runtime,
      serviceState,
      envFile,
      payloadHash: digest({
        sourceHash: state.sourceHash,
        runtime: runtimeValue,
        repository,
        serviceState,
        inventoryHash,
      }),
    };
    journal.save("runner-config.json", config);
  }
  if (
    ["runtime-config", "service-state", "credential-file", "image"].some((flag) =>
      flags.has(flag),
    ) &&
    command !== "prepare"
  )
    throw Error(
      "Configuration is retained from prepare; preserve this run and reconcile changes explicitly",
    );
  if (command === "prepare") {
    if (
      (flags.has("runtime-config") && flags.get("runtime-config") !== config.runtime) ||
      (flags.has("service-state") && flags.get("service-state") !== config.serviceState) ||
      (flags.has("image") &&
        flags.get("image") !== JSON.parse(readFileSync(config.runtime, "utf8")).image)
    )
      throw Error(
        "Prepared source/runtime identity cannot change silently; preserve this scenario and review a new configuration explicitly",
      );
    const attachment = flags.get("credential-file");
    if (attachment) {
      if (!isAbsolute(attachment)) throw Error("Credential configuration path must be absolute");
      if (config.envFile && config.envFile !== attachment)
        throw Error("A different credential path is already attached; reconcile it explicitly");
      config.envFile = attachment;
      journal.save("runner-config.json", config);
    }
  }
  const runtime = JSON.parse(readFileSync(config.runtime, "utf8"));
  const currentInventoryHash = digest(skillInventory(runtime.skills));
  if (
    config.payloadHash !==
    digest({
      sourceHash: state.sourceHash,
      runtime,
      repository,
      serviceState: config.serviceState,
      inventoryHash: currentInventoryHash,
    })
  )
    throw Error("Reviewed fixture payload changed; preserve state and obtain a new scoped review");
  const service = (verb: "status" | "progress" | "scan") => {
    const result = spawnSync(
      process.execPath,
      [resolve(dirname(fileURLToPath(import.meta.url)), "../src/service-cli.ts"), verb],
      {
        env: {
          ...process.env,
          FACTORY_STATE_DIR: config.serviceState,
          FACTORY_REPOSITORY: repository,
          FACTORY_RUNTIME_CONFIG: config.runtime,
          ...(config.envFile ? { FACTORY_ENV_FILE: config.envFile } : {}),
        },
        encoding: "utf8",
        timeout: 65000,
        maxBuffer: 8 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    if (result.status !== 0)
      throw Error(
        "Native service command unavailable; inspect private service logs or restart the same persistent deployment",
      );
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw Error("Native service returned malformed progress");
    }
  };
  if (command === "prepare")
    return print({
      state: "prepared-not-applied",
      scenario: state.scenario,
      payloadHash: config.payloadHash,
      setupPlan: join(directory as string, "setup-plan.json"),
      runtime: config.runtime,
      serviceState: config.serviceState,
      required:
        "Review exact setup source and complete selected skills/provider payload. Setup writes and provider execution remain separate authorizations. No service or external API called. Obtain exact provider payload approval BEFORE starting an enabled production serve command after activation; startup/ticks can dispatch without runner run.",
    });
  if (command === "setup") {
    if (!flags.has("apply"))
      return print({
        state: "dry-run",
        plan: journal.read("setup-plan.json"),
        payloadHash: config.payloadHash,
      });
    let running = false;
    try {
      running = service("status").running === true;
    } catch {
      /* No healthy CLI status. Setup is performed before native service startup. */
    }
    if (running) throw Error("Stop the fixture service before applying setup or activation");
    const token = fixtureGitHubToken(config.envFile);
    const applied = await applyFixture(
      directory as string,
      fixtureGitHub(token),
      token,
      flags.has("activate"),
    );
    return print({
      state: applied.activated ? "setup-activated" : "setup-staged",
      repositoryId: applied.repositoryId,
      issues: Object.fromEntries(
        Object.entries(applied.issues).map(([key, value]) => [
          key,
          { id: value.id, nodeId: value.node_id, number: value.number, url: value.html_url },
        ]),
      ),
      externalPull: applied.externalPull?.html_url,
      next: "Keep the service stopped until exact provider payload approval. Enabled serve startup/ticks may dispatch immediately; runner run acknowledgement does not guard separately started services.",
    });
  }
  if (command === "evidence") {
    const report = evidenceReport(journal, state);
    journal.save("evidence.json", report);
    return print({
      completed: false,
      report: join(directory as string, "evidence.json"),
      observationHash: report.observationHash,
      gates: report.gates,
      promotion: "Operator review is required. This report never writes rollout authorization.",
    });
  }
  const before = recordProgress(journal, service("progress") as Progress);
  if (command === "status")
    return print({
      state: "observed",
      service: before.service,
      runs: before.runs,
      graphs: before.graphs,
    });
  if (flags.get("approved-payload") !== config.payloadHash)
    throw Error(
      "Run requires --approved-payload with the exact reviewed payload hash; starting scan can dispatch real provider work",
    );
  if (!state.activated)
    throw Error("Complete explicit fixture setup activation before native scan");
  try {
    service("scan");
  } catch {
    journal.save("runner-wait.json", {
      state: "awaiting-service-restart-or-reconciliation",
      at: new Date().toISOString(),
      originalInstance: before.service.instanceId,
    });
    return print({
      state: "awaiting-service-restart-or-reconciliation",
      instruction:
        "Inspect private logs and native one-shot fault receipt. Restart the same production serve command, preserving all state; then rerun.",
    });
  }
  const progress = recordProgress(journal, service("progress") as Progress);
  const next = await advanceFixture(
    journal,
    state,
    progress,
    fixtureGitHub(fixtureGitHubToken(config.envFile)),
  );
  journal.save("runner-wait.json", next);
  print(next);
}
function print(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
