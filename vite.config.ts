import tailwind from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import velite from "@velite/plugin-vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import paths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    devtools(),
    paths({ projects: ["./tsconfig.json"] }),
    tailwind(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    solid({ ssr: true, hot: true }),
    velite({
      config: "velite.config.ts",
    }),
  ],
});
