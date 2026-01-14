import type { ECharts, EChartsOption, SetOptionOpts } from "echarts";
import { BarChart, LineChart, PieChart, RadarChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { Component, ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";

// Register ECharts components - using SVG renderer for crisp rendering
echarts.use([
  SVGRenderer,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
]);

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for chart series styling and labeling.
 * Similar to shadcn's ChartConfig for familiarity.
 */
export type ChartConfig = {
  [key: string]: {
    /** Human-readable label for the series */
    label?: JSX.Element | string;
    /** Icon component to show in legends/tooltips */
    icon?: Component;
    /** Static color value (hex, hsl, oklch, or CSS variable) */
    color?: string;
    /** Theme-aware colors for light/dark mode */
    theme?: {
      light: string;
      dark: string;
    };
  };
};

export type ChartContainerProps = ComponentProps<"div"> & {
  /** ECharts option configuration */
  option: EChartsOption;
  /** Chart configuration for series styling */
  config?: ChartConfig;
  /** Whether to show loading animation */
  loading?: boolean;
  /** Loading options for ECharts */
  loadingOptions?: object;
  /** Options for setOption call */
  setOptionOpts?: SetOptionOpts;
  /** ECharts theme name (not used, we use CSS variables) */
  theme?: string;
  /** Callback when chart instance is initialized */
  onInit?: (chart: ECharts) => void;
  /** Event handlers for chart events */
  eventHandlers?: Record<string, (params: unknown) => void>;
};

// ============================================================================
// Context
// ============================================================================

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextValue>({ config: {} });

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }
  return context;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the computed color from a config entry.
 * Handles CSS variables, theme colors, and static colors.
 */
function getConfigColor(
  configEntry: ChartConfig[string] | undefined,
  isDark: boolean,
): string | undefined {
  if (!configEntry) return undefined;

  if (configEntry.theme) {
    return isDark ? configEntry.theme.dark : configEntry.theme.light;
  }

  return configEntry.color;
}

/**
 * Build CSS custom properties for chart colors from config.
 * This mimics shadcn's approach of injecting --color-{key} variables.
 */
function buildChartStyles(config: ChartConfig, isDark: boolean): Record<string, string> {
  const styles: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    const color = getConfigColor(value, isDark);
    if (color) {
      styles[`--color-${key}`] = color;
    }
  }

  return styles;
}

/**
 * Check if dark mode is active by looking for the data-kb-theme attribute.
 */
function useIsDarkMode() {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    // Initial check
    const html = document.documentElement;
    setIsDark(html.getAttribute("data-kb-theme") === "dark");

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-kb-theme") {
          setIsDark(html.getAttribute("data-kb-theme") === "dark");
        }
      }
    });

    observer.observe(html, { attributes: true });
    onCleanup(() => observer.disconnect());
  });

  return isDark;
}

// ============================================================================
// ChartContainer Component
// ============================================================================

/**
 * ChartContainer is the main wrapper component for ECharts.
 * It handles:
 * - SVG rendering for crisp graphics
 * - Automatic resizing
 * - Theme integration via CSS variables
 * - Loading states
 * - Proper cleanup on unmount
 */
function ChartContainer(props: ChartContainerProps) {
  const mergedProps = mergeProps(
    {
      config: {} as ChartConfig,
      loading: false,
      loadingOptions: {},
      setOptionOpts: { notMerge: true } as SetOptionOpts,
    },
    props,
  );

  const [local, others] = splitProps(mergedProps, [
    "class",
    "children",
    "option",
    "config",
    "loading",
    "loadingOptions",
    "setOptionOpts",
    "theme",
    "onInit",
    "eventHandlers",
    "style",
  ]);

  let containerRef: HTMLDivElement | undefined;
  let chartInstance: ECharts | undefined;

  const isDark = useIsDarkMode();

  // Initialize chart
  onMount(() => {
    if (!containerRef) return;

    // Initialize with SVG renderer
    chartInstance = echarts.init(containerRef, undefined, {
      renderer: "svg",
    });

    // Set initial option
    chartInstance.setOption(local.option, local.setOptionOpts);

    // Register event handlers
    if (local.eventHandlers) {
      for (const [event, handler] of Object.entries(local.eventHandlers)) {
        chartInstance.on(event, handler);
      }
    }

    // Call onInit callback
    local.onInit?.(chartInstance);

    // Setup resize observer
    const resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize();
    });
    resizeObserver.observe(containerRef);

    onCleanup(() => {
      resizeObserver.disconnect();
      chartInstance?.dispose();
    });
  });

  // Update option when it changes
  createEffect(
    on(
      () => local.option,
      (newOption) => {
        chartInstance?.setOption(newOption, local.setOptionOpts);
      },
      { defer: true },
    ),
  );

  // Handle loading state
  createEffect(
    on(
      () => local.loading,
      (isLoading) => {
        if (isLoading) {
          chartInstance?.showLoading("default", local.loadingOptions);
        } else {
          chartInstance?.hideLoading();
        }
      },
    ),
  );

  // Compute styles with chart color variables
  const chartStyles = () => {
    const configStyles = buildChartStyles(local.config, isDark());
    const userStyles = typeof local.style === "object" ? (local.style as object) : {};
    return { ...configStyles, ...userStyles };
  };

  return (
    <ChartContext.Provider value={{ config: local.config }}>
      <div
        ref={containerRef}
        data-slot="chart"
        data-chart
        class={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.echarts-tooltip]:rounded-lg [&_.echarts-tooltip]:border [&_.echarts-tooltip]:border-border/50 [&_.echarts-tooltip]:bg-background [&_.echarts-tooltip]:text-foreground [&_.echarts-tooltip]:shadow-xl",
          local.class,
        )}
        style={chartStyles()}
        {...others}
      >
        {local.children}
      </div>
    </ChartContext.Provider>
  );
}

