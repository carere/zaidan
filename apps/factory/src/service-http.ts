import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { LocalService } from "./local-service.ts";
import type { Candidate } from "./workflow-contracts.ts";

/** Loopback transport only: all policy and durable state remain in IssueWorkflow. */
export async function listenLocalService(options: {
  service: LocalService;
  workflow: IssueWorkflow;
  port: number;
  evidence?: () => unknown;
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
    if (request.method === "GET" && request.url === "/factory/progress")
      return json(response, 200, {
        evidence: options.evidence?.(),
        service: service.status(),
        runs: workflow.admissions().map((run) => ({
          runId: run.runId,
          issueId: run.issue.issueId,
          issueNumber: run.issue.number,
          issueRevision: run.issue.revision,
          route: run.issue.route,
          graphId: run.issue.graphId,
          status: run.status,
          phase: run.phase,
          sessionId: run.session.id,
          snapshotId: run.resources?.id,
          startingRevision: run.issue.startingRevision,
          eveRunId: run.eveRunId,
          eveContinuationId: run.eveContinuationId,
          checkpoint: run.checkpoint
            ? { id: run.checkpoint.id, answered: Boolean(run.checkpoint.answer) }
            : undefined,
          execution: run.execution
            ? {
                active: Boolean(run.execution.operationId),
                attempt: run.execution.attempt,
                consumedMs: run.execution.consumedMs,
                modelCalls: run.execution.models.length,
                retries: run.execution.retries,
              }
            : undefined,
          candidate: run.candidate?.commit,
          candidateEvidence: candidateEvidence(run.acceptanceResult ?? run.candidate),
          acceptance: run.acceptance?.id,
          publication: run.publication
            ? { state: run.publication.state, pullRequest: run.publication.pullRequest?.url }
            : undefined,
        })),
        graphs: workflow.admittedGraphs().map((graph) => ({
          graphId: graph.graphId,
          head: graph.head,
          revision: graph.graphRevision,
          state: graph.state,
          integrationCount: graph.integrations.length,
          integrations: Object.entries(graph.deliveries).map(([issueId, delivery]) => ({
            issueId,
            runId: delivery.runId,
            expectedHead: delivery.expectedHead,
            commit: delivery.candidate.commit,
            tree: delivery.candidate.tree,
            published: delivery.published === true,
            closedRevision: delivery.closedRevision,
          })),
          pullRequest: graph.pullRequest?.url,
          acceptance: graph.finalization
            ? {
                id: graph.finalization.input.id,
                state: graph.finalization.state,
                head: graph.finalization.input.head,
                tree: graph.finalization.input.tree,
              }
            : undefined,
          reconciliation: graph.reconciliation,
        })),
      });
    if (request.method === "POST" && request.url === "/factory/scan") {
      const result = await service.trigger("manual");
      return json(response, 200, result);
    }
    if (
      request.method === "POST" &&
      (request.url === "/factory/drive" || request.url === "/factory/wake-pending")
    ) {
      const input = await body(request);
      if (
        !input ||
        typeof input !== "object" ||
        !("runId" in input) ||
        typeof input.runId !== "string"
      )
        return json(response, 400, { error: "runId-required" });
      const continuationId = "continuationId" in input ? input.continuationId : undefined;
      if (
        continuationId !== undefined &&
        (typeof continuationId !== "string" ||
          !continuationId.trim() ||
          continuationId.length > 200)
      )
        return json(response, 400, { error: "invalid-continuationId" });
      if (workflow.observe(input.runId).eveContinuationId !== continuationId)
        return json(response, 200, { status: "completed", graphPending: false });
      if (!service.status().ready) {
        workflow.observe(input.runId);
        // Eve's durable loop can sleep without consuming failed-step retries while
        // reconciliation waits on external receipts. No workflow mutation occurs.
        return json(
          response,
          200,
          request.url === "/factory/drive" ? { status: "running" } : { accepted: false },
        );
      }
      const result =
        request.url === "/factory/drive"
          ? await workflow.driveOwned(input.runId, continuationId)
          : await workflow.recoverWakeOwned(input.runId, continuationId);
      if (workflow.observe(input.runId).eveContinuationId !== continuationId)
        return json(response, 200, { status: "completed", graphPending: false });
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
function candidateEvidence(candidate?: Candidate) {
  if (!candidate) return undefined;
  const records = (value: unknown) =>
    Array.isArray(value)
      ? (value.filter((item) => item && typeof item === "object") as Record<string, unknown>[])
      : [];
  return {
    tree: typeof candidate.tree === "string" ? candidate.tree : undefined,
    checks: records(candidate.checks).map((check) => ({
      exitCode: check.exitCode === 0 ? 0 : "failed",
      commit: check.commit,
    })),
    reviews: records(candidate.reviews).map((review) => ({
      axis: review.axis === "standards" ? "standards" : "spec",
      passed: review.passed === true,
      delegateSession:
        typeof review.delegateSession === "string" ? review.delegateSession : undefined,
      commit: review.commit,
    })),
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
