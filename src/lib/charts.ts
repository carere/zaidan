import type { Component } from "solid-js";

export const chartTypes = ["area", "bar", "line", "pie", "radar", "radial", "tooltip"] as const;

export type ChartType = (typeof chartTypes)[number];

type ChartModule = Record<string, Component>;

export type ChartDefinition = {
  id: string;
  type: ChartType;
  source: string;
  fullWidth: boolean;
};

const modules = import.meta.glob<ChartModule>("../registry/kobalte/charts/*.tsx");

const sources = import.meta.glob<string>("../registry/kobalte/charts/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
});

const idsByType = {
  area: [
    "chart-area-interactive",
    "chart-area-default",
    "chart-area-linear",
    "chart-area-step",
    "chart-area-legend",
    "chart-area-stacked",
    "chart-area-stacked-expand",
    "chart-area-icons",
    "chart-area-gradient",
    "chart-area-axes",
  ],
  bar: [
    "chart-bar-interactive",
    "chart-bar-default",
    "chart-bar-horizontal",
    "chart-bar-multiple",
    "chart-bar-stacked",
    "chart-bar-label",
    "chart-bar-label-custom",
    "chart-bar-mixed",
    "chart-bar-active",
    "chart-bar-negative",
  ],
  line: [
    "chart-line-interactive",
    "chart-line-default",
    "chart-line-linear",
    "chart-line-step",
    "chart-line-multiple",
    "chart-line-dots",
    "chart-line-dots-custom",
    "chart-line-dots-colors",
    "chart-line-label",
    "chart-line-label-custom",
  ],
  pie: [
    "chart-pie-simple",
    "chart-pie-separator-none",
    "chart-pie-label",
    "chart-pie-label-custom",
    "chart-pie-label-list",
    "chart-pie-legend",
    "chart-pie-donut",
    "chart-pie-donut-active",
    "chart-pie-donut-text",
    "chart-pie-stacked",
    "chart-pie-interactive",
  ],
  radar: [
    "chart-radar-default",
    "chart-radar-dots",
    "chart-radar-lines-only",
    "chart-radar-label-custom",
    "chart-radar-grid-custom",
    "chart-radar-grid-none",
    "chart-radar-grid-circle",
    "chart-radar-grid-circle-no-lines",
    "chart-radar-grid-circle-fill",
    "chart-radar-grid-fill",
    "chart-radar-radius",
    "chart-radar-legend",
    "chart-radar-icons",
    "chart-radar-multiple",
  ],
  radial: [
    "chart-radial-simple",
    "chart-radial-label",
    "chart-radial-grid",
    "chart-radial-text",
    "chart-radial-shape",
    "chart-radial-stacked",
  ],
  tooltip: [
    "chart-tooltip-default",
    "chart-tooltip-indicator-line",
    "chart-tooltip-indicator-none",
    "chart-tooltip-label-none",
    "chart-tooltip-label-custom",
    "chart-tooltip-label-formatter",
    "chart-tooltip-formatter",
    "chart-tooltip-icons",
    "chart-tooltip-advanced",
  ],
} as const satisfies Record<ChartType, readonly string[]>;

const fullWidthCharts = new Set([
  "chart-area-interactive",
  "chart-bar-interactive",
  "chart-line-interactive",
]);

function exportName(id: string) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function chartPath(id: string) {
  return `../registry/kobalte/charts/${id}.tsx`;
}

function createChartDefinition(type: ChartType, id: string): ChartDefinition {
  const path = chartPath(id);
  const source = sources[path];

  if (!modules[path] || !source) {
    throw new Error(`Unable to resolve chart registry item: ${id}`);
  }

  return {
    id,
    type,
    source,
    fullWidth: fullWidthCharts.has(id),
  };
}

export const charts = Object.fromEntries(
  chartTypes.map((type) => [type, idsByType[type].map((id) => createChartDefinition(type, id))]),
) as Record<ChartType, ChartDefinition[]>;

export function isChartType(value: string): value is ChartType {
  return chartTypes.some((type) => type === value);
}

export async function loadChartComponent(id: string): Promise<{ default: Component }> {
  const path = chartPath(id);
  const load = modules[path];
  if (!load) {
    throw new Error(`Unable to resolve chart registry item: ${id}`);
  }

  const module = await load();
  const component = module[exportName(id)];
  if (!component) {
    throw new Error(`Unable to resolve chart component export: ${id}`);
  }

  return { default: component };
}

export function chartTypeLabel(type: ChartType) {
  return type === "tooltip" ? "Tooltips" : `${type.charAt(0).toUpperCase()}${type.slice(1)} Charts`;
}
