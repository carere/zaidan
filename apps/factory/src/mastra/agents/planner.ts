import { openaiCodexProvider } from "@mastra/code-sdk/providers/openai-codex";
import { Agent } from "@mastra/core/agent";

export const planner = new Agent({
  id: "planner",
  name: "Issue planner",
  instructions: `You plan implementation work for Zaidan, a SolidJS component registry.
Given an issue and any supplied repository context, return a concise implementation
plan, acceptance criteria, and verification steps. Identify missing information.
You have no repository tools yet: distinguish supplied facts from assumptions,
and never claim to have inspected files, modified code, or run checks.`,
  model: () => openaiCodexProvider(process.env.FACTORY_MODEL || "gpt-5.6-sol"),
});
