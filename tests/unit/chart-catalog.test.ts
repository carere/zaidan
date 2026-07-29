import { describe, expect, it } from "vitest";
import { AREA_CHARTS, CHART_SOURCE_REVISION } from "@/lib/chart-catalog";
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
