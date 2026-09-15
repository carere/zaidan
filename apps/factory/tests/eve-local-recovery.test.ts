import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepareEveWorld } from "../src/eve-local-recovery.ts";

test("exclusive pinned Eve startup repairs only an abandoned step creation before its record and journal exist", (t) => {
  const root = mkdtempSync(join(tmpdir(), "factory-world-repair-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const world = join(root, ".eve", ".workflow-data");
  for (const folder of ["runs", "steps", "events", ".locks/steps"])
    mkdirSync(join(world, folder), { recursive: true });
  writeFileSync(join(world, "version.txt"), "@workflow/world-local@5.0.0-beta.43");
  const run = "wrun_01M2JG1KDSRF60FCK75SW6HKX9",
    step = "step_01M2JG1KDS3B82BSYZ1K6A8T2D",
    other = "step_01M2JG1KDS3B82BSYZ1K6A8T2E";
  writeFileSync(
    join(world, "runs", `${run}.json`),
    JSON.stringify({ runId: run, status: "running" }),
  );
  const abandoned = join(world, ".locks/steps", `${run}-${step}.created`),
    valid = join(world, ".locks/steps", `${run}-${other}.created`);
  writeFileSync(abandoned, "");
  writeFileSync(valid, "");
  writeFileSync(
    join(world, "steps", `${run}-${other}.json`),
    JSON.stringify({ stepId: other, runId: run, status: "completed" }),
  );
  const tombstone = join(world, ".locks/steps", `${run}-${step}.completed`);
  writeFileSync(tombstone, "retained");
  const owner = prepareEveWorld(world);
  assert.equal(owner.repaired.length, 1);
  assert.equal(existsSync(abandoned), false);
  assert.equal(existsSync(valid), true);
  assert.equal(readFileSync(tombstone, "utf8"), "retained");
  assert.ok(existsSync(owner.repaired[0].quarantine));
  assert.throws(() => prepareEveWorld(world), /owns/);
  owner.release();
  const next = prepareEveWorld(world);
  assert.deepEqual(next.repaired, []);
  next.release();
});
test("startup preserves journaled and terminal step markers and refuses malformed or unknown state", (t) => {
  const root = mkdtempSync(join(tmpdir(), "factory-world-safe-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const world = join(root, ".eve", ".workflow-data");
  for (const folder of ["runs", "steps", "events", ".locks/steps"])
    mkdirSync(join(world, folder), { recursive: true });
  const run = "wrun_01M2JG1KDSRF60FCK75SW6HKX9",
    step = "step_01M2JG1KDS3B82BSYZ1K6A8T2D";
  const marker = join(world, ".locks/steps", `${run}-${step}.created`);
  writeFileSync(marker, "");
  writeFileSync(
    join(world, "runs", `${run}.json`),
    JSON.stringify({ runId: run, status: "running" }),
  );
  writeFileSync(join(world, "version.txt"), "unknown");
  assert.throws(() => prepareEveWorld(world), /version/);
  assert.ok(existsSync(marker));
  writeFileSync(join(world, "version.txt"), "@workflow/world-local@5.0.0-beta.43");
  const event = join(world, "events", `${run}-event.json`);
  writeFileSync(
    event,
    JSON.stringify({ runId: run, eventType: "step_created", correlationId: step }),
  );
  let owner = prepareEveWorld(world);
  assert.deepEqual(owner.repaired, []);
  assert.ok(existsSync(marker));
  owner.release();
  rmSync(event);
  writeFileSync(
    join(world, "runs", `${run}.json`),
    JSON.stringify({ runId: run, status: "completed" }),
  );
  owner = prepareEveWorld(world);
  assert.deepEqual(owner.repaired, []);
  owner.release();
  assert.ok(existsSync(marker));
  writeFileSync(
    join(world, "runs", `${run}.json`),
    JSON.stringify({ runId: run, status: "unknown" }),
  );
  assert.throws(() => prepareEveWorld(world), /identity/);
  assert.ok(existsSync(marker));
  writeFileSync(join(world, "runs", `${run}.json`), "invalid-json");
  assert.throws(() => prepareEveWorld(world));
  assert.ok(existsSync(marker));
});
