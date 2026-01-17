import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://localhost:${process.env.FRONTEND_PORT || "5175"}`,
    testIdAttribute: "data-slot",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: process.env.CI
      ? "off"
      : {
          mode: "on",
          size: {
            width: 1280,
            height: 720,
          },
        },
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
