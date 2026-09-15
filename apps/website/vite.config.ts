/// <reference types="vitest/config" />

import { createRequire } from "node:module";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import lucide from "vite-plugin-lucide-preprocess";
import solid from "vite-plugin-solid";
import { configDefaults } from "vitest/config";
import { getPrerenderPages } from "./src/lib/prerender-pages.ts";
import { highlightCode } from "./src/lib/vite-plugins/highlight-code.ts";
import mdx from "./src/lib/vite-plugins/mdx.ts";

const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  server: { port: Number(process.env.PORT) || 5173 },
  optimizeDeps: {
    // `solid-mdx` only ever appears as the `providerImportSource` injected into
    // compiled MDX, so the dependency scanner cannot see it statically. Without
    // this it is discovered on first page load, which re-optimizes and reloads
    // mid-render and 504s every demo module still in flight.
    include: ["solid-mdx"],
  },
  environments: {
    ssr: {
      build: {
        // Vite leaves server builds unminified by default; the Worker upload
        // then exceeds Cloudflare's 64 MiB payload cap (~117 MB of route
        // chunks). Minifying brings it down ~73%.
        minify: "oxc",
      },
    },
  },
  plugins: [
    lucide(),
    highlightCode(),
    mdx({
      jsx: true,
      jsxImportSource: "solid-js",
      providerImportSource: "solid-mdx",
      stylePropertyNameCase: "css",
    }),
    devtools(),
    ...(mode === "test" ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tailwind(),
    tanstackStart({
      prerender: {
        enabled: true,
        autoSubfolderIndex: false,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        concurrency: 8,
        filter: ({ path }) =>
          path !== "/create" &&
          path !== "/charts" &&
          !path.startsWith("/preview/") &&
          !path.startsWith("/r/"),
        retryCount: 2,
        retryDelay: 500,
        maxRedirects: 5,
        failOnError: true,
      },
      pages: getPrerenderPages(),
    }),
    solid({ ssr: true, hot: mode !== "test", extensions: [".tsx", ".mdx"] }),
    ...(mode === "test" ? [] : [velite()]),
  ],
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          exclude: [
            ...configDefaults.exclude,
            ".claude/worktrees/**",
            "tests/browser/**",
            "**/*.test.tsx",
          ],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            "solid-js/store": require.resolve("solid-js/store/dist/dev.js"),
            "solid-js/web": require.resolve("solid-js/web/dist/web.js"),
            "solid-js": require.resolve("solid-js/dist/dev.js"),
          },
        },
        test: {
          server: { deps: { inline: true } },
          name: "dom",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
    exclude: [...configDefaults.exclude, ".claude/worktrees/**", "tests/browser/**"],
  },
}));
