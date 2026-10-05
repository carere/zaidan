import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 4,
  use: { baseURL: "http://127.0.0.1:5174/tests/browser/index.html", browserName: "chromium" },
  webServer: {
    command:
      "bun vite --config tests/browser/vite.config.ts --mode test --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174/tests/browser/index.html",
  },
});
