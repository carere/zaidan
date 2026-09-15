import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = fileURLToPath(new URL("./tabs.mdx", import.meta.url));
const docsExamplesPath = fileURLToPath(new URL("../../../lib/docs-examples.ts", import.meta.url));
const demoNames = ["tabs-demo", "tabs-line", "tabs-vertical", "tabs-disabled", "tabs-icons"];

describe("Tabs documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const [page, docsExamples] = await Promise.all([
      readFile(pagePath, "utf8"),
      readFile(docsExamplesPath, "utf8"),
    ]);

    expect(page).toContain("Kobalte Tabs");
    expect(page).toContain("https://kobalte.dev/docs/core/components/tabs");
    expect(docsExamples).toContain(
      'import.meta.glob<ExampleModule>("../registry/kobalte/examples/docs/*.tsx")',
    );
    expect(docsExamples).toContain(`../registry/kobalte/examples/docs/\${name}.tsx`);

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
    }

    expect(page).not.toContain("tabs-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
