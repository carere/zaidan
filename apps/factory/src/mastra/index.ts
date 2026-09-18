import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { planner } from "./agents/planner";
import { sandboxCheck } from "./workflows/sandbox-check";

// The CLI may change cwd to the public directory before loading this module.
const dataDirectory = resolve(process.env.MASTRA_PROJECT_ROOT || ".", ".data");
mkdirSync(dataDirectory, { recursive: true });

export const mastra = new Mastra({
  agents: { planner },
  workflows: { sandboxCheck },
  storage: new LibSQLStore({
    id: "factory-storage",
    url: pathToFileURL(resolve(dataDirectory, "mastra.db")).href,
  }),
  server: { host: "127.0.0.1", port: 4111 },
});
