import { randomUUID } from "node:crypto";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { DockerSandbox } from "@mastra/docker";
import { z } from "zod";

const inputSchema = z.object({});
const outputSchema = z.object({
  sandboxId: z.string(),
  nodeVersion: z.string(),
  reusedFilesystem: z.boolean(),
});

const checkDocker = createStep({
  id: "check-docker",
  description: "Run two commands in one isolated container, then remove it",
  inputSchema,
  outputSchema,
  execute: async () => {
    const sandboxId = `zaidan-check-${randomUUID()}`;
    const sandbox = new DockerSandbox({
      id: sandboxId,
      image: "node:24-slim",
      timeout: 30_000,
      dockerOptions: process.env.DOCKER_SOCKET_PATH
        ? { socketPath: process.env.DOCKER_SOCKET_PATH }
        : undefined,
    });

    try {
      await sandbox.start();
      if (!sandbox.executeCommand) throw new Error("Docker sandbox does not support commands");
      const write = await sandbox.executeCommand("node", [
        "-e",
        "require('node:fs').writeFileSync('/tmp/factory-check', 'ready'); console.log(process.version)",
      ]);
      if (write.exitCode !== 0) throw new Error(write.stderr || "Sandbox write failed");

      const read = await sandbox.executeCommand("node", [
        "-e",
        "console.log(require('node:fs').readFileSync('/tmp/factory-check', 'utf8'))",
      ]);
      if (read.exitCode !== 0 || read.stdout.trim() !== "ready") {
        throw new Error(read.stderr || "Sandbox filesystem was not preserved between commands");
      }

      return { sandboxId, nodeVersion: write.stdout.trim(), reusedFilesystem: true };
    } finally {
      await sandbox.destroy();
    }
  },
});

export const sandboxCheck = createWorkflow({
  id: "sandbox-check",
  description: "Verify Docker execution without model credentials or repository changes",
  inputSchema,
  outputSchema,
})
  .then(checkDocker)
  .commit();
