import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import tailwind from "@tailwindcss/vite";
import type { RegistryItem } from "shadcn/schema";
import { build, createServer } from "vite";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, STYLES } from "@/lib/config";
import { encodeDesignSystemPreset } from "@/lib/preset";
import { buildPresetRegistryItem } from "@/lib/registry-preset";
import { THEMES_VARIANTS } from "@/lib/themes";
import registry from "@/registry/kobalte/registry.json";

const items = registry.items as RegistryItem[];
const neutral = items.find((item) => item.name === "neutral");

if (!neutral) throw new Error("Missing neutral registry theme");

function closure(item: RegistryItem, seen = new Set<string>()): RegistryItem[] {
  if (seen.has(item.name)) return [];
  seen.add(item.name);
  return [
    ...(item.registryDependencies ?? []).flatMap((dependency) => {
      const name = dependency
        .split("/")
        .pop()
        ?.replace(/\.json$/, "");
      const target = items.find((candidate) => candidate.name === name);
      if (!target) throw new Error(`Missing registry dependency: ${dependency}`);
      return closure(target, seen);
    }),
    item,
  ];
}

function cssRules(rules: Record<string, unknown>): string {
  return Object.entries(rules)
    .map(([key, value]) =>
      typeof value === "object" && value !== null
        ? Object.keys(value).length === 0
          ? `${key};`
          : `${key} { ${cssRules(value as Record<string, unknown>)} }`
        : `${key}: ${value};`,
    )
    .join("\n");
}

// The standard mappings supplied by shadcn init. Extra colors must come from
// the installed registry contract, never the website stylesheet.
const standardMappings = Object.keys(neutral.cssVars?.light ?? {})
  .filter((key) => key !== "radius")
  .map((key) => `--color-${key}: var(--${key});`)
  .join("\n");

for (const path of ["style and theme", "preset"] as const) {
  describe(`consumer CSS: ${path}`, () => {
    it.each(STYLES.map(({ name }) => name))(
      "compiles %s in development and production",
      async (style) => {
        const root = await mkdtemp(join(tmpdir(), "zaidan-css-"));
        try {
          await symlink(resolve("node_modules"), join(root, "node_modules"), "dir");
          const entry =
            path === "preset"
              ? buildPresetRegistryItem(encodeDesignSystemPreset({ ...DEFAULT_CONFIG, style }))
              : items.find((item) => item.name === `style-${style}`);
          if (!entry) throw new Error("Missing design system registry item");
          const installed = [neutral, ...closure(entry)];
          const light: Record<string, string> = {};
          const dark: Record<string, string> = {};
          const theme: Record<string, string> = {};
          let css = "";
          for (const item of installed) {
            Object.assign(light, item.cssVars?.light);
            Object.assign(dark, item.cssVars?.dark);
            Object.assign(theme, item.cssVars?.theme);
            css += cssRules(item.css ?? {});
            for (const file of item.files ?? []) {
              if (!file.target || !file.path.endsWith(".css")) continue;
              await mkdir(join(root, "styles"), { recursive: true });
              await writeFile(join(root, file.target), await readFile(file.path, "utf8"));
            }
          }
          const vars = (values: Record<string, string>) =>
            Object.entries(values)
              .map(([key, value]) => `${key.startsWith("--") ? key : `--${key}`}: ${value};`)
              .join("\n");
          await writeFile(
            join(root, "index.css"),
            `@import "tailwindcss";\n@import "tw-animate-css";\n${css}\n@custom-variant dark (&:where(.dark, .dark *));\n:root {${vars(light)}}\n.dark {${vars(dark)}}\n@theme inline {${standardMappings}\n--font-heading: sans-serif;\n${vars(theme)}}`,
          );
          await writeFile(
            join(root, "index.html"),
            '<link rel="stylesheet" href="/index.css"><div class="z-alert">Consumer</div>',
          );
          const config = {
            root,
            configFile: false as const,
            plugins: [tailwind()],
            logLevel: "silent" as const,
          };
          const server = await createServer(config);
          try {
            expect((await server.transformRequest("/index.css"))?.code).toContain(".z-alert");
          } finally {
            await server.close();
          }
          await build({ ...config, plugins: [tailwind()], build: { write: false } });
          for (const token of [
            "success",
            "success-foreground",
            "warning",
            "warning-foreground",
            "info",
            "info-foreground",
          ]) {
            expect(light[token], `light ${token}`).toMatch(/^oklch\(/);
            expect(dark[token], `dark ${token}`).toMatch(/^oklch\(/);
          }
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      },
      30000,
    );
  });
}

it("preserves semantic colors and picker overrides in consumer themes", () => {
  const expected = {
    light: {
      success: "oklch(0.979 0.021 166.113)",
      "success-foreground": "oklch(0.378 0.077 168.94)",
      warning: "oklch(0.987 0.026 102.212)",
      "warning-foreground": "oklch(0.421 0.095 57.708)",
      info: "oklch(0.97 0.014 254.604)",
      "info-foreground": "oklch(0.379 0.146 265.522)",
    },
    dark: {
      success: "oklch(0.23 0.0359 185.7)",
      "success-foreground": "oklch(0.765 0.177 163.223)",
      warning: "oklch(0.25 0.0437 50.86)",
      "warning-foreground": "oklch(0.795 0.184 86.047)",
      info: "oklch(0.25 0.0714 268.38)",
      "info-foreground": "oklch(0.707 0.165 254.624)",
    },
  };
  for (const theme of THEMES_VARIANTS) expect(theme.cssVars).toMatchObject(expected);
  expect(items.find((item) => item.name === "semantic-colors")?.cssVars).toMatchObject(expected);
  const preset = buildPresetRegistryItem(
    encodeDesignSystemPreset({
      ...DEFAULT_CONFIG,
      baseColor: "zinc",
      theme: "blue",
      chartColor: "amber",
      radius: "large",
      menuAccent: "bold",
    }),
  );
  expect(preset?.cssVars).toMatchObject(expected);
  expect(preset?.cssVars?.light).toMatchObject({
    background: "oklch(1 0 0)",
    primary: "oklch(0.488 0.243 264.376)",
    accent: "oklch(0.488 0.243 264.376)",
    radius: "0.875rem",
    "chart-1": "oklch(0.879 0.169 91.605)",
  });
});
