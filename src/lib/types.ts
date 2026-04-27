import type { docs } from "@velite";
import { z } from "zod";
import { FONT_DEFINITIONS, type FontName } from "@/lib/fonts";
import type { ColorMode } from "@/registry/kobalte/components/color-mode";

export const StyleSchema = z.enum(["vega", "nova", "lyra", "maia", "mira", "luma", "sera"]);
export type Style = z.infer<typeof StyleSchema>;

export const BaseColorSchema = z.enum([
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
]);
export type BaseColor = z.infer<typeof BaseColorSchema>;

const ThemeColorSchema = z.enum([
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
]);

export const ThemeSchema = z.union([BaseColorSchema, ThemeColorSchema]);
export type Theme = z.infer<typeof ThemeSchema>;

// Chart palette behaves like the theme picker: same value space, with
// "match base color palette" expressed by setting `chartColor === baseColor`.
export const ChartColorSchema = ThemeSchema;
export type ChartColor = Theme;

const FONT_NAMES = FONT_DEFINITIONS.map((f) => f.name) as [FontName, ...FontName[]];
export const FontSchema = z.enum(FONT_NAMES);
export type Font = z.infer<typeof FontSchema>;

export const RadiusSchema = z.enum(["default", "none", "small", "medium", "large"]);
export type Radius = z.infer<typeof RadiusSchema>;

export const MenuAccentSchema = z.enum(["subtle", "bold"]);
export type MenuAccent = z.infer<typeof MenuAccentSchema>;

export type LockableParam =
  | "style"
  | "baseColor"
  | "theme"
  | "chartColor"
  | "headingFont"
  | "font"
  | "radius"
  | "menuAccent";

export type TocEntry = docs["toc"];

export type IframeMessage =
  | {
      type: "design-system-params-sync";
      data: DesignSystemConfig;
    }
  | {
      type: "cmd-k-forward";
      key: "k" | "K";
    }
  | {
      type: "dark-mode-forward";
      key: "d" | "D";
    }
  | {
      type: "randomize-forward";
      key: "r" | "R";
    }
  | {
      type: "color-mode-sync";
      data: ColorMode;
    };

export type IframeMessageType = IframeMessage["type"];

export const PrimitiveSchema = z.enum(["kobalte", "base"]);

export type Primitive = z.infer<typeof PrimitiveSchema>;

export type Kind = "ui" | "blocks";

export const DesignSystemConfigSchema = z.object({
  primitive: PrimitiveSchema.optional().default("kobalte"),
  style: StyleSchema.optional().default("vega"),
  baseColor: BaseColorSchema.optional().default("neutral"),
  theme: ThemeSchema.optional().default("neutral"),
  chartColor: ChartColorSchema.optional().default("neutral"),
  font: FontSchema.optional().default("inter"),
  headingFont: FontSchema.optional().default("inter"),
  radius: RadiusSchema.optional().default("default"),
  menuAccent: MenuAccentSchema.optional().default("subtle"),
});

export type DesignSystemConfig = z.infer<typeof DesignSystemConfigSchema>;
