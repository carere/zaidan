import { defineChannel, GET, POST } from "eve/channels";
import { getRun, getWorld, resumeHook, start } from "workflow/api";
import { findFactoryRun } from "../../src/eve-engine";
import { issueWorkflow } from "../lib/issue-workflow";

// One local Eve host owns a world directory. Concurrent retries join its original
// start promise; after a host restart the persisted attribute is authoritative.
const starting = new Map<string, Promise<string>>();

async function find(runId: string) {
  const world = await getWorld();
  return findFactoryRun(runId, (cursor) =>
    world.runs.list({ resolveData: "none", pagination: { cursor, limit: 100 } }),
  );
}

async function ensureStarted(runId: string): Promise<string> {
  const pending = starting.get(runId);
  if (pending) return pending;
  const operation = (async () => {
    const existing = await find(runId);
    if (existing) return existing;
    const run = await start(issueWorkflow, [{ runId }], {
      attributes: { factoryRunId: runId },
    });
    return run.runId;
  })();
  starting.set(runId, operation);
  try {
    return await operation;
  } finally {
    starting.delete(runId);
  }
}

export default defineChannel({
  routes: [
    POST("/factory/engine/start", async (request) => {
      const input = await request.json();
      const runId = isRecord(input) ? input.runId : undefined;
      if (typeof runId !== "string" || !runId) return new Response(null, { status: 400 });
      return Response.json({ runId: await ensureStarted(runId) });
    }),
    POST("/factory/engine/find", async (request) => {
      const input = await request.json();
      const runId = isRecord(input) ? input.runId : undefined;
      if (typeof runId !== "string" || !runId) return new Response(null, { status: 400 });
      const found = await find(runId);
      return Response.json({ runId: found ?? null });
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
