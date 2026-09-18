import {
  TYPESET_CONTENT_OPTIONS,
  TYPESET_DEFAULTS,
  TYPESET_FLOWS,
  TYPESET_FONTS,
  TYPESET_LEADINGS,
  TYPESET_MEASURES,
  TYPESET_SIZES,
  type TypesetParams,
  validateTypesetSearch,
} from "@/lib/typeset";

/**
 * A typeset code is the whole design — every picker plus the specimen — packed
 * into one short string, the way `--preset` codes work on the create page.
 *
 * Same scheme as shadcn's `encodePreset`: each field contributes its index in
 * a fixed value list, the indices are bit-packed into a single integer, and the
 * integer is base62'd behind a version letter. `a3kD9` decodes to the same
 * design forever, which is what lets `@zaidan/typeset-a3kD9` be an installable
 * registry item.
 *
 * APPEND-ONLY CONTRACT: the field order below, the order of every value list it
 * points at, and each field's bit width are frozen. Appending a value is safe
 * (as long as it still fits the field's bits); inserting, removing, or
 * reordering one silently repoints every code already in the wild. Any such
 * change needs a new version letter and an entry in {@link CODE_VERSIONS}.
 * `typeset-code.test.ts` pins the current lists so a reorder fails loudly.
 */

const FONT_IDS = TYPESET_FONTS.map((font) => font.id);
const HEADING_IDS = ["inherit", ...FONT_IDS];

type CodeField = {
  key: keyof TypesetParams;
  values: readonly (string | number)[];
  bits: number;
};

/** Frozen — see the append-only contract above. */
const CODE_FIELDS = [
  { key: "body", values: FONT_IDS, bits: 5 },
  { key: "heading", values: HEADING_IDS, bits: 5 },
  { key: "mono", values: FONT_IDS, bits: 5 },
  { key: "scale", values: TYPESET_SIZES.map((option) => option.value), bits: 3 },
  { key: "measure", values: TYPESET_MEASURES.map((option) => option.value), bits: 3 },
  { key: "leading", values: TYPESET_LEADINGS.map((option) => option.value), bits: 3 },
  { key: "flow", values: TYPESET_FLOWS.map((option) => option.value), bits: 3 },
  { key: "item", values: TYPESET_CONTENT_OPTIONS.map((option) => option.value), bits: 3 },
] as const satisfies readonly CodeField[];

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Every version this build can read; the last one is what it writes. */
const CODE_VERSIONS = ["a"] as const;
const CURRENT_VERSION = CODE_VERSIONS[CODE_VERSIONS.length - 1];

/** Widest code the packing can produce, used to reject junk early. */
const MAX_CODE_LENGTH = 10;

function toBase62(value: number) {
  if (value === 0) return "0";
  let result = "";
  let rest = value;
  while (rest > 0) {
    result = BASE62[rest % 62] + result;
    rest = Math.floor(rest / 62);
  }
  return result;
}

function fromBase62(value: string) {
  let result = 0;
  for (const character of value) {
    const index = BASE62.indexOf(character);
    if (index === -1) return -1;
    result = result * 62 + index;
  }
  return result;
}

export function encodeTypesetCode(params: TypesetParams): string {
  let packed = 0;
  let shift = 0;

  for (const field of CODE_FIELDS) {
    const index = field.values.findIndex(
      (candidate) => String(candidate) === String(params[field.key]),
    );
    packed += (index === -1 ? 0 : index) * 2 ** shift;
    shift += field.bits;
  }

  return CURRENT_VERSION + toBase62(packed);
}

export function decodeTypesetCode(code: string | undefined | null): TypesetParams | null {
  if (!code || code.length < 2 || code.length > MAX_CODE_LENGTH) return null;
  if (!CODE_VERSIONS.includes(code[0] as (typeof CODE_VERSIONS)[number])) return null;

  const packed = fromBase62(code.slice(1));
  if (packed < 0) return null;

  const params: Record<string, string | number> = {};
  let shift = 0;

  for (const field of CODE_FIELDS) {
    const index = Math.floor(packed / 2 ** shift) % 2 ** field.bits;
    // An index past the end means a newer build wrote the code; fall back to
    // the field's first value rather than rejecting the whole design.
    params[field.key] = field.values[index] ?? field.values[0];
    shift += field.bits;
  }

  // Round-trip through the param validator so the result is typed and every
  // value is one the pickers actually offer.
  return validateTypesetSearch(params);
}

export function isTypesetCode(value: string): boolean {
  return decodeTypesetCode(value) !== null;
}

// ------------------------------------------------------------------- search

/** The builder page carries one search param: the code. */
export type TypesetSearch = { typeset?: string };

/**
 * Route `validateSearch` for `/typeset`.
 *
 * A bare `/typeset` stays bare — no code in the URL until the first pick, same
 * as `/create`. Expanded params (`?body=lora&scale=16`) are still accepted so
 * links shared from upstream's typeset builder land on the right design; they
 * normalize to a code on the first change.
 */
export function validateTypesetCodeSearch(search: Record<string, unknown>): TypesetSearch {
  const code = typeof search.typeset === "string" ? search.typeset : undefined;
  if (code && decodeTypesetCode(code)) return { typeset: code };

  const hasExpandedParams = CODE_FIELDS.some((field) => {
    const raw = search[field.key];
    return typeof raw === "string" || typeof raw === "number";
  });
  if (!hasExpandedParams) return {};

  return { typeset: encodeTypesetCode(validateTypesetSearch(search)) };
}

/** The design a search state describes; defaults when there is no code. */
export function typesetParamsFromSearch(search: TypesetSearch): TypesetParams {
  return decodeTypesetCode(search.typeset) ?? TYPESET_DEFAULTS;
}

/**
 * Pulls a code out of whatever the user pasted into "Open Typeset": the bare
 * code, the registry item, or a link to the builder.
 */
export function parseTypesetCodeInput(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const registryMatch = value.match(/@zaidan\/typeset-([\w-]+)/);
  const urlCode = (() => {
    try {
      return new URL(value, "https://zaidan.carere.dev").searchParams.get("typeset");
    } catch {
      return null;
    }
  })();
  const code = registryMatch?.[1] ?? urlCode ?? value.replace(/^typeset-/, "");

  return isTypesetCode(code) ? code : null;
}
