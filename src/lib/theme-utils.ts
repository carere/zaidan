import { RADII } from "@/lib/config";
import { THEMES_VARIANTS, type ThemeVariant } from "@/lib/themes";
import type { BaseColor, MenuAccent, Radius, Theme } from "@/lib/types";

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
 * Build a registry theme from design system configuration.
 * Merges base color and theme CSS variables and applies transformations.
 *
 * @param config - The design system configuration
 * @param config.baseColor - The base color (neutral, stone, zinc, gray)
 * @param config.theme - The theme color (blue, green, etc.)
 * @param config.menuAccent - The menu accent style (subtle, bold)
 * @param config.radius - The border radius setting (default, none, small, medium, large)
 * @returns The merged RegistryTheme or null if base color or theme is not found
 */
export function buildRegistryTheme(config: {
  baseColor: BaseColor;
  theme: Theme;
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
