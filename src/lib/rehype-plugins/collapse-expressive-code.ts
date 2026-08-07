import type { Element, ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { SKIP, visit } from "unist-util-visit";

type MdxJsxAttribute = {
  type: string;
  name?: string;
  value?: { data?: { estree?: unknown } } | string | null;
};

type MdxJsxFlowElement = {
  type: "mdxJsxFlowElement";
  name?: string | null;
  attributes?: MdxJsxAttribute[];
  children?: unknown[];
};

function isMdxJsxFlowElement(node: unknown): node is MdxJsxFlowElement {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: string }).type === "mdxJsxFlowElement"
  );
}

function isScript(node: ElementContent | MdxJsxFlowElement) {
  const name = isMdxJsxFlowElement(node) ? node.name : (node as Element).tagName;
  return node.type !== "text" && name === "script";
}

// rehype-expressive-code marks its <style>/<script> assets as JSX elements
// carrying a dangerouslySetInnerHTML attribute; pull the raw string back out.
function dangerouslySetInnerHtml(node: MdxJsxFlowElement): string | undefined {
  const attribute = node.attributes?.find(
    (candidate) =>
      candidate.type === "mdxJsxAttribute" && candidate.name === "dangerouslySetInnerHTML",
  );
  if (typeof attribute?.value !== "object" || attribute.value === null) return undefined;

  const estree = attribute.value.data?.estree as
    | {
        body?: {
          expression?: { properties?: { value?: { value?: unknown } }[] };
        }[];
      }
    | undefined;
  const value = estree?.body?.[0]?.expression?.properties?.[0]?.value?.value;

  return typeof value === "string" ? value : undefined;
}

// rehype-expressive-code emits a full hast tree where every syntax token is
// its own <span>. Compiled through solid-mdx, each of those becomes a
// `createComponent` call, ballooning doc-page chunks to megabytes (a single
// code line compiles to ~30KB of JSX). Since the highlighted markup is
// static, collapse each `.expressive-code` block into one HTML string that
// Solid injects via `innerHTML` — on the server and the client alike.
//
// <script> children (EC's copy-button/theme JS) are hoisted out unchanged:
// scripts inserted through innerHTML never execute, so they must stay real
// elements for rehypeFixExpressiveCodeJsx + Solid to create and run them.
export function rehypeCollapseExpressiveCode() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (parent === undefined || index === undefined) return;

      const className = node.properties?.className;
      const classes = Array.isArray(className) ? className : [className];
      if (!classes.includes("expressive-code")) return;

      const scripts: unknown[] = [];
      const htmlParts: string[] = [];

      for (const child of node.children) {
        if (isScript(child)) {
          scripts.push(child);
        } else if (isMdxJsxFlowElement(child)) {
          const innerHtml = dangerouslySetInnerHtml(child);
          // Unknown JSX child we cannot serialize — leave this block alone.
          if (innerHtml === undefined || !child.name) return;
          htmlParts.push(`<${child.name}>${innerHtml}</${child.name}>`);
        } else {
          htmlParts.push(toHtml(child));
        }
      }

      const collapsed: Element = {
        type: "element",
        tagName: "div",
        properties: {
          ...node.properties,
          innerHTML: htmlParts.join(""),
        },
        children: [],
      };

      parent.children.splice(index, 1, collapsed, ...(scripts as ElementContent[]));
      return SKIP;
    });
  };
}
