import { resolve, sep } from "node:path";

const clientDirectory = resolve(".output/client");
const builtServerPath = "../../.output/server/server.js";
const { default: app } = (await import(builtServerPath)) as {
  default: { fetch(request: Request): Response | Promise<Response> };
};
const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
    const assetPath = resolve(clientDirectory, pathname);
    if (pathname && assetPath.startsWith(`${clientDirectory}${sep}`)) {
      const asset = Bun.file(assetPath);
      if (await asset.exists()) return new Response(asset);
    }
    return app.fetch(request);
  },
});

process.stdout.write(`${server.url.href}\n`);

process.on("SIGTERM", () => {
  server.stop(true);
  process.exit(0);
});
