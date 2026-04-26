import { defineConfig, s } from "velite";

export default defineConfig({
  root: "src/pages",
  collections: {
    docs: {
      name: "docs",
      pattern: "docs/**/*.mdx",
      schema: s.object({
        slug: s.slug("docs"),
        title: s.string(),
        description: s.string(),
        order: s.number().optional(),
        parent: s.string().optional(),
        toc: s.toc(),
      }),
    },
    ui: {
      name: "ui",
      pattern: "ui/**/*.mdx",
      schema: s.object({
        slug: s.slug("ui"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
    blocks: {
      name: "blocks",
      pattern: "blocks/**/*.mdx",
      schema: s.object({
        slug: s.slug("blocks"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
  },
});
