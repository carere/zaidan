import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defineConfig, s } from "velite";

export default defineConfig({
  mdx: {
    jsxImportSource: "solid-js/h",
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: "github-dark" }]],
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
        code: s.mdx(),
      }),
    },
  },
});
