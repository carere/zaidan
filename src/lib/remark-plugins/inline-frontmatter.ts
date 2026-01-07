import { SKIP, visit } from "unist-util-visit";

export function remarkInlineFrontmatter() {
  // biome-ignore lint/suspicious/noExplicitAny: <tree is any>
  return (tree: any) => {
    visit(tree, (node, _, parent) => {
      if (node.type !== "mdxTextExpression" || parent.type !== "heading") return;

      if (!node.value.startsWith("frontmatter.") && !node.value.startsWith("frontmatter[")) return;

      // biome-ignore lint/suspicious/noExplicitAny: <scope is any>
      const scopedEval = (scope: any, script: string) =>
        Function(`"use strict"; return ${script}`).bind(scope)();

      const value = scopedEval({ frontmatter: tree.data.frontmatter }, `this.${node.value}`);

      Object.assign(node, {
        type: "text",
        value,
      });

      return SKIP;
    });
  };
}
