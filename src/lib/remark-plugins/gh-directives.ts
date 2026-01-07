import { visit } from "unist-util-visit";

export function remarkGithubAlertsToDirectives() {
  // biome-ignore lint/suspicious/noExplicitAny: <tree is any>
  return (tree: any) => {
    visit(tree, (node) => {
      if (node.type !== "blockquote") return;

      const text: string | undefined = node.children?.[0]?.children?.[0]?.value;
      if (!text) return;
      const matches = text.match(/^\[!(\w+)]/);
      if (!matches) return;
      const key = matches[1];
      if (!key) return;
      const directive = key.toLowerCase();

      node.children[0].children[0].value = text.slice(matches[0].length);

      Object.assign(node, {
        type: "containerDirective",
        name: directive,
        children: node.children,
      });
    });
  };
}
