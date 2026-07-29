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
  },
  inspectFamily: (inspection: CatalogInspection) => Promise<Evidence>,
) {
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
      previews.push({
        slug: await catalogEntry.getAttribute("data-chart-entry"),
        renderedShapeCount: await chart.locator(options.renderedShapeSelector).count(),
        chartRole: await application.getAttribute("role"),
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
      consoleErrors,
    };
  } finally {
    page.off("console", recordConsole);
    page.off("pageerror", recordPageError);
  }
}

async function exerciseChartPreviewRecovery(context: unknown, slug: string) {
  const testFrame = await getChartTestFrame(context);
  const page = testFrame.page();
  const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
  const blockedPreview = `**/preview/charts/${slug}`;
  await page.route(blockedPreview, (route) => route.abort());
  try {
    await routeFrame.locator("body").evaluate(() => window.location.reload());
    await testFrame.waitForTimeout(750);

    const entry = routeFrame.locator(`[data-chart-entry="${slug}"]`);
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
    await entry
      .frameLocator("iframe")
      .locator('[data-slot="chart"]')
      .waitFor({ state: "visible", timeout: 8_000 });
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
          previews: previews.map(({ slug, renderedShapeCount, chartRole }) => ({
            slug,
            renderedAreaCount: renderedShapeCount,
            chartRole,
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
        const representativeCapture = await negativeEntry.screenshot();

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
      ...(await exerciseChartPreviewRecovery(context, "chart-bar-active")),
    };
  },
  async inspectDeferredAreaPreviews(context: unknown) {
    const testFrame = await getChartTestFrame(context);
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
  async exerciseAreaSourceFailure(context: unknown) {
    const testFrame = await getChartTestFrame(context);
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
        (route) => route.fulfill({ status: 503, body: "Source temporarily unavailable" }),
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
      await source.getByText("export function ChartAreaAxes", { exact: false }).waitFor({
        state: "visible",
      });

      return { ...evidence, recovered: true, pageErrors };
    } finally {
      page.off("pageerror", recordPageError);
      await page.unroute(sourceChunk);
    }
  },
  async exerciseAreaChartFailure(context: unknown) {
    return exerciseChartPreviewRecovery(context, "chart-area-axes");
  },
};
