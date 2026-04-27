import { FONT_DEFINITIONS } from "@/lib/fonts";
import { THEMES_VARIANTS } from "@/lib/themes";
import type {
  BaseColor,
  ChartColor,
  DesignSystemConfig,
  Font,
  MenuAccent,
  Primitive,
  Radius,
  Style,
  Theme,
} from "@/lib/types";

/**
 * Default configuration values for the design system
 */
export const DEFAULT_CONFIG: DesignSystemConfig = {
  primitive: "kobalte",
  style: "vega",
  baseColor: "neutral",
  theme: "neutral",
  chartColor: "neutral",
  font: "inter",
  headingFont: "inter",
  radius: "default",
  menuAccent: "subtle",
};

/**
 * Available style options with their metadata
 */
export const STYLES: { name: Style; label: string; description: string }[] = [
  {
    name: "vega",
    label: "Vega",
    description: "The classic shadcn/ui look. Clean, neutral, and familiar.",
  },
  {
    name: "nova",
    label: "Nova",
    description: "Reduced padding and margins for compact layouts.",
  },
  {
    name: "maia",
    label: "Maia",
    description: "Soft and rounded, with generous spacing.",
  },
  {
    name: "lyra",
    label: "Lyra",
    description: "Boxy and sharp. Pairs well with mono fonts.",
  },
  {
    name: "mira",
    label: "Mira",
    description: "Compact. Made for dense interfaces.",
  },
  {
    name: "luma",
    label: "Luma",
    description: "Fluid, luminous, and soft. Pillowed surfaces with a gentle glow.",
  },
  {
    name: "sera",
    label: "Sera",
    description: "Editorial and typographic. Sharp corners with expressive type.",
  },
];

/**
 * Pull a theme variant's light primary color (used as the swatch in pickers).
 */
function getPreviewColor(name: string, kind: "primary" | "muted-foreground" = "primary") {
  const entry = THEMES_VARIANTS.find((t) => t.name === name);
  return entry?.cssVars?.light?.[kind] as string;
}

/**
 * Pull the chart-1..chart-5 light values for a theme variant. Used as the swatch
 * in the chart-color picker.
 */
function getChartLight(name: string) {
  const entry = THEMES_VARIANTS.find((t) => t.name === name);
  const light = entry?.cssVars?.light as Record<string, string>;
  return [
    light["chart-1"] as string,
    light["chart-2"] as string,
    light["chart-3"] as string,
    light["chart-4"] as string,
    light["chart-5"] as string,
  ];
}

/**
 * Available base color options with their metadata and color values.
 * Mirrors shadcn's filter `["neutral","stone","zinc","mauve","olive","mist","taupe"]`.
 */
export const BASE_COLORS: { name: BaseColor; label: string; color: string }[] = [
  { name: "neutral", label: "Neutral", color: getPreviewColor("neutral", "muted-foreground") },
  { name: "stone", label: "Stone", color: getPreviewColor("stone", "muted-foreground") },
  { name: "zinc", label: "Zinc", color: getPreviewColor("zinc", "muted-foreground") },
  { name: "mauve", label: "Mauve", color: getPreviewColor("mauve", "muted-foreground") },
  { name: "olive", label: "Olive", color: getPreviewColor("olive", "muted-foreground") },
  { name: "mist", label: "Mist", color: getPreviewColor("mist", "muted-foreground") },
  { name: "taupe", label: "Taupe", color: getPreviewColor("taupe", "muted-foreground") },
];

/**
 * Available theme color options with their metadata and color values
 */
export const THEMES: { name: Theme; label: string; color: string }[] = [
  { name: "amber", label: "Amber", color: getPreviewColor("amber") },
  { name: "blue", label: "Blue", color: getPreviewColor("blue") },
  { name: "cyan", label: "Cyan", color: getPreviewColor("cyan") },
  { name: "emerald", label: "Emerald", color: getPreviewColor("emerald") },
  { name: "fuchsia", label: "Fuchsia", color: getPreviewColor("fuchsia") },
  { name: "green", label: "Green", color: getPreviewColor("green") },
  { name: "indigo", label: "Indigo", color: getPreviewColor("indigo") },
  { name: "lime", label: "Lime", color: getPreviewColor("lime") },
  { name: "orange", label: "Orange", color: getPreviewColor("orange") },
  { name: "pink", label: "Pink", color: getPreviewColor("pink") },
  { name: "purple", label: "Purple", color: getPreviewColor("purple") },
  { name: "red", label: "Red", color: getPreviewColor("red") },
  { name: "rose", label: "Rose", color: getPreviewColor("rose") },
  { name: "sky", label: "Sky", color: getPreviewColor("sky") },
  { name: "teal", label: "Teal", color: getPreviewColor("teal") },
  { name: "violet", label: "Violet", color: getPreviewColor("violet") },
  { name: "yellow", label: "Yellow", color: getPreviewColor("yellow") },
];

