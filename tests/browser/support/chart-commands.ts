import axeCore from "axe-core";
import type { Frame, FrameLocator, Locator, Page } from "playwright";

type ChartCommandContext = {
  provider: {
    getCommandsContext: (sessionId: string) => {
      frame: () => Promise<Frame>;
    };
  };
  sessionId: string;
};

const getChartTestFrame = (context: unknown) => {
  const commandContext = context as ChartCommandContext;
  return commandContext.provider.getCommandsContext(commandContext.sessionId).frame();
};

type CatalogPreviewEvidence = {
  slug: string | null;
  renderedShapeCount: number;
  chartRole: string | null;
  canonicalPath: string | null;
};

type CatalogInspection = {
  testFrame: Frame;
  page: Page;
  routeFrame: FrameLocator;
  entries: Locator;
  firstEntry: Locator;
  firstPreview: FrameLocator;
  interactiveEntry: Locator;
  previews: CatalogPreviewEvidence[];
};

async function inspectChartCatalog<Evidence>(
  context: unknown,
  options: {
    familyHeading: string;
    interactiveSlug: string;
    renderedShapeSelector: string;
    routeFrameTitle?: string;
  },
  inspectFamily: (inspection: CatalogInspection) => Promise<Evidence>,
) {
  const testFrame = await getChartTestFrame(context);
  const page = testFrame.page();
  const routeFrame = testFrame.frameLocator(
    `iframe[title="${options.routeFrameTitle ?? "Chart Catalog route"}"]`,
  );
  const consoleErrors: string[] = [];
  const recordConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const recordPageError = (error: Error) => consoleErrors.push(error.message);
  page.on("console", recordConsole);
  page.on("pageerror", recordPageError);

  try {
    // Attach listeners before a fresh navigation so evidence includes initial
    // hydration and every lazy child frame.
    await routeFrame.locator("body").evaluate(() => window.location.reload());
    await testFrame.waitForTimeout(500);
    await routeFrame
      .getByRole("heading", { name: options.familyHeading })
      .waitFor({ state: "visible" });

    const entries = routeFrame.locator("[data-chart-entry]");
    const firstEntry = entries.first();
    const entryCount = await entries.count();
    const previews: CatalogPreviewEvidence[] = [];
    for (let index = 0; index < entryCount; index += 1) {
      const catalogEntry = entries.nth(index);
      await catalogEntry.scrollIntoViewIfNeeded();
      const preview = catalogEntry.frameLocator("iframe");
      const chart = preview.locator('[data-slot="chart"]');
      await chart.waitFor({ state: "visible", timeout: 8_000 });
      await chart.locator(".recharts-surface").waitFor({ state: "visible" });
      const application = preview.getByRole("application");
      const canonicalHref = await preview.locator('link[rel="canonical"]').getAttribute("href");
      previews.push({
        slug: await catalogEntry.getAttribute("data-chart-entry"),
        renderedShapeCount: await chart.locator(options.renderedShapeSelector).count(),
        chartRole: await application.getAttribute("role"),
        canonicalPath: canonicalHref ? new URL(canonicalHref).pathname : null,
      });
    }

    await firstEntry.scrollIntoViewIfNeeded();
    const firstPreview = firstEntry.frameLocator("iframe");
    await firstPreview.getByRole("application").focus();
    await page.keyboard.press("ArrowRight");
    await testFrame.waitForTimeout(250);
    const keyboardTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();

    const interactiveEntry = routeFrame.locator(`[data-chart-entry="${options.interactiveSlug}"]`);
    const firstWidth = await firstEntry.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    const interactiveWidth = await interactiveEntry.evaluate(
      (element) => element.getBoundingClientRect().width,
    );

    const familyEvidence = await inspectFamily({
      testFrame,
      page,
      routeFrame,
      entries,
      firstEntry,
      firstPreview,
      interactiveEntry,
      previews,
    });

    return {
      ...familyEvidence,
      entryCount,
      entrySlugs: previews.map(({ slug }) => slug ?? ""),
      previewHeight: await firstEntry
        .locator("[data-chart-preview]")
        .evaluate((element) => element.getBoundingClientRect().height),
      previewLoading: await firstEntry.locator("iframe").getAttribute("loading"),
      interactiveIsFullWidth: interactiveWidth > firstWidth * 2,
      keyboardTooltipText,
      routeCanonicalPath: await routeFrame
        .locator("main[data-product-surface=charts]")
        .getAttribute("data-canonical-route"),
      consoleErrors,
    };
  } finally {
    page.off("console", recordConsole);
    page.off("pageerror", recordPageError);
  }
}

