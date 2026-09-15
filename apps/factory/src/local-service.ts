import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ScanResult } from "./discovery.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { RolloutMode } from "./rollout.ts";
import type { Clock } from "./workflow-contracts.ts";

export type ScanTrigger = "restart" | "wake" | "manual" | "scheduled";
export interface ServiceStatus {
  instanceId?: string;
  mode: RolloutMode;
  rollout?: { enabled: boolean; reason?: string };
  running: boolean;
  ready: boolean;
  scanning: boolean;
  nextScanAt?: number;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastTrigger?: ScanTrigger;
  error?: "scan-failed";
}
export interface LocalServiceOptions {
  workflow: IssueWorkflow;
  stateDirectory: string;
  clock?: Clock;
  onScan?: (result: ScanResult) => void | Promise<void>;
  prepare?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  rollout?: () => { mode: RolloutMode; enabled: boolean; reason?: string };
}

/** A single local lifecycle around the authoritative IssueWorkflow.scan boundary.
 * Polling observes wall time after sleep; missed intervals never form a queue.
 */
export class LocalService {
  private options: LocalServiceOptions;
  private clock: Clock;
  private db?: DatabaseSync;
  private owner = randomUUID();
  private pending?: Promise<ScanResult>;
  private lastPoll?: number;
  private stopping = false;
  private current: ServiceStatus = {
    mode: "read-only",
    running: false,
    ready: false,
    scanning: false,
  };
  constructor(options: LocalServiceOptions) {
    this.options = options;
    this.clock = options.clock ?? { now: Date.now };
  }
  status(): ServiceStatus {
    const rollout = this.options.rollout?.();
    return {
      ...this.current,
      instanceId: this.owner,
      ...(rollout ? { mode: rollout.mode, rollout } : {}),
    };
  }
  async start() {
    if (this.db) throw new Error("Service already started");
    mkdirSync(this.options.stateDirectory, { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(join(this.options.stateDirectory, "service.sqlite"));
    db.exec(
      "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS service (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT, pid INTEGER, status TEXT)",
    );
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db.prepare("SELECT * FROM service WHERE id=1").get();
      if (row?.owner && alive(Number(row.pid)))
        throw new Error("Another coordinator owns this state directory");
      const previous = row?.status ? (JSON.parse(String(row.status)) as ServiceStatus) : undefined;
      this.current = {
        mode: "read-only",
        running: true,
        ready: false,
        scanning: false,
        lastSuccessAt: previous?.lastSuccessAt,
      };
      db.prepare(
        "INSERT INTO service VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, pid=excluded.pid, status=excluded.status",
      ).run(this.owner, process.pid, JSON.stringify(this.current));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
    this.db = db;
    this.stopping = false;
    this.lastPoll = this.clock.now();
    return this.trigger("restart");
  }
  trigger(reason: ScanTrigger): Promise<ScanResult> {
    if (!this.db || this.stopping) return Promise.reject(new Error("Service is stopped"));
    if (this.pending) return this.pending;
    this.current.scanning = true;
    this.current.lastAttemptAt = this.clock.now();
    this.current.lastTrigger = reason;
    this.save();
    this.pending = Promise.resolve()
      .then(async () => {
        if (reason === "restart") await this.options.prepare?.();
        return this.options.workflow.scan();
      })
      .then(async (result) => {
        this.current.ready = true;
        this.current.lastSuccessAt = this.clock.now();
        delete this.current.error;
        await this.options.onScan?.(result);
        return result;
      })
      .catch((error: unknown) => {
        this.current.ready = false;
        this.current.error = "scan-failed";
        throw error;
      })
      .finally(() => {
        this.current.scanning = false;
        // Schedule from completion: a slow scan or multi-day sleep cannot enqueue a burst.
        this.current.nextScanAt = this.clock.now() + 21600000;
        this.lastPoll = this.clock.now();
        this.pending = undefined;
        this.save();
      });
    return this.pending;
  }
  async poll() {
    if (!this.db || this.stopping) return;
    const now = this.clock.now();
    const woke = this.lastPoll !== undefined && now - this.lastPoll > 60000;
    this.lastPoll = now;
    if (woke) return this.trigger("wake");
    if (now >= (this.current.nextScanAt ?? Infinity)) return this.trigger("scheduled");
  }
  async stop() {
    this.stopping = true;
    await this.pending?.catch(() => {});
    if (!this.db) return;
    await this.options.disconnect?.();
    this.current.running = false;
    this.current.ready = false;
    this.save();
    this.db
      .prepare("UPDATE service SET owner=NULL, pid=NULL WHERE id=1 AND owner=?")
      .run(this.owner);
    this.db.close();
    this.db = undefined;
  }
  private save() {
    this.db
      ?.prepare("UPDATE service SET status=? WHERE id=1 AND owner=?")
      .run(JSON.stringify(this.current), this.owner);
  }
}
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
