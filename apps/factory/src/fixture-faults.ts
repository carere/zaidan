import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const fixtureFaultPoints = [
  "branch-publication.before",
  "branch-publication.after",
  "issue-closure.before",
  "issue-closure.after",
  "pr-readiness.before",
  "pr-readiness.after",
  "question-notification.before",
  "question-notification.after",
  "answer-persistence.before",
  "answer-persistence.after",
] as const;
export type FixtureFaultPoint = (typeof fixtureFaultPoints)[number];

/** Deliberate one-shot process interruption, available only to the named private fixture.
 * Its receipt precedes SIGKILL; restarting finishes the original adapter intent.
 */
export class FixtureFaults {
  private path: string;
  private points: FixtureFaultPoint[];
  private interrupt: () => void;
  constructor(options: {
    path: string;
    repository: string;
    mode: string;
    points?: FixtureFaultPoint[];
    interrupt?: () => void;
  }) {
    this.path = options.path;
    this.points = options.points ?? [];
    if (
      this.points.length &&
      (options.mode !== "fixture" || options.repository !== "carere/zaidan-factory-fixture")
    )
      throw new Error("Crash injection is restricted to the private acceptance fixture");
    if (this.points.some((point) => !fixtureFaultPoints.includes(point)))
      throw new Error("Unknown fixture fault point");
    this.interrupt = options.interrupt ?? (() => process.kill(process.pid, "SIGKILL"));
  }
  receipts(): { point: FixtureFaultPoint; at: string }[] {
    if (!existsSync(this.path)) return [];
    const records = JSON.parse(readFileSync(this.path, "utf8"));
    if (
      !Array.isArray(records) ||
      records.some(
        (record) => !fixtureFaultPoints.includes(record.point) || typeof record.at !== "string",
      )
    )
      throw new Error("Malformed fixture interruption receipts");
    return records;
  }
  hit(point: FixtureFaultPoint) {
    if (!this.points.includes(point)) return;
    const receipts = this.receipts();
    if (receipts.some((receipt) => receipt.point === point)) return;
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    writeFileSync(
      `${this.path}.tmp`,
      JSON.stringify([...receipts, { point, at: new Date().toISOString() }]),
      { mode: 0o600, flush: true },
    );
    renameSync(`${this.path}.tmp`, this.path);
    this.interrupt();
  }
  async effect<T>(
    name: "branch-publication" | "issue-closure" | "pr-readiness" | "question-notification",
    action: () => Promise<T>,
  ) {
    this.hit(`${name}.before`);
    const result = await action();
    this.hit(`${name}.after`);
    return result;
  }
}
