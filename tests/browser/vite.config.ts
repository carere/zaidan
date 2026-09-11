import { readFile } from "node:fs/promises";
import { defineConfig, type ViteDevServer } from "vite";
import appConfig from "../../vite.config.ts";

// Keep the site's Solid, TanStack and Tailwind transforms without rendering a route.
export default defineConfig(async (env) => {
  const config = await appConfig(env);
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      {
        name: "switch-browser-fixture",
        configureServer(server: ViteDevServer) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split("?")[0] !== "/tests/browser/index.html") return next();
            const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
            res.setHeader("Content-Type", "text/html");
            res.end(await server.transformIndexHtml("/tests/browser/index.html", html));
          });
        },
      },
    ],
  };
});
