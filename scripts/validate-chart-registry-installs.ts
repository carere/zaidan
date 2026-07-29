import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

type RegistryItem = {
  name: string;
  categories?: string[];
  registryDependencies?: string[];
};

const repositoryRoot = resolve(import.meta.dir, "..");
const builtRegistryRoot = join(repositoryRoot, "public/r/kobalte");
const registry = JSON.parse(
  await readFile(join(repositoryRoot, "src/registry/kobalte/registry.json"), "utf8"),
) as { items: RegistryItem[] };
const chartItems = registry.items.filter((item) => item.categories?.includes("charts"));
const areaItems = chartItems.filter((item) => item.categories?.includes("charts-area"));
const barItems = chartItems.filter((item) => item.categories?.includes("charts-bar"));
const lineItems = chartItems.filter((item) => item.categories?.includes("charts-line"));
const radarItems = chartItems.filter((item) => item.categories?.includes("charts-radar"));
const tooltipItems = chartItems.filter((item) => item.categories?.includes("charts-tooltip"));

if (areaItems.length !== 10) {
  throw new Error(`Expected ten Area registry entries, found ${areaItems.length}.`);
}
if (barItems.length !== 10) {
  throw new Error(`Expected ten Bar registry entries, found ${barItems.length}.`);
}
if (lineItems.length !== 10) {
  throw new Error(`Expected ten Line registry entries, found ${lineItems.length}.`);
}
if (radarItems.length !== 14) {
  throw new Error(`Expected fourteen Radar registry entries, found ${radarItems.length}.`);
}
if (tooltipItems.length !== 9) {
  throw new Error(`Expected nine Tooltip registry entries, found ${tooltipItems.length}.`);
}

const rootPackage = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};
const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const name = basename(new URL(request.url).pathname);
    if (!/^[a-z0-9-]+\.json$/.test(name)) return new Response("Not found", { status: 404 });

    const source = Bun.file(join(builtRegistryRoot, name));
    if (!(await source.exists())) return new Response("Not found", { status: 404 });

    const item = (await source.json()) as RegistryItem;
    item.registryDependencies = item.registryDependencies?.map((dependency) => {
      const dependencyName = basename(new URL(dependency).pathname);
      return new URL(dependencyName, server.url).href;
    });
    return Response.json(item);
  },
});

const cli = join(repositoryRoot, "node_modules/shadcn/dist/index.js");

try {
  for (const item of chartItems) {
    const consumer = await mkdtemp(join(tmpdir(), `zaidan-${item.name}-`));
    try {
      await mkdir(join(consumer, "src"), { recursive: true });
      await writeFile(
        join(consumer, "package.json"),
        `${JSON.stringify(
          {
            name: `install-${item.name}`,
            private: true,
            type: "module",
            packageManager: "bun@1.3.14",
            dependencies: { "solid-js": rootPackage.dependencies["solid-js"] },
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(
        join(consumer, "components.json"),
        `${JSON.stringify(
          {
            $schema: "https://ui.shadcn.com/schema.json",
            style: "new-york",
            rsc: false,
            tsx: true,
            tailwind: {
              config: "",
              css: "src/styles.css",
              baseColor: "neutral",
              cssVariables: true,
              prefix: "",
            },
            iconLibrary: "lucide",
            aliases: {
              components: "@/components",
              utils: "@/lib/utils",
              ui: "@/components/ui",
              lib: "@/lib",
              hooks: "@/hooks",
            },
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(
        join(consumer, "tsconfig.json"),
        `${JSON.stringify(
          {
            compilerOptions: {
              baseUrl: ".",
              jsx: "preserve",
              jsxImportSource: "solid-js",
              paths: { "@/*": ["./src/*"] },
            },
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(join(consumer, "src/styles.css"), "@import 'tailwindcss';\n");

      const itemUrl = new URL(`${item.name}.json`, server.url).href;
      const install = Bun.spawn(
        [process.execPath, cli, "add", itemUrl, "--yes", "--cwd", consumer, "--silent"],
        { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        install.exited,
        new Response(install.stdout).text(),
        new Response(install.stderr).text(),
      ]);
      if (exitCode !== 0) {
        throw new Error(
          `${item.name} did not install independently (exit ${exitCode}).\n${stdout}\n${stderr}`,
        );
      }

      const installedFiles = (await readdir(consumer, { recursive: true })).map((path) =>
        String(path),
      );
      const hasFile = (name: string) => installedFiles.some((path) => path.endsWith(`/${name}`));
      if (!hasFile(`${item.name}.tsx`) || !hasFile("chart.tsx") || !hasFile("card.tsx")) {
        throw new Error(
          `${item.name} exited successfully without its complete install graph: ${installedFiles.join(", ")}`,
        );
      }
      if (item.name === "chart-area-interactive") {
        if (!hasFile("select.tsx")) {
          throw new Error(
            "chart-area-interactive installed without its Select registry dependency.",
          );
        }
      }

      const consumerPackage = JSON.parse(
        await readFile(join(consumer, "package.json"), "utf8"),
      ) as {
        dependencies?: Record<string, string>;
      };
      if (consumerPackage.dependencies?.["solid-recharts"] !== "1.0.0") {
        throw new Error(`${item.name} did not retain solid-recharts@1.0.0.`);
      }
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  }
} finally {
  server.stop(true);
}

console.log(
  `Installed ${areaItems.length} Area, ${barItems.length} Bar, ${lineItems.length} Line, ${radarItems.length} Radar, and ${tooltipItems.length} Tooltip registry entries in independent consumers.`,
);
