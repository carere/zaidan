export interface FontConfig {
  name: string;
  value: string;
  fontFamily: string;
}

export const FONTS: FontConfig[] = [
  { name: "Inter", value: "inter", fontFamily: '"Inter Variable", sans-serif' },
  { name: "Noto Sans", value: "noto-sans", fontFamily: '"Noto Sans Variable", sans-serif' },
  { name: "Nunito Sans", value: "nunito-sans", fontFamily: '"Nunito Sans Variable", sans-serif' },
  { name: "Figtree", value: "figtree", fontFamily: '"Figtree Variable", sans-serif' },
];
