import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import paths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    devtools(),
    nitro(),
    paths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    solid({ ssr: true, hot: true }),
  ],
});
