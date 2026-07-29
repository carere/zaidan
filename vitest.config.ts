import { playwright } from "@vitest/browser-playwright";
import axeCore from "axe-core";
import type { Frame } from "playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { createBrowserCommands } from "./tests/browser/support/create-commands";
import { docsBrowserCommands } from "./tests/browser/support/docs-commands";

async function getProductRouteTestFrame(context: unknown) {
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

async function exerciseChartPreviewFailure(
  context: unknown,
  options: {
    entrySlug: string;
    recoveredFrameTitle: string;
    routeFrameTitle: string;
  },
) {
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
  const page = testFrame.page();
  const routeFrame = testFrame.frameLocator(`iframe[title="${options.routeFrameTitle}"]`);
  const blockedPreview = `**/preview/charts/${options.entrySlug}`;
  await page.route(blockedPreview, (route) => route.abort());

  try {
    await routeFrame.locator("body").evaluate(() => window.location.reload());
    await testFrame.waitForTimeout(750);

    const entry = routeFrame.locator(`[data-chart-entry="${options.entrySlug}"]`);
    await entry.waitFor({ state: "visible" });
    await entry.scrollIntoViewIfNeeded();
    const alert = entry.getByRole("alert");
    await alert.waitFor({ state: "visible", timeout: 8_000 });
    const retry = alert.getByRole("button", { name: /Retry/ });
    const openPreview = alert.getByRole("link", { name: /Open Preview/ });
    const evidence = {
      alertText: (await alert.textContent()) ?? "",
      retryVisible: await retry.isVisible(),
      openPreviewVisible: await openPreview.isVisible(),
    };

    await page.unroute(blockedPreview);
    await retry.click();
    const recoveredFrame = routeFrame.frameLocator(
      `iframe[title="${options.recoveredFrameTitle}"]`,
    );
    await recoveredFrame.locator('[data-slot="chart"]').waitFor({
      state: "visible",
      timeout: 8_000,
    });
    return { ...evidence, recovered: true };
  } finally {
    await page.unroute(blockedPreview);
  }
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
              ...docsBrowserCommands,
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
                const { testFrame, routeFrame } = await getProductRouteTestFrame(context);
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
                const { testFrame, routeFrame } = await getProductRouteTestFrame(context);
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
              ...createBrowserCommands,
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
              async inspectAreaChartCatalog(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const page = testFrame.page();
                const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
                const consoleErrors: string[] = [];
                const recordConsole = (message: { type: () => string; text: () => string }) => {
                  if (message.type() === "error") consoleErrors.push(message.text());
                };
                const recordPageError = (error: Error) => consoleErrors.push(error.message);
                page.on("console", recordConsole);
                page.on("pageerror", recordPageError);

                try {
                  // The command attaches listeners before a fresh navigation so the
                  // evidence includes initial hydration and every lazy child frame.
                  await routeFrame.locator("body").evaluate(() => window.location.reload());
                  await testFrame.waitForTimeout(500);

                  const heading = routeFrame.getByRole("heading", {
                    name: "Beautiful Charts & Graphs",
                  });
                  await heading.waitFor({ state: "visible" });
                  const entries = routeFrame.locator("[data-chart-entry]");
                  const firstEntry = entries.first();
                  const previews: Array<{
                    slug: string | null;
                    renderedAreaCount: number;
                    chartRole: string | null;
                  }> = [];

                  for (let index = 0; index < (await entries.count()); index += 1) {
                    const catalogEntry = entries.nth(index);
                    await catalogEntry.scrollIntoViewIfNeeded();
                    const preview = catalogEntry.frameLocator("iframe");
                    const chart = preview.locator('[data-slot="chart"]');
                    await chart.waitFor({ state: "visible", timeout: 8_000 });
                    await chart.locator(".recharts-surface").waitFor({ state: "visible" });
                    const application = preview.getByRole("application");
                    previews.push({
                      slug: await catalogEntry.getAttribute("data-chart-entry"),
                      renderedAreaCount: await chart.locator(".recharts-area-area").count(),
                      chartRole: await application.getAttribute("role"),
                    });
                  }

                  await firstEntry.scrollIntoViewIfNeeded();
                  const previewFrame = firstEntry.frameLocator("iframe");
                  const chart = previewFrame.locator('[data-slot="chart"]');
                  await chart.waitFor({ state: "visible" });
                  const rtlHasNoOverflow = await previewFrame
                    .locator("html")
                    .evaluate((element) => {
                      (element as HTMLHtmlElement).dir = "rtl";
                      const hasNoOverflow = element.scrollWidth <= element.clientWidth;
                      (element as HTMLHtmlElement).dir = "";
                      return hasNoOverflow;
                    });
                  const application = previewFrame.getByRole("application");
                  await application.focus();
                  await page.keyboard.press("ArrowRight");
                  await testFrame.waitForTimeout(250);
                  const keyboardTooltipText = await previewFrame
                    .locator(".cn-chart-tooltip")
                    .textContent();

                  await chart.locator(".recharts-surface").hover({ position: { x: 220, y: 150 } });
                  await previewFrame.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
                  const pointerTooltipText = await previewFrame
                    .locator(".cn-chart-tooltip")
                    .textContent();

                  const interactiveEntry = routeFrame.locator(
                    '[data-chart-entry="chart-area-interactive"]',
                  );
                  await interactiveEntry.scrollIntoViewIfNeeded();
                  const interactiveFrame = interactiveEntry.frameLocator("iframe");
                  const rangeTrigger = interactiveFrame.getByRole("button", {
                    name: "Select a value",
                  });
                  await rangeTrigger.click();
                  await interactiveFrame.getByRole("option", { name: "Last 7 days" }).waitFor({
                    state: "visible",
                  });
                  await rangeTrigger.press("End");
                  await rangeTrigger.press("Enter");
                  const interactiveSelection = await rangeTrigger.textContent();

                  const beforeMode = await previewFrame.locator("html").getAttribute("class");
                  await routeFrame.getByRole("button", { name: "Toggle color mode" }).click();
                  await testFrame.waitForTimeout(250);
                  const afterMode = await previewFrame.locator("html").getAttribute("class");
                  const configTheme = await previewFrame
                    .locator("html")
                    .getAttribute("data-kb-theme");

                  const firstWidth = await firstEntry.evaluate(
                    (element) => element.getBoundingClientRect().width,
                  );
                  const interactiveWidth = await routeFrame
                    .locator('[data-chart-entry="chart-area-interactive"]')
                    .evaluate((element) => element.getBoundingClientRect().width);
                  const previewHeight = await firstEntry
                    .locator("[data-chart-preview]")
                    .evaluate((element) => element.getBoundingClientRect().height);

                  return {
                    heading: await heading.textContent(),
                    families: await routeFrame
                      .getByRole("navigation", { name: "Chart families" })
                      .getByRole("link")
                      .allTextContents(),
                    entryCount: await entries.count(),
                    previewHeight,
                    previewLoading: await firstEntry.locator("iframe").getAttribute("loading"),
                    interactiveIsFullWidth: interactiveWidth > firstWidth * 2,
                    previews,
                    keyboardTooltipText,
                    pointerTooltipText,
                    interactiveSelection: interactiveSelection?.trim() ?? null,
                    colorModeSynchronized: beforeMode !== afterMode,
                    configThemeSynchronized:
                      configTheme === (afterMode?.includes("dark") ? "dark" : "light"),
                    rtlHasNoOverflow,
                    consoleErrors,
                  };
                } finally {
                  page.off("console", recordConsole);
                  page.off("pageerror", recordPageError);
                }
              },
              async inspectRadarChartCatalog(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const page = testFrame.page();
                const routeFrame = testFrame.frameLocator(
                  'iframe[title="Radar Chart Catalog route"]',
                );
                const consoleErrors: string[] = [];
                const recordConsole = (message: { type: () => string; text: () => string }) => {
                  if (message.type() === "error") consoleErrors.push(message.text());
                };
                const recordPageError = (error: Error) => consoleErrors.push(error.message);
                page.on("console", recordConsole);
                page.on("pageerror", recordPageError);

                try {
                  await routeFrame.locator("body").evaluate(() => window.location.reload());
                  await testFrame.waitForTimeout(500);
                  const main = routeFrame.locator('[data-canonical-route="/charts/radar"]');
                  await main.waitFor({ state: "visible" });
                  const entries = routeFrame.locator("[data-chart-entry]");
                  const previews: Array<{
                    chartRole: string | null;
                    circleGridCount: number;
                    polygonCount: number;
                    polarGridCount: number;
                    radialLineCount: number;
                    slug: string | null;
                  }> = [];

                  for (let index = 0; index < (await entries.count()); index += 1) {
                    const catalogEntry = entries.nth(index);
                    await catalogEntry.scrollIntoViewIfNeeded();
                    const preview = catalogEntry.frameLocator("iframe");
                    const chart = preview.locator('[data-slot="chart"]');
                    await chart.waitFor({ state: "visible", timeout: 8_000 });
                    await chart.locator(".recharts-surface").waitFor({ state: "visible" });
                    previews.push({
                      slug: await catalogEntry.getAttribute("data-chart-entry"),
                      polygonCount: await chart.locator(".recharts-radar-polygon").count(),
                      polarGridCount: await chart.locator(".recharts-polar-grid").count(),
                      circleGridCount: await chart
                        .locator(".recharts-polar-grid-concentric-circle")
                        .count(),
                      radialLineCount: await chart
                        .locator(".recharts-polar-grid-angle line")
                        .count(),
                      chartRole: await preview.getByRole("application").getAttribute("role"),
                    });
                  }

                  const firstEntry = entries.first();
                  await firstEntry.scrollIntoViewIfNeeded();
                  const firstPreview = firstEntry.frameLocator("iframe");
                  const firstChart = firstPreview.locator('[data-slot="chart"]');
                  const application = firstPreview.getByRole("application");
                  await application.focus();
                  await page.keyboard.press("ArrowRight");
                  await testFrame.waitForTimeout(250);
                  const keyboardTooltipText = await firstPreview
                    .locator(".cn-chart-tooltip")
                    .textContent();
                  await firstChart
                    .locator(".recharts-radar-polygon")
                    .hover({ position: { x: 20, y: 20 } });
                  await firstPreview.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
                  const pointerTooltipText = await firstPreview
                    .locator(".cn-chart-tooltip")
                    .textContent();

                  const iconsEntry = routeFrame.locator('[data-chart-entry="chart-radar-icons"]');
                  await iconsEntry.scrollIntoViewIfNeeded();
                  const iconsPreview = iconsEntry.frameLocator("iframe");
                  const legend = iconsPreview.locator(".recharts-legend-wrapper");
                  await legend.waitFor({ state: "visible" });
                  await testFrame.waitForTimeout(1_800);
                  const firstCapture = await iconsPreview.locator("main").screenshot();
                  await testFrame.waitForTimeout(250);
                  const secondCapture = await iconsPreview.locator("main").screenshot();

                  await iconsEntry.getByRole("button", { name: "View Code" }).click();
                  const sourceDialog = routeFrame.getByRole("dialog");
                  await sourceDialog.waitFor({ state: "visible" });
                  const sourceCode = sourceDialog.locator("pre code");
                  await sourceCode
                    .getByText("export function ChartRadarIcons", { exact: false })
                    .waitFor({
                      state: "visible",
                    });
                  const installCommand = await sourceDialog
                    .getByText("bunx shadcn@latest add @zaidan/chart-radar-icons", { exact: true })
                    .textContent();
                  const sourceLoaded = (await sourceCode.textContent())?.includes(
                    "export function ChartRadarIcons",
                  );
                  await page.keyboard.press("Escape");
                  await sourceDialog.waitFor({ state: "hidden" });

                  const customLabelPreview = routeFrame
                    .locator('[data-chart-entry="chart-radar-label-custom"]')
                    .frameLocator("iframe");
                  const customLabels = await customLabelPreview
                    .locator(".recharts-polar-angle-axis-tick")
                    .allTextContents();
                  const firstPreviewHeight = await firstEntry
                    .locator("[data-chart-preview]")
                    .evaluate((element) => element.getBoundingClientRect().height);

                  return {
                    canonicalPath: await main.getAttribute("data-canonical-route"),
                    activeFamily: await routeFrame
                      .getByRole("navigation", { name: "Chart families" })
                      .locator('[aria-current="page"]')
                      .textContent(),
                    entryCount: await entries.count(),
                    previewHeight: firstPreviewHeight,
                    previewLoading: await firstEntry.locator("iframe").getAttribute("loading"),
                    previews,
                    keyboardTooltipText,
                    pointerTooltipText,
                    iconLegendLabels: await legend.locator(":scope > div > div").allTextContents(),
                    iconLegendSvgCount: await legend.locator("svg").count(),
                    sharedActionCount: await entries
                      .filter({ has: routeFrame.getByRole("button", { name: "Copy Code" }) })
                      .count(),
                    installCommand,
                    sourceLoaded,
                    customLabels: customLabels.join(" "),
                    representativeScreenshotBytes: firstCapture.length,
                    representativeDeterministic: firstCapture.equals(secondCapture),
                    consoleErrors,
                  };
                } finally {
                  page.off("console", recordConsole);
                  page.off("pageerror", recordPageError);
                }
              },
              async inspectDeferredAreaPreviews(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
                const entries = routeFrame.locator("[data-chart-entry]");
                await entries.first().waitFor({ state: "visible" });

                // The catalog's failure threshold is five seconds. Native-lazy
                // frames below the fold must not enter a failed state before the
                // browser has brought them near the viewport.
                await testFrame.waitForTimeout(6_500);

                let deferredAlertCount = 0;
                for (let index = 6; index < (await entries.count()); index += 1) {
                  deferredAlertCount += await entries.nth(index).getByRole("alert").count();
                }

                return {
                  alertCount: await routeFrame.getByRole("alert").count(),
                  deferredAlertCount,
                };
              },
              async exerciseAreaSourceFailure(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const page = testFrame.page();
                const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
                const firstEntry = routeFrame.locator('[data-chart-entry="chart-area-axes"]');
                const sourceChunk = /\/assets\/chart-area-axes-[^/]+\.tsx(?:\?.*)?$/;
                const pageErrors: string[] = [];
                const recordPageError = (error: Error) => pageErrors.push(error.message);
                page.on("pageerror", recordPageError);

                try {
                  await firstEntry.waitFor({ state: "visible" });
                  await firstEntry.scrollIntoViewIfNeeded();
                  await firstEntry
                    .frameLocator("iframe")
                    .locator('[data-slot="chart"]')
                    .waitFor({ state: "visible" });
                  await page.route(
                    sourceChunk,
                    (route) =>
                      route.fulfill({ status: 503, body: "Source temporarily unavailable" }),
                    { times: 1 },
                  );

                  await firstEntry.getByRole("button", { name: "View Code" }).click();
                  const alert = routeFrame.getByRole("alert").filter({
                    hasText: "Source failed to load",
                  });
                  await alert.waitFor({ state: "visible", timeout: 7_000 });
                  const retry = alert.getByRole("button", { name: "Retry source" });
                  const evidence = {
                    alertText: (await alert.textContent()) ?? "",
                    retryVisible: await retry.isVisible(),
                  };

                  await page.unroute(sourceChunk);
                  await retry.press("Enter");
                  const source = routeFrame.locator("pre code");
                  await source.waitFor({ state: "visible", timeout: 7_000 });
                  await source
                    .getByText("export function ChartAreaAxes", { exact: false })
                    .waitFor({
                      state: "visible",
                    });

                  return { ...evidence, recovered: true, pageErrors };
                } finally {
                  page.off("pageerror", recordPageError);
                  await page.unroute(sourceChunk);
                }
              },
              async exerciseAreaChartFailure(context) {
                return exerciseChartPreviewFailure(context, {
                  routeFrameTitle: "Chart Catalog route",
                  entrySlug: "chart-area-axes",
                  recoveredFrameTitle: "Area Chart — Axes Preview",
                });
              },
              async exerciseRadarChartFailure(context) {
                return exerciseChartPreviewFailure(context, {
                  routeFrameTitle: "Radar Chart Catalog route",
                  entrySlug: "chart-radar-default",
                  recoveredFrameTitle: "Radar Chart Preview",
                });
              },
              async inspectRadarRepresentative(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const route = testFrame.locator('iframe[title="Radar representative Preview"]');
                const routeFrame = route.contentFrame();
                await route.evaluate((element) => {
                  element.style.border = "0";
                });
                const main = routeFrame.locator('[data-preview-slug="chart-radar-icons"]');
                await main.waitFor({ state: "visible" });
                await routeFrame.locator(".recharts-surface").waitFor({ state: "visible" });
                await routeFrame.locator("html").evaluate((element) => {
                  element.classList.remove("dark");
                  element.classList.add("light");
                  element.dataset.kbTheme = "light";
                });
                await testFrame.waitForTimeout(1_800);
                const lightCapture = await route.screenshot();
                const lightViewport = await route.evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  return { width: bounds.width, height: bounds.height };
                });

                await route.evaluate((element) => {
                  element.style.width = "1440px";
                  element.style.height = "900px";
                });
                await routeFrame.locator("html").evaluate((element) => {
                  element.classList.remove("light");
                  element.classList.add("dark");
                  element.dataset.kbTheme = "dark";
                });
                await testFrame.waitForTimeout(250);
                const darkCapture = await route.screenshot();
                await testFrame.waitForTimeout(250);
                const repeatedDarkCapture = await route.screenshot();
                const darkViewport = await route.evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  return { width: bounds.width, height: bounds.height };
                });

                return {
                  slug: await main.getAttribute("data-preview-slug"),
                  legendLabels: await routeFrame
                    .locator(".recharts-legend-wrapper > div > div")
                    .allTextContents(),
                  lightViewport,
                  darkViewport,
                  lightBytes: lightCapture.length,
                  darkBytes: darkCapture.length,
                  darkStable: darkCapture.equals(repeatedDarkCapture),
                };
              },
              async inspectTooltipChartCatalog(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const page = testFrame.page();
                const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
                const consoleErrors: string[] = [];
                const recordConsole = (message: { type: () => string; text: () => string }) => {
                  if (message.type() === "error") consoleErrors.push(message.text());
                };
                const recordPageError = (error: Error) => consoleErrors.push(error.message);
                page.on("console", recordConsole);
                page.on("pageerror", recordPageError);

                try {
                  await routeFrame.locator("body").evaluate(() => window.location.reload());
                  await testFrame.waitForTimeout(500);

                  const entries = routeFrame.locator("[data-chart-entry]");
                  await entries.first().waitFor({ state: "visible" });
                  const slugs: Array<string | null> = [];
                  const labels: string[] = [];
                  const actionCounts: number[] = [];
                  const renderedBarCounts: number[] = [];
                  const applicationRoles: Array<string | null> = [];
                  let defaultTooltipText: string | null = null;
                  let keyboardTooltipText: string | null = null;
                  let pointerTooltipText: string | null = null;
                  let customLabelText: string | null = null;
                  let labelFormatterText: string | null = null;
                  let formatterText: string | null = null;
                  let iconCount = 0;
                  let advancedText: string | null = null;
                  let advancedCaptureBytes = 0;

                  for (let index = 0; index < (await entries.count()); index += 1) {
                    const entry = entries.nth(index);
                    await entry.scrollIntoViewIfNeeded();
                    const preview = entry.frameLocator("iframe");
                    const chart = preview.locator('[data-slot="chart"]');
                    await chart.waitFor({ state: "visible", timeout: 8_000 });
                    await chart.locator(".recharts-surface").waitFor({ state: "visible" });
                    const slug = await entry.getAttribute("data-chart-entry");
                    slugs.push(slug);
                    labels.push(
                      (await entry.getByRole("heading", { level: 3 }).textContent())?.trim() ?? "",
                    );
                    actionCounts.push(
                      await entry.locator("[data-chart-actions]").locator("button, a").count(),
                    );
                    renderedBarCounts.push(await chart.locator(".recharts-bar-rectangle").count());
                    applicationRoles.push(
                      await preview.getByRole("application").getAttribute("role"),
                    );
                    const tooltip = preview.locator(".cn-chart-tooltip");
                    await tooltip.waitFor({ state: "visible", timeout: 8_000 });
                    if (slug === "chart-tooltip-default") {
                      defaultTooltipText = await tooltip.textContent();
                      const application = preview.getByRole("application");
                      await application.focus();
                      await page.keyboard.press("ArrowRight");
                      await testFrame.waitForTimeout(150);
                      keyboardTooltipText = await tooltip.textContent();
                      await chart
                        .locator(".recharts-surface")
                        .hover({ position: { x: 220, y: 150 } });
                      await tooltip.waitFor({ state: "visible" });
                      pointerTooltipText = await tooltip.textContent();
                    } else if (slug === "chart-tooltip-label-custom") {
                      customLabelText = await tooltip.textContent();
                    } else if (slug === "chart-tooltip-label-formatter") {
                      labelFormatterText = await tooltip.textContent();
                    } else if (slug === "chart-tooltip-formatter") {
                      formatterText = await tooltip.textContent();
                    } else if (slug === "chart-tooltip-icons") {
                      iconCount = await tooltip.locator("svg").count();
                    } else if (slug === "chart-tooltip-advanced") {
                      advancedText = await tooltip.textContent();
                      advancedCaptureBytes = (await preview.locator("body").screenshot()).length;
                    }
                  }

                  const firstEntry = entries.first();
                  const activeFamily = await routeFrame
                    .getByRole("navigation", { name: "Chart families" })
                    .locator('[aria-current="page"]')
                    .textContent();
                  const viewCode = firstEntry.getByRole("button", { name: "View Code" });
                  await viewCode.focus();
                  await page.keyboard.press("Enter");
                  const installCommand = routeFrame.getByText(
                    "bunx shadcn@latest add @zaidan/chart-tooltip-default",
                    { exact: true },
                  );
                  await installCommand.waitFor({ state: "visible" });
                  const source = routeFrame.locator("pre code");
                  await source
                    .getByText("export function ChartTooltipDefault", { exact: false })
                    .waitFor({ state: "visible", timeout: 7_000 });

                  const advancedFrameElement = await routeFrame
                    .locator('[data-chart-entry="chart-tooltip-advanced"] iframe')
                    .elementHandle();
                  const advancedFrame = await advancedFrameElement?.contentFrame();
                  if (!advancedFrame) throw new TypeError("Advanced Tooltip frame is unavailable");
                  await advancedFrame.addScriptTag({ content: axeCore.source });
                  const accessibilityViolations = await advancedFrame.evaluate(async () => {
                    const axe = (
                      window as typeof window & {
                        axe: {
                          run: (
                            root: Document,
                            options: { runOnly: { type: "tag"; values: string[] } },
                          ) => Promise<{
                            violations: {
                              id: string;
                              impact: string | null;
                              nodes: { target: string[] }[];
                            }[];
                          }>;
                        };
                      }
                    ).axe;
                    const results = await axe.run(document, {
                      runOnly: {
                        type: "tag",
                        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
                      },
                    });
                    return results.violations.map((violation) => ({
                      id: violation.id,
                      impact: violation.impact,
                      targets: violation.nodes.map(({ target }) => target),
                    }));
                  });

                  return {
                    canonicalRoute: await routeFrame
                      .locator("main")
                      .getAttribute("data-canonical-route"),
                    activeFamily,
                    labels,
                    slugs,
                    actionCounts,
                    previewHeight: await firstEntry
                      .locator("[data-chart-preview]")
                      .evaluate((element) => element.getBoundingClientRect().height),
                    lazyPreviewCount: await entries.locator('iframe[loading="lazy"]').count(),
                    renderedBarCounts,
                    applicationRoles,
                    defaultTooltipText,
                    keyboardTooltipText,
                    pointerTooltipText,
                    customLabelText,
                    labelFormatterText,
                    formatterText,
                    iconCount,
                    advancedText,
                    advancedCaptureBytes,
                    accessibilityViolations,
                    installCommand: await installCommand.textContent(),
                    sourceContainsExport: ((await source.textContent()) ?? "").includes(
                      "export function ChartTooltipDefault",
                    ),
                    consoleErrors,
                  };
                } finally {
                  page.off("console", recordConsole);
                  page.off("pageerror", recordPageError);
                }
              },
              async exerciseTooltipPreviewRecovery(context) {
                const providerContext = context.provider.getCommandsContext(context.sessionId) as {
                  frame: () => Promise<Frame>;
                };
                const testFrame = await providerContext.frame();
                const page = testFrame.page();
                const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
                const blockedPreview = "**/preview/charts/chart-tooltip-default";
                const pageErrors: string[] = [];
                const recordPageError = (error: Error) => pageErrors.push(error.message);
                page.on("pageerror", recordPageError);

                try {
                  const firstEntry = routeFrame.locator(
                    '[data-chart-entry="chart-tooltip-default"]',
                  );
                  await firstEntry.waitFor({ state: "visible" });
                  await firstEntry.scrollIntoViewIfNeeded();
                  await firstEntry
                    .frameLocator("iframe")
                    .locator('[data-slot="chart"]')
                    .waitFor({ state: "visible" });
                  await firstEntry.locator("iframe").dispatchEvent("error");

                  const alert = firstEntry.getByRole("alert");
                  await alert.waitFor({ state: "visible", timeout: 8_000 });
                  const retry = alert.getByRole("button", { name: /Retry/ });
                  const openPreview = alert.getByRole("link", { name: /Open Preview/ });
                  const evidence = {
                    alertText: (await alert.textContent()) ?? "",
                    retryVisible: await retry.isVisible(),
                    openPreviewVisible: await openPreview.isVisible(),
                  };

                  await page.route(
                    blockedPreview,
                    async (route) => {
                      await testFrame.waitForTimeout(500);
                      await route.abort();
                    },
                    { times: 1 },
                  );
                  await retry.click();
                  const loading = firstEntry.getByRole("status");
                  await loading.waitFor({ state: "visible" });
                  const loadingText = (await loading.textContent()) ?? "";
                  await alert.waitFor({ state: "visible", timeout: 8_000 });

                  await page.unroute(blockedPreview);
                  await retry.click();
                  await firstEntry
                    .frameLocator('iframe[title="Tooltip — Default Preview"]')
                    .locator('[data-slot="chart"]')
                    .waitFor({ state: "visible", timeout: 8_000 });
                  return { ...evidence, loadingText, recovered: true, pageErrors };
                } finally {
                  page.off("pageerror", recordPageError);
                  await page.unroute(blockedPreview);
                }
              },
              async inspectDesktopProductHeader(context) {
                const { header } = await getProductRouteTestFrame(context);

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
                const { testFrame, routeFrame, header } = await getProductRouteTestFrame(context);
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
