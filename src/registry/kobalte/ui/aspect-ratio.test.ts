import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourcePath = fileURLToPath(new URL("./aspect-ratio.tsx", import.meta.url));

describe("AspectRatio", () => {
  it("keeps the pinned native-div contract", async () => {
    const source = await readFile(sourcePath, "utf8");

    expect(source).toContain('data-slot="aspect-ratio"');
    expect(source).toContain('"--ratio": local.ratio');
    expect(source).toContain('cn("relative aspect-(--ratio)", local.class)');
    expect(source).not.toContain("overflow-hidden");
  });
});
