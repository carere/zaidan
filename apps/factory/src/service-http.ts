import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { LocalService } from "./local-service.ts";

/** Loopback transport only: all policy and durable state remain in IssueWorkflow. */
export async function listenLocalService(options: {
  service: LocalService;
  workflow: IssueWorkflow;
  port: number;
}) {
  const { service, workflow } = options;
  const server = createServer((request, response) => {
    void handle(request, response).catch(() =>
      json(response, 503, { error: "operation-unavailable" }),
    );
  });
  async function handle(request: IncomingMessage, response: ServerResponse) {
    // Browsers must not turn a malicious page into a local administration client.
    if (request.headers.origin || request.headers["sec-fetch-site"])
      return json(response, 403, { error: "browser-request-denied" });
    if (request.method === "GET" && request.url === "/factory/status")
      return json(response, 200, service.status());
    if (request.method === "POST" && request.url === "/factory/scan") {
      const result = await service.trigger("manual");
      return json(response, 200, result);
    }
    if (
      request.method === "POST" &&
      (request.url === "/factory/drive" || request.url === "/factory/wake-pending")
    ) {
      if (!service.status().ready) return json(response, 503, { error: "reconciliation-pending" });
      const input = await body(request);
      if (
        !input ||
        typeof input !== "object" ||
        !("runId" in input) ||
        typeof input.runId !== "string"
      )
        return json(response, 400, { error: "runId-required" });
      const result =
        request.url === "/factory/drive"
          ? await workflow.drive(input.runId)
          : await workflow.recoverWake(input.runId);
      return json(response, 200, result ?? { accepted: true });
    }
    return json(response, 404, { error: "not-found" });
  }
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No coordinator address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 16384) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}
