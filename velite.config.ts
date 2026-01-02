import { defineConfig, s } from "velite";

// `s` is extended from Zod with some custom schemas,
// you can also import re-exported `z` from `velite` if you don't need these extension schemas.

export default defineConfig({
  collections: {
    docs: {
      name: "Docs", // collection type name
      pattern: "*.mdx", // content files glob pattern
      schema: s
        .object({
          title: s.string().max(99), // Zod primitive type
          slug: s.slug("docs"), // validate format, unique in posts collection
          // slug: s.path(), // auto generate slug from file path
          metadata: s.metadata(), // extract markdown reading-time, word-count, etc
          // content: s.markdown(), // transform markdown to html
          code: s.mdx({
            jsxImportSource: "solid-js/h",
          }),
        })
        // more additional fields (computed fields)
        .transform((data) => ({ ...data, permalink: `/docs/${data.slug}` })),
    },
  },
});
