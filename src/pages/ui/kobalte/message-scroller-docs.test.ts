import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./message-scroller.mdx", import.meta.url));
const demoNames = [
  "message-scroller-demo",
  "message-scroller-anchoring",
  "message-scroller-group-chat",
  "message-scroller-previous-context",
  "message-scroller-streaming",
  "message-scroller-opening-position",
  "message-scroller-load-history",
  "message-scroller-animation",
  "message-scroller-commands",
  "message-scroller-visibility",
  "message-scroller-scrollable",
];

describe("Message Scroller documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/ui/message-scroller"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("sonner");

      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("native Solid composition");
    expect(page).toContain("Message Scroller source");
    expect(page).not.toContain("message-scroller-rtl");
    expect(page).not.toContain("## RTL");
    expect(page).not.toContain("Direction");
    expect(page).not.toContain("Sonner");
  });
});
