import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { RolloutMode } from "./rollout.ts";

export interface ProductionConfig {
  version: 1;
  mode: RolloutMode;
  image: string;
  authFile: string;
  skills: { path: string; selected?: boolean; target?: string }[];
  checks: string[];
  evidence?: string;
}

/** Explicit local data, never shell code. Secret values never enter returned configuration. */
export function loadPrivateEnvironment(path: string, env: NodeJS.ProcessEnv = process.env) {
  if (!isAbsolute(path) || !statSync(path).isFile() || statSync(path).mode & 0o077)
    throw new Error("Factory environment file must be an absolute private file (0600)");
  const allowed = new Set([
    "FACTORY_GITHUB_TOKEN",
    "FACTORY_TELEGRAM_TOKEN",
    "FACTORY_TELEGRAM_MAINTAINER_ID",
  ]);
  const result = { ...env };
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    if (!match || !allowed.has(match[1]) || result[match[1]] !== undefined)
      throw new Error("Invalid, duplicate or conflicting factory environment entry");
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (!value || /[\r\n\0]/.test(value)) throw new Error("Invalid factory credential entry");
    result[match[1]] = value;
  }
  return result;
}

export function readProductionConfig(path: string): ProductionConfig {
  if (!isAbsolute(path)) throw new Error("FACTORY_RUNTIME_CONFIG must be absolute");
  const value = JSON.parse(readFileSync(path, "utf8")) as ProductionConfig;
  if (
    value.version !== 1 ||
    !["read-only", "fixture", "live"].includes(value.mode) ||
    typeof value.image !== "string" ||
    !/^[\w./:@-]+$/.test(value.image) ||
    !isAbsolute(value.authFile ?? "") ||
    !Array.isArray(value.skills) ||
    !value.skills.length ||
    value.skills.some((skill) => typeof skill.path !== "string" || !skill.path) ||
    !Array.isArray(value.checks) ||
    !value.checks.length ||
    value.checks.some((check) => typeof check !== "string" || !check.trim()) ||
    (value.evidence !== undefined && !isAbsolute(value.evidence))
  )
    throw new Error("Invalid factory runtime configuration");
  return value;
}

/** Hash only explicitly selected source trees; never credentials or unrelated home files. */
export function sourceIdentity(paths: string[]) {
  const digest = createHash("sha256");
  const seen = new Set<string>();
  const visit = (path: string, logical: string) => {
    const real = realpathSync(path);
    if (seen.has(real)) throw new Error("Cyclic selected source tree");
    const info = lstatSync(real);
    digest.update(logical);
    if (info.isFile()) {
      digest.update(readFileSync(real));
      return;
    }
    if (!info.isDirectory()) throw new Error("Unsupported selected source resource");
    seen.add(real);
    for (const name of readdirSync(real).sort()) visit(join(real, name), `${logical}/${name}`);
    seen.delete(real);
  };
  for (const path of paths) visit(path, path);
  return digest.digest("hex");
}
