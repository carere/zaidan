import type { BaseColor, Font, MenuAccent, Radius, Style, Theme } from "@/lib/types";

/**
 * Design system configuration interface
 * Contains all customizable design tokens for the component library
 */
export interface DesignSystemConfig {
  style: Style;
  baseColor: BaseColor;
  theme: Theme;
  font: Font;
  radius: Radius;
  menuAccent: MenuAccent;
}

/**
 * Default configuration values for the design system
 */
export const DEFAULT_CONFIG: DesignSystemConfig = {
  style: "vega",
  baseColor: "neutral",
  theme: "amber",
  font: "inter",
  radius: "medium",
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
  { name: "nova", label: "Nova", description: "Reduced padding and margins for compact layouts." },
  { name: "lyra", label: "Lyra", description: "Boxy and sharp. Pairs well with mono fonts." },
  { name: "maia", label: "Maia", description: "Soft and rounded, with generous spacing." },
  { name: "mira", label: "Mira", description: "Compact. Made for dense interfaces." },
];

/**
 * Available base color options with their metadata and color values
 */
export const BASE_COLORS: { name: BaseColor; label: string; color: string }[] = [
  { name: "neutral", label: "Neutral", color: "hsl(0 0% 45%)" },
  { name: "stone", label: "Stone", color: "hsl(25 5% 45%)" },
  { name: "zinc", label: "Zinc", color: "hsl(240 4% 46%)" },
  { name: "gray", label: "Gray", color: "hsl(220 9% 46%)" },
];

/**
 * Available theme color options with their metadata and color values
 */
export const THEMES: { name: Theme; label: string; color: string }[] = [
  { name: "amber", label: "Amber", color: "hsl(45 93% 47%)" },
  { name: "blue", label: "Blue", color: "hsl(221 83% 53%)" },
  { name: "cyan", label: "Cyan", color: "hsl(189 94% 43%)" },
  { name: "emerald", label: "Emerald", color: "hsl(160 84% 39%)" },
  { name: "fuchsia", label: "Fuchsia", color: "hsl(293 69% 49%)" },
  { name: "green", label: "Green", color: "hsl(142 76% 36%)" },
  { name: "indigo", label: "Indigo", color: "hsl(239 84% 67%)" },
  { name: "lime", label: "Lime", color: "hsl(84 81% 44%)" },
  { name: "orange", label: "Orange", color: "hsl(25 95% 53%)" },
  { name: "pink", label: "Pink", color: "hsl(330 81% 60%)" },
  { name: "purple", label: "Purple", color: "hsl(271 81% 56%)" },
  { name: "red", label: "Red", color: "hsl(0 84% 60%)" },
  { name: "rose", label: "Rose", color: "hsl(347 77% 50%)" },
  { name: "sky", label: "Sky", color: "hsl(199 89% 48%)" },
  { name: "teal", label: "Teal", color: "hsl(173 80% 40%)" },
  { name: "violet", label: "Violet", color: "hsl(263 70% 50%)" },
  { name: "yellow", label: "Yellow", color: "hsl(48 96% 53%)" },
];

/**
 * Available radius options with their metadata
 */
export const RADII: { name: Radius; label: string; value: string }[] = [
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
 * Available font options with their metadata and font family values
 */
export const FONTS: { label: string; value: Font; fontFamily: string }[] = [
  { label: "Inter", value: "inter", fontFamily: '"Inter Variable", sans-serif' },
  { label: "Noto Sans", value: "noto-sans", fontFamily: '"Noto Sans Variable", sans-serif' },
  { label: "Nunito Sans", value: "nunito-sans", fontFamily: '"Nunito Sans Variable", sans-serif' },
  { label: "Figtree", value: "figtree", fontFamily: '"Figtree Variable", sans-serif' },
];

/**
 * Menu color options for sidebar/navigation styling
 * Currently a placeholder for future menu color customization
 */
export const MENU_COLORS: { name: string; label: string }[] = [
  { name: "default", label: "Default" },
];
