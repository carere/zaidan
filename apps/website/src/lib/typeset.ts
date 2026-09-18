import { FONT_DEFINITIONS } from "@/lib/fonts";

/**
 * Param model for the typeset builder, ported from shadcn/ui's
 * `app/(app)/(typeset)/lib/search-params.ts`.
 *
 * Upstream uses nuqs; Zaidan uses TanStack Router search params, so the
 * parsers become {@link validateTypesetSearch} and {@link coerceTypesetValue}.
 * Everything else — option lists, defaults, message names — matches upstream
 * exactly so a shared URL means the same thing on both sites.
 */

export const TYPESET_PARAMS_MESSAGE = "typeset-params";
export const TYPESET_COMMAND_MESSAGE = "typeset-command";

export type TypesetCommand = "shuffle" | "reset" | "undo" | "redo" | "toggle-theme";

/**
 * `scale`, `measure`, and `leading` are numbers rather than numeric strings on
 * purpose. TanStack Router's default search serializer JSON-quotes a string
 * that would otherwise parse back as a number, which would put `scale=%2215%22`
 * in the address bar. Keeping them numeric produces `scale=15`, matching
 * upstream's URLs so a shared link works on either site.
 */
export const TYPESET_SIZES = [
  { value: 14, label: "14px" },
  { value: 15, label: "15px" },
  { value: 16, label: "16px" },
  { value: 18, label: "18px" },
] as const;

export const TYPESET_LEADINGS = [
  { value: 1.6, label: "Tight (1.6)" },
  { value: 1.75, label: "Regular (1.75)" },
  { value: 1.9, label: "Loose (1.9)" },
] as const;

export const TYPESET_FLOWS = [
  { value: "1em", label: "Compact (1em)" },
  { value: "1.25em", label: "Regular (1.25em)" },
  { value: "2em", label: "Airy (2em)" },
] as const;

export const TYPESET_MEASURES = [
  { value: 60, label: "60ch", width: "28em" },
  { value: 70, label: "70ch", width: "33em" },
  { value: 80, label: "80ch", width: "37em" },
  { value: 90, label: "90ch", width: "42em" },
] as const;

export const TYPESET_CONTENT_OPTIONS = [
  { value: "docs", label: "Docs" },
  { value: "chat", label: "Chat" },
  { value: "article", label: "Article" },
  { value: "changelog", label: "Changelog" },
  { value: "notes", label: "Notes" },
] as const;

export type TypesetItem = (typeof TYPESET_CONTENT_OPTIONS)[number]["value"];

/**
 * Display-only faces that read poorly as body text stay out of typeset.
 * Same exclusion list as upstream.
 */
const EXCLUDED_FONTS = ["instrument-serif", "eb-garamond", "playfair-display"];

/**
 * Zaidan loads every face through `@fontsource-variable/*` in `styles.css`,
 * so the family string is directly usable — no per-font CSS variable
 * indirection like upstream's Next font loader needs.
 */
export const TYPESET_FONTS = FONT_DEFINITIONS.filter(
  (definition) => !EXCLUDED_FONTS.includes(definition.name),
).map((definition) => ({
  id: definition.name,
  label: definition.title,
  type: definition.type,
  value: definition.family,
}));

export function findTypesetFont(id: string | null | undefined) {
  return TYPESET_FONTS.find((font) => font.id === id);
}

export function findTypesetFontDefinition(id: string | null | undefined) {
  return FONT_DEFINITIONS.find((definition) => definition.name === id);
}

/** The one source of truth for what each param accepts. */
const TYPESET_PARAM_VALUES = {
  body: TYPESET_FONTS.map((font) => font.id),
  heading: ["inherit", ...TYPESET_FONTS.map((font) => font.id)],
  mono: TYPESET_FONTS.map((font) => font.id),
  scale: TYPESET_SIZES.map((option) => option.value),
  measure: TYPESET_MEASURES.map((option) => option.value),
  flow: TYPESET_FLOWS.map((option) => option.value),
  leading: TYPESET_LEADINGS.map((option) => option.value),
  item: TYPESET_CONTENT_OPTIONS.map((option) => option.value),
} as Record<string, readonly (string | number)[]>;

