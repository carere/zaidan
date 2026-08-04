import solid from "vite-plugin-solid";
import { configDefaults, defineConfig } from "vitest/config";

const alias = {
  "@": new URL("./src", import.meta.url).pathname,
};

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [solid({ ssr: true })],
        resolve: { alias },
        test: {
          name: "server",
          environment: "node",
          exclude: [
            ...configDefaults.exclude,
            "**/{accordion,collapsible}*.test.tsx",
            "**/checkbox*.browser.test.tsx",
          ],
        },
      },
      {
        plugins: [solid()],
        resolve: {
          alias,
          conditions: ["browser"],
        },
        test: {
          name: "browser",
          environment: "happy-dom",
          include: ["**/{accordion,collapsible}*.test.tsx", "**/checkbox*.browser.test.tsx"],
          server: {
            deps: {
              inline: [/@tanstack\/solid-(router|start)/],
            },
          },
        },
      },
    ],
  },
});
