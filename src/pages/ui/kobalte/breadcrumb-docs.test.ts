import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./breadcrumb.mdx", import.meta.url));
const demoNames = [
  "breadcrumb-demo",
  "breadcrumb-basic",
  "breadcrumb-separator",
  "breadcrumb-dropdown",
  "breadcrumb-ellipsis",
  "breadcrumb-link",
];

describe("Breadcrumb documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/breadcrumb"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "next/');
      expect(demo).not.toContain('from "lucide-react"');

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("Kobalte Breadcrumbs");
    expect(page).toContain("Kobalte Breadcrumbs API reference");
    expect(page).not.toContain("breadcrumb-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
