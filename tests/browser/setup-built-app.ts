import { spawnSync } from "node:child_process";
import { Miniflare } from "miniflare";
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

  const server = new Miniflare({
    modules: true,
    modulesRoot: ".output/server",
    modulesRules: [{ type: "ESModule", include: ["**/*.js", "**/*.mjs"] }],
    scriptPath: ".output/server/index.js",
    compatibilityDate: "2026-05-01",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      binding: "ASSETS",
      directory: ".output/client",
      routerConfig: {
        has_user_worker: true,
      },
    },
  });
  const builtAppUrl = await server.ready;

  project.provide("builtAppUrl", builtAppUrl.href);

  return () => server.dispose();
}
