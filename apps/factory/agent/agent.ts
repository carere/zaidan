import { defineAgent } from "eve";

// The factory is deterministic orchestration. Only Pi workers may invoke a model.
export default defineAgent({
  model: {
    specificationVersion: "v4",
    provider: "disabled-coordinator",
    modelId: "no-model-calls",
    supportedUrls: {},
    async doGenerate() {
      throw new Error("Coordinator model calls are disabled");
    },
    async doStream() {
      throw new Error("Coordinator model calls are disabled");
    },
  },
  modelContextWindowTokens: 10000,
  defaultTools: false,
});
