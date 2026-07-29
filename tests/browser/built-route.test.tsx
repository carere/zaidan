import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

async function renderBuiltRoute(pathname = "/", viewport = { width: "1280px", height: "900px" }) {
  const builtAppUrl = new URL(pathname, inject("builtAppUrl")).href;
  const title =
    pathname === "/preview/ui/kobalte/chart"
      ? "Built chart route"
      : pathname === "/charts/line"
        ? "Line Chart Catalog route"
        : pathname === "/charts" || pathname === "/charts/bar" || pathname === "/charts/tooltip"
          ? "Chart Catalog route"
          : pathname === "/charts/radar"
            ? "Radar Chart Catalog route"
            : pathname === "/preview/charts/chart-radar-icons"
              ? "Radar representative Preview"
              : "Built Zaidan route";
  let resolveLoaded: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });

  dispose = render(
    () => (
      <iframe src={builtAppUrl} style={viewport} title={title} onLoad={() => resolveLoaded?.()} />
    ),
    document.body,
  );

  const route = page.getByTitle(title);
  await expect.element(route).toBeVisible();
  await loaded;

  return route;
}

describe("built application", () => {
  it("drives and captures the native Home Showcase", async () => {
    const route = await renderBuiltRoute();

    const { inspectBuiltRoute } = commands as unknown as {
      inspectBuiltRoute: () => Promise<{
        heading: string | null;
        iframeCount: number;
        showcaseVisible: boolean;
      }>;
    };
    const evidence = await inspectBuiltRoute();
    const capture = await route.screenshot({ save: false });

    expect(evidence.heading).toBe("The best foundation for your next SolidJS project");
    expect(evidence.iframeCount).toBe(0);
    expect(evidence.showcaseVisible).toBe(true);
    expect(capture.length).toBeGreaterThan(1_000);
  });

  it("executes the quarantined chart consumer in Chromium", async () => {
    const route = await renderBuiltRoute("/preview/ui/kobalte/chart");

    const { inspectBuiltChart } = commands as unknown as {
      inspectBuiltChart: () => Promise<{
        chartSlot: string | null;
        description: string | null;
        renderedAreaCount: number;
      }>;
    };
    const evidence = await inspectBuiltChart();
    const capture = await route.screenshot({ save: false });

    expect(evidence.chartSlot).toMatch(/^chart-/);
    expect(evidence.description).toBe("Showing total visitors for the last 6 months");
    expect(evidence.renderedAreaCount).toBeGreaterThan(0);
    expect(capture.length).toBeGreaterThan(1_000);
  });

  it("renders the Area catalog with isolated accessible Previews", async () => {
    await renderBuiltRoute("/charts");
    const { inspectAreaChartCatalog } = commands as unknown as {
      inspectAreaChartCatalog: () => Promise<{
        heading: string | null;
        routeCanonicalPath: string | null;
        families: string[];
        entryCount: number;
        previewHeight: number;
        previewLoading: string | null;
        interactiveIsFullWidth: boolean;
        previews: Array<{
          slug: string | null;
          renderedSeriesCount: number;
          chartRole: string | null;
          canonicalPath: string | null;
        }>;
        keyboardTooltipText: string | null;
        pointerTooltipText: string | null;
        interactiveSelection: string | null;
        colorModeSynchronized: boolean;
        configThemeSynchronized: boolean;
        rtlHasNoOverflow: boolean;
        consoleErrors: string[];
      }>;
    };
    const evidence = await inspectAreaChartCatalog();

    expect(evidence.heading).toBe("Beautiful Charts & Graphs");
    expect(evidence.routeCanonicalPath).toBe("/charts");
    expect(evidence.families).toEqual([
      "Area",
      "Bar",
      "Line",
      "Pie",
      "Radar",
      "Radial",
      "Tooltips",
    ]);
    expect(evidence.entryCount).toBe(10);
    expect(evidence.previewHeight).toBe(460);
    expect(evidence.previewLoading).toBe("lazy");
    expect(evidence.interactiveIsFullWidth).toBe(true);
    expect(evidence.previews.map((preview) => preview.slug)).toEqual([
      "chart-area-axes",
      "chart-area-default",
      "chart-area-gradient",
      "chart-area-icons",
      "chart-area-interactive",
      "chart-area-legend",
      "chart-area-linear",
      "chart-area-stacked-expand",
      "chart-area-stacked",
      "chart-area-step",
    ]);
    expect(evidence.previews.every((preview) => preview.renderedSeriesCount > 0)).toBe(true);
    expect(evidence.previews.every((preview) => preview.chartRole === "application")).toBe(true);
    expect(evidence.previews.every((preview) => preview.canonicalPath === "/charts")).toBe(true);
    expect(evidence.keyboardTooltipText).toMatch(/January|Desktop|186/);
    expect(evidence.pointerTooltipText).toMatch(/Desktop|Mobile|186|80/);
    expect(evidence.interactiveSelection).toBe("Last 7 days");
    expect(evidence.colorModeSynchronized).toBe(true);
    expect(evidence.configThemeSynchronized).toBe(true);
    expect(evidence.rtlHasNoOverflow).toBe(true);
    expect(evidence.consoleErrors).toEqual([]);
  }, 30_000);

  it("does not time out native-lazy Previews before they approach the viewport", async () => {
    await renderBuiltRoute("/charts", { width: "390px", height: "700px" });
    const { inspectDeferredAreaPreviews } = commands as unknown as {
      inspectDeferredAreaPreviews: () => Promise<{
        alertCount: number;
        deferredAlertCount: number;
      }>;
    };

    const evidence = await inspectDeferredAreaPreviews();
    expect(evidence.alertCount).toBe(0);
    expect(evidence.deferredAlertCount).toBe(0);
  }, 12_000);

  it("handles a source-chunk failure and clears the error after Retry", async () => {
    await renderBuiltRoute("/charts");
    const { exerciseAreaSourceFailure } = commands as unknown as {
      exerciseAreaSourceFailure: () => Promise<{
        alertText: string;
        retryVisible: boolean;
        recovered: boolean;
        pageErrors: string[];
      }>;
    };

    const evidence = await exerciseAreaSourceFailure();
    expect(evidence.alertText).toContain("Source failed to load");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
    expect(evidence.pageErrors).toEqual([]);
  }, 20_000);

  it("retains failure actions and recovers an Area Preview", async () => {
    await renderBuiltRoute("/charts");
    const { exerciseAreaChartFailure } = commands as unknown as {
      exerciseAreaChartFailure: () => Promise<{
        alertText: string;
        retryVisible: boolean;
        openPreviewVisible: boolean;
        recovered: boolean;
      }>;
    };
    const evidence = await exerciseAreaChartFailure();

    expect(evidence.alertText).toContain("Preview could not be loaded");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.openPreviewVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
  });

  it("renders the Line catalog with its source-pinned Solid adaptations", async () => {
    await renderBuiltRoute("/charts/line");
    const { inspectLineChartCatalog } = commands as unknown as {
      inspectLineChartCatalog: () => Promise<{
        heading: string | null;
        routeCanonicalPath: string | null;
        activeFamily: string | null;
        entryCount: number;
        previewHeight: number;
        previewLoading: string | null;
        interactiveIsFullWidth: boolean;
        previews: Array<{
          slug: string | null;
          renderedSeriesCount: number;
          chartRole: string | null;
          canonicalPath: string | null;
        }>;
        keyboardTooltipText: string | null;
        pointerTooltipText: string | null;
        interactiveSelection: string | null;
        customDotCount: number;
        labelCount: number;
        customLabels: string[];
        colorModeSynchronized: boolean;
        configThemeSynchronized: boolean;
        rtlHasNoOverflow: boolean;
        consoleErrors: string[];
      }>;
    };
    const evidence = await inspectLineChartCatalog();

    expect(evidence.heading).toBe("Beautiful Charts & Graphs");
    expect(evidence.routeCanonicalPath).toBe("/charts/line");
    expect(evidence.activeFamily).toBe("Line");
    expect(evidence.entryCount).toBe(10);
    expect(evidence.previewHeight).toBe(460);
    expect(evidence.previewLoading).toBe("lazy");
    expect(evidence.interactiveIsFullWidth).toBe(true);
    expect(evidence.previews.map(({ slug }) => slug)).toEqual([
      "chart-line-default",
      "chart-line-dots-colors",
      "chart-line-dots-custom",
      "chart-line-dots",
      "chart-line-interactive",
      "chart-line-label-custom",
      "chart-line-label",
      "chart-line-linear",
      "chart-line-multiple",
      "chart-line-step",
    ]);
    expect(evidence.previews.every(({ renderedSeriesCount }) => renderedSeriesCount > 0)).toBe(
      true,
    );
    expect(evidence.previews.every(({ chartRole }) => chartRole === "application")).toBe(true);
    expect(evidence.previews.every(({ canonicalPath }) => canonicalPath === "/charts/line")).toBe(
      true,
    );
    expect(evidence.keyboardTooltipText).toMatch(/January|Desktop|186/);
    expect(evidence.pointerTooltipText).toMatch(/Desktop|186/);
    expect(evidence.interactiveSelection).toMatch(/Mobile/);
    expect(evidence.customDotCount).toBe(6);
    expect(evidence.labelCount).toBe(6);
    expect(evidence.customLabels).toEqual(["Chrome", "Safari", "Firefox", "Edge", "Other"]);
    expect(evidence.colorModeSynchronized).toBe(true);
    expect(evidence.configThemeSynchronized).toBe(true);
    expect(evidence.rtlHasNoOverflow).toBe(true);
    expect(evidence.consoleErrors).toEqual([]);
  }, 45_000);

  it("defers offscreen Line Previews without mobile overflow or false failure", async () => {
    await renderBuiltRoute("/charts/line", { width: "390px", height: "700px" });
    const { inspectDeferredLinePreviews } = commands as unknown as {
      inspectDeferredLinePreviews: () => Promise<{
        alertCount: number;
        deferredAlertCount: number;
        hasNoOverflow: boolean;
      }>;
    };

    const evidence = await inspectDeferredLinePreviews();
    expect(evidence.alertCount).toBe(0);
    expect(evidence.deferredAlertCount).toBe(0);
    expect(evidence.hasNoOverflow).toBe(true);
  }, 12_000);

  it("handles a Line source-chunk failure and clears the error after Retry", async () => {
    await renderBuiltRoute("/charts/line");
    const { exerciseLineSourceFailure } = commands as unknown as {
      exerciseLineSourceFailure: () => Promise<{
        alertText: string;
        retryVisible: boolean;
        recovered: boolean;
        pageErrors: string[];
      }>;
    };

    const evidence = await exerciseLineSourceFailure();
    expect(evidence.alertText).toContain("Source failed to load");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
    expect(evidence.pageErrors).toEqual([]);
  }, 20_000);

  it("retains failure actions and recovers a Line Preview", async () => {
    await renderBuiltRoute("/charts/line");
    const { exerciseLineChartFailure } = commands as unknown as {
      exerciseLineChartFailure: () => Promise<{
        alertText: string;
        retryVisible: boolean;
        openPreviewVisible: boolean;
        recovered: boolean;
      }>;
    };
    const evidence = await exerciseLineChartFailure();

    expect(evidence.alertText).toContain("Preview could not be loaded");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.openPreviewVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
  });

  it("renders the Bar catalog with accessible positive and negative geometry", async () => {
    await renderBuiltRoute("/charts/bar");
    const { inspectBarChartCatalog } = commands as unknown as {
      inspectBarChartCatalog: () => Promise<{
        activeFamily: string | null;
        areaEntryCount: number;
        areaHeadingCount: number;
        entryCount: number;
        entrySlugs: string[];
        previewHeight: number;
        previewLoading: string | null;
        interactiveIsFullWidth: boolean;
        previewsAreAccessible: boolean;
        previewsRenderBars: boolean;
        keyboardTooltipText: string | null;
        pointerTooltipText: string | null;
        interactiveSelection: string | null;
        interactiveTotal: string | null;
        negativeSharesZeroBaseline: boolean;
        negativeUsesBothChartColors: boolean;
        representativeCaptureSize: number;
        representativeDeterministic: boolean;
        consoleErrors: string[];
      }>;
    };

    const evidence = await inspectBarChartCatalog();
    expect(evidence.activeFamily).toBe("Bar");
    expect(evidence.areaEntryCount).toBe(0);
    expect(evidence.areaHeadingCount).toBe(0);
    expect(evidence.entryCount).toBe(10);
    expect(evidence.entrySlugs).toEqual([
      "chart-bar-active",
      "chart-bar-default",
      "chart-bar-horizontal",
      "chart-bar-interactive",
      "chart-bar-label-custom",
      "chart-bar-label",
      "chart-bar-mixed",
      "chart-bar-multiple",
      "chart-bar-negative",
      "chart-bar-stacked",
    ]);
    expect(evidence.previewHeight).toBe(460);
    expect(evidence.previewLoading).toBe("lazy");
    expect(evidence.interactiveIsFullWidth).toBe(true);
    expect(evidence.previewsAreAccessible).toBe(true);
    expect(evidence.previewsRenderBars).toBe(true);
    expect(evidence.keyboardTooltipText).toMatch(/Visitors|Chrome|Safari|Firefox|187|200|275/);
    expect(evidence.pointerTooltipText).toMatch(/Visitors|March|-207/);
    expect(evidence.interactiveSelection).toBe("Mobile");
    expect(evidence.interactiveTotal).toBe("25,010");
    expect(evidence.negativeSharesZeroBaseline).toBe(true);
    expect(evidence.negativeUsesBothChartColors).toBe(true);
    expect(evidence.representativeCaptureSize).toBeGreaterThan(1_000);
    expect(evidence.representativeDeterministic).toBe(true);
    expect(evidence.consoleErrors).toEqual([]);
  }, 30_000);

  it("keeps the Bar route responsive without horizontal overflow", async () => {
    await renderBuiltRoute("/charts/bar", { width: "390px", height: "844px" });
    const { inspectBarResponsiveGeometry } = commands as unknown as {
      inspectBarResponsiveGeometry: () => Promise<{
        documentOverflow: number;
        cardFitsViewport: boolean;
        iframeFitsCard: boolean;
      }>;
    };

    expect(await inspectBarResponsiveGeometry()).toEqual({
      documentOverflow: 0,
      cardFitsViewport: true,
      iframeFitsCard: true,
    });
  });

  it("retains source actions and recovers a failed Bar Preview", async () => {
    await renderBuiltRoute("/charts/bar");
    const { exerciseBarCatalogRecovery } = commands as unknown as {
      exerciseBarCatalogRecovery: () => Promise<{
        sourceContainsExport: boolean;
        installCommand: string | null;
        alertText: string;
        retryVisible: boolean;
        openPreviewVisible: boolean;
        recovered: boolean;
      }>;
    };

    const evidence = await exerciseBarCatalogRecovery();
    expect(evidence.sourceContainsExport).toBe(true);
    expect(evidence.installCommand).toBe("bunx shadcn@latest add @zaidan/chart-bar-active");
    expect(evidence.alertText).toContain("Preview could not be loaded");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.openPreviewVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
  }, 20_000);

  it("renders the Radar catalog with polar, legend, accessibility, and interaction parity", async () => {
    await renderBuiltRoute("/charts/radar", { width: "1440px", height: "900px" });
    const { inspectRadarChartCatalog } = commands as unknown as {
      inspectRadarChartCatalog: () => Promise<{
        activeFamily: string | null;
        canonicalPath: string | null;
        consoleErrors: string[];
        customLabels: string;
        entryCount: number;
        iconLegendLabels: string[];
        iconLegendSvgCount: number;
        installCommand: string | null;
        keyboardTooltipText: string | null;
        pointerTooltipText: string | null;
        previewHeight: number;
        previewLoading: string | null;
        previews: Array<{
          chartRole: string | null;
          circleGridCount: number;
          polygonCount: number;
          polarGridCount: number;
          radialLineCount: number;
          slug: string | null;
        }>;
        representativeDeterministic: boolean;
        representativeScreenshotBytes: number;
        sharedActionCount: number;
        sourceLoaded: boolean;
      }>;
    };

    const evidence = await inspectRadarChartCatalog();
    expect(evidence.canonicalPath).toBe("/charts/radar");
    expect(evidence.activeFamily).toBe("Radar");
    expect(evidence.entryCount).toBe(14);
    expect(evidence.previewHeight).toBe(460);
    expect(evidence.previewLoading).toBe("lazy");
    expect(evidence.previews.map(({ slug }) => slug)).toEqual([
      "chart-radar-default",
      "chart-radar-dots",
      "chart-radar-grid-circle-fill",
      "chart-radar-grid-circle-no-lines",
      "chart-radar-grid-circle",
      "chart-radar-grid-custom",
      "chart-radar-grid-fill",
      "chart-radar-grid-none",
      "chart-radar-icons",
      "chart-radar-label-custom",
      "chart-radar-legend",
      "chart-radar-lines-only",
      "chart-radar-multiple",
      "chart-radar-radius",
    ]);
    expect(evidence.previews.every(({ polygonCount }) => polygonCount > 0)).toBe(true);
    expect(evidence.previews.every(({ chartRole }) => chartRole === "application")).toBe(true);
    expect(evidence.previews[2]?.circleGridCount).toBeGreaterThan(0);
    expect(evidence.previews[3]?.radialLineCount).toBe(0);
    expect(evidence.previews[5]?.polarGridCount).toBe(1);
    expect(evidence.previews[7]?.polarGridCount).toBe(0);
    expect(evidence.iconLegendLabels).toEqual(["Desktop", "Mobile"]);
    expect(evidence.iconLegendSvgCount).toBe(2);
    expect(evidence.sharedActionCount).toBe(14);
    expect(evidence.installCommand).toBe("bunx shadcn@latest add @zaidan/chart-radar-icons");
    expect(evidence.sourceLoaded).toBe(true);
    expect(evidence.customLabels).toMatch(/186\/80.*January/s);
    expect(evidence.keyboardTooltipText).toMatch(/January|Desktop|186/);
    expect(evidence.pointerTooltipText).toMatch(/Desktop|186/);
    expect(evidence.representativeScreenshotBytes).toBeGreaterThan(1_000);
    expect(evidence.representativeDeterministic).toBe(true);
    expect(evidence.consoleErrors).toEqual([]);
  }, 40_000);

  it("retains failure actions and recovers a Radar Preview", async () => {
    await renderBuiltRoute("/charts/radar");
    const { exerciseRadarChartFailure } = commands as unknown as {
      exerciseRadarChartFailure: () => Promise<{
        alertText: string;
        openPreviewVisible: boolean;
        recovered: boolean;
        retryVisible: boolean;
      }>;
    };

    const evidence = await exerciseRadarChartFailure();
    expect(evidence.alertText).toContain("Preview could not be loaded");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.openPreviewVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
  });

  it("keeps the approved Radar representative deterministic at matrix viewports", async () => {
    await renderBuiltRoute("/preview/charts/chart-radar-icons", {
      width: "390px",
      height: "844px",
    });
    const { inspectRadarRepresentative } = commands as unknown as {
      inspectRadarRepresentative: () => Promise<{
        darkBytes: number;
        darkStable: boolean;
        darkViewport: { height: number; width: number };
        legendLabels: string[];
        lightBytes: number;
        lightViewport: { height: number; width: number };
        slug: string | null;
      }>;
    };

    const evidence = await inspectRadarRepresentative();
    expect(evidence.slug).toBe("chart-radar-icons");
    expect(evidence.legendLabels).toEqual(["Desktop", "Mobile"]);
    expect(evidence.lightViewport).toEqual({ width: 390, height: 844 });
    expect(evidence.darkViewport).toEqual({ width: 1440, height: 900 });
    expect(evidence.lightBytes).toBeGreaterThan(1_000);
    expect(evidence.darkBytes).toBeGreaterThan(1_000);
    expect(evidence.darkStable).toBe(true);
  }, 15_000);

  it("renders the Tooltip catalog with deterministic functional renderers", async () => {
    await renderBuiltRoute("/charts/tooltip");
    const { inspectTooltipChartCatalog } = commands as unknown as {
      inspectTooltipChartCatalog: () => Promise<{
        canonicalRoute: string | null;
        activeFamily: string | null;
        labels: string[];
        slugs: Array<string | null>;
        actionCounts: number[];
        previewHeight: number;
        lazyPreviewCount: number;
        renderedBarCounts: number[];
        applicationRoles: Array<string | null>;
        defaultTooltipText: string | null;
        keyboardTooltipText: string | null;
        pointerTooltipText: string | null;
        customLabelText: string | null;
        labelFormatterText: string | null;
        formatterText: string | null;
        iconCount: number;
        advancedText: string | null;
        advancedCaptureBytes: number;
        accessibilityViolations: {
          id: string;
          impact: string | null;
          targets: string[][];
        }[];
        installCommand: string | null;
        sourceContainsExport: boolean;
        consoleErrors: string[];
      }>;
    };

    const evidence = await inspectTooltipChartCatalog();
    expect(evidence.canonicalRoute).toBe("/charts/tooltip");
    expect(evidence.activeFamily).toBe("Tooltips");
    expect(evidence.labels).toEqual([
      "Tooltip — Default",
      "Tooltip — Line Indicator",
      "Tooltip — No Indicator",
      "Tooltip — No Label",
      "Tooltip — Custom Label",
      "Tooltip — Label Formatter",
      "Tooltip — Formatter",
      "Tooltip — Icons",
      "Tooltip — Advanced",
    ]);
    expect(evidence.slugs).toEqual([
      "chart-tooltip-default",
      "chart-tooltip-indicator-line",
      "chart-tooltip-indicator-none",
      "chart-tooltip-label-none",
      "chart-tooltip-label-custom",
      "chart-tooltip-label-formatter",
      "chart-tooltip-formatter",
      "chart-tooltip-icons",
      "chart-tooltip-advanced",
    ]);
    expect(evidence.actionCounts).toEqual(Array.from({ length: 9 }, () => 4));
    expect(evidence.previewHeight).toBe(460);
    expect(evidence.lazyPreviewCount).toBe(9);
    expect(evidence.renderedBarCounts.every((count) => count > 0)).toBe(true);
    expect(evidence.applicationRoles.every((role) => role === "application")).toBe(true);
    expect(evidence.defaultTooltipText).toMatch(/Tue|Running|Swimming|380|420/);
    expect(evidence.keyboardTooltipText).toMatch(/Wed|Running|Swimming|520|120/);
    expect(evidence.pointerTooltipText).toMatch(/Running|Swimming/);
    expect(evidence.customLabelText).toContain("Activities");
    expect(evidence.labelFormatterText).toContain("July 16, 2024");
    expect(evidence.formatterText).toMatch(/Running|Swimming|kcal/);
    expect(evidence.iconCount).toBe(2);
    expect(evidence.advancedText).toMatch(/Total|800|kcal/);
    expect(evidence.advancedCaptureBytes).toBeGreaterThan(1_000);
    expect(evidence.accessibilityViolations).toEqual([]);
    expect(evidence.installCommand).toBe("bunx shadcn@latest add @zaidan/chart-tooltip-default");
    expect(evidence.sourceContainsExport).toBe(true);
    expect(evidence.consoleErrors).toEqual([]);
  }, 60_000);

  it("shows Tooltip loading and failure states, then recovers the isolated Preview", async () => {
    await renderBuiltRoute("/charts/tooltip");
    const { exerciseTooltipPreviewRecovery } = commands as unknown as {
      exerciseTooltipPreviewRecovery: () => Promise<{
        loadingText: string;
        alertText: string;
        retryVisible: boolean;
        openPreviewVisible: boolean;
        recovered: boolean;
        pageErrors: string[];
      }>;
    };

    const evidence = await exerciseTooltipPreviewRecovery();
    expect(evidence.loadingText).toContain("Loading Tooltip — Default Preview");
    expect(evidence.alertText).toContain("Preview could not be loaded");
    expect(evidence.retryVisible).toBe(true);
    expect(evidence.openPreviewVisible).toBe(true);
    expect(evidence.recovered).toBe(true);
    expect(evidence.pageErrors).toEqual([]);
  }, 20_000);
});
