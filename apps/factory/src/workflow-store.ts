import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ResourceSnapshotReference } from "./captured-resources.ts";
import type { IssueSnapshot, RunSnapshot } from "./workflow-contracts.ts";

export interface Operation {
  id: string;
  kind: "start" | "dispatch" | "resume" | "notify" | "wake" | "publication";
  runId: string;
  phase: number;
  state: "pending" | "claimed" | "done";
  owner?: string;
  ownerPid?: number;
  leaseUntil?: number;
  receipt?: unknown;
}
/** Coarse transactions keep admission, checkpoint and outbox mutations indivisible. */
export interface WorkflowStore {
  admit(issue: IssueSnapshot, resources?: ResourceSnapshotReference): RunSnapshot;
  read(runId: string): RunSnapshot;
  list(): RunSnapshot[];
  change<T>(runId: string, fn: (run: RunSnapshot, operations: Operation[]) => T): T;
}
export class SqliteWorkflowStore implements WorkflowStore {
  private db: DatabaseSync;
  private stateDirectory: string;
  constructor(path: string) {
    if (!isAbsolute(path))
      throw new Error("Workflow database requires an absolute persistent path");
    this.stateDirectory = dirname(path);
    mkdirSync(this.stateDirectory, { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, issue_id TEXT NOT NULL, revision TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(issue_id, revision));
      CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), data TEXT NOT NULL);`);
  }
  close() {
    this.db.close();
  }
  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  admit(issue: IssueSnapshot, resources?: ResourceSnapshotReference): RunSnapshot {
    return this.transaction(() => {
      const existing = this.db
        .prepare("SELECT data FROM runs WHERE issue_id=? AND revision=?")
        .get(issue.issueId, issue.revision);
      if (existing) return JSON.parse(existing.data as string);
      const runId = randomUUID();
      const sessionId = randomUUID();
      const run: RunSnapshot = {
        runId,
        issue,
        ...(resources ? { resources } : {}),
        session: { id: sessionId, path: join(this.stateDirectory, "sessions", sessionId) },
        status: "admitted",
        phase: 0,
      };
      this.db
        .prepare("INSERT INTO runs VALUES (?, ?, ?, ?)")
        .run(runId, issue.issueId, issue.revision, JSON.stringify(run));
      this.writeOperation({
        id: `${runId}:start`,
        kind: "start",
        runId,
        phase: 0,
        state: "pending",
      });
      return run;
    });
  }
  read(runId: string): RunSnapshot {
    const row = this.db.prepare("SELECT data FROM runs WHERE id=?").get(runId);
    if (!row) throw new Error("Unknown factory run");
    return JSON.parse(row.data as string);
  }
  list(): RunSnapshot[] {
    return this.db
      .prepare("SELECT data FROM runs ORDER BY rowid")
      .all()
      .map((row) => JSON.parse(row.data as string));
  }
  change<T>(runId: string, fn: (run: RunSnapshot, operations: Operation[]) => T): T {
    return this.transaction(() => {
      const run = this.read(runId);
      const operations: Operation[] = this.db
        .prepare("SELECT data FROM operations WHERE run_id=?")
        .all(runId)
        .map((row) => JSON.parse(row.data as string));
      const result = fn(run, operations);
      this.db.prepare("UPDATE runs SET data=? WHERE id=?").run(JSON.stringify(run), runId);
      for (const op of operations) this.writeOperation(op);
      return result;
    });
  }
  private writeOperation(op: Operation) {
    this.db
      .prepare(
        "INSERT INTO operations VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(op.id, op.runId, JSON.stringify(op));
  }
}
