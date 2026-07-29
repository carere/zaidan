import { playwright } from "@vitest/browser-playwright";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

async function getProductHeaderTestFrame(context: unknown) {
  const commandContext = context as {
    provider: {
      getCommandsContext: (sessionId: string) => {
        frame: () => Promise<Frame>;
      };
    };
    sessionId: string;
  };
  const testFrame = await commandContext.provider
    .getCommandsContext(commandContext.sessionId)
    .frame();
  const routeFrame = testFrame.frameLocator('iframe[title="Product Header route"]');
  const header = routeFrame.locator("[data-product-header]");
  await header.waitFor({ state: "visible" });
  return { testFrame, routeFrame, header };
}

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
                      body: body.slice(0, 50_000),
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

                const showcase = routeFrame.locator('[data-home-showcase="native"]');
                await showcase.waitFor({ state: "visible" });

                return {
                  heading: await heading.textContent(),
                  iframeCount: await routeFrame.locator("iframe").count(),
                  showcaseVisible: await showcase.isVisible(),
                };
              },
              async inspectHomeShowcase(context, colorMode: "light" | "dark") {
                const { testFrame, routeFrame } = await getProductHeaderTestFrame(context);
                await routeFrame.locator("html").evaluate((element, mode) => {
                  element.classList.remove("light", "dark");
                  element.classList.add(mode);
                }, colorMode);
                await testFrame.waitForTimeout(50);

                const nativeShowcase = routeFrame.locator('[data-home-showcase="native"]');
                const visibleColumns = nativeShowcase.locator("[data-showcase-column]:visible");
                const mobileArtwork = routeFrame.locator("[data-mobile-artwork]:visible");
                return {
                  columnCount: await visibleColumns.count(),
                  content: await routeFrame
                    .locator("[data-showcase-content]")
                    .evaluateAll((elements) =>
                      elements.map(
                        (element) => element.getAttribute("data-showcase-content") ?? "",
                      ),
                    ),
                  fadeCount: await nativeShowcase.locator("[data-showcase-fade]:visible").count(),
                  iframeCount: await routeFrame.locator("iframe").count(),
                  installCommand: await routeFrame.locator("[data-install-command]").textContent(),
                  mobileArtworkCount: await mobileArtwork.count(),
                  mobileArtworkSource:
                    (await mobileArtwork.count()) > 0
                      ? await mobileArtwork.first().getAttribute("src")
                      : null,
                  mobileControlCount: await routeFrame
                    .locator(
                      "[data-home-mobile] button, [data-home-mobile] input, [data-home-mobile] select, [data-home-mobile] textarea, [data-home-mobile] iframe",
                    )
                    .count(),
                  nativeShowcaseVisible: await nativeShowcase.isVisible(),
                  overflow: await routeFrame
                    .locator("body")
                    .evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
                  pathname: await routeFrame
                    .locator("body")
                    .evaluate(() => window.location.pathname),
                  search: await routeFrame.locator("body").evaluate(() => window.location.search),
                };
              },
              async exerciseHomeInstallCopy(context) {
                const { testFrame, routeFrame } = await getProductHeaderTestFrame(context);
                const copied: string[] = [];
                await routeFrame.locator("body").evaluate(() => {
                  Object.defineProperty(navigator, "clipboard", {
                    configurable: true,
                    value: {
                      writeText(value: string) {
                        document.documentElement.dataset.copiedInstallCommand = value;
                        return Promise.resolve();
                      },
                    },
                  });
                });
                const copyButton = routeFrame.getByRole("button", {
                  name: "Copy install command",
                });
                await copyButton.focus();
                await testFrame.page().keyboard.press("Enter");
                await routeFrame.getByText("Install command copied", { exact: true }).waitFor({
                  state: "attached",
                });
                copied.push(
                  (await routeFrame.locator("html").getAttribute("data-copied-install-command")) ??
                    "",
                );
                return {
                  copiedText: copied[0] ?? "",
                  focusedLabel: await routeFrame
                    .locator("body")
                    .evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null),
                  liveStatus: await routeFrame.locator('[aria-live="polite"]').textContent(),
                  pathname: await routeFrame
                    .locator("body")
                    .evaluate(() => window.location.pathname),
                  search: await routeFrame.locator("body").evaluate(() => window.location.search),
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
                  activeIdentity: await previewFrame
                    .locator("body")
                    .evaluate(
                      () =>
                        (document.activeElement as HTMLElement | null)?.dataset.previewAnchor ??
                        null,
                    ),
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
              async inspectDesktopProductHeader(context) {
                const { header } = await getProductHeaderTestFrame(context);

                const productNavigation = header.getByRole("navigation", {
                  name: "Product Surfaces",
                });
                return {
                  surfaces: await productNavigation.getByRole("link").allTextContents(),
                  activeSurface: await productNavigation
                    .locator('[aria-current="location"]')
                    .textContent(),
                  searchVisible: await header
                    .getByRole("button", { name: "Open Command Search" })
                    .isVisible(),
                  githubVisible: await header.getByRole("link", { name: /GitHub/i }).isVisible(),
                  modeVisible: await header
                    .getByRole("button", { name: "Toggle color mode" })
                    .isVisible(),
                  createVisible: await header
                    .getByRole("link", { name: "New", exact: true })
                    .isVisible(),
                  headerHeight: await header.evaluate(
                    (element) => element.getBoundingClientRect().height,
                  ),
                  offset: await header.evaluate(() =>
                    Number.parseFloat(
                      getComputedStyle(document.documentElement).getPropertyValue(
                        "--product-header-height",
                      ),
                    ),
                  ),
                };
              },
              async exerciseMobileProductHeader(context) {
                const { testFrame, routeFrame, header } = await getProductHeaderTestFrame(context);
                await testFrame.page().emulateMedia({ reducedMotion: "reduce" });

                const search = header.getByRole("button", { name: "Open Command Search" });
                const mode = header.getByRole("button", { name: "Toggle color mode" });
                const mobileCreate = header.getByRole("link", { name: "New", exact: true });
                const menuTrigger = header.getByRole("button", { name: "Open Product menu" });
                const compactSearchVisible = await search.isVisible();
                const modeVisible = await mode.isVisible();
                const mobileCreateVisible = await mobileCreate.isVisible();

                await menuTrigger.click();
                const dialog = routeFrame.getByRole("dialog");
                await dialog.waitFor({ state: "visible" });
                const hierarchyVisible = await dialog.getByText("Component Catalog").isVisible();
                await testFrame.page().keyboard.press("Tab");
                const focusTrapped = await dialog.evaluate((element) =>
                  element.contains(document.activeElement),
                );
                const reducedMotionDuration = await dialog.evaluate(
                  (element) => getComputedStyle(element).animationDuration,
                );

                await testFrame.page().keyboard.press("Escape");
                await dialog.waitFor({ state: "hidden" });
                await testFrame.waitForTimeout(250);
                const restoredLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                await testFrame.page().keyboard.press("/");
                const shortcutLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));
                await routeFrame
                  .locator("body")
                  .evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
                await testFrame.page().keyboard.press("Control+K");
                const commandShortcutLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                await menuTrigger.click();
                await dialog.waitFor({ state: "visible" });
                await dialog.getByRole("link", { name: "Button", exact: true }).click();
                await routeFrame
                  .locator('[data-canonical-route="/components/button"]')
                  .waitFor({ state: "visible" });
                await testFrame.waitForTimeout(250);
                const selectedFocus = await routeFrame.locator("body").evaluate(() => ({
                  id: (document.activeElement as HTMLElement | null)?.id ?? null,
                  tag: document.activeElement?.tagName ?? null,
                  text: document.activeElement?.textContent?.trim() ?? null,
                }));
                const selectedHash = await routeFrame
                  .locator("body")
                  .evaluate(() => window.location.hash);

                await menuTrigger.click();
                await dialog.waitFor({ state: "visible" });
                await testFrame.page().keyboard.press("Escape");
                await dialog.waitFor({ state: "hidden" });
                await testFrame.waitForTimeout(250);
                const postSelectionRestoredLabel = await routeFrame
                  .locator("body")
                  .evaluate(() => document.activeElement?.getAttribute("aria-label"));

                return {
                  compactSearchVisible,
                  modeVisible,
                  mobileCreateVisible,
                  hierarchyVisible,
                  focusTrapped,
                  restoredLabel,
                  shortcutLabel,
                  commandShortcutLabel,
                  selectedFocusId: selectedFocus.id,
                  selectedFocusTag: selectedFocus.tag,
                  selectedFocusText: selectedFocus.text,
                  selectedHash,
                  postSelectionRestoredLabel,
                  reducedMotionDuration,
                };
              },
            },
          },
        },
      },
    ],
  },
});
