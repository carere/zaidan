import { FONT_DEFINITIONS } from "@/lib/fonts";
import { buildRegistryTheme } from "@/lib/theme-utils";
import type { DesignSystemConfig } from "@/lib/types";

export type PresetThemeProjection = {
  style: DesignSystemConfig["style"];
  dependencies: string[];
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

/** The single pure projection used by both registry installation and live Preview. */
export function projectPresetTheme(config: DesignSystemConfig): PresetThemeProjection | null {
  const theme = buildRegistryTheme(config);
  const bodyFont = FONT_DEFINITIONS.find(({ name }) => name === config.font);
  const headingFont = FONT_DEFINITIONS.find(({ name }) => name === config.headingFont);
  if (!theme || !bodyFont || !headingFont) return null;

  const withFontRoles = (values: Record<string, string>) => ({
    ...values,
    "font-sans": bodyFont.family,
    "font-heading": headingFont.family,
  });

  return {
    style: config.style,
    dependencies: [...new Set([bodyFont.dependency, headingFont.dependency])],
    cssVars: {
      light: withFontRoles(theme.cssVars.light),
      dark: withFontRoles(theme.cssVars.dark),
    },
  };
}
