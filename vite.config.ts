/// <reference types="vitest/config" />

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import lucide from "vite-plugin-lucide-preprocess";
import solid from "vite-plugin-solid";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    lucide(),
    mdx({
      jsx: true,
      jsxImportSource: "solid-js",
      providerImportSource: "solid-mdx",
      stylePropertyNameCase: "css",
    }),
    devtools(),
    ...(mode === "test" ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tailwind(),
    tanstackStart(),
    solid({ ssr: true, hot: true, extensions: [".tsx", ".mdx"] }),
    ...(mode === "test" ? [] : [velite()]),
  ],
  test: {
    environment: "node",
  },
}));
