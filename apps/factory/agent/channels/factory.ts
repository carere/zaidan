import { defineChannel, GET, POST } from "eve/channels";
import { getRun, getWorld, resumeHook, start } from "workflow/api";
import { findFactoryRun } from "../../src/eve-engine";
import { issueWorkflow } from "../lib/issue-workflow";

// One local Eve host owns a world directory. Concurrent retries join its original
// start promise; after a host restart the persisted attribute is authoritative.
const starting = new Map<string, Promise<string>>();

async function find(runId: string, continuationId?: string) {
  const world = await getWorld();
  return findFactoryRun(
    runId,
    (cursor) => world.runs.list({ resolveData: "none", pagination: { cursor, limit: 100 } }),
    continuationId,
  );
}

async function ensureStarted(runId: string, continuationId?: string): Promise<string> {
  const owner = JSON.stringify([runId, continuationId ?? null]);
  const pending = starting.get(owner);
  if (pending) return pending;
  const operation = (async () => {
    const existing = await find(runId, continuationId);
    if (existing) return existing;
    const run = await start(issueWorkflow, [{ runId, continuationId }], {
      attributes: {
        factoryRunId: runId,
        ...(continuationId ? { factoryContinuationId: continuationId } : {}),
      },
    });
    return run.runId;
  })();
  starting.set(owner, operation);
  try {
    return await operation;
  } finally {
    starting.delete(owner);
  }
}

export default defineChannel({
  routes: [
    POST("/factory/engine/start", async (request) => {
      const input = await request.json();
      const runId = isRecord(input) ? input.runId : undefined;
      const continuationId = isRecord(input) ? input.continuationId : undefined;
      if (
        typeof runId !== "string" ||
        !runId ||
        (continuationId !== undefined &&
          (typeof continuationId !== "string" ||
            !continuationId.trim() ||
            continuationId.length > 200))
      )
        return new Response(null, { status: 400 });
      return Response.json({ runId: await ensureStarted(runId, continuationId) });
    }),
    POST("/factory/engine/find", async (request) => {
      const input = await request.json();
      const runId = isRecord(input) ? input.runId : undefined;
      const continuationId = isRecord(input) ? input.continuationId : undefined;
      if (
        typeof runId !== "string" ||
        !runId ||
        (continuationId !== undefined &&
          (typeof continuationId !== "string" ||
            !continuationId.trim() ||
            continuationId.length > 200))
      )
        return new Response(null, { status: 400 });
      const found = await find(runId, continuationId);
      return Response.json({ runId: found ?? null });
    }),
    POST("/factory/engine/inspect", async (request) => {
      const input = await request.json();
      const eveRunId = isRecord(input) ? input.eveRunId : undefined;
      if (typeof eveRunId !== "string" || !eveRunId) return new Response(null, { status: 400 });
      const world = await getWorld();
      const run = await world.runs.get(eveRunId, { resolveData: "none" });
      return Response.json({
        status: run.status,
        ...(run.errorCode ? { errorCode: run.errorCode } : {}),
      });
    }),
    POST("/factory/engine/wake", async (request) => {
      const input = await request.json();
      const token = isRecord(input) ? input.token : undefined;
      const payload = isRecord(input) ? input.payload : undefined;
      if (typeof token !== "string" || !token) return new Response(null, { status: 400 });
      await resumeHook(token, payload);
      return Response.json({ accepted: true });
    }),
    GET("/factory/engine/state/:id", async (_request, { params }) => {
      const run = getRun(params.id);
      const status = await run.status;
      const world = await getWorld();
      const hooks = await world.hooks.list({ runId: params.id });
      return Response.json({
        status,
        pendingHooks: hooks.data.map((hook) => hook.token),
        ...(status === "completed" ? { result: await run.returnValue } : {}),
      });
    }),
  ],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
