import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5192", browserName: "chromium" },
  webServer: {
    command: "bun vite --config tests/browser/vite.config.ts",
    url: "http://127.0.0.1:5192",
    reuseExistingServer: !process.env.CI,
  },
});
