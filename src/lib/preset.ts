import { decodePreset, encodePreset, type PresetConfig } from "shadcn/preset";
import { type DesignSystemConfig, DesignSystemConfigSchema } from "@/lib/types";

function toPresetConfig(config: DesignSystemConfig): PresetConfig {
  return {
    style: config.style,
    baseColor: config.baseColor,
    theme: config.theme,
    chartColor: config.chartColor,
    iconLibrary: "lucide",
    font: config.font,
    fontHeading: config.headingFont === config.font ? "inherit" : config.headingFont,
    radius: config.radius,
    menuAccent: config.menuAccent,
    menuColor: "default",
  };
}

export function encodeDesignSystemPreset(config: DesignSystemConfig): string {
  return encodePreset(toPresetConfig(config));
}

export function decodeDesignSystemPreset(code: string): DesignSystemConfig | null {
  const decoded = decodePreset(code);
  if (!decoded) return null;

  const result = DesignSystemConfigSchema.safeParse({
    primitive: "kobalte",
    style: decoded.style,
    baseColor: decoded.baseColor,
    theme: decoded.theme,
    chartColor: decoded.chartColor ?? decoded.theme,
    font: decoded.font,
    headingFont: decoded.fontHeading === "inherit" ? decoded.font : decoded.fontHeading,
    radius: decoded.radius,
    menuAccent: decoded.menuAccent,
  });

  return result.success ? result.data : null;
}
