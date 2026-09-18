import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = fileURLToPath(new URL("./aspect-ratio.mdx", import.meta.url));
const demoNames = ["aspect-ratio-demo", "aspect-ratio-square", "aspect-ratio-portrait"];

describe("Aspect Ratio documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/aspect-ratio"');
    }

    expect(page).not.toContain("aspect-ratio-rtl");
    expect(page).not.toContain("## RTL");
  });
});