export type TypesetParams = {
  body: string;
  heading: string;
  mono: string;
  scale: number;
  measure: number;
  leading: number;
  flow: string;
  item: TypesetItem;
};

export const TYPESET_DEFAULTS: TypesetParams = {
  body: "geist",
  heading: "inherit",
  mono: "geist-mono",
  scale: 15,
  measure: 80,
  flow: "1.25em",
  leading: 1.75,
  item: "docs",
};

export const TYPESET_PARAM_KEYS = Object.keys(TYPESET_DEFAULTS) as (keyof TypesetParams)[];

/** Everything but the specimen switcher — the params shuffle can randomize. */
export type LockableParam = Exclude<keyof TypesetParams, "item">;

/**
 * Narrows a raw value to the param's allowed set, returning it in the param's
 * own type (number for `scale`/`measure`/`leading`, string otherwise) or null
 * if it isn't a legal value. Accepts either representation on the way in, so
 * `?scale=15` and a postMessage carrying `15` both land.
 */
export function coerceTypesetValue(
  key: keyof TypesetParams,
  value: string | number,
): string | number | null {
  const allowed = TYPESET_PARAM_VALUES[key];
  if (!allowed) return null;
  return allowed.find((candidate) => String(candidate) === String(value)) ?? null;
}

/** Route `validateSearch`: unknown or absent values fall back to defaults. */
export function validateTypesetSearch(search: Record<string, unknown>): TypesetParams {
  const result = { ...TYPESET_DEFAULTS } as Record<string, string | number>;

  for (const key of TYPESET_PARAM_KEYS) {
    const raw = search[key];
    if (typeof raw !== "string" && typeof raw !== "number") continue;
    const coerced = coerceTypesetValue(key, raw);
    if (coerced !== null) result[key] = coerced;
  }

  return result as TypesetParams;
}

/** Absolute href for the preview iframe / "Open in New Tab". */
export function serializeTypesetSearch(path: string, params: TypesetParams) {
  const search = new URLSearchParams();
  for (const key of TYPESET_PARAM_KEYS) {
    if (key === "item") continue;
    search.set(key, String(params[key]));
  }
  return `${path}?${search.toString()}`;
}

/**
 * The preview never rewrites the typeset class — it sets these `--preview-*`
 * custom properties and a small stylesheet maps them onto `--typeset-*`.
 * That is what makes hover previews cheap.
 */
export function typesetPreviewVars(params: TypesetParams) {
  const bodyFont = findTypesetFont(params.body)?.value;

  return {
    "--preview-size": `${params.scale}px`,
    "--preview-leading": String(params.leading),
    "--preview-flow": params.flow,
    "--preview-measure": TYPESET_MEASURES.find((option) => option.value === params.measure)?.width,
    "--preview-font": bodyFont,
    "--preview-font-heading":
      params.heading === "inherit" ? bodyFont : findTypesetFont(params.heading)?.value,
    "--preview-font-mono": findTypesetFont(params.mono)?.value,
  } satisfies Record<string, string | undefined>;
}

/** Generated preset CSS shown in the Get Code panel. */
export function typesetPresetCss(params: TypesetParams) {
  const heading = params.heading === "inherit" ? params.body : params.heading;
  const family = (id: string) => findTypesetFont(id)?.value ?? "inherit";

  return `.typeset-${params.item} {
  --typeset-font-body: ${family(params.body)};
  --typeset-font-heading: ${family(heading)};
  --typeset-font-mono: ${family(params.mono)};
  --typeset-size: ${params.scale}px;
  --typeset-leading: ${params.leading};
  --typeset-flow: ${params.flow};
}`;
}
