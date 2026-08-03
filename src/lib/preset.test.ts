import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, RADII, STYLES } from "@/lib/config";
import { decodeDesignSystemPreset, encodeDesignSystemPreset } from "@/lib/preset";
import { buildPresetRegistryItem } from "@/lib/registry-preset";

describe("design system presets", () => {
  it("round-trips every supported picker", () => {
    const config = {
      ...DEFAULT_CONFIG,
      style: "nova" as const,
      baseColor: "zinc" as const,
      theme: "blue" as const,
      chartColor: "amber" as const,
      font: "geist" as const,
      headingFont: "lora" as const,
      radius: "large" as const,
      menuAccent: "bold" as const,
    };

    expect(decodeDesignSystemPreset(encodeDesignSystemPreset(config))).toEqual(config);
  });

  it("rejects malformed or unsupported presets", () => {
    expect(decodeDesignSystemPreset("not-a-preset")).toBeNull();
  });

  it("round-trips the Rhea style", () => {
    const config = {
      ...DEFAULT_CONFIG,
      style: "rhea" as const,
    };

    expect(decodeDesignSystemPreset(encodeDesignSystemPreset(config))).toEqual(config);
  });

  it("exposes the pinned style and radius catalogs", () => {
    expect(STYLES.map((style) => style.name)).toEqual([
      "vega",
      "nova",
      "maia",
      "lyra",
      "mira",
      "luma",
      "sera",
      "rhea",
    ]);
    expect(RADII.map(({ name, value }) => [name, value])).toEqual([
      ["default", ""],
      ["none", "0"],
      ["small", "0.45rem"],
      ["medium", "0.625rem"],
      ["large", "0.875rem"],
    ]);
  });

  it("builds an installable virtual registry base item", () => {
    const code = encodeDesignSystemPreset({
      ...DEFAULT_CONFIG,
      style: "sera",
      theme: "violet",
      headingFont: "lora",
    });
    const item = buildPresetRegistryItem(code);

    expect(item).toMatchObject({
      name: `preset-${code}`,
      type: "registry:base",
      extends: "none",
      registryDependencies: ["@zaidan/style-sera", "@zaidan/font-inter", "@zaidan/font-lora"],
      meta: { preset: code },
    });
    expect(item?.cssVars?.theme?.["--font-heading"]).toContain("Lora");
  });
});
