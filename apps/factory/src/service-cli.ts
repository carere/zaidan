import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createEveEngine } from "./eve-engine.ts";
import { createGitHubDiscovery } from "./github-discovery.ts";
import { IssueWorkflow } from "./issue-workflow.ts";
import { LocalService } from "./local-service.ts";
import { startModelPermitServer } from "./model-permit-server.ts";
import { type CreateServiceAdapters, discoveryOnlyAdapters } from "./service-adapters.ts";
import { type ServiceConfig, serviceConfig } from "./service-config.ts";
import { listenLocalService } from "./service-http.ts";
import { TelegramControl } from "./telegram.ts";
import { TelegramOperations } from "./telegram-operations.ts";
import { SqliteWorkflowStore } from "./workflow-store.ts";

const factoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
if (!command || !["prepare", "serve", "status", "scan"].includes(command)) {
  throw new Error("Usage: node apps/factory/src/service-cli.ts prepare|serve|status|scan");
}
process.umask(0o077);
const config = serviceConfig();
if (command === "prepare") prepare(config);
else if (command === "serve") await serve(config);
else {
  const response = await fetch(`http://127.0.0.1:${config.coordinatorPort}/factory/${command}`, {
    method: command === "scan" ? "POST" : "GET",
    signal: AbortSignal.timeout(60000),
  });
  process.stdout.write(`${await response.text()}\n`);
  if (!response.ok) process.exitCode = 1;
}

