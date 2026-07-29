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
              async requestBuiltRoutes(_context, urls: string[]) {
                return Promise.all(
                  urls.map(async (url) => {
                    const response = await fetch(url, { redirect: "manual" });
                    const body = await response.text();
                    return {
                      url,
                      status: response.status,
                      location: response.headers.get("location"),
                      xRobotsTag: response.headers.get("x-robots-tag"),
                      canonicalLinks: Array.from(
                        body.matchAll(/rel="canonical" href="([^"]+)"/g),
                        (match) => match[1],
                      ),
                      body: body.slice(0, 5_000),
                    };
                  }),
                );
              },
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
              async inspectCanonicalPreview(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const previewFrame = testFrame.frameLocator(
                  'iframe[title="Canonical Preview route"]',
                );
                const examples = previewFrame.locator('[data-slot="example"]');

                await testFrame.waitForTimeout(500);

                return {
                  activeId: await previewFrame
                    .locator("body")
                    .evaluate(() => document.activeElement?.id ?? null),
                  activeTitle: await previewFrame
                    .locator("body")
                    .evaluate(
                      () =>
                        document.activeElement
                          ?.querySelector(":scope > div")
                          ?.textContent?.trim() ?? null,
                    ),
                  iframeCount: await testFrame
                    .locator('iframe[title="Canonical Preview route"]')
                    .count(),
                  hash: await previewFrame.locator("body").evaluate(() => window.location.hash),
                  exampleIds: await examples.evaluateAll((elements) =>
                    elements.map((element) => element.id),
                  ),
                };
              },
              async inspectSidebarCompatibilityNavigations(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const inspect = async (title: string) => {
                  const routeFrame = testFrame.frameLocator(`iframe[title="${title}"]`);
                  await routeFrame
                    .locator('[data-canonical-route="/components/sidebar"]')
                    .waitFor({ state: "visible" });
                  return routeFrame.locator("body").evaluate(() => {
                    const navigation = performance.getEntriesByType(
                      "navigation",
                    )[0] as PerformanceNavigationTiming;
                    return {
                      pathname: window.location.pathname,
                      search: window.location.search,
                      hash: window.location.hash,
                      redirectCount: navigation.redirectCount,
                    };
                  });
                };

                await testFrame.waitForTimeout(500);
                return {
                  defaultNavigation: await inspect("Sidebar default navigation"),
                  fragmentNavigation: await inspect("Sidebar fragment navigation"),
                };
              },
              async inspectBuiltChart(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Built chart route"]');
                const chart = routeFrame.locator('[data-slot="chart"]');

                await chart.waitFor({ state: "visible" });
                await chart.locator(".recharts-surface").waitFor({ state: "visible" });

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
