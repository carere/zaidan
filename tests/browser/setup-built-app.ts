import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    builtAppUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const build = spawnSync("bun", ["vite", "build"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (build.status !== 0) {
    throw new Error(`Built application fixture failed with code ${build.status}.`);
  }

  const server = spawn("bun", ["run", "tests/browser/serve-built-app.ts"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const builtAppUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Built application server did not start.")),
      10_000,
    );
    let output = "";
    server.stdout.setEncoding("utf8");
    server.stdout.on("data", (chunk: string) => {
      output += chunk;
      const [url] = output.split("\n", 1);
      if (!url?.startsWith("http")) return;
      clearTimeout(timeout);
      resolve(url);
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Built application server exited with code ${code}.`));
    });
  });

  project.provide("builtAppUrl", builtAppUrl);

  return async () => {
    if (server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill("SIGTERM");
      await exited;
    }
  };
}
