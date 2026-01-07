// ty Solid Base :)

import { visit } from "unist-util-visit";

const DANGEROUSLY_SET_INNER_HTML = "dangerouslySetInnerHTML";

// rehype-expressive-code is hardcoded to use dangerouslySetInnerHtml
export function rehypeFixExpressiveCodeJsx() {
  // biome-ignore lint/suspicious/noExplicitAny: <tree is any>
  return (tree: any) => {
    visit(
      tree,
      "mdxJsxFlowElement",
      // biome-ignore lint/suspicious/noExplicitAny: <tree is any>
      (node: { attributes?: any[]; name: string }, index, parent) => {
        const dangerouslySetInnerHtmlAttribute = node.attributes?.find(
          (a) => a.name === DANGEROUSLY_SET_INNER_HTML,
        );
        if (!dangerouslySetInnerHtmlAttribute || index === undefined) return;

        let innerHTML: string =
          dangerouslySetInnerHtmlAttribute.value.data.estree.body[0].expression.properties[0].value
            .value;

        innerHTML = innerHTML.replace(
          "initTwoslashPopups(document);",
          ` 
					if(typeof window.$$$$SolidBase === "undefined") window.$$$$SolidBase = {};

					window.$$$$SolidBase.initTwoslashPopups = () => {
						if (!!document.querySelector(".twoslash-popup-container")) initTwoslashPopups(document);
					} `,
        );

        parent.children[index] = {
          type: "element",
          tagName: node.name,
          properties: node.attributes
            ?.filter((n) => n.name !== DANGEROUSLY_SET_INNER_HTML)
            ?.reduce(
              (acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              },
              {
                // solid inserts this as the raw element content,
                // using children results in utf-8 encoding eg. &amp
                innerHTML,
              },
            ),
        };
      },
    );
  };
}
