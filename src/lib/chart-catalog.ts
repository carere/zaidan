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

type AreaChartEntry = {
  slug: AreaChartSlug;
  label: string;
  exportName: string;
  description: string;
  categories: readonly ["charts", "charts-area"];
  interactive: boolean;
  sourceUrl: string;
  installCommand: string;
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

export function getAreaChart(slug: string) {
  return AREA_CHARTS.find((candidate) => candidate.slug === slug);
}
