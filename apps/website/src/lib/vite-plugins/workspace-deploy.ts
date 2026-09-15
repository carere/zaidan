import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import type { Plugin } from "vite";

/** Keep root Wrangler commands working after the website's workspace move. */
export function workspaceDeploy(): Plugin {
  return {
    name: "zaidan-workspace-deploy",
    apply: "build",
    writeBundle: {
      order: "post",
      async handler() {
        if (this.environment.name !== "ssr") return;

        const websiteRoot = this.environment.config.root;
        const redirect = resolve(websiteRoot, "../../.wrangler/deploy/config.json");
        const workerConfig = resolve(
          websiteRoot,
          this.environment.config.build.outDir,
          "wrangler.json",
        );
        await mkdir(dirname(redirect), { recursive: true });
        await writeFile(
          redirect,
          JSON.stringify({ configPath: relative(dirname(redirect), workerConfig) }),
        );
      },
    },
  };
}
