import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { type CompileOptions, nodeTypes } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExpressiveCode, { type ExpressiveCodeTheme } from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkCodeImport from "remark-code-import";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig, s } from "velite";
import { rehypeFixExpressiveCodeJsx } from "@/lib/rehype-plugins/fix-expressive-code";
import { remarkCodeTabs } from "@/lib/remark-plugins/code-tabs";
import { remarkDirectiveContainers } from "@/lib/remark-plugins/directives";
import { remarkGithubAlertsToDirectives } from "@/lib/remark-plugins/gh-directives";
import { remarkAddClass } from "@/lib/remark-plugins/kbd";
import { remarkPackageManagerTabs } from "@/lib/remark-plugins/package-manager-tabs";
import { remarkSteps } from "@/lib/remark-plugins/steps";
import { remarkTabGroup } from "@/lib/remark-plugins/tab-group";

const rehypePlugins: CompileOptions["rehypePlugins"] = [
  [
    rehypeExpressiveCode,
    {
      themes: ["github-dark-default", "github-light-default"],
      themeCssSelector: (theme: ExpressiveCodeTheme) => `[data-kb-theme*="${theme.type}"]`,
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
      defaultProps: {
        showLineNumbers: false,
        collapseStyle: "collapsible-auto",
      },
    },
  ],
  rehypeFixExpressiveCodeJsx,
  [rehypeRaw, { passThrough: nodeTypes }],
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: "wrap", properties: { "data-auto-heading": "" } }],
];

const remarkPlugins: CompileOptions["remarkPlugins"] = [
  remarkSteps,
  remarkFrontmatter,
  remarkGfm,
  remarkGithubAlertsToDirectives,
  [remarkCodeTabs, { withJsToggle: false }],
  remarkPackageManagerTabs,
  remarkTabGroup,
  remarkDirective,
  remarkDirectiveContainers,
  remarkAddClass,
  remarkCodeImport,
];

export default defineConfig({
  mdx: {
    jsxImportSource: "solid-js/h",
    remarkPlugins,
    rehypePlugins,
  },
  root: "src/pages",
  collections: {
    docs: {
      name: "docs",
      pattern: "docs/*.mdx",
      schema: s.object({
        slug: s.slug("docs"),
        title: s.string(),
        description: s.string(),
        code: s.mdx(),
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
        code: s.mdx(),
        toc: s.toc(),
      }),
    },
  },
});
