import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: [".kojo/tests/**/*.test.ts"], environment: "node" },
});
