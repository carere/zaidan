import { createHook, sleep } from "workflow";

type DriveResult =
  | { status: "waiting-human"; checkpoint: { id: string } }
  | {
      status: "admitted" | "running" | "paused" | "waiting-subscription" | "waiting-authentication";
    }
  | { status: "completed" | "failed" | "cancelled" };

export async function issueWorkflow(input: { runId: string }) {
  "use workflow";
  for (;;) {
    const state = await drive(input.runId);
    if (
      [
        "admitted",
        "running",
        "paused",
        "waiting-subscription",
        "waiting-authentication",
        "failed",
        "cancelled",
      ].includes(state.status)
    ) {
      await sleep("1s");
      continue;
    }
    if (state.status !== "waiting-human") return state;
    using answer = createHook({ token: state.checkpoint.id });
    // A fast human answer can arrive before hook creation. Its persisted wake
    // intent is retried only after this hook has entered Eve's durable history.
    await recoverWake(input.runId);
    await answer;
  }
}

async function drive(runId: string): Promise<DriveResult> {
  "use step";
  const result = await coordinator("drive", runId);
  if (typeof result !== "object" || result === null || !("status" in result))
    throw new Error("Invalid factory drive response");
  if (
    [
      "completed",
      "failed",
      "cancelled",
      "admitted",
      "running",
      "paused",
      "waiting-subscription",
      "waiting-authentication",
    ].includes(result.status as string)
  )
    return result as DriveResult;
  if (
    result.status === "waiting-human" &&
    "checkpoint" in result &&
    typeof result.checkpoint === "object" &&
    result.checkpoint !== null &&
    "id" in result.checkpoint &&
    typeof result.checkpoint.id === "string" &&
    result.checkpoint.id
  )
    return result as DriveResult;
  throw new Error("Invalid factory drive response");
}

async function recoverWake(runId: string): Promise<void> {
  "use step";
  await coordinator("wake-pending", runId);
}

async function coordinator(path: string, runId: string): Promise<unknown> {
  const baseUrl = process.env.FACTORY_COORDINATOR_URL;
  if (!baseUrl) throw new Error("FACTORY_COORDINATOR_URL is required");
  const response = await fetch(new URL(`/factory/${path}`, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  if (!response.ok) throw new Error(`Factory ${path} returned ${response.status}`);
  return response.json();
}
