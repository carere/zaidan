import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export interface ServiceConfig {
  stateDirectory: string;
  deploymentDirectory: string;
  repository: string;
  coordinatorPort: number;
  evePort: number;
  adapterModule?: string;
}

/** Configuration contains paths and identities only; credentials stay in the environment. */
export function serviceConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const stateDirectory = externalDirectory(env.FACTORY_STATE_DIR);
  const deploymentDirectory = externalDirectory(join(stateDirectory, "eve"));
  for (const path of ["workflow.sqlite", "service.sqlite", "sessions", "eve/.eve/.workflow-data"])
    externalDirectory(join(stateDirectory, path), false);
  const repository = env.FACTORY_REPOSITORY ?? "carere/zaidan";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid FACTORY_REPOSITORY");
  const coordinatorPort = port(env.FACTORY_COORDINATOR_PORT, 4311);
  const evePort = port(env.FACTORY_EVE_PORT, 4312);
  if (coordinatorPort === evePort) throw new Error("Coordinator and Eve ports must differ");
  const adapterModule = env.FACTORY_ADAPTER_MODULE;
  if (adapterModule && !isAbsolute(adapterModule))
    throw new Error("FACTORY_ADAPTER_MODULE must be absolute");
  return {
    stateDirectory,
    deploymentDirectory,
    repository,
    coordinatorPort,
    evePort,
    adapterModule,
  };
}
function port(value: string | undefined, fallback: number) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < 1 || result > 65535)
    throw new Error("Service ports must be integers between 1 and 65535");
  return result;
}
function externalDirectory(value: string | undefined, create = true) {
  if (!value || !isAbsolute(value))
    throw new Error("FACTORY_STATE_DIR must be an absolute persistent directory outside Git");
  const resolved = resolve(value);
  // Check both lexical and resolved ancestry; a symlink cannot place durable state in Git.
  for (let path = resolved; ; path = dirname(path)) {
    if (existsSync(join(path, ".git")))
      throw new Error("Factory durable state must be outside Git");
    if (existsSync(path)) {
      for (let real = realpathSync(path); ; real = dirname(real)) {
        if (existsSync(join(real, ".git")))
          throw new Error("Factory durable state must be outside Git");
        if (dirname(real) === real) break;
      }
    }
    if (dirname(path) === path) break;
  }
  if (create) mkdirSync(resolved, { recursive: true, mode: 0o700 });
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}
