import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { type CompileOptions, nodeTypes } from "@mdx-js/mdx";
import ecTwoSlash from "expressive-code-twoslash";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExpressiveCode, { type ExpressiveCodeTheme } from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { convertCompilerOptionsFromJson } from "typescript";
import { defineConfig, s } from "velite";
import { rehypeFixExpressiveCodeJsx } from "@/lib/rehype-plugins/fix-expressive-code";
import { remarkCodeTabs } from "@/lib/remark-plugins/code-tabs";
import { remarkDirectiveContainers } from "@/lib/remark-plugins/directives";
import { remarkGithubAlertsToDirectives } from "@/lib/remark-plugins/gh-directives";
import { remarkInlineFrontmatter } from "@/lib/remark-plugins/inline-frontmatter";
import { remarkIssueAutolink } from "@/lib/remark-plugins/issue-autolink";
import { remarkAddClass } from "@/lib/remark-plugins/kbd";
import { remarkMdxFrontmatter } from "@/lib/remark-plugins/mdx-frontmatter";
import { remarkPackageManagerTabs } from "@/lib/remark-plugins/package-manager-tabs";
import { remarkSteps } from "@/lib/remark-plugins/steps";
import { remarkTabGroup } from "@/lib/remark-plugins/tab-group";
import { remarkTOC } from "@/lib/remark-plugins/toc";

const rehypePlugins: CompileOptions["rehypePlugins"] = [
  [
    rehypeExpressiveCode,
    {
      themes: ["github-dark-default", "github-light-default"],
      themeCssSelector: (theme: ExpressiveCodeTheme) => `[data-kb-theme*="${theme.type}"]`,
      plugins: [
        pluginCollapsibleSections(),
        pluginLineNumbers(),
        ecTwoSlash({
          twoslashOptions: {
            compilerOptions: {
              ...convertCompilerOptionsFromJson(
                {
                  allowSyntheticDefaultImports: true,
                  esModuleInterop: true,
                  target: "ESNext",
                  module: "ESNext",
                  lib: ["dom", "esnext"],
                  jsxImportSource: "solid-js",
                  jsx: "preserve",
                },
                ".",
              ).options,
            },
          },
        }),
      ],
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
  remarkMdxFrontmatter,
  remarkInlineFrontmatter,
  remarkGfm,
  remarkGithubAlertsToDirectives,
  [remarkCodeTabs, { withJsToggle: false }],
  remarkPackageManagerTabs,
  remarkTabGroup,
  remarkDirective,
  remarkTOC,
  remarkDirectiveContainers,
  remarkAddClass,
  remarkIssueAutolink,
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
