import { SKIP, visit } from "unist-util-visit";

export interface PackageManagerConfig {
  show?: string[];
  default?: string;
  lang?: string;
  presets?: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

export function remarkPackageManagerTabs() {
  // biome-ignore lint/suspicious/noExplicitAny: <coming from solid base>
  return (tree: any) => {
    const resolvedManagers: PackageManagerConfig = {
      show: ["npm", "pnpm", "yarn", "bun"],
      default: "bun",
      lang: "sh",
      presets: {
        npm: {
          install: "npm i :content",
          "install-dev": "npm i :content -D",
          run: "npm run :content",
          "run-full": "npm run :content",
          dlx: "npx :content",
          create: "npm create :content",
        },
        pnpm: {
          install: "pnpm add :content",
          "install-dev": "pnpm add :content -D",
          run: "pnpm :content",
          "run-full": "pnpm run :content",
          dlx: "pnpx :content-latest",
          create: "pnpm create :content-latest",
        },
        yarn: {
          install: "yarn add :content",
          "install-dev": "yarn add :content -D",
          run: "yarn :content",
          "run-full": "yarn run :content",
          dlx: "yarn dlx :content",
          create: "yarn create :content",
        },
        bun: {
          install: "bun add :content",
          "install-dev": "bun add :content -d",
          run: "bun :content",
          "run-full": "bun run :content",
          dlx: "bunx :content",
          create: "bun create :content",
        },
      },
    };

    visit(tree, (node, index, parent) => {
      if (node.type === "code") {
        if (!node.lang?.startsWith("package-")) return;

        const packageManagerCommand = node.lang.slice("package-".length);

        const content = node.value;

        // biome-ignore lint/style/noNonNullAssertion: <coming from solid base>
        parent.children[index!] = {
          type: "containerDirective",
          name: "tab-group",
          children: (resolvedManagers.show ?? []).map((preset: string) => {
            return {
              type: "containerDirective",
              name: "tab",
              children: [
                {
                  children: [
                    {
                      type: "text",
                      value: preset,
                    },
                  ],
                  data: {
                    directiveLabel: true,
                  },
                },
                {
                  type: "code",
                  lang: resolvedManagers.lang,
                  meta: 'frame="none"',
                  value: (resolvedManagers.presets?.[preset]?.[packageManagerCommand] ?? ":content")
                    .replace(":content-latest", content.replace("@latest", ""))
                    .replace(":content", content),
                },
              ],
            };
          }),
          attributes: {
            codeGroup: "true",
            title: "package-manager",
          },
        };

        // biome-ignore lint/style/noNonNullAssertion: <coming from solid base>
        return [SKIP, index!];
      }
    });
  };
}
