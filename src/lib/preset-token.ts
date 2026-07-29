import { DEFAULT_CONFIG } from "@/lib/config";
import type {
  BaseColor,
  ChartColor,
  DesignSystemConfig,
  Font,
  LockableParam,
  MenuAccent,
  Radius,
  Style,
  Theme,
} from "@/lib/types";

const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE62_RADIX = 62n;
const MAX_V1_VALUE = (1n << 33n) - 1n;

const freeze = <T extends readonly string[]>(values: T): T => Object.freeze(values);

const themeValues = freeze([
  "neutral",
  "stone",
  "zinc",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
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
] as const satisfies readonly Theme[]);

const fontValues = freeze([
  "inter",
  "geist",
  "noto-sans",
  "nunito-sans",
  "figtree",
  "roboto",
  "raleway",
  "dm-sans",
  "public-sans",
  "outfit",
  "oxanium",
  "manrope",
  "space-grotesk",
  "montserrat",
  "ibm-plex-sans",
  "source-sans-3",
  "instrument-sans",
  "jetbrains-mono",
  "geist-mono",
  "noto-serif",
  "roboto-slab",
  "merriweather",
  "lora",
  "playfair-display",
  "eb-garamond",
  "instrument-serif",
] as const satisfies readonly Font[]);

/**
 * Immutable v1 value tables. Defaults stay at index zero and new values may
 * only be appended. Changing an existing position requires a new codec version.
 */
export const PRESET_TABLES_V1 = Object.freeze({
  style: freeze([
    "vega",
    "nova",
    "maia",
    "lyra",
    "mira",
    "luma",
    "sera",
  ] as const satisfies readonly Style[]),
  baseColor: freeze([
    "neutral",
    "stone",
    "zinc",
    "gray",
    "mauve",
    "olive",
    "mist",
    "taupe",
  ] as const satisfies readonly BaseColor[]),
  theme: themeValues,
  chartColor: themeValues as readonly ChartColor[],
  headingFont: fontValues,
  font: fontValues,
  radius: freeze([
    "default",
    "none",
    "small",
    "medium",
    "large",
  ] as const satisfies readonly Radius[]),
  menuAccent: freeze(["subtle", "bold"] as const satisfies readonly MenuAccent[]),
});

type PresetField = keyof typeof PRESET_TABLES_V1;

const FIELD_LAYOUT = Object.freeze([
  ["style", 4],
  ["baseColor", 4],
  ["theme", 5],
  ["chartColor", 5],
  ["headingFont", 5],
  ["font", 5],
  ["radius", 3],
  ["menuAccent", 2],
] as const satisfies readonly (readonly [PresetField, number])[]);

const encodeBase62 = (input: bigint) => {
  if (input === 0n) return "0";
  let value = input;
  let output = "";
  while (value > 0n) {
    output = BASE62_ALPHABET[Number(value % BASE62_RADIX)] + output;
    value /= BASE62_RADIX;
  }
  return output;
};

const decodeBase62 = (input: string) => {
  let value = 0n;
  for (const character of input) {
    const digit = BASE62_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    value = value * BASE62_RADIX + BigInt(digit);
  }
  return value;
};

export function encodePresetToken(config: DesignSystemConfig) {
  let packed = 0n;
  for (const [field, width] of FIELD_LAYOUT) {
    const table = PRESET_TABLES_V1[field] as readonly string[];
    const index = table.indexOf(config[field]);
    if (index < 0) throw new TypeError(`Unsupported v1 ${field} value: ${config[field]}`);
    packed = (packed << BigInt(width)) | BigInt(index);
  }
  return `v1-${encodeBase62(packed)}`;
}

export function decodePresetToken(token: string): DesignSystemConfig | null {
  const match = /^v1-([0-9A-Za-z]{1,6})$/.exec(token);
  if (!match) return null;
  const payload = match[1] as string;
  if (payload.length > 1 && payload.startsWith("0")) return null;
  const decoded = decodeBase62(payload);
  if (decoded === null || decoded > MAX_V1_VALUE) return null;

  let packed = decoded;
  const values: Partial<Record<PresetField, string>> = {};
  for (const [field, width] of [...FIELD_LAYOUT].reverse()) {
    const mask = (1n << BigInt(width)) - 1n;
    const index = Number(packed & mask);
    const value = (PRESET_TABLES_V1[field] as readonly string[])[index];
    if (value === undefined) return null;
    values[field] = value;
    packed >>= BigInt(width);
  }
  if (packed !== 0n) return null;

  const config = {
    primitive: "kobalte",
    style: values.style,
    baseColor: values.baseColor,
    theme: values.theme,
    chartColor: values.chartColor,
    headingFont: values.headingFont,
    font: values.font,
    radius: values.radius,
    menuAccent: values.menuAccent,
  } as DesignSystemConfig;

  return encodePresetToken(config) === token ? config : null;
}

export const DEFAULT_PRESET_TOKEN = encodePresetToken(DEFAULT_CONFIG);

/** Stable non-default fixture used to verify the complete install/build pipeline. */
export const SEMANTIC_PRESET_CONFIG: DesignSystemConfig = Object.freeze({
  ...DEFAULT_CONFIG,
  style: "nova",
  baseColor: "zinc",
  theme: "violet",
  chartColor: "emerald",
  headingFont: "oxanium",
  font: "geist",
  radius: "large",
  menuAccent: "bold",
});
export const SEMANTIC_PRESET_TOKEN = encodePresetToken(SEMANTIC_PRESET_CONFIG);

