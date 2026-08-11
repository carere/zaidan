import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./badge.mdx", import.meta.url));
const demoNames = [
  "badge-demo",
  "badge-variants",
  "badge-status",
  "badge-icon",
  "badge-spinner",
  "badge-link",
  "badge-colors",
];

describe("Badge documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Kobalte Badge");
    expect(page).toContain("https://kobalte.dev/docs/core/components/badge#api-reference");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/badge"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("badge-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });

  it("backs every declared variant with a rule in all eight styles", async () => {
    const sourcePath = fileURLToPath(
      new URL("../../../registry/kobalte/ui/badge.tsx", import.meta.url),
    );
    const source = await readFile(sourcePath, "utf8");

    const variantClasses = [...source.matchAll(/"(z-badge-variant-[a-z-]+)"/g)].map((m) => m[1]);
    expect(variantClasses.length).toBeGreaterThanOrEqual(16);

    const styles = ["vega", "nova", "lyra", "maia", "mira", "luma", "rhea", "sera"];

    for (const style of styles) {
      const stylePath = fileURLToPath(
        new URL(`../../../registry/kobalte/styles/style-${style}.css`, import.meta.url),
      );
      const css = await readFile(stylePath, "utf8");

      for (const variantClass of variantClasses) {
        expect(css, `style-${style}.css is missing .${variantClass}`).toContain(
          `.${variantClass} {`,
        );
      }
    }
  });
});
