import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareEveWorld } from "../src/eve-local-recovery.ts";

const factoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function eventually<T>(
  check: () => Promise<T>,
  ready: (value: T) => boolean,
): Promise<T> {
  const deadline = Date.now() + 30000;
  for (;;) {
    const value = await check();
    if (ready(value)) return value;
    if (Date.now() >= deadline)
      throw new Error(`Eve host did not settle: ${JSON.stringify(value)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Builds actual production workflow directives, outside Git, using installed pinned Eve. */
export async function buildEveHost() {
  const root = mkdtempSync(join(tmpdir(), "zaidan-factory-eve-"));
  const modules = process.env.FACTORY_EVE_MODULES ?? join(factoryRoot, "node_modules");
  const node = process.env.FACTORY_NODE_EXECUTABLE ?? "node";
  cpSync(join(factoryRoot, "agent"), join(root, "agent"), { recursive: true });
  mkdirSync(join(root, "src"));
  cpSync(join(factoryRoot, "src/eve-engine.ts"), join(root, "src/eve-engine.ts"));
  symlinkSync(modules, join(root, "node_modules"), "dir");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "zaidan-factory-eve-fixture",
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
  const build = spawnSync(node, [join(modules, "eve/bin/eve.js"), "build"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
  });
  writeFileSync(join(root, "build.log"), `${build.stdout ?? ""}\n${build.stderr ?? ""}`);
  if (build.status !== 0) throw new Error(`Eve build failed: ${join(root, "build.log")}`);
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  let host: ChildProcess | undefined;
  let ownership: ReturnType<typeof prepareEveWorld> | undefined;
  let logs = "";
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    root,
    baseUrl,
    async start(coordinatorUrl: string) {
      ownership = prepareEveWorld(join(root, ".eve", ".workflow-data"));
      host = spawn(node, [join(root, ".output/server/index.mjs")], {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          HOST: "127.0.0.1",
          PORT: String(port),
          WORKFLOW_INLINE_OWNERSHIP_LEASE_SECONDS: "1",
          FACTORY_COORDINATOR_URL: coordinatorUrl,
          DO_NOT_TRACK: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      host.stdout?.on("data", (data) => {
        logs += data;
      });
      host.stderr?.on("data", (data) => {
        logs += data;
      });
      await eventually(async () => {
        if (host?.exitCode !== null) throw new Error(`Eve host exited: ${logs}`);
        try {
          return (await fetch(`${baseUrl}/eve/v1/health`)).ok;
        } catch {
          return false;
        }
      }, Boolean);
    },
    async stop() {
      if (!host) return;
      if (host.exitCode === null && host.signalCode === null) {
        const stopped = once(host, "exit");
        host.kill("SIGKILL");
        await stopped;
      }
      host = undefined;
      ownership?.release();
      ownership = undefined;
      writeFileSync(join(root, "host.log"), logs);
    },
    logs() {
      return readFileSync(join(root, "build.log"), "utf8") + logs;
    },
  };
}
