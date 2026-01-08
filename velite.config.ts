import { defineConfig, s } from "velite";

export default defineConfig({
  root: "src/pages",
  collections: {
    docs: {
      name: "docs",
      pattern: "docs/*.mdx",
      schema: s.object({
        slug: s.slug("docs"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
    ui: {
      name: "ui",
      pattern: "ui/*.mdx",
      schema: s.object({
        slug: s.slug("ui"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
  },
});
