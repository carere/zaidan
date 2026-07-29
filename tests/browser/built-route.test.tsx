import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

async function renderBuiltRoute(pathname = "/") {
  const builtAppUrl = new URL(pathname, inject("builtAppUrl")).href;
  const title =
    pathname === "/preview/ui/kobalte/chart" ? "Built chart route" : "Built Zaidan route";
  let resolveLoaded: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });

  dispose = render(
    () => (
      <iframe
        src={builtAppUrl}
        style={{ width: "1280px", height: "900px" }}
        title={title}
        onLoad={() => resolveLoaded?.()}
      />
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
});
