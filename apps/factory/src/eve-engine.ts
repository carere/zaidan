/** Code-controlled transport to the compiled local Eve host. */
export function createEveEngine(options: { baseUrl: string; fetch?: typeof fetch }) {
  const request = options.fetch ?? fetch;
  async function post(path: string, body: unknown): Promise<unknown> {
    const response = await request(new URL(`/factory/engine/${path}`, options.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Eve ${path} returned ${response.status}`);
    return response.json();
  }
  return {
    async start(input: { runId: string; continuationId?: string }): Promise<string> {
      const result = await post("start", input);
      if (!hasRunId(result) || typeof result.runId !== "string" || !result.runId)
        throw new Error("Invalid Eve start response");
      return result.runId;
    },
    async find(runId: string, continuationId?: string): Promise<string | undefined> {
      const result = await post("find", { runId, continuationId });
      if (
        !hasRunId(result) ||
        (result.runId !== null && (typeof result.runId !== "string" || !result.runId))
      )
        throw new Error("Invalid Eve find response");
      return result.runId ?? undefined;
    },
    async inspect(eveRunId: string): Promise<{ status: string; errorCode?: string }> {
      const result = await post("inspect", { eveRunId });
      if (
        typeof result !== "object" ||
        result === null ||
        !("status" in result) ||
        typeof result.status !== "string" ||
        ("errorCode" in result && typeof result.errorCode !== "string")
      )
        throw new Error("Invalid Eve inspection response");
      return result as { status: string; errorCode?: string };
    },
    async wake(token: string, payload: unknown): Promise<void> {
      await post("wake", { token, payload });
    },
  };
}

function hasRunId(value: unknown): value is { runId: string | null } {
  return typeof value === "object" && value !== null && "runId" in value;
}

interface RunPage {
  data: { runId: string; attributes: Record<string, string> }[];
  cursor: string | null;
  hasMore: boolean;
}

/** Exhaust the pinned Eve world API before concluding an uncertain start is absent. */
export async function findFactoryRun(
  runId: string,
  list: (cursor?: string) => Promise<RunPage>,
  continuationId?: string,
): Promise<string | undefined> {
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let found: string | undefined;
  for (;;) {
    const page = await list(cursor);
    for (const run of page.data) {
      if (
        run.attributes.factoryRunId !== runId ||
        run.attributes.factoryContinuationId !== continuationId
      )
        continue;
      if (found && found !== run.runId)
        throw new Error("Multiple Eve runs own one factory admission");
      found = run.runId;
    }
    if (!page.hasMore) return found;
    if (!page.cursor || cursors.has(page.cursor)) throw new Error("Invalid Eve pagination cursor");
    cursor = page.cursor;
    cursors.add(cursor);
  }
}