export const sharePathForPreset = (token: string) =>
  token === DEFAULT_PRESET_TOKEN ? "/create" : `/create?preset=${token}`;

export const previewPathForPreset = (token: string) =>
  token === DEFAULT_PRESET_TOKEN ? "/preview/create" : `/preview/create?preset=${token}`;

export const copyPresetArgument = (token: string) => `--preset ${token}`;

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export function getPresetInstallCommand(packageManager: PackageManager, token: string) {
  if (!decodePresetToken(token)) throw new TypeError(`Invalid Preset Token: ${token}`);
  const item = `@zaidan/preset-${token}`;
  if (packageManager === "pnpm") return `pnpm dlx shadcn@latest add ${item}`;
  if (packageManager === "npm") return `npx shadcn@latest add ${item}`;
  if (packageManager === "yarn") return `yarn dlx shadcn@latest add ${item}`;
  return `bunx --bun shadcn@latest add ${item}`;
}

export function normalizeOpenPresetInput(input: string) {
  const trimmed = input.trim();
  const candidate = trimmed.startsWith("--preset ")
    ? trimmed.slice("--preset ".length).trim()
    : trimmed;
  if (candidate.includes(" ") || (candidate !== trimmed && !trimmed.startsWith("--preset "))) {
    return null;
  }
  return decodePresetToken(candidate) ? candidate : null;
}

const legacyFields = new Set<PresetField>(Object.keys(PRESET_TABLES_V1) as PresetField[]);
const LEGACY_KEYS = new Set<string>(["primitive", ...legacyFields]);

export type CreateLocationResolution = {
  config: DesignSystemConfig;
  token: string;
  canonicalPath: string;
  replace: boolean;
  source: "default" | "preset" | "invalid-preset" | "legacy";
};

export function resolveCreateLocation(input: string): CreateLocationResolution {
  const url = new URL(input, "https://zaidan.invalid");
  const presetValues = url.searchParams.getAll("preset");
  if (presetValues.length > 0) {
    const token = presetValues.length === 1 ? presetValues[0] : undefined;
    const config = token ? decodePresetToken(token) : null;
    if (!config) {
      return {
        config: DEFAULT_CONFIG,
        token: DEFAULT_PRESET_TOKEN,
        canonicalPath: "/create",
        replace: true,
        source: "invalid-preset",
      };
    }
    const canonicalPath = sharePathForPreset(token as string);
    return {
      config,
      token: token as string,
      canonicalPath,
      replace: `${url.pathname}${url.search}` !== canonicalPath,
      source: "preset",
    };
  }

  const hasLegacy = [...url.searchParams.keys()].some((key) => LEGACY_KEYS.has(key));
  if (hasLegacy) {
    const config = { ...DEFAULT_CONFIG };
    for (const field of legacyFields) {
      const candidate = url.searchParams.get(field);
      if (candidate && (PRESET_TABLES_V1[field] as readonly string[]).includes(candidate)) {
        Object.assign(config, { [field]: candidate });
      }
    }
    const token = encodePresetToken(config);
    return {
      config,
      token,
      canonicalPath: sharePathForPreset(token),
      replace: true,
      source: "legacy",
    };
  }

  return {
    config: DEFAULT_CONFIG,
    token: DEFAULT_PRESET_TOKEN,
    canonicalPath: "/create",
    replace: url.pathname !== "/create" || url.search.length > 0,
    source: "default",
  };
}

const curatedConfigs: readonly DesignSystemConfig[] = [
  SEMANTIC_PRESET_CONFIG,
  {
    ...DEFAULT_CONFIG,
    style: "maia",
    baseColor: "stone",
    theme: "rose",
    chartColor: "orange",
    headingFont: "playfair-display",
    font: "instrument-sans",
    radius: "large",
  },
  {
    ...DEFAULT_CONFIG,
    style: "lyra",
    baseColor: "gray",
    theme: "blue",
    chartColor: "cyan",
    headingFont: "jetbrains-mono",
    font: "ibm-plex-sans",
    radius: "none",
    menuAccent: "bold",
  },
  {
    ...DEFAULT_CONFIG,
    style: "sera",
    baseColor: "mauve",
    theme: "fuchsia",
    chartColor: "purple",
    headingFont: "instrument-serif",
    font: "source-sans-3",
    radius: "small",
  },
];

export const CURATED_PRESET_TOKENS = Object.freeze(curatedConfigs.map(encodePresetToken));

export function shufflePreset(
  current: DesignSystemConfig,
  locks: ReadonlySet<string>,
  random: () => number = Math.random,
) {
  const fields = Object.keys(PRESET_TABLES_V1) as PresetField[];
  if (fields.every((field) => locks.has(field))) return current;
  const candidates = curatedConfigs
    .map((candidate) => {
      const next = { ...candidate };
      for (const field of fields) {
        if (locks.has(field as LockableParam)) Object.assign(next, { [field]: current[field] });
      }
      return next;
    })
    .filter((candidate) => encodePresetToken(candidate) !== encodePresetToken(current));
  if (candidates.length === 0) return current;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length),
  );
  return candidates[index] as DesignSystemConfig;
}
