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
        parent: s.string().optional(),
        toc: s.toc(),
      }),
    },
    shadcn: {
      name: "shadcn",
      pattern: "shadcn/**/*.mdx",
      schema: s.object({
        slug: s.slug("shadcn"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
    bazza: {
      name: "bazza",
      pattern: "bazza/**/*.mdx",
      schema: s.object({
        slug: s.slug("bazza"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
    motionPrimitives: {
      name: "motionPrimitives",
      pattern: "motion-primitives/**/*.mdx",
      schema: s.object({
        slug: s.slug("motion-primitives"),
        title: s.string(),
        description: s.string(),
        toc: s.toc(),
      }),
    },
  },
});