async function inspectDeferredChartPreviews(
  context: unknown,
  options: { routeFrameTitle?: string },
) {
  const testFrame = await getChartTestFrame(context);
  const routeFrame = testFrame.frameLocator(
    `iframe[title="${options.routeFrameTitle ?? "Chart Catalog route"}"]`,
  );
  const entries = routeFrame.locator("[data-chart-entry]");
  await entries.first().waitFor({ state: "visible" });
  await testFrame.waitForTimeout(6_500);

  let deferredAlertCount = 0;
  for (let index = 6; index < (await entries.count()); index += 1) {
    deferredAlertCount += await entries.nth(index).getByRole("alert").count();
  }

  return {
    alertCount: await routeFrame.getByRole("alert").count(),
    deferredAlertCount,
    hasNoOverflow: await routeFrame
      .locator("html")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  };
}

async function exerciseChartSourceFailure(
  context: unknown,
  options: {
    entrySlug: string;
    exportName: string;
    routeFrameTitle?: string;
  },
) {
  const testFrame = await getChartTestFrame(context);
  const page = testFrame.page();
  const routeFrame = testFrame.frameLocator(
    `iframe[title="${options.routeFrameTitle ?? "Chart Catalog route"}"]`,
  );
  const firstEntry = routeFrame.locator(`[data-chart-entry="${options.entrySlug}"]`);
  const sourceChunk = new RegExp(`/assets/${options.entrySlug}-[^/]+\\.tsx(?:\\?.*)?$`);
  const pageErrors: string[] = [];
  const recordPageError = (error: Error) => pageErrors.push(error.message);
  page.on("pageerror", recordPageError);

  try {
    await firstEntry.waitFor({ state: "visible" });
    await firstEntry.scrollIntoViewIfNeeded();
    await firstEntry.frameLocator("iframe").locator('[data-slot="chart"]').waitFor({
      state: "visible",
    });
    await page.route(
      sourceChunk,
      (route) => route.fulfill({ status: 503, body: "Source temporarily unavailable" }),
      { times: 1 },
    );

    await firstEntry.getByRole("button", { name: "View Code" }).click();
    const alert = routeFrame.getByRole("alert").filter({ hasText: "Source failed to load" });
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
    await source.getByText(`export function ${options.exportName}`, { exact: false }).waitFor({
      state: "visible",
    });
    return { ...evidence, recovered: true, pageErrors };
  } finally {
    page.off("pageerror", recordPageError);
    await page.unroute(sourceChunk);
  }
}

async function exerciseChartPreviewRecovery(
  context: unknown,
  options: {
    entrySlug: string;
    recoveredFrameTitle?: string;
    routeFrameTitle?: string;
  },
) {
  const testFrame = await getChartTestFrame(context);
  const page = testFrame.page();
  const routeFrame = testFrame.frameLocator(
    `iframe[title="${options.routeFrameTitle ?? "Chart Catalog route"}"]`,
  );
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
    const recoveredFrame = options.recoveredFrameTitle
      ? routeFrame.frameLocator(`iframe[title="${options.recoveredFrameTitle}"]`)
      : entry.frameLocator("iframe");
    await recoveredFrame.locator('[data-slot="chart"]').waitFor({
      state: "visible",
      timeout: 8_000,
    });
    return { ...evidence, recovered: true };
  } finally {
    await page.unroute(blockedPreview);
  }
}

