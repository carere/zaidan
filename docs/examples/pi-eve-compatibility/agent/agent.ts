import { defineAgent } from "eve";

// Code-controlled routes are the only entry point. Accidental chat fails locally.
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
