export const CHART_SOURCE_REVISION = "47c7f92dbc4dd22a29982986458787000c4e7bc1";

export const CHART_FAMILIES = [
  { label: "Area", path: "/charts" },
  { label: "Bar", path: "/charts/bar" },
  { label: "Line", path: "/charts/line" },
  { label: "Pie", path: "/charts/pie" },
  { label: "Radar", path: "/charts/radar" },
  { label: "Radial", path: "/charts/radial" },
  { label: "Tooltips", path: "/charts/tooltip" },
] as const;

type AreaChartSlug =
  | "chart-area-axes"
  | "chart-area-default"
  | "chart-area-gradient"
  | "chart-area-icons"
  | "chart-area-interactive"
  | "chart-area-legend"
  | "chart-area-linear"
  | "chart-area-stacked-expand"
  | "chart-area-stacked"
  | "chart-area-step";

type RadarChartSlug =
  | "chart-radar-default"
  | "chart-radar-dots"
  | "chart-radar-grid-circle-fill"
  | "chart-radar-grid-circle-no-lines"
  | "chart-radar-grid-circle"
  | "chart-radar-grid-custom"
  | "chart-radar-grid-fill"
  | "chart-radar-grid-none"
  | "chart-radar-icons"
  | "chart-radar-label-custom"
  | "chart-radar-legend"
  | "chart-radar-lines-only"
  | "chart-radar-multiple"
  | "chart-radar-radius";

export type ChartCatalogEntry = {
  slug: AreaChartSlug | RadarChartSlug;
  label: string;
  exportName: string;
  description: string;
  categories: readonly ["charts", "charts-area" | "charts-radar"];
  interactive: boolean;
  sourceUrl: string;
  installCommand: string;
};

type AreaChartEntry = ChartCatalogEntry & {
  slug: AreaChartSlug;
  categories: readonly ["charts", "charts-area"];
};

type RadarChartEntry = ChartCatalogEntry & {
  slug: RadarChartSlug;
  categories: readonly ["charts", "charts-radar"];
};

const sourceRoot = `https://github.com/shadcn-ui/ui/blob/${CHART_SOURCE_REVISION}/apps/v4/registry/new-york-v4/charts`;

const entry = (
  slug: AreaChartSlug,
  label: string,
  description: string,
  exportName: string,
  interactive = false,
): AreaChartEntry => ({
  slug,
  label,
  exportName,
  description,
  categories: ["charts", "charts-area"],
  interactive,
  sourceUrl: `${sourceRoot}/${slug}.tsx`,
  installCommand: `bunx shadcn@latest add @zaidan/${slug}`,
});

export const AREA_CHARTS = [
  entry("chart-area-axes", "Area Chart — Axes", "An area chart with axes.", "ChartAreaAxes"),
  entry("chart-area-default", "Area Chart", "A simple area chart.", "ChartAreaDefault"),
  entry(
    "chart-area-gradient",
    "Area Chart — Gradient",
    "An area chart with gradient fill.",
    "ChartAreaGradient",
  ),
  entry("chart-area-icons", "Area Chart — Icons", "An area chart with icons.", "ChartAreaIcons"),
  entry(
    "chart-area-interactive",
    "Area Chart — Interactive",
    "An interactive area chart with selectable time ranges.",
    "ChartAreaInteractive",
    true,
  ),
  entry(
    "chart-area-legend",
    "Area Chart — Legend",
    "An area chart with a legend.",
    "ChartAreaLegend",
  ),
  entry("chart-area-linear", "Area Chart — Linear", "A linear area chart.", "ChartAreaLinear"),
  entry(
    "chart-area-stacked-expand",
    "Area Chart — Stacked Expanded",
    "A proportional stacked area chart.",
    "ChartAreaStackedExpand",
  ),
  entry("chart-area-stacked", "Area Chart — Stacked", "A stacked area chart.", "ChartAreaStacked"),
  entry("chart-area-step", "Area Chart — Step", "A step area chart.", "ChartAreaStep"),
] as const satisfies readonly AreaChartEntry[];

export const AREA_CHART_SLUGS = AREA_CHARTS.map(({ slug }) => slug);

const radarEntry = (
  slug: RadarChartSlug,
  label: string,
  description: string,
  exportName: string,
): RadarChartEntry => ({
  slug,
  label,
  exportName,
  description,
  categories: ["charts", "charts-radar"],
  interactive: false,
  sourceUrl: `${sourceRoot}/${slug}.tsx`,
  installCommand: `bunx shadcn@latest add @zaidan/${slug}`,
});

export const RADAR_CHARTS = [
  radarEntry("chart-radar-default", "Radar Chart", "A radar chart.", "ChartRadarDefault"),
  radarEntry(
    "chart-radar-dots",
    "Radar Chart — Dots",
    "A radar chart with dots.",
    "ChartRadarDots",
  ),
  radarEntry(
    "chart-radar-grid-circle-fill",
    "Radar Chart — Grid Circle Filled",
    "A radar chart with a filled circular grid.",
    "ChartRadarGridCircleFill",
  ),
  radarEntry(
    "chart-radar-grid-circle-no-lines",
    "Radar Chart — Grid Circle, No Lines",
    "A radar chart with a circular grid and no radial lines.",
    "ChartRadarGridCircleNoLines",
  ),
  radarEntry(
    "chart-radar-grid-circle",
    "Radar Chart — Grid Circle",
    "A radar chart with a circular grid.",
    "ChartRadarGridCircle",
  ),
  radarEntry(
    "chart-radar-grid-custom",
    "Radar Chart — Grid Custom",
    "A radar chart with a custom grid.",
    "ChartRadarGridCustom",
  ),
  radarEntry(
    "chart-radar-grid-fill",
    "Radar Chart — Grid Filled",
    "A radar chart with a filled grid.",
    "ChartRadarGridFill",
  ),
  radarEntry(
    "chart-radar-grid-none",
    "Radar Chart — Grid None",
    "A radar chart without a grid.",
    "ChartRadarGridNone",
  ),
  radarEntry(
    "chart-radar-icons",
    "Radar Chart — Icons",
    "A radar chart with icon-aware legend items.",
    "ChartRadarIcons",
  ),
  radarEntry(
    "chart-radar-label-custom",
    "Radar Chart — Custom Label",
    "A radar chart with custom polar labels.",
    "ChartRadarLabelCustom",
  ),
  radarEntry(
    "chart-radar-legend",
    "Radar Chart — Legend",
    "A radar chart with a legend.",
    "ChartRadarLegend",
  ),
  radarEntry(
    "chart-radar-lines-only",
    "Radar Chart — Lines Only",
    "A radar chart with lines only.",
    "ChartRadarLinesOnly",
  ),
  radarEntry(
    "chart-radar-multiple",
    "Radar Chart — Multiple",
    "A radar chart with multiple series.",
    "ChartRadarMultiple",
  ),
  radarEntry(
    "chart-radar-radius",
    "Radar Chart — Radius Axis",
    "A radar chart with a radius axis.",
    "ChartRadarRadius",
  ),
] as const satisfies readonly RadarChartEntry[];

export const RADAR_CHART_SLUGS = RADAR_CHARTS.map(({ slug }) => slug);

export function getAreaChart(slug: string) {
  return AREA_CHARTS.find((candidate) => candidate.slug === slug);
}

export function getRadarChart(slug: string) {
  return RADAR_CHARTS.find((candidate) => candidate.slug === slug);
}

export function getChartCatalogEntry(slug: string) {
  return getAreaChart(slug) ?? getRadarChart(slug);
}