export const chartBrowserCommands = {
  async inspectBuiltChart(context: unknown) {
    const testFrame = await getChartTestFrame(context);
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
  async inspectAreaChartCatalog(context: unknown) {
    return inspectChartCatalog(
      context,
      {
        familyHeading: "Area Charts",
        interactiveSlug: "chart-area-interactive",
        renderedShapeSelector: ".recharts-area-area",
      },
      async ({ testFrame, routeFrame, firstPreview, interactiveEntry, previews }) => {
        const chart = firstPreview.locator('[data-slot="chart"]');
        const rtlHasNoOverflow = await firstPreview.locator("html").evaluate((element) => {
          (element as HTMLHtmlElement).dir = "rtl";
          const hasNoOverflow = element.scrollWidth <= element.clientWidth;
          (element as HTMLHtmlElement).dir = "";
          return hasNoOverflow;
        });

        await chart.locator(".recharts-surface").hover({ position: { x: 220, y: 150 } });
        await firstPreview.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
        const pointerTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();

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

        const beforeMode = await firstPreview.locator("html").getAttribute("class");
        await routeFrame.getByRole("button", { name: "Toggle color mode" }).click();
        await testFrame.waitForTimeout(250);
        const afterMode = await firstPreview.locator("html").getAttribute("class");
        const configTheme = await firstPreview.locator("html").getAttribute("data-kb-theme");

        return {
          heading: await routeFrame
            .getByRole("heading", { name: "Beautiful Charts & Graphs" })
            .textContent(),
          families: await routeFrame
            .getByRole("navigation", { name: "Chart families" })
            .getByRole("link")
            .allTextContents(),
          previews: previews.map(({ slug, renderedShapeCount, chartRole, canonicalPath }) => ({
            slug,
            renderedSeriesCount: renderedShapeCount,
            chartRole,
            canonicalPath,
          })),
          pointerTooltipText,
          interactiveSelection: interactiveSelection?.trim() ?? null,
          colorModeSynchronized: beforeMode !== afterMode,
          configThemeSynchronized: configTheme === (afterMode?.includes("dark") ? "dark" : "light"),
          rtlHasNoOverflow,
        };
      },
    );
  },
  async inspectBarChartCatalog(context: unknown) {
    return inspectChartCatalog(
      context,
      {
        familyHeading: "Bar Charts",
        interactiveSlug: "chart-bar-interactive",
        renderedShapeSelector: ".recharts-bar-rectangle",
      },
      async ({ testFrame, page, routeFrame, interactiveEntry, previews }) => {
        await interactiveEntry.scrollIntoViewIfNeeded();
        const interactiveFrame = interactiveEntry.frameLocator("iframe");
        const mobileButton = interactiveFrame.getByRole("button", { name: /Mobile/ });
        await mobileButton.focus();
        await page.keyboard.press("Enter");
        await testFrame.waitForTimeout(250);
        const interactiveSelection = await mobileButton.locator("span").first().textContent();
        const interactiveTotal = await mobileButton.locator("span").nth(1).textContent();

        const negativeEntry = routeFrame.locator('[data-chart-entry="chart-bar-negative"]');
        await negativeEntry.scrollIntoViewIfNeeded();
        const negativeFrame = negativeEntry.frameLocator("iframe");
        const negativeBars = negativeFrame.locator(".recharts-bar-rectangle .recharts-rectangle");
        await negativeBars.first().waitFor({ state: "visible" });
        await testFrame.waitForTimeout(500);
        const barGeometry = await negativeBars.evaluateAll((elements) =>
          elements.map((element) => {
            const box = (element as SVGGraphicsElement).getBBox();
            return {
              y: box.y,
              height: box.height,
              fill: getComputedStyle(element).fill,
            };
          }),
        );
        const positiveIndexes = [0, 1, 3, 5];
        const negativeIndexes = [2, 4];
        const positiveBaseline = Math.max(
          ...positiveIndexes.map((index) => {
            const bar = barGeometry[index];
            return bar ? bar.y + bar.height : Number.NEGATIVE_INFINITY;
          }),
        );
        const negativeBaseline = Math.min(
          ...negativeIndexes.map((index) => barGeometry[index]?.y ?? Number.POSITIVE_INFINITY),
        );

        await negativeBars.nth(2).hover();
        await negativeFrame.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
        const pointerTooltipText = await negativeFrame.locator(".cn-chart-tooltip").textContent();
        await negativeFrame.getByText("Bar Chart - Negative", { exact: true }).hover();
        await negativeFrame
          .locator(".cn-chart-tooltip")
          .waitFor({ state: "hidden", timeout: 2_000 });
        await testFrame.waitForTimeout(500);
        const representative = negativeFrame.locator('[data-visual-representative="bar"]');
        const representativeCapture = await representative.screenshot();
        await testFrame.waitForTimeout(250);
        const repeatedRepresentativeCapture = await representative.screenshot();

        return {
          activeFamily: await routeFrame
            .getByRole("navigation", { name: "Chart families" })
            .locator('[aria-current="page"]')
            .textContent(),
          areaEntryCount: await routeFrame.locator('[data-chart-entry^="chart-area-"]').count(),
          areaHeadingCount: await routeFrame.getByRole("heading", { name: "Area Charts" }).count(),
          previewsAreAccessible: previews.every(({ chartRole }) => chartRole === "application"),
          previewsRenderBars: previews.every(({ renderedShapeCount }) => renderedShapeCount > 0),
          pointerTooltipText,
          interactiveSelection: interactiveSelection?.trim() ?? null,
          interactiveTotal: interactiveTotal?.trim() ?? null,
          negativeSharesZeroBaseline:
            Number.isFinite(positiveBaseline) &&
            Number.isFinite(negativeBaseline) &&
            Math.abs(positiveBaseline - negativeBaseline) < 1,
          negativeUsesBothChartColors: new Set(barGeometry.map(({ fill }) => fill)).size === 2,
          representativeCaptureSize: representativeCapture.length,
          representativeDeterministic: representativeCapture.equals(repeatedRepresentativeCapture),
        };
      },
    );
  },
  async inspectBarResponsiveGeometry(context: unknown) {
    const testFrame = await getChartTestFrame(context);
    const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
    const firstEntry = routeFrame.locator("[data-chart-entry]").first();
    await firstEntry.waitFor({ state: "visible" });
    await firstEntry.scrollIntoViewIfNeeded();
    const iframe = firstEntry.locator("iframe");
    await iframe.waitFor({ state: "visible" });

    const viewportWidth = await routeFrame.locator("body").evaluate(() => window.innerWidth);
    const cardWidth = await firstEntry.evaluate((element) => element.getBoundingClientRect().width);
    const iframeWidth = await iframe.evaluate((element) => element.getBoundingClientRect().width);
    return {
      documentOverflow: await routeFrame
        .locator("html")
        .evaluate((element) => Math.max(0, element.scrollWidth - element.clientWidth)),
      cardFitsViewport: cardWidth <= viewportWidth,
      iframeFitsCard: iframeWidth <= cardWidth && cardWidth - iframeWidth <= 2,
    };
  },
  async exerciseBarCatalogRecovery(context: unknown) {
    const testFrame = await getChartTestFrame(context);
    const page = testFrame.page();
    const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
    const firstEntry = routeFrame.locator('[data-chart-entry="chart-bar-active"]');
    await firstEntry.waitFor({ state: "visible" });
    await firstEntry.scrollIntoViewIfNeeded();
    await firstEntry.getByRole("button", { name: "View Code" }).click();
    const source = routeFrame.locator("pre code");
    await source.getByText("export function ChartBarActive", { exact: false }).waitFor({
      state: "visible",
    });
    const sourceContainsExport =
      (await source.textContent())?.includes("export function ChartBarActive") ?? false;
    const command = "bunx shadcn@latest add @zaidan/chart-bar-active";
    const installCommand = await routeFrame.getByText(command, { exact: true }).textContent();
    await page.keyboard.press("Escape");

    return {
      sourceContainsExport,
      installCommand,
      ...(await exerciseChartPreviewRecovery(context, { entrySlug: "chart-bar-active" })),
    };
  },
  async inspectDeferredAreaPreviews(context: unknown) {
    return inspectDeferredChartPreviews(context, {});
  },
  async exerciseAreaSourceFailure(context: unknown) {
    return exerciseChartSourceFailure(context, {
      entrySlug: "chart-area-axes",
      exportName: "ChartAreaAxes",
    });
  },
  async exerciseAreaChartFailure(context: unknown) {
    return exerciseChartPreviewRecovery(context, { entrySlug: "chart-area-axes" });
  },
  async inspectLineChartCatalog(context: unknown) {
    return inspectChartCatalog(
      context,
      {
        familyHeading: "Line Charts",
        interactiveSlug: "chart-line-interactive",
        renderedShapeSelector: ".recharts-line-curve",
        routeFrameTitle: "Line Chart Catalog route",
      },
      async ({ testFrame, routeFrame, firstPreview, interactiveEntry, previews }) => {
        const chart = firstPreview.locator('[data-slot="chart"]');
        const rtlHasNoOverflow = await firstPreview.locator("html").evaluate((element) => {
          (element as HTMLHtmlElement).dir = "rtl";
          const hasNoOverflow = element.scrollWidth <= element.clientWidth;
          (element as HTMLHtmlElement).dir = "";
          return hasNoOverflow;
        });

        await chart.locator(".recharts-surface").hover({ position: { x: 220, y: 150 } });
        await firstPreview.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
        const pointerTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();

        await interactiveEntry.scrollIntoViewIfNeeded();
        const interactiveFrame = interactiveEntry.frameLocator("iframe");
        const mobileSeries = interactiveFrame.getByRole("button", { name: /Mobile/ });
        await mobileSeries.press("Enter");
        await testFrame.waitForTimeout(100);
        const interactiveSelection = await interactiveFrame
          .getByRole("button", { pressed: true })
          .textContent();

        const representativeFrame = routeFrame
          .locator('[data-chart-entry="chart-line-dots-custom"]')
          .frameLocator("iframe");
        const customDotCount = await representativeFrame.locator("[data-custom-line-dot]").count();
        const labelFrame = routeFrame
          .locator('[data-chart-entry="chart-line-label"]')
          .frameLocator("iframe");
        const labelCount = await labelFrame.locator("[data-line-label]").count();
        const customLabelFrame = routeFrame
          .locator('[data-chart-entry="chart-line-label-custom"]')
          .frameLocator("iframe");
        const customLabels = await customLabelFrame.locator("[data-line-label]").allTextContents();

        const beforeMode = await firstPreview.locator("html").getAttribute("class");
        await routeFrame.getByRole("button", { name: "Toggle color mode" }).click();
        await testFrame.waitForTimeout(250);
        const afterMode = await firstPreview.locator("html").getAttribute("class");
        const configTheme = await firstPreview.locator("html").getAttribute("data-kb-theme");

        return {
          heading: await routeFrame
            .getByRole("heading", { name: "Beautiful Charts & Graphs" })
            .textContent(),
          activeFamily: await routeFrame
            .getByRole("navigation", { name: "Chart families" })
            .locator('[aria-current="page"]')
            .textContent(),
          previews: previews.map(({ slug, renderedShapeCount, chartRole, canonicalPath }) => ({
            slug,
            renderedSeriesCount: renderedShapeCount,
            chartRole,
            canonicalPath,
          })),
          pointerTooltipText,
          interactiveSelection: interactiveSelection?.trim() ?? null,
          customDotCount,
          labelCount,
          customLabels,
          colorModeSynchronized: beforeMode !== afterMode,
          configThemeSynchronized: configTheme === (afterMode?.includes("dark") ? "dark" : "light"),
          rtlHasNoOverflow,
        };
      },
    );
  },
  async inspectDeferredLinePreviews(context: unknown) {
    return inspectDeferredChartPreviews(context, { routeFrameTitle: "Line Chart Catalog route" });
  },
  async exerciseLineSourceFailure(context: unknown) {
    return exerciseChartSourceFailure(context, {
      entrySlug: "chart-line-default",
      exportName: "ChartLineDefault",
      routeFrameTitle: "Line Chart Catalog route",
    });
  },
  async exerciseLineChartFailure(context: unknown) {
    return exerciseChartPreviewRecovery(context, {
      entrySlug: "chart-line-default",
      recoveredFrameTitle: "Line Chart Preview",
      routeFrameTitle: "Line Chart Catalog route",
    });
  },
  async inspectRadarChartCatalog(context: unknown) {
    const testFrame = await getChartTestFrame(context);
    const page = testFrame.page();
    const routeFrame = testFrame.frameLocator('iframe[title="Radar Chart Catalog route"]');
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
          circleGridCount: await chart.locator(".recharts-polar-grid-concentric-circle").count(),
          radialLineCount: await chart.locator(".recharts-polar-grid-angle line").count(),
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
      const keyboardTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();
      await firstChart.locator(".recharts-radar-polygon").hover({ position: { x: 20, y: 20 } });
      await firstPreview.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
      const pointerTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();

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
      await sourceCode.getByText("export function ChartRadarIcons", { exact: false }).waitFor({
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
  async exerciseRadarChartFailure(context: unknown) {
    return exerciseChartPreviewRecovery(context, {
      routeFrameTitle: "Radar Chart Catalog route",
      entrySlug: "chart-radar-default",
      recoveredFrameTitle: "Radar Chart Preview",
    });
  },
  async inspectRadarRepresentative(context: unknown) {
    const testFrame = await getChartTestFrame(context);
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
  async inspectTooltipChartCatalog(context: unknown) {
    const testFrame = await getChartTestFrame(context);
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
        labels.push((await entry.getByRole("heading", { level: 3 }).textContent())?.trim() ?? "");
        actionCounts.push(await entry.locator("[data-chart-actions]").locator("button, a").count());
        renderedBarCounts.push(await chart.locator(".recharts-bar-rectangle").count());
        applicationRoles.push(await preview.getByRole("application").getAttribute("role"));
        const tooltip = preview.locator(".cn-chart-tooltip");
        await tooltip.waitFor({ state: "visible", timeout: 8_000 });
        if (slug === "chart-tooltip-default") {
          defaultTooltipText = await tooltip.textContent();
          const application = preview.getByRole("application");
          await application.focus();
          await page.keyboard.press("ArrowRight");
          await testFrame.waitForTimeout(150);
          keyboardTooltipText = await tooltip.textContent();
          await chart.locator(".recharts-surface").hover({ position: { x: 220, y: 150 } });
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
        canonicalRoute: await routeFrame.locator("main").getAttribute("data-canonical-route"),
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
  async exerciseTooltipPreviewRecovery(context: unknown) {
    const testFrame = await getChartTestFrame(context);
    const page = testFrame.page();
    const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
    const blockedPreview = "**/preview/charts/chart-tooltip-default";
    const pageErrors: string[] = [];
    const recordPageError = (error: Error) => pageErrors.push(error.message);
    page.on("pageerror", recordPageError);

    try {
      const firstEntry = routeFrame.locator('[data-chart-entry="chart-tooltip-default"]');
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
};
