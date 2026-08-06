import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./sidebar.mdx", import.meta.url));
const demoNames = ["sidebar-demo"];

describe("Sidebar documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("native SolidJS composition");
    expect(page).toContain("foundation: kobalte");
    expect(page).toContain("https://kobalte.dev/docs/core/components/dialog");
    expect(page).toContain("https://kobalte.dev/docs/core/components/dialog#api-reference");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "solid-js"');
      expect(demo).toContain('from "@/registry/kobalte/ui/sidebar"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain('from "next/');
      expect(demo).not.toContain("sonner");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("sidebar-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
    expect(page).not.toContain("React.");
    expect(page).not.toContain("next/");
    expect(page).not.toContain("<Callout>");
  });
});
