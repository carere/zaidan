import { existsSync } from "node:fs";
import path from "node:path";
import type { Code, Root } from "mdast";
import { visit } from "unist-util-visit";

type MdxAttribute = {
  type: string;
  name?: string;
  value?: unknown;
};

type MdxElement = {
  type: string;
  name?: string | null;
  attributes?: MdxAttribute[];
  children?: unknown[];
};

const SAFE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getStringAttribute(node: MdxElement, name: string) {
  const attribute = node.attributes?.find(
    (candidate) => candidate.type === "mdxJsxAttribute" && candidate.name === name,
  );

  return typeof attribute?.value === "string" ? attribute.value : undefined;
}

function sourcePathFor(node: MdxElement, name: string) {
  if (node.name === "ComponentPreview") {
    return `src/registry/kobalte/examples/docs/${name}.tsx`;
  }

  return `src/registry/kobalte/ui/${name}.tsx`;
}

export function remarkComponentSource() {
  return (tree: Root) => {
    visit(tree, "mdxJsxFlowElement", (node: MdxElement) => {
      if (node.name !== "ComponentPreview" && node.name !== "ComponentSource") return;
      if (node.children?.length) return;

      const name = getStringAttribute(node, "name");
      if (!name || !SAFE_NAME.test(name)) {
        throw new Error(`${node.name} requires a safe, static "name" attribute`);
      }

      const relativePath = sourcePathFor(node, name);
      const absolutePath = path.join(process.cwd(), relativePath);
      if (!existsSync(absolutePath)) {
        throw new Error(`${node.name} source not found: ${relativePath}`);
      }

      const title = getStringAttribute(node, "title");
      const meta = [
        node.name === "ComponentPreview" ? "showLineNumbers" : undefined,
        `file=<rootDir>/${relativePath}`,
        title ? `title=${title.replaceAll(" ", "\\ ")}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");

      node.children = [
        {
          type: "code",
          lang: "tsx",
          meta,
          value: "",
        } satisfies Code,
      ];
    });
  };
}
