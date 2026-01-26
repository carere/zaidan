import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.APP_PORT) {
  throw new Error("APP_PORT is not set");
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://localhost:${process.env.APP_PORT}`,
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
