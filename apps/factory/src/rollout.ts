import { readFileSync } from "node:fs";

export type RolloutMode = "read-only" | "fixture" | "live";
export interface RolloutBinding {
  runtime: string;
  configuration: string;
  repositoryId: string;
}
export interface RolloutOptions {
  mode?: RolloutMode;
  repository: string;
  binding: RolloutBinding;
  evidence?: string;
}
export const actualAcceptanceScenarios = [
  "authenticated-contained-workers",
  "telegram-human-restart",
  "concurrent-conflict-graph",
  "standalone-normal-delivery",
  "external-squash-delivery",
  "graph-maintainer-delivery",
  "publication-restart",
] as const;

/** Operator-owned acceptance receipts authorize this exact runtime/configuration only.
 * Read on every consequential action, so retained runs cannot bypass withdrawal.
 * This is independent from temporary factory/run pause controls.
 */
export class RolloutPolicy {
  private options: RolloutOptions;
  constructor(options: RolloutOptions) {
    this.options = options;
  }
  status(): { mode: RolloutMode; enabled: boolean; reason?: string } {
    const { repository, binding, evidence } = this.options;
    const mode = this.options.mode ?? "read-only";
    const disabled = (reason: string) => ({ mode, enabled: false, reason });
    if (!Object.values(binding).every((value) => typeof value === "string" && value.trim()))
      return disabled("Runtime, configuration and native repository identities are required");
    if (mode === "read-only") return disabled("Read-only discovery selected");
    if (mode === "fixture")
      return repository === "carere/zaidan-factory-fixture"
        ? { mode, enabled: true }
        : disabled("Fixture authority is limited to carere/zaidan-factory-fixture");
    if (repository !== "carere/zaidan" || !evidence)
      return disabled("Zaidan requires complete bound actual acceptance evidence");
    try {
      const proof = JSON.parse(readFileSync(evidence, "utf8"));
      const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
      if (
        proof.version !== 1 ||
        Object.entries(binding).some(([key, value]) => proof.binding?.[key] !== value) ||
        proof.fixture?.repository !== "carere/zaidan-factory-fixture" ||
        !proof.fixture.repositoryId ||
        proof.fixture.completed !== true ||
        !hash(proof.fixture.evidenceHash) ||
        !Array.isArray(proof.fixture.scenarios) ||
        actualAcceptanceScenarios.some((scenario) => !proof.fixture.scenarios.includes(scenario)) ||
        proof.discovery?.repository !== repository ||
        proof.discovery.repositoryId !== binding.repositoryId ||
        proof.discovery.readOnly !== true ||
        !hash(proof.discovery.snapshotHash)
      )
        return disabled(
          "Acceptance evidence is incomplete or belongs to another runtime, configuration or repository",
        );
      return { mode, enabled: true };
    } catch {
      return disabled("Acceptance evidence is unavailable or malformed");
    }
  }
  assertAllowed() {
    const status = this.status();
    if (!status.enabled) throw new Error(`Rollout disabled: ${status.reason}`);
  }
}
