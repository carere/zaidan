import { defineConfig, s } from "velite";

export default defineConfig({
  mdx: {
    jsxImportSource: "solid-js/h",
  },
  root: "src/pages",
  collections: {
    docs: {
      name: "docs",
      pattern: "docs/*.mdx",
      schema: s.object({
        slug: s.slug("docs"),
        title: s.string(),
        code: s.mdx(),
      }),
    },
    ui: {
      name: "ui",
      pattern: "ui/*.mdx",
      schema: s.object({
        slug: s.slug("ui"),
        title: s.string(),
        example: s.string(),
        code: s.mdx(),
      }),
    },
  },
});