function prepare(settings: ServiceConfig) {
  const root = settings.deploymentDirectory;
  mkdirSync(root, { recursive: true });
  if (existsSync(join(root, ".eve"))) {
    throw new Error(
      "Existing Eve world: stop the service, back it up, and replace only agent/src/.output using the documented upgrade procedure",
    );
  }
  cpSync(join(factoryRoot, "agent"), join(root, "agent"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(join(factoryRoot, "src/eve-engine.ts"), join(root, "src/eve-engine.ts"));
  const modules = realpathSync(join(factoryRoot, "node_modules"));
  if (!existsSync(join(root, "node_modules")))
    symlinkSync(modules, join(root, "node_modules"), "dir");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "zaidan-local-factory",
      private: true,
      type: "module",
      dependencies: { eve: "0.54.3" },
    }),
  );
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "Bundler",
        types: ["node", "eve/workflow-modules"],
        lib: ["esnext", "dom"],
      },
    }),
  );
  const built = spawnSync(process.execPath, [join(modules, "eve/bin/eve.js"), "build"], {
    cwd: root,
    stdio: "inherit",
    env: hostEnvironment(settings),
  });
  if (built.status !== 0) throw new Error("Eve build failed");
}
function hostEnvironment(settings: ServiceConfig): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    HOST: "127.0.0.1",
    NITRO_HOST: "127.0.0.1",
    PORT: String(settings.evePort),
    NITRO_PORT: String(settings.evePort),
    FACTORY_COORDINATOR_URL: `http://127.0.0.1:${settings.coordinatorPort}`,
    DO_NOT_TRACK: "1",
  };
}
async function serve(settings: ServiceConfig) {
  if (!existsSync(join(settings.deploymentDirectory, ".output/server/index.mjs")))
    throw new Error("Prepare the external Eve deployment first");
  const adapters = settings.adapterModule
    ? await (
        (await import(pathToFileURL(settings.adapterModule).href)) as {
          createServiceAdapters: CreateServiceAdapters;
        }
      ).createServiceAdapters({
        stateDirectory: settings.stateDirectory,
        repository: settings.repository,
        mode: "read-only",
      })
    : discoveryOnlyAdapters();
  if (settings.telegram && adapters.telegram)
    throw new Error("Configure one Telegram transport, through environment or adapters");
  const telegram =
    adapters.telegram ??
    (settings.telegram
      ? new TelegramControl({
          database: join(settings.stateDirectory, "telegram.sqlite"),
          maintainerId: settings.telegram.maintainerId,
          token: process.env.FACTORY_TELEGRAM_TOKEN ?? "",
        })
      : undefined);
  const store = new SqliteWorkflowStore(join(settings.stateDirectory, "workflow.sqlite"));
  const workflow = new IssueWorkflow({
    store,
    execution: {
      ...settings.execution,
      permitUrl: `http://host.docker.internal:${settings.permitPort}`,
    },
    engine: createEveEngine({ baseUrl: `http://127.0.0.1:${settings.evePort}` }),
    worker: adapters.worker,
    notifications: telegram ?? adapters.notifications,
    triage: adapters.triage,
    discovery:
      adapters.discovery ??
      createGitHubDiscovery({
        repository: settings.repository,
        token: process.env.FACTORY_GITHUB_TOKEN,
      }),
  });
  let operators: TelegramOperations | undefined;
  let permits: Awaited<ReturnType<typeof startModelPermitServer>> | undefined;
  let child: ChildProcess | undefined;
  let stopping = false;
  let prepared = false;
  const service = new LocalService({
    workflow,
    stateDirectory: settings.stateDirectory,
    prepare: async () => {
      permits = await startModelPermitServer(workflow, settings.permitPort);
      const logs = join(settings.stateDirectory, "logs");
      mkdirSync(logs, { recursive: true });
      const fd = openSync(join(logs, "eve.log"), "a", 0o600);
      child = spawn(
        process.execPath,
        [
          join(factoryRoot, "src/eve-service-host.ts"),
          join(settings.deploymentDirectory, ".output/server/index.mjs"),
        ],
        {
          cwd: settings.deploymentDirectory,
          env: hostEnvironment(settings),
          stdio: ["ignore", fd, fd, "ipc"],
        },
      );
      closeSync(fd);
      child.once("error", () => {
        if (!stopping) void shutdown(1);
      });
      child.once("exit", () => {
        if (!stopping) void shutdown(1);
      });
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null || stopping)
          throw new Error("Eve host exited");
        let healthy = false;
        try {
          healthy = (
            await fetch(`http://127.0.0.1:${settings.evePort}/eve/v1/health`, {
              signal: AbortSignal.timeout(1000),
            })
          ).ok;
        } catch {
          /* Host is still opening its persistent world. */
        }
        if (healthy) {
          await adapters.attach?.({ workflow, service, operators });
          prepared = true;
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      child.kill("SIGTERM");
      throw new Error("Eve host startup timed out");
    },
    disconnect: async () => {
      await permits?.close();
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
    },
    onScan: (result) => {
      process.stdout.write(
        `${JSON.stringify({ event: "scan-completed", mode: result.mode, decisions: result.decisions.length })}\n`,
      );
    },
  });
  if (telegram)
    operators = new TelegramOperations({
      database: join(settings.stateDirectory, "operators.sqlite"),
      workflow,
      service,
      telegram,
      graphs: adapters.operatorGraphs,
      triageRecovery: adapters.triageRecovery,
    });
  const http = await listenLocalService({ workflow, service, port: settings.coordinatorPort });
  const interval = setInterval(() => {
    void service.poll().catch(() => logFailure());
  }, 30000);
  async function shutdown(code: number) {
    if (stopping) return;
    stopping = true;
    clearInterval(interval);
    const deadline = setTimeout(() => {
      child?.kill("SIGKILL");
      process.exit(code || 1);
    }, 10000);
    deadline.unref();
    await operators?.stop();
    await service.stop();
    await http.close();
    operators?.close();
    if (telegram && !adapters.telegram) telegram.close();
    await adapters.close?.();
    store.close();
    clearTimeout(deadline);
    process.exit(code);
  }
  process.once("SIGINT", () => {
    void shutdown(0);
  });
  process.once("SIGTERM", () => {
    void shutdown(0);
  });
  await service.start().catch(() => {
    logFailure();
    if (!prepared) void shutdown(1);
  });
  if (!stopping && service.status().running) await operators?.start();
}
function logFailure() {
  // External adapter errors can contain request URLs or credentials; expose a stable code.
  process.stderr.write(
    `${JSON.stringify({ event: "scan-failed", recovery: "Inspect status and adapter receipts, then scan again" })}\n`,
  );
}
