import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import paths from "vite-tsconfig-paths";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig({
  server: {
    port: parseInt(Bun.env.FRONTEND_PORT || "5175", 10),
  },
  plugins: [
    mdx({
      jsx: true,
      jsxImportSource: "solid-js",
      providerImportSource: "solid-mdx",
      stylePropertyNameCase: "css",
    }),
    devtools(),
    paths({ projects: ["./tsconfig.json"] }),
    tailwind(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    solid({ ssr: true, hot: true, extensions: [".tsx", ".jsx", ".mdx"] }),
    velite(),
  ],
});
