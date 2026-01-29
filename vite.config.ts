import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig, loadEnv } from "vite";
import solid from "vite-plugin-solid";
import paths from "vite-tsconfig-paths";
import mdx from "./src/lib/vite-plugins/mdx";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      port: env.APP_PORT ? Number(env.APP_PORT) : undefined,
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
      tanstackStart(),
      solid({ ssr: true, hot: false, extensions: [".tsx", ".jsx", ".mdx"] }),
      velite(),
    ],
  };
});