/**
 * Available chart color options. Each entry exposes the chart-1..5 light values
 * used as a 5-segment swatch in the chart color picker. The chart picker mirrors
 * the theme picker: setting `chartColor === baseColor` is the "match base color
 * palette" affordance, no sentinel is needed.
 */
export const CHART_COLORS: {
  name: ChartColor;
  label: string;
  chart: string[];
}[] = [
  // Base colors
  { name: "neutral", label: "Neutral", chart: getChartLight("neutral") },
  { name: "stone", label: "Stone", chart: getChartLight("stone") },
  { name: "zinc", label: "Zinc", chart: getChartLight("zinc") },
  { name: "mauve", label: "Mauve", chart: getChartLight("mauve") },
  { name: "olive", label: "Olive", chart: getChartLight("olive") },
  { name: "mist", label: "Mist", chart: getChartLight("mist") },
  { name: "taupe", label: "Taupe", chart: getChartLight("taupe") },
  // Theme colors
  { name: "amber", label: "Amber", chart: getChartLight("amber") },
  { name: "blue", label: "Blue", chart: getChartLight("blue") },
  { name: "cyan", label: "Cyan", chart: getChartLight("cyan") },
  { name: "emerald", label: "Emerald", chart: getChartLight("emerald") },
  { name: "fuchsia", label: "Fuchsia", chart: getChartLight("fuchsia") },
  { name: "green", label: "Green", chart: getChartLight("green") },
  { name: "indigo", label: "Indigo", chart: getChartLight("indigo") },
  { name: "lime", label: "Lime", chart: getChartLight("lime") },
  { name: "orange", label: "Orange", chart: getChartLight("orange") },
  { name: "pink", label: "Pink", chart: getChartLight("pink") },
  { name: "purple", label: "Purple", chart: getChartLight("purple") },
  { name: "red", label: "Red", chart: getChartLight("red") },
  { name: "rose", label: "Rose", chart: getChartLight("rose") },
  { name: "sky", label: "Sky", chart: getChartLight("sky") },
  { name: "teal", label: "Teal", chart: getChartLight("teal") },
  { name: "violet", label: "Violet", chart: getChartLight("violet") },
  { name: "yellow", label: "Yellow", chart: getChartLight("yellow") },
];

/**
 * Available radius options with their metadata
 */
export const RADII: { name: Radius; label: string; value: string }[] = [
  { name: "default", label: "Default", value: "0.625rem" },
  { name: "none", label: "None", value: "0" },
  { name: "small", label: "Small", value: "0.25rem" },
  { name: "medium", label: "Medium", value: "0.5rem" },
  { name: "large", label: "Large", value: "0.75rem" },
];

/**
 * Available menu accent options with their metadata
 */
export const MENU_ACCENTS: { name: MenuAccent; label: string }[] = [
  { name: "subtle", label: "Subtle" },
  { name: "bold", label: "Bold" },
];

/**
 * Available font options with their metadata and font family values.
 * Derived from FONT_DEFINITIONS (single source of truth in src/lib/fonts.ts).
 */
export const FONTS: {
  label: string;
  value: Font;
  fontFamily: string;
  type: "sans" | "serif" | "mono";
}[] = FONT_DEFINITIONS.map((f) => ({
  label: f.title,
  value: f.name,
  fontFamily: f.family,
  type: f.type,
}));

/**
 * Menu color options for sidebar/navigation styling
 * Currently a placeholder for future menu color customization
 */
export const MENU_COLORS: { name: string; label: string }[] = [
  { name: "default", label: "Default" },
];

/**
 * Available primitive options with their metadata
 */
export const PRIMITIVES: { name: Primitive; label: string }[] = [
  { name: "kobalte", label: "Kobalte" },
  { name: "base", label: "Base" },
];

/**
 * Discriminated entry for the "has updates" indicator. Items listed in
 * {@link UPDATED_ITEMS} render a small blue dot next to their label in the
 * sidebar (`ItemExplorer`) and command palette (`ItemPicker`). The `kind`
 * keeps the lookup unambiguous when the same slug exists across docs, ui,
 * and blocks (e.g. a doc page named "button" vs the button component).
 */
export type UpdatedItem = {
  kind: "docs" | "ui" | "blocks";
  slug: string;
};

/**
 * Items flagged as recently updated. Each entry renders a blue dot next to
 * its label in the sidebar and command palette. The list is maintained
 * manually — entries stay until the maintainer removes them.
 */
export const UPDATED_ITEMS: UpdatedItem[] = [
  { kind: "docs", slug: "changelog" },
  { kind: "ui", slug: "scroll-area" },
];

/**
 * Announcement pill shown above the homepage hero. Update `label` + `href`
 * whenever a new announcement-worthy release ships; the rest of the homepage
 * picks it up automatically.
 */
export type LatestAnnouncement = {
  label: string;
  href: string;
};

export const LATEST_ANNOUNCEMENT: LatestAnnouncement = {
  label: "New: Changelog page is live",
  href: "/changelog",
};
