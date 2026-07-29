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

export type TooltipChartSlug =
  | "chart-tooltip-default"
  | "chart-tooltip-indicator-line"
  | "chart-tooltip-indicator-none"
  | "chart-tooltip-label-none"
  | "chart-tooltip-label-custom"
  | "chart-tooltip-label-formatter"
  | "chart-tooltip-formatter"
  | "chart-tooltip-icons"
  | "chart-tooltip-advanced";

export type ChartCatalogEntry = {
  slug: AreaChartSlug | RadarChartSlug | TooltipChartSlug;
  label: string;
  exportName: string;
  description: string;
  categories: readonly ["charts", "charts-area" | "charts-radar" | "charts-tooltip"];
  canonicalPath: "/charts" | "/charts/radar" | "/charts/tooltip";
  interactive: boolean;
  sourceUrl: string;
  installCommand: string;
};

type AreaChartEntry = ChartCatalogEntry & {
  slug: AreaChartSlug;
  categories: readonly ["charts", "charts-area"];
  canonicalPath: "/charts";
};

type RadarChartEntry = ChartCatalogEntry & {
  slug: RadarChartSlug;
  categories: readonly ["charts", "charts-radar"];
  canonicalPath: "/charts/radar";
};

type TooltipChartEntry = ChartCatalogEntry & {
  slug: TooltipChartSlug;
  categories: readonly ["charts", "charts-tooltip"];
  canonicalPath: "/charts/tooltip";
};

const sourceRoot = `https://github.com/shadcn-ui/ui/blob/${CHART_SOURCE_REVISION}/apps/v4/registry/new-york-v4/charts`;

function chartEntry(
  family: "area",
  slug: AreaChartSlug,
  label: string,
  description: string,
  exportName: string,
  interactive?: boolean,
): AreaChartEntry;
function chartEntry(
  family: "radar",
  slug: RadarChartSlug,
  label: string,
  description: string,
  exportName: string,
): RadarChartEntry;
function chartEntry(
  family: "tooltip",
  slug: TooltipChartSlug,
  label: string,
  description: string,
  exportName: string,
): TooltipChartEntry;
function chartEntry(
  family: "area" | "radar" | "tooltip",
  slug: AreaChartSlug | RadarChartSlug | TooltipChartSlug,
  label: string,
  description: string,
  exportName: string,
  interactive = false,
): ChartCatalogEntry {
  const category = {
    area: "charts-area",
    radar: "charts-radar",
    tooltip: "charts-tooltip",
  }[family] as "charts-area" | "charts-radar" | "charts-tooltip";
  const canonicalPath = {
    area: "/charts",
    radar: "/charts/radar",
    tooltip: "/charts/tooltip",
  }[family] as "/charts" | "/charts/radar" | "/charts/tooltip";
  return {
    slug,
    label,
    exportName,
    description,
    categories: ["charts", category],
    canonicalPath,
    interactive,
    sourceUrl: `${sourceRoot}/${slug}.tsx`,
    installCommand: `bunx shadcn@latest add @zaidan/${slug}`,
  };
}

export const AREA_CHARTS = [
  chartEntry(
    "area",
    "chart-area-axes",
    "Area Chart — Axes",
    "An area chart with axes.",
    "ChartAreaAxes",
  ),
  chartEntry(
    "area",
    "chart-area-default",
    "Area Chart",
    "A simple area chart.",
    "ChartAreaDefault",
  ),
  chartEntry(
    "area",
    "chart-area-gradient",
    "Area Chart — Gradient",
    "An area chart with gradient fill.",
    "ChartAreaGradient",
  ),
  chartEntry(
    "area",
    "chart-area-icons",
    "Area Chart — Icons",
    "An area chart with icons.",
    "ChartAreaIcons",
  ),
  chartEntry(
    "area",
    "chart-area-interactive",
    "Area Chart — Interactive",
    "An interactive area chart with selectable time ranges.",
    "ChartAreaInteractive",
    true,
  ),
  chartEntry(
    "area",
    "chart-area-legend",
    "Area Chart — Legend",
    "An area chart with a legend.",
    "ChartAreaLegend",
  ),
  chartEntry(
    "area",
    "chart-area-linear",
    "Area Chart — Linear",
    "A linear area chart.",
    "ChartAreaLinear",
  ),
  chartEntry(
    "area",
    "chart-area-stacked-expand",
    "Area Chart — Stacked Expanded",
    "A proportional stacked area chart.",
    "ChartAreaStackedExpand",
  ),
  chartEntry(
    "area",
    "chart-area-stacked",
    "Area Chart — Stacked",
    "A stacked area chart.",
    "ChartAreaStacked",
  ),
  chartEntry("area", "chart-area-step", "Area Chart — Step", "A step area chart.", "ChartAreaStep"),
] as const satisfies readonly AreaChartEntry[];

