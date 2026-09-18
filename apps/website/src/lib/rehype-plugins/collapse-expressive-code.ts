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

// Assets that must outlive the block they were emitted with. Expressive Code
// attaches the page's whole stylesheet and its JS to the FIRST code block it
// renders; both have to survive that block being collapsed — and, more
// importantly, that block not rendering at all.
function isHoistedAsset(node: ElementContent | MdxJsxFlowElement) {
  const name = isMdxJsxFlowElement(node) ? node.name : (node as Element).tagName;
  return node.type !== "text" && (name === "script" || name === "style");
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
// <script> and <style> children are hoisted out unchanged, to the end of the
// document. Scripts must stay real elements because a script inserted through
// innerHTML never executes. Both must leave the block entirely, not just the
// innerHTML: EC attaches the page's whole stylesheet and JS to the first code
// block it renders, which on a component page is the source injected into
// <ComponentPreview> — and that block is conditional (`hideCode` drops it).
// Left in place, one `hideCode` took the syntax colors of every block on the
// page down with it. At document level they no longer depend on any one block
// being rendered.
export function rehypeCollapseExpressiveCode() {
  return (tree: Root) => {
    const hoisted: ElementContent[] = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (parent === undefined || index === undefined) return;

      const className = node.properties?.className;
      const classes = Array.isArray(className) ? className : [className];
      if (!classes.includes("expressive-code")) return;

      const assets: ElementContent[] = [];
      const htmlParts: string[] = [];

      for (const child of node.children) {
        if (isHoistedAsset(child)) {
          assets.push(child as ElementContent);
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

      hoisted.push(...assets);
      parent.children.splice(index, 1, collapsed);
      return SKIP;
    });

    tree.children.push(...hoisted);
  };
}
