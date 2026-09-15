import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepareEveWorld } from "../src/eve-local-recovery.ts";

for (const entity of ["step", "wait"] as const) {
  test(`exclusive pinned Eve startup repairs only an abandoned ${entity} creation before its record and journal exist`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "factory-world-repair-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const world = join(root, ".eve", ".workflow-data");
    for (const folder of ["runs", `${entity}s`, "events", `.locks/${entity}s`])
      mkdirSync(join(world, folder), { recursive: true });
    writeFileSync(join(world, "version.txt"), "@workflow/world-local@5.0.0-beta.43");
    const run = "wrun_01M2JG1KDSRF60FCK75SW6HKX9",
      step = `${entity}_01M2JG1KDS3B82BSYZ1K6A8T2D`,
      other = `${entity}_01M2JG1KDS3B82BSYZ1K6A8T2E`;
    writeFileSync(
      join(world, "runs", `${run}.json`),
      JSON.stringify({ runId: run, status: "running" }),
    );
    const abandoned = join(world, `.locks/${entity}s`, `${run}-${step}.created`),
      valid = join(world, `.locks/${entity}s`, `${run}-${other}.created`);
    writeFileSync(abandoned, "");
    writeFileSync(valid, "");
    writeFileSync(
      join(world, `${entity}s`, `${run}-${other}.json`),
      JSON.stringify({ stepId: other, runId: run, status: "completed" }),
    );
    const tombstone = join(world, `.locks/${entity}s`, `${run}-${step}.completed`);
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
  test(`startup preserves journaled and terminal ${entity} markers and refuses malformed or unknown state`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "factory-world-safe-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const world = join(root, ".eve", ".workflow-data");
    for (const folder of ["runs", `${entity}s`, "events", `.locks/${entity}s`])
      mkdirSync(join(world, folder), { recursive: true });
    const run = "wrun_01M2JG1KDSRF60FCK75SW6HKX9",
      step = `${entity}_01M2JG1KDS3B82BSYZ1K6A8T2D`;
    const marker = join(world, `.locks/${entity}s`, `${run}-${step}.created`);
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
      JSON.stringify({ runId: run, eventType: `${entity}_created`, correlationId: step }),
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
}

test("startup quarantines only an unjournaled initial idempotent factory step record, preserving uncertain effects", (t) => {
  const root = mkdtempSync(join(tmpdir(), "factory-pending-record-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const world = join(root, ".eve", ".workflow-data");
  for (const folder of ["runs", "steps", "events", ".locks/steps"])
    mkdirSync(join(world, folder), { recursive: true });
  writeFileSync(join(world, "version.txt"), "@workflow/world-local@5.0.0-beta.43");
  const runId = "wrun_01M2JG1KDSRF60FCK75SW6HKX9";
  const stepId = "step_01M2JG1KDS3B82BSYZ1K6A8T2D";
  const marker = join(world, ".locks/steps", `${runId}-${stepId}.created`);
  const record = join(world, "steps", `${runId}-${stepId}.json`);
  const event = join(world, "events", `${runId}-event.json`);
  const terminal = join(world, ".locks/steps", `${runId}-${stepId}.terminal`);
  writeFileSync(join(world, "runs", `${runId}.json`), JSON.stringify({ runId, status: "running" }));
  writeFileSync(marker, "");
  const pending = {
    runId,
    stepId,
    stepName: "step//./agent/lib/issue-workflow//drive",
    status: "pending",
    attempt: 0,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  };
  for (const change of [
    { status: "running" },
    { status: "completed" },
    { status: "failed" },
    { attempt: 1 },
    { stepName: "step//foreign//effect" },
    { startedAt: pending.createdAt },
    { output: {} },
    { error: {} },
    { updatedAt: "2026-09-15T00:00:01.000Z" },
    { runId: "other" },
  ]) {
    writeFileSync(record, JSON.stringify({ ...pending, ...change }));
    const owner = prepareEveWorld(world);
    assert.deepEqual(owner.repaired, []);
    owner.release();
    assert.ok(existsSync(record));
    assert.ok(existsSync(marker));
  }
  writeFileSync(record, JSON.stringify(pending));
  for (const barrier of [event, terminal]) {
    writeFileSync(
      barrier,
      barrier === event
        ? JSON.stringify({ runId, eventType: "step_started", correlationId: stepId })
        : "",
    );
    const owner = prepareEveWorld(world);
    assert.deepEqual(owner.repaired, []);
    owner.release();
    rmSync(barrier);
  }
  const owner = prepareEveWorld(world);
  assert.equal(owner.repaired.length, 1);
  assert.equal(existsSync(record), false);
  assert.equal(existsSync(marker), false);
  assert.deepEqual(
    JSON.parse(readFileSync(owner.repaired[0].record?.quarantine ?? "missing", "utf8")),
    pending,
  );
  assert.ok(existsSync(owner.repaired[0].quarantine));
  owner.release();
  const next = prepareEveWorld(world);
  assert.deepEqual(next.repaired, []);
  next.release();
});
