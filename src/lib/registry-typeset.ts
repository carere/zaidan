import { type RegistryItem, registryItemSchema } from "shadcn/schema";
import { findTypesetFontDefinition } from "@/lib/typeset";
import { decodeTypesetCode } from "@/lib/typeset-code";

/**
 * Builds the virtual `@zaidan/typeset-<code>` registry item: the typeset
 * stylesheet, the faces the design uses, and the `.typeset-<item>` preset
 * class, in one installable item.
 *
 * The preset lands in `css` rather than `cssVars` because these variables live
 * on a class, not on `:root`.
 */
export function buildTypesetRegistryItem(code: string): RegistryItem | null {
  const params = decodeTypesetCode(code);
  if (!params) return null;

  const headingId = params.heading === "inherit" ? params.body : params.heading;
  const fonts = [...new Set([params.body, headingId, params.mono])].map((id) =>
    findTypesetFontDefinition(id),
  );
  if (fonts.some((font) => font === undefined)) return null;

  const family = (id: string) => findTypesetFontDefinition(id)?.family ?? "inherit";

  return registryItemSchema.parse({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `typeset-${code}`,
    title: "Zaidan typeset preset",
    type: "registry:theme",
    registryDependencies: ["@zaidan/typeset", ...fonts.map((font) => `@zaidan/font-${font?.name}`)],
    css: {
      "@layer components": {
        [`.typeset-${params.item}`]: {
          "--typeset-font-body": family(params.body),
          "--typeset-font-heading": family(headingId),
          "--typeset-font-mono": family(params.mono),
          "--typeset-size": `${params.scale}px`,
          "--typeset-leading": String(params.leading),
          "--typeset-flow": params.flow,
        },
      },
    },
    meta: {
      typeset: code,
      params,
    },
  });
}
