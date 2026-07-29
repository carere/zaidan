import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/lib/config";
import {
  CURATED_PRESET_TOKENS,
  DEFAULT_PRESET_TOKEN,
  decodePresetToken,
  encodePresetToken,
  getPresetInstallCommand,
  normalizeOpenPresetInput,
  PRESET_TABLES_V1,
  resolveCreateLocation,
  SEMANTIC_PRESET_CONFIG,
  SEMANTIC_PRESET_TOKEN,
  sharePathForPreset,
  shufflePreset,
} from "@/lib/preset-token";

describe("immutable v1 Preset Token codec", () => {
  it("encodes the approved all-zero default canonically", () => {
    expect(encodePresetToken(DEFAULT_CONFIG)).toBe("v1-0");
    expect(decodePresetToken("v1-0")).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_PRESET_TOKEN).toBe("v1-0");
  });

  it("round-trips every value at every fixed-width field boundary", () => {
    for (const [field, values] of Object.entries(PRESET_TABLES_V1)) {
      for (const value of values) {
        const config = { ...DEFAULT_CONFIG, [field]: value };
        expect(decodePresetToken(encodePresetToken(config))).toEqual(config);
      }
    }
  });

  it("freezes default-first append-only tables within the 4/4/5/5/5/5/3/2 layout", () => {
    expect(Object.isFrozen(PRESET_TABLES_V1)).toBe(true);
    expect(Object.values(PRESET_TABLES_V1).every(Object.isFrozen)).toBe(true);
    expect(
      Object.fromEntries(Object.entries(PRESET_TABLES_V1).map(([key, values]) => [key, values[0]])),
    ).toEqual({
      style: "vega",
      baseColor: "neutral",
      theme: "neutral",
      chartColor: "neutral",
      headingFont: "inter",
      font: "inter",
      radius: "default",
      menuAccent: "subtle",
    });
    expect(Object.values(PRESET_TABLES_V1).map((values) => values.length)).toEqual([
      7, 8, 25, 25, 26, 26, 5, 2,
    ]);
    expect(PRESET_TABLES_V1).toEqual({
      style: ["vega", "nova", "maia", "lyra", "mira", "luma", "sera"],
      baseColor: ["neutral", "stone", "zinc", "gray", "mauve", "olive", "mist", "taupe"],
      theme: [
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
      ],
      chartColor: [
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
      ],
      headingFont: [
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
      ],
      font: [
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
      ],
      radius: ["default", "none", "small", "medium", "large"],
      menuAccent: ["subtle", "bold"],
    });
  });

  it.each([
    "v1-00",
    "v1-",
    "v1-000001",
    "v1-!!!!",
    "v1-zzzzzzz",
    "v2-0",
    "V1-0",
    "v1-zzzzzz",
  ])("rejects malformed, aliased, oversized, overflow, or unused-slot input: %s", (token) => {
    expect(decodePresetToken(token)).toBeNull();
  });

  it("freezes the semantic visual fixture only after encoding its approved values", () => {
    expect(Object.isFrozen(SEMANTIC_PRESET_CONFIG)).toBe(true);
    expect(SEMANTIC_PRESET_TOKEN).toBe("v1-gWzAn");
    expect(decodePresetToken(SEMANTIC_PRESET_TOKEN)).toEqual(SEMANTIC_PRESET_CONFIG);
  });
});

describe("Create URL and action contract", () => {
  const nonDefault = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });

  it("omits the default and materializes a non-default Preset Token", () => {
    expect(sharePathForPreset(DEFAULT_PRESET_TOKEN)).toBe("/create");
    expect(sharePathForPreset(nonDefault)).toBe(`/create?preset=${nonDefault}`);
  });

  it("accepts raw and flag-shaped Open Preset input only", () => {
    expect(normalizeOpenPresetInput(nonDefault)).toBe(nonDefault);
    expect(normalizeOpenPresetInput(`--preset ${nonDefault}`)).toBe(nonDefault);
    expect(normalizeOpenPresetInput(`https://zaidan.test/create?preset=${nonDefault}`)).toBeNull();
    expect(normalizeOpenPresetInput(`@zaidan/preset-${nonDefault}`)).toBeNull();
    expect(normalizeOpenPresetInput("--preset v2-0")).toBeNull();
  });

  it("generates the approved commands without changing the token", () => {
    expect(getPresetInstallCommand("pnpm", nonDefault)).toBe(
      `pnpm dlx shadcn@latest add @zaidan/preset-${nonDefault}`,
    );
    expect(getPresetInstallCommand("npm", nonDefault)).toBe(
      `npx shadcn@latest add @zaidan/preset-${nonDefault}`,
    );
    expect(getPresetInstallCommand("yarn", nonDefault)).toBe(
      `yarn dlx shadcn@latest add @zaidan/preset-${nonDefault}`,
    );
    expect(getPresetInstallCommand("bun", nonDefault)).toBe(
      `bunx --bun shadcn@latest add @zaidan/preset-${nonDefault}`,
    );
  });

  it("canonicalizes default, non-default, invalid, and unknown Create URLs", () => {
    expect(resolveCreateLocation("/create")).toMatchObject({
      config: DEFAULT_CONFIG,
      canonicalPath: "/create",
      replace: false,
      source: "default",
    });
    expect(resolveCreateLocation(`/create?preset=${nonDefault}`)).toMatchObject({
      canonicalPath: `/create?preset=${nonDefault}`,
      replace: false,
      source: "preset",
    });
    expect(resolveCreateLocation("/create?preset=v2-0&style=nova")).toMatchObject({
      config: DEFAULT_CONFIG,
      canonicalPath: "/create",
      replace: true,
      source: "invalid-preset",
    });
    expect(resolveCreateLocation("/create?unknown=1")).toMatchObject({
      canonicalPath: "/create",
      replace: true,
    });
  });

  it("migrates recognized legacy fields once and gives valid preset precedence", () => {
    const migrated = resolveCreateLocation(
      "/create?primitive=base&style=nova&baseColor=zinc&theme=violet&font=not-real&keep=1",
    );
    expect(migrated.source).toBe("legacy");
    expect(migrated.replace).toBe(true);
    expect(migrated.config).toMatchObject({
      primitive: "kobalte",
      style: "nova",
      baseColor: "zinc",
      theme: "violet",
      font: "inter",
    });
    expect(migrated.canonicalPath).toBe(sharePathForPreset(encodePresetToken(migrated.config)));

    expect(
      resolveCreateLocation(`/create?preset=${nonDefault}&style=sera&unknown=1`),
    ).toMatchObject({
      canonicalPath: `/create?preset=${nonDefault}`,
      replace: true,
      source: "preset",
      config: { style: "nova" },
    });
  });

  it("shuffles through curated tokens, excludes the current token, and preserves locks", () => {
    expect(CURATED_PRESET_TOKENS.length).toBeGreaterThan(2);
    const current = decodePresetToken(CURATED_PRESET_TOKENS[0] as string);
    expect(current).not.toBeNull();
    if (!current) return;
    const shuffled = shufflePreset(current, new Set(["style", "font"]), () => 0);
    expect(shuffled).not.toEqual(current);
    expect(shuffled.style).toBe(current.style);
    expect(shuffled.font).toBe(current.font);
    expect(shufflePreset(current, new Set(Object.keys(PRESET_TABLES_V1)), () => 0)).toEqual(
      current,
    );
  });
});
