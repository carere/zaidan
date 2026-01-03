import { defineConfig, s } from "velite";

export default defineConfig({
  mdx: {
    jsxImportSource: "solid-js/h",
  },
  collections: {
    docs: {
      name: "Docs", // collection type name
      pattern: "*.mdx", // content files glob pattern
      schema: s.object({
        title: s.string().max(99), // Zod primitive type
        slug: s.slug("docs"), // validate format, unique in posts collection
        // slug: s.path(), // auto generate slug from file path
        metadata: s.metadata(), // extract markdown reading-time, word-count, etc
        // content: s.markdown(), // transform markdown to html
        code: s.mdx(),
      }),
    },
  },
});
