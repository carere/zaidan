import { type RegistryItem, registryItemSchema } from "shadcn/schema";
import { FONT_DEFINITIONS } from "@/lib/fonts";
import { decodeDesignSystemPreset } from "@/lib/preset";
import { buildRegistryTheme } from "@/lib/theme-utils";

export function buildPresetRegistryItem(code: string): RegistryItem | null {
  const config = decodeDesignSystemPreset(code);
  if (!config) return null;

  const theme = buildRegistryTheme(config);
  const font = FONT_DEFINITIONS.find((item) => item.name === config.font);
  const headingFont = FONT_DEFINITIONS.find((item) => item.name === config.headingFont);
  if (!theme || !font || !headingFont) return null;

  const registryDependencies = [`@zaidan/style-${config.style}`, `@zaidan/font-${config.font}`];
  if (config.headingFont !== config.font) {
    registryDependencies.push(`@zaidan/font-${config.headingFont}`);
  }

  return registryItemSchema.parse({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `preset-${code}`,
    title: "Zaidan design system preset",
    type: "registry:base",
    extends: "none",
    config: {
      style: "kobalte",
      iconLibrary: "lucide",
      menuAccent: config.menuAccent,
      menuColor: "default",
      tailwind: {
        baseColor: config.baseColor,
        cssVariables: true,
      },
    },
    registryDependencies,
    cssVars: {
      ...theme.cssVars,
      theme: {
        "--font-sans": font.family,
        "--font-heading": headingFont.family,
      },
    },
    meta: {
      preset: code,
      configuration: config,
    },
  });
}
