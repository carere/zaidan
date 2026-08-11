import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./toggle-group.mdx", import.meta.url));
const demoNames = [
  "toggle-group-demo",
  "toggle-group-outline",
  "toggle-group-sizes",
  "toggle-group-spacing",
  "toggle-group-vertical",
  "toggle-group-disabled",
  "toggle-group-font-weight-selector",
];

describe("Toggle Group documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Kobalte Toggle Group");
    expect(page).toContain("https://kobalte.dev/docs/core/components/toggle-group");
    expect(page).toContain("Single vs. multiple selection");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain('from "next/');
      expect(demo).not.toContain("Sonner");

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("toggle-group-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
