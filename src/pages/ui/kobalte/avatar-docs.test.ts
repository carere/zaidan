import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./avatar.mdx", import.meta.url));
const demoNames = [
  "avatar-demo",
  "avatar-basic",
  "avatar-badge",
  "avatar-badge-icon",
  "avatar-group",
  "avatar-group-count",
  "avatar-group-count-icon",
  "avatar-size",
  "avatar-dropdown",
];

describe("Avatar documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("Kobalte Image");
    expect(page).toContain("Kobalte Image API reference");
    expect(page).not.toContain("avatar-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
  });
});
