import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import lucide from "vite-plugin-lucide-preprocess";
import solid from "vite-plugin-solid";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig({
  optimizeDeps: {
    // v1.0.0 publishes TS/TSX source. Vite's optimizer preserves some JSX in its
    // generated .js bundle, so let vite-plugin-solid compile the source directly.
    exclude: ["solid-recharts"],
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["solid-recharts"],
    optimizeDeps: {
      exclude: ["solid-recharts"],
    },
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
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwind(),
    tanstackStart(),
    solid({ ssr: true, hot: true, extensions: [".tsx", ".mdx"] }),
    velite(),
  ],
});
