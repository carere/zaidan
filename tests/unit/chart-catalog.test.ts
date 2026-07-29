import { describe, expect, it } from "vitest";
import {
  AREA_CHARTS,
  CHART_SOURCE_REVISION,
  LINE_CHARTS,
  RADAR_CHARTS,
  TOOLTIP_CHARTS,
} from "@/lib/chart-catalog";
import { resolvePreviewRequest } from "@/lib/product-routing";
import registry from "@/registry/kobalte/registry.json";

const pinnedAreaOrder = [
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
] as const;

const pinnedLineOrder = [
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
] as const;

const pinnedRadarOrder = [
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
] as const;

const pinnedTooltipOrder = [
  "chart-tooltip-default",
  "chart-tooltip-indicator-line",
  "chart-tooltip-indicator-none",
  "chart-tooltip-label-none",
  "chart-tooltip-label-custom",
  "chart-tooltip-label-formatter",
  "chart-tooltip-formatter",
  "chart-tooltip-icons",
  "chart-tooltip-advanced",
] as const;

describe("Area Chart Catalog contract", () => {
  it("publishes the ten pinned entries in upstream source order", () => {
    expect(CHART_SOURCE_REVISION).toBe("47c7f92dbc4dd22a29982986458787000c4e7bc1");
    expect(AREA_CHARTS.map(({ slug }) => slug)).toEqual(pinnedAreaOrder);
    expect(
      AREA_CHARTS.every(({ categories }) => categories.join(",") === "charts,charts-area"),
    ).toBe(true);
  });

  it("gives every entry a canonical source, install command, and isolated Preview", () => {
    for (const entry of AREA_CHARTS) {
      expect(entry.sourceUrl).toContain(CHART_SOURCE_REVISION);
      expect(entry.sourceUrl.endsWith(`/${entry.slug}.tsx`)).toBe(true);
      expect(entry.canonicalPath).toBe("/charts");
      expect(entry.installCommand).toBe(`bunx shadcn@latest add @zaidan/${entry.slug}`);
      expect(resolvePreviewRequest(`/preview/charts/${entry.slug}`)).toEqual({
        accepted: true,
        kind: "charts",
        slug: entry.slug,
        canonicalPath: "/charts",
      });
    }
  });

  it("keeps every Area entry independently installable with exact registry metadata", () => {
    const areaItems = registry.items.filter(({ name }) =>
      pinnedAreaOrder.includes(name as (typeof pinnedAreaOrder)[number]),
    );

    expect(areaItems.map(({ name }) => name)).toEqual(pinnedAreaOrder);
    for (const item of areaItems) {
      const dependencies = item.dependencies ?? [];
      const files = item.files ?? [];
      const registryDependencies = [
        "card",
        "chart",
        ...(item.name === "chart-area-interactive" ? ["select"] : []),
      ].map((dependency) => `https://zaidan.carere.dev/r/kobalte/${dependency}.json`);

      expect(item.type).toBe("registry:block");
      expect(item.categories).toEqual(["charts", "charts-area"]);
      expect(item.registryDependencies).toEqual(registryDependencies);
      expect(dependencies).toContain("solid-recharts@1.0.0");
      expect(dependencies.some((dependency) => /^echarts(?:@|$)/.test(dependency))).toBe(false);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({
        path: `src/registry/kobalte/charts/${item.name}.tsx`,
        type: item.name === "chart-area-interactive" ? "registry:component" : "registry:block",
      });
    }
  });
});

describe("Line Chart Catalog contract", () => {
  it("publishes the ten pinned entries in upstream source order", () => {
    expect(CHART_SOURCE_REVISION).toBe("47c7f92dbc4dd22a29982986458787000c4e7bc1");
    expect(LINE_CHARTS.map(({ slug }) => slug)).toEqual(pinnedLineOrder);
    expect(
      LINE_CHARTS.every(({ categories }) => categories.join(",") === "charts,charts-line"),
    ).toBe(true);
  });

  it("gives every entry a canonical source, install command, and isolated Preview", () => {
    for (const entry of LINE_CHARTS) {
      expect(entry.sourceUrl).toContain(CHART_SOURCE_REVISION);
      expect(entry.sourceUrl.endsWith(`/${entry.slug}.tsx`)).toBe(true);
      expect(entry.canonicalPath).toBe("/charts/line");
      expect(entry.installCommand).toBe(`bunx shadcn@latest add @zaidan/${entry.slug}`);
      expect(resolvePreviewRequest(`/preview/charts/${entry.slug}`)).toEqual({
        accepted: true,
        kind: "charts",
        slug: entry.slug,
        canonicalPath: "/charts/line",
      });
    }
  });

  it("keeps every Line entry independently installable with exact registry metadata", () => {
    const lineItems = registry.items.filter(({ name }) =>
      pinnedLineOrder.includes(name as (typeof pinnedLineOrder)[number]),
    );

    expect(lineItems.map(({ name }) => name)).toEqual(pinnedLineOrder);
    for (const item of lineItems) {
      expect(item.type).toBe("registry:block");
      expect(item.categories).toEqual(["charts", "charts-line"]);
      expect(item.registryDependencies).toEqual(
        ["card", "chart"].map(
          (dependency) => `https://zaidan.carere.dev/r/kobalte/${dependency}.json`,
        ),
      );
      expect(item.dependencies).toEqual(
        item.name === "chart-line-interactive"
          ? ["solid-recharts@1.0.0"]
          : ["lucide-solid", "solid-recharts@1.0.0"],
      );
      expect(item.files).toEqual([
        {
          path: `src/registry/kobalte/charts/${item.name}.tsx`,
          type: "registry:block",
        },
      ]);
    }
  });

  it("marks the approved deterministic visual representative", () => {
    expect(
      LINE_CHARTS.filter(({ visualRepresentative }) => visualRepresentative).map(
        ({ slug }) => slug,
      ),
    ).toEqual(["chart-line-dots-custom"]);
  });
});

