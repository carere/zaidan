import { createServer } from "node:http";
import type { IssueWorkflow } from "./issue-workflow.ts";

/** Loopback-only, phase-scoped model capacity transport. No credentials or administrative routes. */
export async function startModelPermitServer(workflow: IssueWorkflow, port = 0) {
  const server = createServer(async (request, response) => {
    try {
      if (
        request.method !== "POST" ||
        request.headers.origin ||
        request.headers["sec-fetch-site"] ||
        !["/acquire", "/release"].includes(request.url ?? "")
      ) {
        response.writeHead(403).end();
        return;
      }
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 4096) {
          response.writeHead(413).end();
          return;
        }
      }
      const { runId, owner } = JSON.parse(body);
      const authorization = request.headers.authorization;
      if (
        typeof runId !== "string" ||
        typeof owner !== "string" ||
        !authorization?.startsWith("Bearer ")
      ) {
        response.writeHead(403).end();
        return;
      }
      const result = workflow.modelPermit(
        runId,
        authorization.slice(7),
        owner,
        request.url === "/acquire" ? "acquire" : "release",
      );
      response
        .writeHead(result === "denied" ? 403 : result === "queued" ? 429 : 200, {
          "content-type": "application/json",
        })
        .end(JSON.stringify({ status: result }));
    } catch {
      response.writeHead(403).end();
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing permit server address");
  return {
    url: `http://host.docker.internal:${address.port}`,
    port: address.port,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
