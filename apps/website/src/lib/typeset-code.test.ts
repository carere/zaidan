import { describe, expect, it } from "vitest";
import { buildTypesetRegistryItem } from "@/lib/registry-typeset";
import {
  TYPESET_CONTENT_OPTIONS,
  TYPESET_DEFAULTS,
  TYPESET_FLOWS,
  TYPESET_FONTS,
  TYPESET_LEADINGS,
  TYPESET_MEASURES,
  TYPESET_SIZES,
  type TypesetParams,
} from "@/lib/typeset";
import {
  decodeTypesetCode,
  encodeTypesetCode,
  parseTypesetCodeInput,
  typesetParamsFromSearch,
  validateTypesetCodeSearch,
} from "@/lib/typeset-code";

describe("typeset codes", () => {
  it("round-trips every picker, specimen included", () => {
    const params: TypesetParams = {
      body: "lora",
      heading: "space-grotesk",
      mono: "jetbrains-mono",
      scale: 18,
      measure: 60,
      leading: 1.9,
      flow: "2em",
      item: "changelog",
    };

    expect(decodeTypesetCode(encodeTypesetCode(params))).toEqual(params);
  });

  it("round-trips the defaults and every single-field change", () => {
    expect(decodeTypesetCode(encodeTypesetCode(TYPESET_DEFAULTS))).toEqual(TYPESET_DEFAULTS);

    const changes: Partial<TypesetParams>[] = [
      ...TYPESET_FONTS.map((font) => ({ body: font.id })),
      ...TYPESET_FONTS.map((font) => ({ heading: font.id })),
      ...TYPESET_FONTS.map((font) => ({ mono: font.id })),
      ...TYPESET_SIZES.map((option) => ({ scale: option.value })),
      ...TYPESET_MEASURES.map((option) => ({ measure: option.value })),
      ...TYPESET_LEADINGS.map((option) => ({ leading: option.value })),
      ...TYPESET_FLOWS.map((option) => ({ flow: option.value })),
      ...TYPESET_CONTENT_OPTIONS.map((option) => ({ item: option.value })),
    ];

    for (const change of changes) {
      const params = { ...TYPESET_DEFAULTS, ...change };
      expect(decodeTypesetCode(encodeTypesetCode(params))).toEqual(params);
    }
  });

  it("stays short enough to paste", () => {
    expect(encodeTypesetCode(TYPESET_DEFAULTS).length).toBeLessThanOrEqual(6);
  });

  it("rejects malformed codes", () => {
    expect(decodeTypesetCode("")).toBeNull();
    expect(decodeTypesetCode("z3kD9")).toBeNull(); // unknown version letter
    expect(decodeTypesetCode("a$$$")).toBeNull(); // not base62
    expect(decodeTypesetCode("aaaaaaaaaaaaaa")).toBeNull(); // too long
  });

  /**
   * The append-only contract. These lists are the alphabet every code in the
   * wild was written against: appending is safe, reordering is not. If this
   * fails, either restore the order or add a new version letter in
   * `typeset-code.ts` and keep the old one readable.
   */
  it("pins the encoded value order", () => {
    expect(TYPESET_FONTS.map((font) => font.id)).toEqual([
      "geist",
      "inter",
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
    ]);
    expect(TYPESET_SIZES.map((option) => option.value)).toEqual([14, 15, 16, 18]);
    expect(TYPESET_MEASURES.map((option) => option.value)).toEqual([60, 70, 80, 90]);
    expect(TYPESET_LEADINGS.map((option) => option.value)).toEqual([1.6, 1.75, 1.9]);
    expect(TYPESET_FLOWS.map((option) => option.value)).toEqual(["1em", "1.25em", "2em"]);
    expect(TYPESET_CONTENT_OPTIONS.map((option) => option.value)).toEqual([
      "docs",
      "chat",
      "article",
      "changelog",
      "notes",
    ]);
  });

  it("pins a known code so the packing itself cannot drift", () => {
    expect(encodeTypesetCode(TYPESET_DEFAULTS)).toBe("a1JbnM");
  });
});

describe("typeset search", () => {
  it("leaves a bare /typeset bare", () => {
    expect(validateTypesetCodeSearch({})).toEqual({});
    expect(typesetParamsFromSearch({})).toEqual(TYPESET_DEFAULTS);
  });

  it("keeps a valid code and drops a broken one", () => {
    const code = encodeTypesetCode({ ...TYPESET_DEFAULTS, body: "lora" });

    expect(validateTypesetCodeSearch({ typeset: code })).toEqual({ typeset: code });
    expect(validateTypesetCodeSearch({ typeset: "not-a-code" })).toEqual({});
  });

  it("adopts expanded params so upstream links still land", () => {
    const search = validateTypesetCodeSearch({ body: "lora", scale: 16, item: "notes" });

    expect(typesetParamsFromSearch(search)).toEqual({
      ...TYPESET_DEFAULTS,
      body: "lora",
      scale: 16,
      item: "notes",
    });
  });

  it("reads a code out of whatever was pasted", () => {
    const code = encodeTypesetCode({ ...TYPESET_DEFAULTS, mono: "jetbrains-mono" });

    expect(parseTypesetCodeInput(code)).toBe(code);
    expect(parseTypesetCodeInput(`  ${code} `)).toBe(code);
    expect(parseTypesetCodeInput(`typeset-${code}`)).toBe(code);
    expect(parseTypesetCodeInput(`bunx shadcn add @zaidan/typeset-${code}`)).toBe(code);
    expect(parseTypesetCodeInput(`https://zaidan.carere.dev/typeset?typeset=${code}`)).toBe(code);
    expect(parseTypesetCodeInput("nonsense!")).toBeNull();
  });
});

describe("typeset registry item", () => {
  it("builds an installable virtual item", () => {
    const code = encodeTypesetCode({
      ...TYPESET_DEFAULTS,
      body: "lora",
      heading: "space-grotesk",
      mono: "jetbrains-mono",
      item: "notes",
    });
    const item = buildTypesetRegistryItem(code);

    expect(item).toMatchObject({
      name: `typeset-${code}`,
      type: "registry:theme",
      registryDependencies: [
        "@zaidan/typeset",
        "@zaidan/font-lora",
        "@zaidan/font-space-grotesk",
        "@zaidan/font-jetbrains-mono",
      ],
      meta: { typeset: code },
    });

    const preset = item?.css?.["@layer components"][".typeset-notes"];
    expect(preset["--typeset-font-body"]).toContain("Lora");
    expect(preset["--typeset-font-heading"]).toContain("Space Grotesk");
    expect(preset["--typeset-font-mono"]).toContain("JetBrains Mono");
    expect(preset["--typeset-size"]).toBe("15px");
  });

  it("resolves an inherited heading to the body face", () => {
    const code = encodeTypesetCode({ ...TYPESET_DEFAULTS, body: "lora", heading: "inherit" });
    const item = buildTypesetRegistryItem(code);

    expect(item?.registryDependencies).toEqual([
      "@zaidan/typeset",
      "@zaidan/font-lora",
      "@zaidan/font-geist-mono",
    ]);
    expect(item?.css?.["@layer components"][".typeset-docs"]["--typeset-font-heading"]).toContain(
      "Lora",
    );
  });

  it("rejects a code it cannot decode", () => {
    expect(buildTypesetRegistryItem("not-a-code")).toBeNull();
  });
});
