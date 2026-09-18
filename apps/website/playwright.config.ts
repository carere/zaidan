import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 5174);
const baseURL = `http://127.0.0.1:${port}/tests/browser/index.html`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 4,
  use: { baseURL, browserName: "chromium" },
  webServer: {
    command: `bun vite --config tests/browser/vite.config.ts --mode test --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
  },
});
