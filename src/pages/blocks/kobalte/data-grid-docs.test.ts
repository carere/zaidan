import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./data-grid.mdx", import.meta.url));
const demoNames = [
  "data-grid-demo",
  "data-grid-cell-border",
  "data-grid-dense",
  "data-grid-light",
  "data-grid-striped",
  "data-grid-auto-width",
  "data-grid-row-selection",
  "data-grid-tree-rows",
];

const reactLeftovers = [
  "className",
  "forwardRef",
  'from "react"',
  'from "lucide-react"',
  "React.",
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
];

describe("Data Grid documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/data-grid"');
      expect(demo).toContain('from "@tanstack/solid-table"');

      for (const leftover of reactLeftovers) {
        expect(demo, `${name}.tsx contains React leftover ${leftover}`).not.toContain(leftover);
      }
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }
  });

  it("documents the install command and the block's API surface", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("shadcn@latest add @zaidan/data-grid");
    expect(page).toContain("@tanstack/solid-table @tanstack/solid-virtual @dnd-kit/solid");

    for (const heading of [
      "### DataGrid",
      "### DataGridContainer",
      "### DataGridScrollArea",
      "### DataGridTable",
      "### DataGridPagination",
      "### DataGridColumnHeader",
      "### DataGridColumnFilter",
      "### DataGridColumnVisibility",
      "### DataGridTableDnd",
      "### DataGridTableDndRows",
      "### DataGridTableVirtual",
      "### DataGridTableRowPin",
      "### DataGridTableRowExpand",
      "### DataGridTableFoot",
      "### DOM Attributes",
    ]) {
      expect(page).toContain(heading);
    }

    // The Solid API, not the React one it was ported from.
    expect(page).toContain("createTable");
    expect(page).toContain("dataGridFeatures");
    expect(page).toContain("table.store.state");
    expect(page).not.toContain("useTable(");
    expect(page).not.toContain("@tanstack/react-table");
  });
});
