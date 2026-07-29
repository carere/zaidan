import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { projectPresetRegistryItem } from "@/lib/preset-registry";
import { getPresetInstallCommand, SEMANTIC_PRESET_TOKEN } from "@/lib/preset-token";

const repositoryRoot = resolve(import.meta.dir, "../..");
const fixture = await mkdtemp(join(tmpdir(), "zaidan-preset-consumer-"));
const token = SEMANTIC_PRESET_TOKEN;
const projected = projectPresetRegistryItem(token);
if (!projected) throw new Error("Expected the semantic Preset Token fixture to project");
const style = await readFile(join(repositoryRoot, "public/r/kobalte/style-nova.json"), "utf8");

let registryOrigin = "";
const server = Bun.serve({
  port: 0,
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === `/r/kobalte/preset-${token}.json`) {
      return Response.json({
        ...projected,
        registryDependencies: [`${registryOrigin}/r/kobalte/style-nova.json`],
      });
    }
    if (pathname === "/r/kobalte/style-nova.json") {
      return new Response(style, { headers: { "Content-Type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  },
});
registryOrigin = server.url.origin;

const run = async (command: string[], input?: string) => {
  const subprocess = Bun.spawn(command, {
    cwd: fixture,
    env: { ...process.env, SHADCN_TELEMETRY_DISABLED: "1" },
    stdout: "pipe",
    stderr: "pipe",
    stdin: input === undefined ? "ignore" : "pipe",
  });
  if (input !== undefined && subprocess.stdin) {
    subprocess.stdin.write(input);
    subprocess.stdin.end();
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed (${exitCode})\n${stdout}\n${stderr}`);
  }
  return { stdout, stderr };
};

try {
  await mkdir(join(fixture, "src"), { recursive: true });
  await Promise.all([
    writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "zaidan-preset-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@fontsource-variable/geist": "^5.2.9",
          "@fontsource-variable/oxanium": "^5.2.8",
          "solid-js": "^1.9.13",
          tailwindcss: "^4.3.0",
          vite: "^8.0.13",
          "vite-plugin-solid": "^2.11.12",
        },
      }),
    ),
    writeFile(
      join(fixture, "components.json"),
      JSON.stringify({
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: {
          config: "",
          css: "src/index.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        iconLibrary: "lucide",
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
        registries: { "@zaidan": `${server.url.origin}/r/kobalte/{name}.json` },
      }),
    ),
    writeFile(
      join(fixture, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "preserve",
          jsxImportSource: "solid-js",
          strict: true,
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src", "vite.config.ts"],
      }),
    ),
    writeFile(join(fixture, "src/index.css"), '@import "tailwindcss";\n'),
    writeFile(join(fixture, "src/vite-env.d.ts"), '/// <reference types="vite/client" />\n'),
    writeFile(
      join(fixture, "src/index.tsx"),
      'import "./index.css";\nimport { render } from "solid-js/web";\nrender(() => <main class="z-font-heading">Preset consumer</main>, document.getElementById("root")!);\n',
    ),
    writeFile(
      join(fixture, "vite.config.ts"),
      'import { defineConfig } from "vite";\nimport solid from "vite-plugin-solid";\nexport default defineConfig({ plugins: [solid()] });\n',
    ),
    writeFile(
      join(fixture, "index.html"),
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/index.tsx"></script></body></html>\n',
    ),
    symlink(join(repositoryRoot, "node_modules"), join(fixture, "node_modules"), "dir"),
  ]);

  const exactCommand = getPresetInstallCommand("bun", token);
  const installResult = await run(exactCommand.split(" "), "y\n");
  const fixtureFiles = await readdir(join(fixture, "src"), { recursive: true });
  const installedStylePath = fixtureFiles.find((path) => path.endsWith("styles/base.css"));
  const [installedCss, packageJson] = await Promise.all([
    readFile(join(fixture, "src/index.css"), "utf8"),
    readFile(join(fixture, "package.json"), "utf8"),
  ]);
  const installedStyle = installedStylePath
    ? await readFile(join(fixture, "src", installedStylePath), "utf8")
    : installedCss;
  for (const expected of [
    "--font-sans: 'Geist Variable', sans-serif",
    "--font-heading: 'Oxanium Variable', sans-serif",
    "--radius: 0.75rem",
    "--chart-1:",
    "--sidebar-accent:",
  ]) {
    if (!installedCss.includes(expected)) {
      throw new Error(
        `Installed CSS is missing ${expected}:\n${installedCss}\n${installResult.stdout}\n${installResult.stderr}`,
      );
    }
  }
  if (!installedStyle.includes(".z-button")) {
    throw new Error(
      `Selected style dependency was not installed:\n${fixtureFiles.join("\n")}\n${installedCss}\n${installResult.stdout}\n${installResult.stderr}`,
    );
  }
  if (
    !packageJson.includes("@fontsource-variable/geist") ||
    !packageJson.includes("@fontsource-variable/oxanium")
  ) {
    throw new Error("Installed consumer is missing required font packages");
  }
  await run(["bun", "--bun", "tsc", "--noEmit"]);
  await run(["bun", "vite", "build"]);
  process.stdout.write(`Installed and built ${exactCommand}\n`);
} finally {
  server.stop(true);
  await rm(fixture, { recursive: true, force: true });
}
