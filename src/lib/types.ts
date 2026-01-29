import type { docs } from "@velite";
import { z } from "zod";
import type { ColorMode } from "./color-mode";

export const StyleSchema = z.enum(["vega", "nova", "lyra", "maia", "mira"]);
export type Style = z.infer<typeof StyleSchema>;

export const BaseColorSchema = z.enum(["neutral", "stone", "zinc", "gray"]);
export type BaseColor = z.infer<typeof BaseColorSchema>;

export const ThemeSchema = z.union([
  BaseColorSchema,
  z.enum([
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
  ]),
]);
export type Theme = z.infer<typeof ThemeSchema>;

export const FontSchema = z.enum(["inter", "noto-sans", "nunito-sans", "figtree"]);
export type Font = z.infer<typeof FontSchema>;

export const RadiusSchema = z.enum(["default", "none", "small", "medium", "large"]);
export type Radius = z.infer<typeof RadiusSchema>;

export const MenuAccentSchema = z.enum(["subtle", "bold"]);
export type MenuAccent = z.infer<typeof MenuAccentSchema>;

export type TocEntry = docs["toc"];

export type IframeMessage =
  | {
      type: "design-system-params-sync";
      data: {
        style: Style;
        baseColor: BaseColor;
        theme: Theme;
        font: Font;
        radius: Radius;
        menuAccent: MenuAccent;
      };
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

export const DesignSystemConfigSchema = z.object({
  style: StyleSchema.optional().default("vega"),
  baseColor: BaseColorSchema.optional().default("neutral"),
  theme: ThemeSchema.optional().default("neutral"),
  font: FontSchema.optional().default("inter"),
  radius: RadiusSchema.optional().default("default"),
  menuAccent: MenuAccentSchema.optional().default("bold"),
});

export type DesignSystemConfig = z.infer<typeof DesignSystemConfigSchema>;
