import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./separator.mdx", import.meta.url));
const demoNames = ["separator-demo", "separator-vertical", "separator-menu", "separator-list"];

describe("Separator documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("Kobalte Separator");
    expect(page).toContain("foundation: kobalte");
    expect(page).toContain("https://kobalte.dev/docs/core/components/separator");
    expect(page).toContain("https://kobalte.dev/docs/core/components/separator#api-reference");
    expect(page).toContain("@kobalte/core");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/separator"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "next/');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("Sonner");

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).not.toContain("separator-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
    expect(page).not.toContain("Next.js");
  });
});
