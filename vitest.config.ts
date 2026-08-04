import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
    conditions: ["browser"],
  },
  test: {
    environment: "node",
    server: {
      deps: {
        inline: [/@tanstack\/solid-(router|start)/],
      },
    },
  },
});
