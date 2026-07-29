import { resolve } from "node:path";
import { playwright } from "@vitest/browser-playwright";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const playwrightLibraryPath = resolve(".cloudflare/playwright-deps/usr/lib/x86_64-linux-gnu");
const cloudBuildReadyTimeout = 90_000;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [solid()],
  test: {
    // Prevent vite-plugin-solid from adding jsdom to the shared config. Each
    // project below owns its real execution environment explicitly.
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.tsx"],
          globalSetup: ["tests/browser/setup-built-app.ts"],
          // Cloudflare Workers Builds share CPU while the built fixture and
          // Chromium run together, so route hydration can exceed Vitest's
          // 15-second default without indicating a failed assertion.
          testTimeout: 120_000,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: {
                env: {
                  ...process.env,
                  LD_LIBRARY_PATH: [playwrightLibraryPath, process.env.LD_LIBRARY_PATH]
                    .filter(Boolean)
                    .join(":"),
                },
              },
            }),
            instances: [{ browser: "chromium" }],
            commands: {
              async inspectBuiltRoute(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built Zaidan route"]');
                const heading = routeFrame.getByRole("heading", {
                  name: "The best foundation for your next SolidJS project",
                });

                await heading.waitFor({ state: "visible", timeout: cloudBuildReadyTimeout });

                const previewFrame = routeFrame.frameLocator('iframe[title="Home Preview"]');
                await previewFrame
                  .locator(".theme-container")
                  .waitFor({ state: "visible", timeout: cloudBuildReadyTimeout });

                return {
                  heading: await heading.textContent(),
                  previewPath: await routeFrame
                    .locator('iframe[title="Home Preview"]')
                    .getAttribute("src"),
                };
              },
              async inspectBuiltChart(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built chart route"]');
                const chart = routeFrame.locator('[data-slot="chart"]');

                await chart.waitFor({ state: "visible", timeout: cloudBuildReadyTimeout });
                await chart
                  .locator(".recharts-surface")
                  .waitFor({ state: "visible", timeout: cloudBuildReadyTimeout });

                return {
                  chartSlot: await chart.getAttribute("data-chart"),
                  description: await routeFrame
                    .getByText("Showing total visitors for the last 6 months")
                    .textContent(),
                  renderedAreaCount: await chart.locator(".recharts-area-area").count(),
                };
              },
            },
          },
        },
      },
    ],
  },
});
