import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./resizable.mdx", import.meta.url));
const demoNames = ["resizable-demo", "resizable-vertical", "resizable-handle"];

describe("Resizable documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Corvu Resizable");
    expect(page).toContain("https://corvu.dev/docs/primitives/resizable#api-reference");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/resizable"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "next/');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("Sonner");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("resizable-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("components/direction");
    expect(page).not.toContain("Sonner");
  });
});
