/** Deterministic external-provider fixture. Loaded only by the dedicated network-none test image. */
import { appendFileSync, readFileSync } from "node:fs";
import {
  type AssistantMessage,
  createAssistantMessageEventStream,
} from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function fixture(pi: ExtensionAPI) {
  pi.registerProvider("openai-codex", {
    baseUrl: "http://fixture.invalid",
    apiKey: "credential-free-test",
    api: "factory-test-only",
    models: [
      {
        id: "gpt-6-astra",
        name: "Deterministic test fixture",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 1000,
      },
    ],
    streamSimple(model, context) {
      const request = JSON.parse(
        readFileSync(process.env.FACTORY_REQUEST ?? "/phase/request.json", "utf8"),
      );
      const axis = process.env.FACTORY_REVIEW_AXIS;
      const results = context.messages.filter((message) => message.role === "toolResult");
      const names = results.map((message) =>
        message.role === "toolResult" ? message.toolName : "",
      );
      const lastUser = [...context.messages].reverse().find((message) => message.role === "user");
      appendFileSync(
        "/state/protocol-observations.jsonl",
        `${JSON.stringify({ uid: process.getuid?.(), axis, model: model.id, provider: model.provider, user: lastUser, session: process.env.FACTORY_MODEL_OWNER ?? request.session.id })}\n`,
      );
      let tool: { name: string; arguments: Record<string, unknown> };
      if (axis)
        tool = {
          name: "review_result",
          arguments: {
            passed: request.issue.number !== 2,
            findings: request.issue.number === 2 ? ["Fixture review failure"] : [],
          },
        };
      else if (request.issue.number === 7)
        tool = {
          name: "factory_no_change",
          arguments: { reason: "Requested behavior already exists" },
        };
      else if (request.issue.number === 3)
        tool = { name: "Skill", arguments: { name: "uncaptured-dependency" } };
      else if (request.issue.number === 4)
        tool = process.env.FACTORY_DELEGATE_RESULT
          ? { name: "bash", arguments: { command: "sleep 120" } }
          : { name: "spawn_agent", arguments: { task: "Run cancellation probe" } };
      else if (!request.answer)
        tool = {
          name: "request_user_input",
          arguments: { prompt: "Choose fixture implementation", allowFreeform: true },
        };
      else if (!names.includes("bash"))
        tool = {
          name: "bash",
          arguments: { command: "cat /resources/skills/fixture/support.txt > result.txt" },
        };
      else if (!names.includes("checkpoint_commit"))
        tool = { name: "checkpoint_commit", arguments: {} };
      else if (!names.includes("factory_validate"))
        tool = { name: "factory_validate", arguments: {} };
      else if (names.filter((name) => name === "spawn_agent").length === 0)
        tool = {
          name: "spawn_agent",
          arguments: { task: "Independently review standards", axis: "standards" },
        };
      else if (names.filter((name) => name === "spawn_agent").length === 1)
        tool = {
          name: "spawn_agent",
          arguments: { task: "Independently review specification", axis: "spec" },
        };
      else if (request.issue.number === 6 && names.filter((name) => name === "bash").length === 1)
        tool = { name: "bash", arguments: { command: "echo dirty >> result.txt" } };
      else if (!names.includes("factory_complete"))
        tool = { name: "factory_complete", arguments: {} };
      else
        tool = {
          name: "factory_failed",
          arguments: { reason: "Fixture completion rejected unsuccessful evidence" },
        };
      const stream = createAssistantMessageEventStream();
      const message: AssistantMessage = {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: `fixture-${context.messages.length}`,
            name: tool.name,
            arguments: tool.arguments,
          },
        ],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "toolUse",
        timestamp: Date.now(),
      };
      queueMicrotask(() => {
        if (results.length > 40) {
          message.stopReason = "error";
          message.errorMessage = "Fixture exceeded bounded protocol steps";
          stream.push({ type: "error", reason: "error", error: message });
          stream.end();
          return;
        }
        stream.push({ type: "start", partial: message });
        stream.push({ type: "done", reason: "toolUse", message });
        stream.end();
      });
      return stream;
    },
  });
}
