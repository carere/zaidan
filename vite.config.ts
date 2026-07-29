import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import lucide from "vite-plugin-lucide-preprocess";
import solid from "vite-plugin-solid";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig({
  build: {
    outDir: ".output",
  },
  optimizeDeps: {
    exclude: ["solid-recharts"],
  },
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
    tailwind(),
    tanstackStart(),
    solid({ ssr: true, hot: true, extensions: [".tsx", ".mdx"] }),
    velite(),
  ],
});
