import { visit } from "unist-util-visit";

export function remarkTabGroup() {
  // biome-ignore lint/suspicious/noExplicitAny: <coming from solid base>
  return (tree: any) => {
    visit(tree, (node) => {
      if (node.type !== "containerDirective" || node.name !== "tab-group") return;

      const tabs = [];
      const tabNames = [];
      for (const child of node.children) {
        if (child.type !== "containerDirective" || child.name !== "tab") continue;
        tabs.push(child);

        const maybeLabel = child.children[0];
        const hasLabel = maybeLabel?.data?.directiveLabel;

        let labelText = "?";

        if (hasLabel && maybeLabel.children.length > 0) {
          const maybeLabelElement = maybeLabel.children[0];
          if (maybeLabelElement.type === "text") {
            labelText = maybeLabelElement.value;
          }
        }

        tabNames.push(labelText);
      }

      if (node.children[0]?.data?.directiveLabel) {
        tabs.unshift(node.children[0]);
      }

      node.children = tabs;
      node.attributes = {
        ...node.attributes,
        tabNames: tabNames.join("\0"),
      };
    });
  };
}
