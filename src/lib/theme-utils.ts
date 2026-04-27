import { RADII } from "@/lib/config";
import { THEMES_VARIANTS, type ThemeVariant } from "@/lib/themes";
import type { BaseColor, ChartColor, MenuAccent, Radius, Theme } from "@/lib/types";

/**
 * Represents a registry theme with CSS variables for light and dark modes
 */
export type RegistryTheme = {
  name: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

const CHART_KEYS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const;

/**
 * Find a base color theme variant by name
 * @param name - The base color name to search for
 * @returns The matching ThemeVariant or undefined if not found
 */
export function getBaseColor(name: BaseColor): ThemeVariant | undefined {
  return THEMES_VARIANTS.find((theme) => theme.name === name);
}

/**
 * Find a theme variant by name
 * @param name - The theme name to search for
 * @returns The matching ThemeVariant or undefined if not found
 */
export function getTheme(name: Theme): ThemeVariant | undefined {
  return THEMES_VARIANTS.find((theme) => theme.name === name);
}

/**
 * Resolve a chart-color selection to its source theme variant.
 */
export function getChartColor(name: ChartColor): ThemeVariant | undefined {
  return THEMES_VARIANTS.find((theme) => theme.name === name);
}

/**
 * Build a registry theme from design system configuration.
 * Merges base color and theme CSS variables and applies transformations.
 *
 * Merge order: base color ← theme ← chart color (chart only overrides chart-1..5).
 *
 * @param config - The design system configuration
 * @param config.baseColor - The base color (e.g. neutral, stone, zinc, mauve)
 * @param config.theme - The theme color (e.g. blue, green, amber)
 * @param config.chartColor - The chart palette (any base/theme name; equals
 *   `baseColor` for the "match base color palette" affordance)
 * @param config.menuAccent - The menu accent style (subtle, bold)
 * @param config.radius - The border radius setting
 * @returns The merged RegistryTheme or null if base color or theme is not found
 */
export function buildRegistryTheme(config: {
  baseColor: BaseColor;
  theme: Theme;
  chartColor: ChartColor;
  menuAccent: MenuAccent;
  radius: Radius;
}): RegistryTheme | null {
  const baseColor = getBaseColor(config.baseColor);
  const theme = getTheme(config.theme);

  if (!baseColor || !theme) {
    return null;
  }

  // Merge base color and theme CSS vars
  const lightVars: Record<string, string> = {
    ...(baseColor.cssVars?.light as Record<string, string>),
    ...(theme.cssVars?.light as Record<string, string>),
  };
  const darkVars: Record<string, string> = {
    ...(baseColor.cssVars?.dark as Record<string, string>),
    ...(theme.cssVars?.dark as Record<string, string>),
  };

  // Apply chart-color overlay (only chart-1..5)
  const chart = getChartColor(config.chartColor);
  if (chart) {
    const chartLight = (chart.cssVars?.light as Record<string, string> | undefined) ?? {};
    const chartDark = (chart.cssVars?.dark as Record<string, string> | undefined) ?? {};
    for (const key of CHART_KEYS) {
      if (chartLight[key]) lightVars[key] = chartLight[key];
      if (chartDark[key]) darkVars[key] = chartDark[key];
    }
  }

  // Apply menu accent transformation
  if (config.menuAccent === "bold") {
    lightVars.accent = lightVars.primary;
    lightVars["accent-foreground"] = lightVars["primary-foreground"];
    darkVars.accent = darkVars.primary;
    darkVars["accent-foreground"] = darkVars["primary-foreground"];
    lightVars["sidebar-accent"] = lightVars.primary;
    lightVars["sidebar-accent-foreground"] = lightVars["primary-foreground"];
    darkVars["sidebar-accent"] = darkVars.primary;
    darkVars["sidebar-accent-foreground"] = darkVars["primary-foreground"];
  }

  // Apply radius transformation
  if (config.radius && config.radius !== "default") {
    const radius = RADII.find((r) => r.name === config.radius);
    if (radius?.value) {
      lightVars.radius = radius.value;
      darkVars.radius = radius.value;
    }
  }

  return {
    name: `${config.baseColor}-${config.theme}`,
    cssVars: {
      light: lightVars,
      dark: darkVars,
    },
  };
}
