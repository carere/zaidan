import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./filters.mdx", import.meta.url));
const demoNames = [
  "filters-demo",
  "filters-validation",
  "filters-trigger",
  "filters-small",
  "filters-large",
  "filters-custom-controls",
  "filters-table",
  "filters-i18n",
  "filters-virtualized",
  "filters-async-prefetch",
  "filters-async-search",
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

describe("Filters documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/filters"');

      for (const leftover of reactLeftovers) {
        expect(demo, `${name} contains React leftover ${leftover}`).not.toContain(leftover);
      }
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }
  });

  it("keeps every field and option icon lazy", async () => {
    // `icon: <Mail />` inside a config object is created eagerly and breaks
    // hydration; only the thunk form is safe. See the "Icons" section of the page.
    for (const name of demoNames) {
      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo, `${name} passes an eagerly created icon element`).not.toMatch(
        /\bicon:\s*(?!\(\)\s*=>)[(<]/,
      );
    }
  });

  it("never reaches into a sibling block", async () => {
    for (const name of demoNames) {
      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      for (const block of ["data-grid", "kanban", "event-calendar", "gantt"]) {
        expect(demo, `${name} imports the ${block} block`).not.toContain(
          `@/registry/kobalte/blocks/${block}`,
        );
      }
    }
  });

  it("documents the install command and the public API", async () => {
    const page = await readFile(pagePath, "utf8");

    expect(page).toContain("shadcn@latest add @zaidan/filters");
    expect(page).toContain("### Filters");
    expect(page).toContain("### FiltersContent");
    expect(page).toContain("### FilterFieldConfig");
    expect(page).toContain("### FilterOption");
    expect(page).toContain("### FilterI18nConfig");
    expect(page).toContain("### Helpers");
    expect(page).toContain("createFilter");
    expect(page).toContain("createFilterGroup");
    expect(page).toContain("loadOptions");
    expect(page).toContain("renderOptionList");
    expect(page).toContain("customRenderer");
    // The trigger takes a component, not an element: Solid has no cloneElement.
    expect(page).toContain("`ValidComponent`");
    expect(page).toContain("### Icons");
    expect(page).toContain("icon: () =>");
  });
});
