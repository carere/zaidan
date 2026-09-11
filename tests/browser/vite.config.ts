import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@/lib/utils": fileURLToPath(new URL("./utils.ts", import.meta.url)),
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
    },
  },
  plugins: [tailwind(), solid()],
  server: { host: "127.0.0.1", port: 5192, strictPort: true },
});