describe("Radar Chart Catalog contract", () => {
  it("publishes the fourteen pinned entries in upstream source order", () => {
    expect(CHART_SOURCE_REVISION).toBe("47c7f92dbc4dd22a29982986458787000c4e7bc1");
    expect(RADAR_CHARTS.map(({ slug }) => slug)).toEqual(pinnedRadarOrder);
    expect(
      RADAR_CHARTS.every(({ categories }) => categories.join(",") === "charts,charts-radar"),
    ).toBe(true);
  });

  it("gives every Radar entry shared source, install, and isolated Preview behavior", () => {
    for (const entry of RADAR_CHARTS) {
      expect(entry.sourceUrl).toContain(CHART_SOURCE_REVISION);
      expect(entry.sourceUrl.endsWith(`/${entry.slug}.tsx`)).toBe(true);
      expect(entry.installCommand).toBe(`bunx shadcn@latest add @zaidan/${entry.slug}`);
      expect(resolvePreviewRequest(`/preview/charts/${entry.slug}`)).toEqual({
        accepted: true,
        kind: "charts",
        slug: entry.slug,
        canonicalPath: "/charts/radar",
      });
    }
  });

  it("keeps every Radar entry independently installable with exact registry metadata", () => {
    const radarItems = registry.items.filter(({ name }) =>
      pinnedRadarOrder.includes(name as (typeof pinnedRadarOrder)[number]),
    );

    expect(radarItems.map(({ name }) => name)).toEqual(pinnedRadarOrder);
    for (const item of radarItems) {
      expect(item.type).toBe("registry:block");
      expect(item.categories).toEqual(["charts", "charts-radar"]);
      expect(item.registryDependencies).toEqual(
        ["card", "chart"].map(
          (dependency) => `https://zaidan.carere.dev/r/kobalte/${dependency}.json`,
        ),
      );
      expect(item.dependencies).toEqual(["lucide-solid", "solid-recharts@1.0.0"]);
      expect(item.files).toEqual([
        {
          path: `src/registry/kobalte/charts/${item.name}.tsx`,
          type: "registry:block",
        },
      ]);
    }
  });
});

describe("Tooltip Chart Catalog contract", () => {
  it("publishes the nine pinned entries in upstream source order", () => {
    expect(CHART_SOURCE_REVISION).toBe("47c7f92dbc4dd22a29982986458787000c4e7bc1");
    expect(TOOLTIP_CHARTS.map(({ slug }) => slug)).toEqual(pinnedTooltipOrder);
    expect(
      TOOLTIP_CHARTS.every(({ categories }) => categories.join(",") === "charts,charts-tooltip"),
    ).toBe(true);
  });

  it("gives every Tooltip entry a canonical source, install command, and isolated Preview", () => {
    for (const entry of TOOLTIP_CHARTS) {
      expect(entry.sourceUrl).toContain(CHART_SOURCE_REVISION);
      expect(entry.sourceUrl.endsWith(`/${entry.slug}.tsx`)).toBe(true);
      expect(entry.installCommand).toBe(`bunx shadcn@latest add @zaidan/${entry.slug}`);
      expect(resolvePreviewRequest(`/preview/charts/${entry.slug}`)).toEqual({
        accepted: true,
        kind: "charts",
        slug: entry.slug,
        canonicalPath: "/charts/tooltip",
      });
    }
  });

  it("keeps every Tooltip entry independently installable with exact registry metadata", () => {
    const tooltipItems = registry.items.filter(({ name }) =>
      pinnedTooltipOrder.includes(name as (typeof pinnedTooltipOrder)[number]),
    );

    expect(tooltipItems.map(({ name }) => name)).toEqual(pinnedTooltipOrder);
    for (const item of tooltipItems) {
      expect(item.type).toBe("registry:block");
      expect(item.categories).toEqual(["charts", "charts-tooltip"]);
      expect(item.registryDependencies).toEqual(
        ["card", "chart"].map(
          (dependency) => `https://zaidan.carere.dev/r/kobalte/${dependency}.json`,
        ),
      );
      expect(item.dependencies).toContain("solid-recharts@1.0.0");
      expect(item.dependencies?.some((dependency) => /^echarts(?:@|$)/.test(dependency))).toBe(
        false,
      );
      expect(item.files).toEqual([
        {
          path: `src/registry/kobalte/charts/${item.name}.tsx`,
          type: "registry:block",
        },
      ]);
    }
  });
});