export const AREA_CHART_SLUGS = AREA_CHARTS.map(({ slug }) => slug);

export const RADAR_CHARTS = [
  chartEntry("radar", "chart-radar-default", "Radar Chart", "A radar chart.", "ChartRadarDefault"),
  chartEntry(
    "radar",
    "chart-radar-dots",
    "Radar Chart — Dots",
    "A radar chart with dots.",
    "ChartRadarDots",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-circle-fill",
    "Radar Chart — Grid Circle Filled",
    "A radar chart with a filled circular grid.",
    "ChartRadarGridCircleFill",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-circle-no-lines",
    "Radar Chart — Grid Circle, No Lines",
    "A radar chart with a circular grid and no radial lines.",
    "ChartRadarGridCircleNoLines",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-circle",
    "Radar Chart — Grid Circle",
    "A radar chart with a circular grid.",
    "ChartRadarGridCircle",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-custom",
    "Radar Chart — Grid Custom",
    "A radar chart with a custom grid.",
    "ChartRadarGridCustom",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-fill",
    "Radar Chart — Grid Filled",
    "A radar chart with a filled grid.",
    "ChartRadarGridFill",
  ),
  chartEntry(
    "radar",
    "chart-radar-grid-none",
    "Radar Chart — Grid None",
    "A radar chart without a grid.",
    "ChartRadarGridNone",
  ),
  chartEntry(
    "radar",
    "chart-radar-icons",
    "Radar Chart — Icons",
    "A radar chart with icon-aware legend items.",
    "ChartRadarIcons",
  ),
  chartEntry(
    "radar",
    "chart-radar-label-custom",
    "Radar Chart — Custom Label",
    "A radar chart with custom polar labels.",
    "ChartRadarLabelCustom",
  ),
  chartEntry(
    "radar",
    "chart-radar-legend",
    "Radar Chart — Legend",
    "A radar chart with a legend.",
    "ChartRadarLegend",
  ),
  chartEntry(
    "radar",
    "chart-radar-lines-only",
    "Radar Chart — Lines Only",
    "A radar chart with lines only.",
    "ChartRadarLinesOnly",
  ),
  chartEntry(
    "radar",
    "chart-radar-multiple",
    "Radar Chart — Multiple",
    "A radar chart with multiple series.",
    "ChartRadarMultiple",
  ),
  chartEntry(
    "radar",
    "chart-radar-radius",
    "Radar Chart — Radius Axis",
    "A radar chart with a radius axis.",
    "ChartRadarRadius",
  ),
] as const satisfies readonly RadarChartEntry[];

export const RADAR_CHART_SLUGS = RADAR_CHARTS.map(({ slug }) => slug);

export const TOOLTIP_CHARTS = [
  chartEntry(
    "tooltip",
    "chart-tooltip-default",
    "Tooltip — Default",
    "Default tooltip with ChartTooltipContent.",
    "ChartTooltipDefault",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-indicator-line",
    "Tooltip — Line Indicator",
    "A tooltip with a line indicator.",
    "ChartTooltipIndicatorLine",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-indicator-none",
    "Tooltip — No Indicator",
    "A tooltip with no indicator.",
    "ChartTooltipIndicatorNone",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-label-none",
    "Tooltip — No Label",
    "A tooltip with no label.",
    "ChartTooltipLabelNone",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-label-custom",
    "Tooltip — Custom Label",
    "A tooltip with a custom label from ChartConfig.",
    "ChartTooltipLabelCustom",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-label-formatter",
    "Tooltip — Label Formatter",
    "A tooltip with a formatted date label.",
    "ChartTooltipLabelFormatter",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-formatter",
    "Tooltip — Formatter",
    "A tooltip with a custom value formatter.",
    "ChartTooltipFormatter",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-icons",
    "Tooltip — Icons",
    "A tooltip with activity icons.",
    "ChartTooltipIcons",
  ),
  chartEntry(
    "tooltip",
    "chart-tooltip-advanced",
    "Tooltip — Advanced",
    "A tooltip with custom formatting and a total.",
    "ChartTooltipAdvanced",
  ),
] as const satisfies readonly TooltipChartEntry[];

export const TOOLTIP_CHART_SLUGS = TOOLTIP_CHARTS.map(({ slug }) => slug);

export function getAreaChart(slug: string) {
  return AREA_CHARTS.find((candidate) => candidate.slug === slug);
}

export function getRadarChart(slug: string) {
  return RADAR_CHARTS.find((candidate) => candidate.slug === slug);
}

export function getTooltipChart(slug: string) {
  return TOOLTIP_CHARTS.find((candidate) => candidate.slug === slug);
}

export function getChartCatalogEntry(slug: string) {
  return getAreaChart(slug) ?? getRadarChart(slug) ?? getTooltipChart(slug);
}

