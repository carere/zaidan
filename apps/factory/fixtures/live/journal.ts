import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export class FixtureJournal {
  readonly directory: string;
  constructor(directory: string) {
    if (!isAbsolute(directory)) throw Error("Fixture state directory must be absolute");
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  read<T>(name: string): T | undefined {
    const path = join(this.directory, name);
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
  }
  save(name: string, value: unknown) {
    const path = join(this.directory, name);
    writeFileSync(`${path}.pending`, JSON.stringify(value, null, 2), { mode: 0o600 });
    renameSync(`${path}.pending`, path);
  }
  async effect<T>(
    key: string,
    request: unknown,
    find: () => Promise<T | undefined>,
    apply: () => Promise<T>,
  ): Promise<T> {
    const name = `action-${digest(key)}.json`;
    const old = this.read<{ key: string; requestHash: string; attempted?: boolean; receipt?: T }>(
      name,
    );
    const requestHash = digest(request);
    if (old && (old.key !== key || old.requestHash !== requestHash))
      throw Error(`Fixture action changed: ${key}`);
    if (old?.receipt !== undefined) return old.receipt;
    const found = await find();
    if (found !== undefined) {
      this.save(name, { key, requestHash, attempted: old?.attempted ?? false, receipt: found });
      return found;
    }
    if (old?.attempted)
      throw Error(`Fixture action uncertain: ${key}; reconcile native state, never blindly retry`);
    this.save(name, { key, requestHash, attempted: true });
    const receipt = await apply();
    this.save(name, { key, requestHash, attempted: true, receipt });
    return receipt;
  }
}
