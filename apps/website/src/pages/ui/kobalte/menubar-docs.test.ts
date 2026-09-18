import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./menubar.mdx", import.meta.url));
const demoNames = [
  "menubar-demo",
  "menubar-checkbox",
  "menubar-radio",
  "menubar-submenu",
  "menubar-icons",
];

describe("Menubar documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Kobalte Menubar");
    expect(page).toContain("https://kobalte.dev/docs/core/components/menubar#api-reference");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/menubar"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain('from "next/');

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("menubar-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
