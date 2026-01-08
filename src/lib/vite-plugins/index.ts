// ty vinxi :)

import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { type CompileOptions, compile, nodeTypes } from "@mdx-js/mdx";
import { transform } from "esbuild";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExpressiveCode, { type ExpressiveCodeTheme } from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkCodeImport from "remark-code-import";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import { VFile } from "vfile";
import type { Plugin as VitePlugin } from "vite";
import { rehypeFixExpressiveCodeJsx } from "../rehype-plugins/fix-expressive-code";
import { remarkCodeTabs } from "../remark-plugins/code-tabs";
import { remarkDirectiveContainers } from "../remark-plugins/directives";
import { remarkGithubAlertsToDirectives } from "../remark-plugins/gh-directives";
import { remarkAddClass } from "../remark-plugins/kbd";
import { remarkPackageManagerTabs } from "../remark-plugins/package-manager-tabs";
import { remarkSteps } from "../remark-plugins/steps";
import { remarkTabGroup } from "../remark-plugins/tab-group";

async function jsxToES2019(code_jsx: string) {
  // We use `esbuild` ourselves instead of letting Vite doing the esbuild transform,
  // because there don't seem to be a way to change the esbuild options for specific
  // files only: https://vitejs.dev/config/#esbuild

  /* Uncomment this to inspect the type `TransformOptions`
  type TransformOptions = Pick<Parameters<typeof esBuild.transform>, 1>[1];
  let t: TransformOptions;
  t!.format
  t!.jsxFactory
  //*/

  let { code: code_es2019 } = await transform(code_jsx, {
    loader: "jsx",
    jsxFactory: "mdx",
    target: "es2019",
  });

  // TODO stabilize this bugfix
  code_es2019 = code_es2019.replace(
    "export default function MDXContent",
    "export default MDXContent; function MDXContent",
  );

  return code_es2019;
}

export const rehypePlugins: Pluggable[] = [
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

export const remarkPlugins: Pluggable[] = [
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

export default function mdx(mdxOptions: CompileOptions) {
  const mdxPlugin: VitePlugin = {
    name: "vite-plugin-mdx",
    // I can't think of any reason why a plugin would need to run before mdx; let's make sure `vite-plugin-mdx` runs first.
    enforce: "pre",
    async transform(_code, id) {
      const [path, _] = id.split("?");
      if (/\.mdx?$/.test(path)) {
        const input = new VFile({ value: _code, path });
        const code_jsx = await compile(input, {
          ...mdxOptions,
          remarkPlugins,
          rehypePlugins,
        });
        const code = !mdxOptions?.jsx
          ? await jsxToES2019(code_jsx.toString())
          : code_jsx.toString();
        return { code, map: { mappings: "" } };
      }
    },
  };

  return [mdxPlugin];
}
