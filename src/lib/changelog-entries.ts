import type { MdxModule } from "@/lib/types";

// Kept out of the route module on purpose. The router code-splitter rewrites a
// route into virtual modules whose ids carry a `?tsr-split=` query, and Vite's
// dependency scanner derives the parser language from `path.extname(id)`
// without stripping that query. A module holding both `import.meta.glob` and
// JSX therefore gets scanned with JSX disabled, which crashes the scan and
// silently disables dependency pre-bundling for the whole dev server. A plain
// .ts module has no query and no JSX, so neither half of that applies.
const modules = import.meta.glob<MdxModule>("../pages/changelog/*.mdx", { eager: true });

const componentBySlug: Record<string, MdxModule["default"]> = {};

for (const [path, mod] of Object.entries(modules)) {
  const slug = path.match(/([^/]+)\.mdx$/)?.[1];
  if (slug) componentBySlug[slug] = mod.default;
}

export function getChangelogEntry(slug: string) {
  return componentBySlug[slug];
}
