import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FixtureFaults } from "../src/fixture-faults.ts";

test("a recorded post-effect fixture crash happens once and permits original receipt recovery after restart", async () => {
  const root = mkdtempSync(join(tmpdir(), "factory-faults-"));
  const options = {
    path: join(root, "faults.json"),
    repository: "carere/zaidan-factory-fixture",
    mode: "fixture",
    points: ["branch-publication.after" as const],
    interrupt() {
      throw new Error("injected death");
    },
  };
  let effects = 0;
  try {
    const faults = new FixtureFaults(options);
    await assert.rejects(
      faults.effect("branch-publication", async () => {
        effects++;
        return "published";
      }),
      /injected death/,
    );
    assert.equal(effects, 1);
    const restored = new FixtureFaults(options);
    assert.equal(restored.receipts()[0].point, "branch-publication.after");
    restored.hit("branch-publication.after");
    assert.throws(
      () => new FixtureFaults({ ...options, repository: "carere/zaidan", mode: "live" }),
      /restricted/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
