/** biome-ignore-all lint/style/noNonNullAssertion: <coming from solid base> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <coming from solid base> */
import { MetaOptions } from "@expressive-code/core";
import type { Root } from "mdast";
import type { Transformer } from "unified";
import { SKIP, visit } from "unist-util-visit";

export interface CodeTabsOptions {
  withTsJsToggle?: boolean;
}

export function remarkCodeTabs(options: CodeTabsOptions): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (node.type === "code" && parent) {
        const nodeMeta = new MetaOptions(node.meta ?? "");

        const key = nodeMeta.getString("tab");

        if (!nodeMeta.getBoolean("tab") && !key) return;

        const groupNodes = [node];

        const groupTitles: string[] = [];
        groupTitles.push(nodeMeta.getString("title") ?? groupTitles.length.toString());

        for (let i = index! + 1; i < parent.children.length; i++) {
          const node = parent.children[i] as any;
          const nodeMeta = new MetaOptions(node.meta ?? "");

          const nodeTitle = nodeMeta.getString("title") ?? groupTitles.length.toString();

          if (
            node.type === "code" &&
            (key
              ? nodeMeta.getString("tab") === key
              : nodeMeta.getBoolean("tab") && !nodeMeta.getString("tab")) &&
            !groupTitles.includes(nodeTitle)
          ) {
            groupNodes.push(node);
            groupTitles.push(nodeTitle);
          } else break;
        }

        parent.children[index!] = {
          type: "containerDirective",
          name: "tab-group",
          children: groupNodes.map((node) => {
            const nodeMeta = new MetaOptions(node.meta ?? "");

            node.meta += ' frame="none"';

            return {
              type: "containerDirective",
              name: "tab",
              children: [
                {
                  children: [
                    {
                      type: "text",
                      value: nodeMeta.getString("title"),
                    },
                  ],
                  data: {
                    directiveLabel: true,
                  },
                } as any,
                node,
              ],
            };
          }),

          attributes: {
            codeGroup: "true",
            title: key,
            withTsJsToggle: String(!!options.withTsJsToggle),
          },
        };

        parent.children.splice(index! + 1, groupNodes.length - 1);
        return [SKIP, index! + groupNodes.length - 1];
      }
    });
  };
}
