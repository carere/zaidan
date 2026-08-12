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

    // The manual install has to hand over every file the registry entry ships,
    // or `~/components/blocks/kanban` does not resolve for a manual installer.
    const registryPath = fileURLToPath(
      new URL("../../../registry/kobalte/registry.json", import.meta.url),
    );
    const registry = JSON.parse(await readFile(registryPath, "utf8")) as {
      items: { name: string; files: { path: string }[] }[];
    };
    const entry = registry.items.find((item) => item.name === "kanban");
    if (!entry) throw new Error("kanban registry entry not found");
    expect(entry.files.length).toBeGreaterThan(2);
    for (const file of entry.files) {
      const relative = file.path.replace("src/registry", "../../../registry");
      expect(page).toContain(`file=${relative}`);
    }

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
