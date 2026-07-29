import type { Frame } from "playwright";

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
      const rtlHasNoOverflow = await previewFrame.locator("html").evaluate((element) => {
        (element as HTMLHtmlElement).dir = "rtl";
        const hasNoOverflow = element.scrollWidth <= element.clientWidth;
        (element as HTMLHtmlElement).dir = "";
        return hasNoOverflow;
      });
      const application = previewFrame.getByRole("application");
      await application.focus();
      await page.keyboard.press("ArrowRight");
      await testFrame.waitForTimeout(250);
      const keyboardTooltipText = await previewFrame.locator(".cn-chart-tooltip").textContent();

      await chart.locator(".recharts-surface").hover({ position: { x: 220, y: 150 } });
      await previewFrame.locator(".cn-chart-tooltip").waitFor({ state: "visible" });
      const pointerTooltipText = await previewFrame.locator(".cn-chart-tooltip").textContent();

      const interactiveEntry = routeFrame.locator('[data-chart-entry="chart-area-interactive"]');
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
      const configTheme = await previewFrame.locator("html").getAttribute("data-kb-theme");

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
        configThemeSynchronized: configTheme === (afterMode?.includes("dark") ? "dark" : "light"),
        rtlHasNoOverflow,
        consoleErrors,
      };
    } finally {
      page.off("console", recordConsole);
      page.off("pageerror", recordPageError);
    }
  },
  async inspectBarChartCatalog(context: unknown) {
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
      await routeFrame.getByRole("heading", { name: "Bar Charts" }).waitFor({ state: "visible" });
      const entries = routeFrame.locator("[data-chart-entry]");
      const firstEntry = entries.first();
      const entryCount = await entries.count();
      let previewsAreAccessible = true;
      let previewsRenderBars = true;

      for (let index = 0; index < entryCount; index += 1) {
        const catalogEntry = entries.nth(index);
        await catalogEntry.scrollIntoViewIfNeeded();
        const preview = catalogEntry.frameLocator("iframe");
        const chart = preview.locator('[data-slot="chart"]');
        await chart.waitFor({ state: "visible", timeout: 8_000 });
        await chart.locator(".recharts-surface").waitFor({ state: "visible" });
        previewsAreAccessible &&= (await preview.getByRole("application").count()) === 1;
        previewsRenderBars &&= (await chart.locator(".recharts-bar-rectangle").count()) > 0;
      }

      await firstEntry.scrollIntoViewIfNeeded();
      const firstPreview = firstEntry.frameLocator("iframe");
      await firstPreview.getByRole("application").focus();
      await page.keyboard.press("ArrowRight");
      await testFrame.waitForTimeout(250);
      const keyboardTooltipText = await firstPreview.locator(".cn-chart-tooltip").textContent();

      const interactiveEntry = routeFrame.locator('[data-chart-entry="chart-bar-interactive"]');
      await interactiveEntry.scrollIntoViewIfNeeded();
      const interactiveFrame = interactiveEntry.frameLocator("iframe");
      const mobileButton = interactiveFrame.getByRole("button", { name: /Mobile/ });
      await mobileButton.focus();
      await page.keyboard.press("Enter");
      await testFrame.waitForTimeout(250);
      const interactiveSelection = await mobileButton.locator("span").first().textContent();

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

      const firstWidth = await firstEntry.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      const interactiveWidth = await interactiveEntry.evaluate(
        (element) => element.getBoundingClientRect().width,
      );

      return {
        activeFamily: await routeFrame
          .getByRole("navigation", { name: "Chart families" })
          .locator('[aria-current="page"]')
          .textContent(),
        areaEntryCount: await routeFrame.locator('[data-chart-entry^="chart-area-"]').count(),
        areaHeadingCount: await routeFrame.getByRole("heading", { name: "Area Charts" }).count(),
        entryCount,
        entrySlugs: await entries.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-chart-entry") ?? ""),
        ),
        previewHeight: await firstEntry
          .locator("[data-chart-preview]")
          .evaluate((element) => element.getBoundingClientRect().height),
        previewLoading: await firstEntry.locator("iframe").getAttribute("loading"),
        interactiveIsFullWidth: interactiveWidth > firstWidth * 2,
        previewsAreAccessible,
        previewsRenderBars,
        keyboardTooltipText,
        pointerTooltipText,
        interactiveSelection: interactiveSelection?.trim() ?? null,
        negativeSharesZeroBaseline:
          Number.isFinite(positiveBaseline) &&
          Number.isFinite(negativeBaseline) &&
          Math.abs(positiveBaseline - negativeBaseline) < 1,
        negativeUsesBothChartColors: new Set(barGeometry.map(({ fill }) => fill)).size === 2,
        representativeCaptureSize: representativeCapture.length,
        consoleErrors,
      };
    } finally {
      page.off("console", recordConsole);
      page.off("pageerror", recordPageError);
    }
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
    let firstEntry = routeFrame.locator('[data-chart-entry="chart-bar-active"]');
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

    const blockedPreview = "**/preview/charts/chart-bar-active";
    await page.route(blockedPreview, (route) => route.abort());
    try {
      await routeFrame.locator("body").evaluate(() => window.location.reload());
      await testFrame.waitForTimeout(750);
      firstEntry = routeFrame.locator('[data-chart-entry="chart-bar-active"]');
      await firstEntry.waitFor({ state: "visible" });
      await firstEntry.scrollIntoViewIfNeeded();
      const alert = firstEntry.getByRole("alert");
      await alert.waitFor({ state: "visible", timeout: 8_000 });
      const retry = alert.getByRole("button", { name: /Retry/ });
      const openPreview = alert.getByRole("link", { name: /Open Preview/ });
      const evidence = {
        sourceContainsExport,
        installCommand,
        alertText: (await alert.textContent()) ?? "",
        retryVisible: await retry.isVisible(),
        openPreviewVisible: await openPreview.isVisible(),
      };

      await page.unroute(blockedPreview);
      await retry.click();
      await firstEntry
        .frameLocator("iframe")
        .locator('[data-slot="chart"]')
        .waitFor({ state: "visible", timeout: 8_000 });
      return { ...evidence, recovered: true };
    } finally {
      await page.unroute(blockedPreview);
    }
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
    const testFrame = await getChartTestFrame(context);
    const page = testFrame.page();
    const routeFrame = testFrame.frameLocator('iframe[title="Chart Catalog route"]');
    const blockedPreview = "**/preview/charts/chart-area-axes";
    await page.route(blockedPreview, (route) => route.abort());
    try {
      await routeFrame.locator("body").evaluate(() => window.location.reload());
      await testFrame.waitForTimeout(750);

      const firstEntry = routeFrame.locator('[data-chart-entry="chart-area-axes"]');
      await firstEntry.waitFor({ state: "visible" });
      await firstEntry.scrollIntoViewIfNeeded();
      const alert = firstEntry.getByRole("alert");
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
      const recoveredFrame = routeFrame.frameLocator('iframe[title="Area Chart — Axes Preview"]');
      await recoveredFrame.locator('[data-slot="chart"]').waitFor({
        state: "visible",
        timeout: 8_000,
      });
      return { ...evidence, recovered: true };
    } finally {
      await page.unroute(blockedPreview);
    }
  },
};
