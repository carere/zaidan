import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./gantt.mdx", import.meta.url));
const demoNames = ["gantt-demo", "gantt-roadmap", "gantt-capacity", "gantt-status-report"];

describe("Gantt documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/gantt"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("className");
      expect(demo).not.toContain("forwardRef");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("shadcn@latest add @zaidan/gantt");
  });

  it("documents the Solid API the block actually ships", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const heading of [
      "### Gantt\n",
      "### GanttNav\n",
      "### GanttView\n",
      "### GanttBar\n",
      "### GanttApi\n",
      "## Hooks\n",
      "## Helpers\n",
      "### State options\n",
      "### Callbacks and validators\n",
      "### View configuration\n",
      "### Internationalization\n",
    ]) {
      expect(page).toContain(heading);
    }

    // Solid divergences from the React original: accessors, a callback apiRef,
    // `class` over `className`, and JSX.Element over ReactNode.
    expect(page).toContain("`(api: GanttApi<TData>) => void`");
    expect(page).toContain("Accessor");
    expect(page).not.toContain("ReactNode");
    expect(page).not.toContain("useRender.RenderProp");
    expect(page).not.toContain("useGanttSettingsVersion");
    // `classNames` is the shadcn slot map and stays; a bare `className` prop
    // row would be a port leftover.
    expect(page).not.toContain("| `className`");
  });
});
