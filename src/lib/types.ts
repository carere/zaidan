import type { docs } from "@velite";
import type { ColorMode } from "./color-mode";

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
