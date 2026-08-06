/// <reference types="vitest/config" />

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
import { highlightCode } from "./src/lib/vite-plugins/highlight-code";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
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
    cloudflare({ viteEnvironment: { name: "ssr" } }),
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
    solid({ ssr: true, hot: true, extensions: [".tsx", ".mdx"] }),
    velite(),
  ],
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, ".sandcastle/**"],
  },
});
