import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./drawer.mdx", import.meta.url));
const demoNames = [
  "drawer-demo",
  "drawer-sides",
  "drawer-swipe-handle",
  "drawer-nested",
  "drawer-non-modal",
  "drawer-snap-points",
  "drawer-dialog",
];

describe("Drawer documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Corvu Drawer");
    expect(page).toContain("https://corvu.dev/docs/primitives/drawer#api-reference");

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
      expect(demo).not.toContain("sonner");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("drawer-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("components/direction");
    expect(page).not.toContain("Sonner");
  });
});
