import { spawn } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function bridge(pi: ExtensionAPI) {
  const events = (event: object) =>
    appendFileSync("/workspace/events.jsonl", `${JSON.stringify(event)}\n`);
  const children = new Set<ReturnType<typeof spawn>>();
  pi.on("session_shutdown", () => {
    for (const child of children) child.kill("SIGKILL");
  });
  pi.registerTool({
    name: "delegate_review",
    label: "Delegate review",
    description: "Run an independent fixture reviewer in this container.",
    parameters: Type.Object({ cancellationProbe: Type.Optional(Type.Boolean()) }),
    async execute(_id, args, signal) {
      signal?.throwIfAborted();
      events({ type: "phase.started", phase: "review", uid: process.getuid?.() });
      const child = spawn(
        "pi",
        [
          "--provider",
          "openai-codex",
          "--model",
          "gpt-6-astra",
          "--thinking",
          "high",
          "--no-extensions",
          "--no-skills",
          "--no-session",
          "--tools",
          args.cancellationProbe ? "read,bash" : "read",
          "-p",
          args.cancellationProbe
            ? "Run bash sleep 120 before doing any review. This is a cancellation probe."
            : "Read /workspace/result.txt and /workspace/skill/resource.txt. Reply exactly REVIEW_OK if identical; otherwise REVIEW_FAILED. Do not read any other files.",
        ],
        { cwd: "/workspace", stdio: ["ignore", "pipe", "pipe"] },
      );
      children.add(child);
      writeFileSync("/workspace/delegate.pid", String(child.pid));
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.resume();
      const abort = () => {
        events({ type: "phase.cancelled", phase: "review" });
        child.kill("SIGKILL");
      };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        const code = await new Promise((resolve, reject) => {
          child.once("exit", resolve);
          child.once("error", reject);
        });
        signal?.throwIfAborted();
        if (code !== 0 || output.trim() !== "REVIEW_OK") throw new Error("Delegated review failed");
        events({ type: "phase.completed", phase: "review", uid: process.getuid?.() });
        return {
          content: [{ type: "text" as const, text: "REVIEW_OK" }],
          details: { type: "phase.completed", phase: "review" },
        };
      } finally {
        signal?.removeEventListener("abort", abort);
        children.delete(child);
      }
    },
  });
  pi.registerTool({
    name: "checkpoint",
    label: "Checkpoint",
    description:
      "Persist a fixture question for the code-controlled coordinator, then finish this turn.",
    parameters: Type.Object({ questionId: Type.Literal("fixture-answer"), prompt: Type.String() }),
    async execute(_id, args) {
      const event = { type: "checkpoint.requested", ...args };
      events(event);
      return {
        content: [
          {
            type: "text" as const,
            text: "Question recorded. End this turn and wait for the coordinator answer.",
          },
        ],
        details: event,
      };
    },
  });
  pi.registerTool({
    name: "phase_complete",
    label: "Complete phase",
    description: "Record completion after writing the resumed answer.",
    parameters: Type.Object({}),
    async execute() {
      const event = { type: "phase.completed", phase: "implementation" };
      events(event);
      return { content: [{ type: "text" as const, text: "Recorded" }], details: event };
    },
  });
}