// ============================================================================
// Chart Tooltip Styling
// ============================================================================

/**
 * Default tooltip formatter that matches shadcn styling.
 * Use this with ECharts tooltip.formatter option.
 */
export function createChartTooltipFormatter(config: ChartConfig): (params: unknown) => string {
  return (params: unknown) => {
    const data = Array.isArray(params) ? params : [params];

    const items = data
      .map((item: { seriesName?: string; value?: unknown; color?: string }) => {
        const configEntry = config[item.seriesName || ""];
        const label = configEntry?.label || item.seriesName || "Value";
        const color = configEntry?.color || item.color || "var(--color-foreground)";

        return `
          <div style="display: flex; align-items: center; gap: 8px; padding: 2px 0;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
            <span style="color: var(--color-muted-foreground);">${label}:</span>
            <span style="font-weight: 500;">${item.value}</span>
          </div>
        `;
      })
      .join("");

    return `<div style="padding: 4px 0;">${items}</div>`;
  };
}

/**
 * Default ECharts tooltip options that match shadcn styling.
 * Merge this with your tooltip configuration.
 */
export const chartTooltipDefaults = {
  trigger: "axis" as const,
  backgroundColor: "var(--background)",
  borderColor: "var(--border)",
  borderWidth: 1,
  padding: [8, 12],
  textStyle: {
    color: "var(--foreground)",
    fontSize: 12,
  },
  axisPointer: {
    type: "shadow" as const,
    shadowStyle: {
      color: "rgba(0, 0, 0, 0.06)",
    },
  },
};

// ============================================================================
// Chart Legend Styling
// ============================================================================

/**
 * Default ECharts legend options that match shadcn styling.
 */
export const chartLegendDefaults = {
  textStyle: {
    color: "var(--foreground)",
    fontSize: 12,
  },
  itemGap: 16,
  itemWidth: 12,
  itemHeight: 12,
  icon: "circle",
};

// ============================================================================
// Chart Grid Styling
// ============================================================================

/**
 * Default ECharts grid options.
 */
export const chartGridDefaults = {
  left: "3%",
  right: "4%",
  bottom: "3%",
  containLabel: true,
};

// ============================================================================
// Chart Axis Styling
// ============================================================================

/**
 * Default x-axis options that match shadcn styling.
 */
export const chartXAxisDefaults = {
  axisLine: {
    lineStyle: {
      color: "var(--border)",
    },
  },
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: "var(--muted-foreground)",
    fontSize: 12,
  },
  splitLine: {
    show: false,
  },
};

/**
 * Default y-axis options that match shadcn styling.
 */
export const chartYAxisDefaults = {
  axisLine: {
    show: false,
  },
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: "var(--muted-foreground)",
    fontSize: 12,
  },
  splitLine: {
    lineStyle: {
      color: "var(--border)",
      type: "dashed" as const,
    },
  },
};

// ============================================================================
// Preset Color Palettes
// ============================================================================

/**
 * Default chart color palette using CSS variables.
 * These correspond to --chart-1 through --chart-5.
 */
export const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Create an ECharts color configuration using the theme's chart colors.
 */
export function createChartColorConfig(): { color: string[] } {
  return { color: chartColors };
}

// ============================================================================
// Exports
// ============================================================================

export { ChartContainer };
