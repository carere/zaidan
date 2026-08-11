import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./checkbox.mdx", import.meta.url));
const demoNames = [
  "checkbox-demo",
  "checkbox-invalid",
  "checkbox-basic",
  "checkbox-description",
  "checkbox-disabled",
  "checkbox-group",
  "checkbox-table",
];

describe("Checkbox documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("## API Reference");
    expect(page).toContain("`onChange`");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/checkbox"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain('from "next/');
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("checkbox-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
