import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FixtureJournal } from "./journal.ts";

test("lost setup response recovers its native receipt after restart without another create", async () => {
  const path = mkdtempSync(join(tmpdir(), "factory-live-journal-"));
  try {
    let calls = 0;
    let receipt: { id: number } | undefined;
    let journal = new FixtureJournal(path);
    await assert.rejects(
      journal.effect(
        "create",
        { title: "fixed" },
        async () => undefined,
        async () => {
          calls++;
          receipt = { id: 42 };
          throw Error("lost response");
        },
      ),
    );
    journal = new FixtureJournal(path);
    assert.deepEqual(
      await journal.effect(
        "create",
        { title: "fixed" },
        async () => receipt,
        async () => {
          throw Error("duplicate");
        },
      ),
      { id: 42 },
    );
    assert.equal(calls, 1);
    await assert.rejects(
      journal.effect(
        "create",
        { title: "changed" },
        async () => receipt,
        async () => receipt,
      ),
      /changed/,
    );
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});

test("uncertain invisible creation pauses durably and does not retry after restart", async () => {
  const path = mkdtempSync(join(tmpdir(), "factory-live-uncertain-"));
  try {
    let calls = 0;
    const create = async () => {
      calls++;
      throw Error("unknown");
    };
    await assert.rejects(
      new FixtureJournal(path).effect("issue", {}, async () => undefined, create),
    );
    await assert.rejects(
      new FixtureJournal(path).effect("issue", {}, async () => undefined, create),
      /uncertain/,
    );
    assert.equal(calls, 1);
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
