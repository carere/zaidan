import { readFile } from "node:fs/promises";
import { codeToHtml } from "shiki";
import type { Plugin as VitePlugin } from "vite";
import { codeThemes } from "../code-highlighting";

const highlightedCodeQuery = "highlight-code";

export function highlightCode(): VitePlugin {
  const cache = new Map<string, string>();

  return {
    name: "vite-plugin-highlight-code",
    enforce: "pre",
    async load(id) {
      const [path, query] = id.split("?");
      if (query !== highlightedCodeQuery) return;

      const source = await readFile(path, "utf8");
      let highlightedSource = cache.get(source);

      if (!highlightedSource) {
        highlightedSource = await codeToHtml(source, {
          lang: "tsx",
          themes: codeThemes,
          transformers: [
            {
              pre(node) {
                node.properties["data-language"] = "tsx";
              },
              code(node) {
                node.properties["data-line-numbers"] = "";
              },
              line(node) {
                node.properties["data-line"] = "";
              },
            },
          ],
        });
        cache.set(source, highlightedSource);
      }

      return `export default ${JSON.stringify(highlightedSource)};`;
    },
  };
}
