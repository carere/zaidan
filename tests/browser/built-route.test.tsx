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
      : pathname === "/charts"
        ? "Chart Catalog route"
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
        families: string[];
        entryCount: number;
        previewHeight: number;
        previewLoading: string | null;
        interactiveIsFullWidth: boolean;
        previews: Array<{
          slug: string | null;
          renderedAreaCount: number;
          chartRole: string | null;
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
    expect(evidence.previews.every((preview) => preview.renderedAreaCount > 0)).toBe(true);
    expect(evidence.previews.every((preview) => preview.chartRole === "application")).toBe(true);
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
});
