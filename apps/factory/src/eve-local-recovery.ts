import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

const pinnedWorld = "@workflow/world-local@5.0.0-beta.43";
const id = "[0-9A-HJKMNP-TV-Z]{26}";
const created = new RegExp(`^(wrun_${id})-((step|wait)_${id})\\.created$`);
const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
const plain = (path: string) => {
  if (lstatSync(path).isSymbolicLink()) throw Error("Eve recovery refuses redirected state");
};
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    return false;
  }
}

/** Call only after acquiring the service owner, with the previous Eve host stopped.
 * The host claim additionally refuses a still-exiting supervised writer. Never repair
 * a running world. This workaround is tied to the installed native journal ordering.
 */
export function prepareEveWorld(world: string) {
  if (!isAbsolute(world)) throw Error("Eve world requires an absolute persistent path");
  mkdirSync(dirname(world), { recursive: true });
  plain(dirname(world));
  const claim = join(dirname(world), "factory-host-owner.json");
  if (existsSync(claim)) {
    plain(claim);
    const previous = read(claim);
    if (
      !Number.isSafeInteger(previous.pid) ||
      Number(previous.pid) <= 0 ||
      typeof previous.owner !== "string"
    )
      throw Error("Malformed Eve host ownership requires reconciliation");
    if (alive(Number(previous.pid))) throw Error("Another Eve host owns this world");
    unlinkSync(claim);
  }
  const owner = randomUUID();
  writeFileSync(claim, JSON.stringify({ pid: process.pid, owner }), { flag: "wx", mode: 0o600 });
  const release = () => {
    if (existsSync(claim) && read(claim).owner === owner) unlinkSync(claim);
  };
  const repaired: {
    marker: string;
    quarantine: string;
    record?: { source: string; quarantine: string };
  }[] = [];
  try {
    if (!existsSync(world)) return { release, repaired };
    plain(world);
    const candidates: { collection: "steps" | "waits"; marker: string; locks: string }[] = [];
    for (const collection of ["steps", "waits"] as const) {
      const locks = join(world, ".locks", collection);
      if (!existsSync(locks)) continue;
      plain(join(world, ".locks"));
      plain(locks);
      for (const marker of readdirSync(locks)) {
        const match = created.exec(marker);
        if (match && `${match[3]}s` === collection) candidates.push({ collection, marker, locks });
      }
    }
    if (!candidates.length) return { release, repaired };
    if (readFileSync(join(world, "version.txt"), "utf8").trim() !== pinnedWorld)
      throw Error("Unknown Eve world version; refuse automatic journal repair");
    const planned: { marker: string; record?: string }[] = [];
    for (const { collection, marker, locks } of candidates) {
      const match = created.exec(marker);
      if (!match) continue;
      const [, runId, recordId] = match;
      const path = join(locks, marker);
      plain(path);
      if (!lstatSync(path).isFile() || lstatSync(path).size !== 0)
        throw Error("Malformed Eve creation marker");
      const runPath = join(world, "runs", `${runId}.json`);
      plain(join(world, "runs"));
      plain(runPath);
      const run = read(runPath);
      if (
        run.runId !== runId ||
        typeof run.status !== "string" ||
        !["pending", "running", "completed", "failed", "cancelled"].includes(run.status)
      )
        throw Error("Malformed Eve run identity");
      if (!["pending", "running"].includes(run.status)) continue;
      const recordPath = join(world, collection, `${runId}-${recordId}.json`);
      let pendingRecord: string | undefined;
      if (existsSync(recordPath)) {
        plain(recordPath);
        // Native inline execution may already have called the coordinator before
        // journal persistence. Only its durable, idempotent factory operations make
        // replay safe; this is deliberately not a repair for arbitrary Eve steps.
        const record = read(recordPath);
        if (
          collection !== "steps" ||
          record.runId !== runId ||
          record.stepId !== recordId ||
          record.status !== "pending" ||
          record.attempt !== 0 ||
          ![
            "step//./agent/lib/issue-workflow//drive",
            "step//./agent/lib/issue-workflow//recoverWake",
          ].includes(String(record.stepName)) ||
          typeof record.createdAt !== "string" ||
          !Number.isFinite(Date.parse(record.createdAt)) ||
          record.updatedAt !== record.createdAt ||
          record.startedAt !== undefined ||
          record.output !== undefined ||
          record.error !== undefined ||
          record.completedAt !== undefined
        )
          continue;
        pendingRecord = recordPath;
      }
      if (existsSync(join(locks, `${runId}-${recordId}.terminal`))) continue;
      const events = join(world, "events");
      if (!existsSync(events)) throw Error("Missing Eve journal requires reconciliation");
      plain(events);
      let journaled = false;
      for (const name of readdirSync(events).filter(
        (name) => name.startsWith(`${runId}-`) && name.endsWith(".json"),
      )) {
        const eventPath = join(events, name);
        plain(eventPath);
        const event = read(eventPath);
        if (event.runId !== runId || typeof event.eventType !== "string")
          throw Error("Malformed Eve journal identity");
        if (event.correlationId === recordId) journaled = true;
      }
      if (!journaled) planned.push({ marker: path, record: pendingRecord });
    }
    // Validate the whole repair set before changing any marker. Keep evidence outside
    // native world directories; all recorded entities and other tombstones survive.
    const quarantine = join(dirname(world), "factory-world-repairs");
    if (planned.length) {
      mkdirSync(quarantine, { recursive: true, mode: 0o700 });
      plain(quarantine);
    }
    for (const { marker: path, record } of planned) {
      const retained = join(quarantine, `${owner}-${path.slice(path.lastIndexOf("/") + 1)}`);
      const retainedRecord = record
        ? join(quarantine, `${owner}-${record.slice(record.lastIndexOf("/") + 1)}`)
        : undefined;
      // Record first: a crash here leaves the already-supported absent-record seam.
      // Both original files remain in the diagnostic quarantine across that crash.
      if (record && retainedRecord) renameSync(record, retainedRecord);
      renameSync(path, retained);
      repaired.push({
        marker: path,
        quarantine: retained,
        ...(record && retainedRecord
          ? { record: { source: record, quarantine: retainedRecord } }
          : {}),
      });
    }
    if (repaired.length)
      writeFileSync(
        join(quarantine, `${owner}.json`),
        JSON.stringify({ world, version: pinnedWorld, repaired }),
        { flag: "wx", mode: 0o600 },
      );
    return { release, repaired };
  } catch (error) {
    release();
    throw error;
  }
}
