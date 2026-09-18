import { SKIP, visit } from "unist-util-visit";

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const;

const PACKAGE_MANAGER_PRESETS: Record<(typeof PACKAGE_MANAGERS)[number], Record<string, string>> = {
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
    dlx: "pnpm dlx :content",
    create: "pnpm create :content",
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
    dlx: "bunx --bun :content",
    create: "bun --bun create :content",
  },
};

export function remarkPackageManagerTabs() {
  // biome-ignore lint/suspicious/noExplicitAny: unified nodes are dynamically extended by MDX.
  return (tree: any) => {
    visit(tree, (node, index, parent) => {
      if (node.type === "code") {
        if (!node.lang?.startsWith("package-")) return;

        const packageManagerCommand = node.lang.slice("package-".length);
        const content = node.value;

        // biome-ignore lint/style/noNonNullAssertion: <coming from solid base>
        parent.children[index!] = {
          type: "mdxJsxFlowElement",
          name: "PackageManagerCodeBlock",
          attributes: PACKAGE_MANAGERS.map((packageManager) => ({
            type: "mdxJsxAttribute",
            name: packageManager,
            value: (
              PACKAGE_MANAGER_PRESETS[packageManager][packageManagerCommand] ?? ":content"
            ).replace(":content", content),
          })),
          children: [],
        };

        // biome-ignore lint/style/noNonNullAssertion: <coming from solid base>
        return [SKIP, index!];
      }
    });
  };
}
