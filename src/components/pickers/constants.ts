import { cn } from "@/lib/utils";

// ============================================================================
// Picker Options Data
// ============================================================================

export const COMPONENT_LIBRARIES = [
  { value: "radix", label: "Radix UI" },
  { value: "base-ui", label: "Base UI" },
] as const;

export const STYLES = [
  {
    value: "vega",
    label: "Vega",
    description: "The classic shadcn/ui look. Clean, neutral, and familiar.",
  },
  { value: "nova", label: "Nova", description: "Reduced padding and margins for compact layouts." },
  { value: "maia", label: "Maia", description: "Soft and rounded, with generous spacing." },
  { value: "lyra", label: "Lyra", description: "Boxy and sharp. Pairs well with mono fonts." },
  { value: "mira", label: "Mira", description: "Compact. Made for dense interfaces." },
] as const;

export const BASE_COLORS = [
  { value: "neutral", label: "Neutral", color: "hsl(0 0% 45%)" },
  { value: "stone", label: "Stone", color: "hsl(25 5% 45%)" },
  { value: "zinc", label: "Zinc", color: "hsl(240 4% 46%)" },
  { value: "gray", label: "Gray", color: "hsl(220 9% 46%)" },
] as const;

export const THEME_COLORS = [
  { value: "neutral", label: "Neutral", description: "Match base color", color: "hsl(0 0% 45%)" },
] as const;

export const ACCENT_COLORS = [
  { value: "amber", label: "Amber", color: "hsl(45 93% 47%)" },
  { value: "blue", label: "Blue", color: "hsl(221 83% 53%)" },
  { value: "cyan", label: "Cyan", color: "hsl(189 94% 43%)" },
  { value: "emerald", label: "Emerald", color: "hsl(160 84% 39%)" },
  { value: "fuchsia", label: "Fuchsia", color: "hsl(293 69% 49%)" },
  { value: "green", label: "Green", color: "hsl(142 76% 36%)" },
  { value: "indigo", label: "Indigo", color: "hsl(239 84% 67%)" },
  { value: "lime", label: "Lime", color: "hsl(84 81% 44%)" },
  { value: "orange", label: "Orange", color: "hsl(25 95% 53%)" },
  { value: "pink", label: "Pink", color: "hsl(330 81% 60%)" },
  { value: "purple", label: "Purple", color: "hsl(271 81% 56%)" },
  { value: "red", label: "Red", color: "hsl(0 84% 60%)" },
  { value: "rose", label: "Rose", color: "hsl(347 77% 50%)" },
  { value: "sky", label: "Sky", color: "hsl(199 89% 48%)" },
  { value: "teal", label: "Teal", color: "hsl(173 80% 40%)" },
  { value: "violet", label: "Violet", color: "hsl(263 70% 50%)" },
  { value: "yellow", label: "Yellow", color: "hsl(48 96% 53%)" },
] as const;

export const ICON_LIBRARIES = [
  { value: "lucide", label: "Lucide" },
  { value: "tabler", label: "Tabler Icons" },
  { value: "hugeicons", label: "HugeIcons" },
  { value: "phosphor", label: "Phosphor Icons" },
  { value: "remix", label: "Remix Icon" },
] as const;

export const FONTS = [
  { value: "inter", label: "Inter", family: "Inter, sans-serif" },
  { value: "noto-sans", label: "Noto Sans", family: "'Noto Sans', sans-serif" },
  { value: "nunito-sans", label: "Nunito Sans", family: "'Nunito Sans', sans-serif" },
  { value: "figtree", label: "Figtree", family: "Figtree, sans-serif" },
  { value: "roboto", label: "Roboto", family: "Roboto, sans-serif" },
  { value: "raleway", label: "Raleway", family: "Raleway, sans-serif" },
  { value: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { value: "public-sans", label: "Public Sans", family: "'Public Sans', sans-serif" },
  { value: "outfit", label: "Outfit", family: "Outfit, sans-serif" },
  { value: "jetbrains-mono", label: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
] as const;

export const RADIUS_OPTIONS = [
  { value: "default", label: "Default", description: "Use radius from style" },
] as const;

export const RADIUS_VALUES = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const;

export const MENU_COLORS = [
  { value: "default", label: "Default" },
  { value: "inverted", label: "Inverted" },
] as const;

export const MENU_ACCENTS = [
  { value: "subtle", label: "Subtle" },
  { value: "bold", label: "Bold" },
] as const;

// ============================================================================
// Picker Trigger Styles
// ============================================================================

export const pickerTriggerClass = cn(
  "border-foreground/10 hover:bg-muted data-expanded:bg-muted",
  "relative w-[160px] shrink-0 rounded-xl border bg-muted/50 p-2",
  "md:w-full md:rounded-lg md:border-transparent md:bg-transparent",
  "flex cursor-pointer items-center justify-between",
);

export const pickerContentClass = cn("rounded-xl border-0 p-1 shadow-md");

export const pickerRadioItemClass = cn("cursor-pointer rounded-lg py-1.5 pr-8 pl-2");
