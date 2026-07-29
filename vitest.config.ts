import { playwright } from "@vitest/browser-playwright";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

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
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
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

                await heading.waitFor({ state: "visible" });

                const previewFrame = routeFrame.frameLocator('iframe[title="Home Preview"]');
                await previewFrame.locator(".theme-container").waitFor({ state: "visible" });

                return {
                  heading: await heading.textContent(),
                  previewPath: await routeFrame
                    .locator('iframe[title="Home Preview"]')
                    .getAttribute("src"),
                };
              },
            },
          },
        },
      },
    ],
  },
});
