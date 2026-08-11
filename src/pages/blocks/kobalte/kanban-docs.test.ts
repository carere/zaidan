import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./kanban.mdx", import.meta.url));
const demoNames = ["kanban-demo", "kanban-overlay", "kanban-persistence"];

describe("Kanban documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/kanban"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("className");
      expect(demo).not.toContain("sonner");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("shadcn@latest add @zaidan/kanban");
    expect(page).toContain("onValueCommit");
    expect(page).toContain("### KanbanBoard");
    expect(page).toContain("### KanbanColumn");
    expect(page).toContain("### KanbanColumnContent");
    expect(page).toContain("### KanbanColumnHandle");
    expect(page).toContain("### KanbanItem");
    expect(page).toContain("### KanbanItemHandle");
    expect(page).toContain("### KanbanOverlay");
  });
});
