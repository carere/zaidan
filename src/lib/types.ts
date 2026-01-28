import type { docs } from "@velite";

export type Primitive = "kobalte" | "base";
export type Style = "vega" | "nova" | "lyra" | "maia" | "mira";
export type BaseColor = "neutral" | "stone" | "zinc" | "gray";
export type Theme =
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "green"
  | "indigo"
  | "lime"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "rose"
  | "sky"
  | "teal"
  | "violet"
  | "yellow";
export type Font = "inter" | "noto-sans" | "nunito-sans" | "figtree";
export type Radius = "none" | "small" | "medium" | "large";
export type MenuAccent = "subtle" | "bold";
export type TocEntry = docs["toc"];

export type IframeMessageType = "design-system-params-sync";

export type IframeMessage = {
  type: IframeMessageType;
  data: {
    style: Style;
    baseColor: BaseColor;
    theme: Theme;
    font: Font;
    radius: Radius;
    menuAccent: MenuAccent;
  };
};
