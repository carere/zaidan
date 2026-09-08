import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as OnExpiry from "@carere/kojo-runtime/contexts/gate/models/OnExpiry";
import { noSandbox } from "@carere/kojo-runtime/contexts/sandbox/adapters/providers";
import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { CurrentRun } from "@carere/kojo-runtime/contexts/workflow/services/CurrentRun";
import { gate } from "@carere/kojo-runtime/contexts/workflow/services/phase/gate";
import { sandboxed } from "@carere/kojo-runtime/contexts/workflow/services/sandboxed";
import { workflow } from "@carere/kojo-runtime/contexts/workflow/services/workflow";
import { Duration, Effect, Schema } from "effect";
import { Activity } from "effect/unstable/workflow";
import { commands } from "../commands.ts";
import { FactoryError, failure } from "../envelopes.ts";
import { agents } from "../lib/agents.ts";
import { claimRun, coordinate, type Outcome, releaseRun } from "../lib/coordinator.ts";
import { repository } from "../lib/integration.ts";
import { exec, git, phase } from "../lib/phases.ts";
import { Settings } from "../settings.ts";

class RetryIssues {
  readonly _tag = "RetryIssues";
}

export const implement = workflow(
  {
    name: "implement",
    payload: Settings.fields,
    success: Schema.Struct({
      branch: Schema.String,
      pr: Schema.String,
      completed: Schema.Array(Schema.Number),
      pending: Schema.Array(Schema.String),
    }),
    error: FactoryError,
    idempotencyKey: (settings) => `implement/${settings.runKey}`,
  },
  (settings) =>
    Effect.gen(function* () {
      const run = yield* CurrentRun;
      const host = yield* Workspace;
      const shared = `codex/kojo-${createHash("sha256").update(run.runId).digest("hex").slice(0, 16)}`;
      const preflight = yield* phase(
        "preflight",
        Schema.Struct({ repo: Schema.String, cwd: Schema.String, token: Schema.String }),
        Effect.gen(function* () {
          yield* git(["check-ref-format", "--branch", settings.baseBranch]);
          yield* exec(["pi", "--version"]);
          yield* exec(["agent-browser", "--version"]);
          yield* exec(["docker", "image", "inspect", "kojo-zaidan:latest", "--format", "{{.Id}}"]);
          // Inspect the provider kind only. Credential values never enter an envelope or trace.
          const authenticated = yield* Effect.try({
            try: () =>
              JSON.parse(readFileSync(join(homedir(), ".pi/agent/auth.json"), "utf8"))[
                "openai-codex"
              ]?.type === "oauth",
            catch: () =>
              new FactoryError({
                message: "Pi auth could not be read. Run pi, then /login and choose OpenAI Codex.",
              }),
          });
          if (!authenticated)
            return yield* new FactoryError({
              message: "Pi needs an OpenAI Codex OAuth login for your ChatGPT subscription.",
            });
          for (const skill of [
            "implement",
            "code-review",
            "agent-browser",
            "resolving-merge-conflicts",
          ]) {
            yield* Effect.try({
              try: () => readFileSync(join(homedir(), `.agents/skills/${skill}/SKILL.md`), "utf8"),
              catch: () => new FactoryError({ message: `Missing global skill ${skill}` }),
            });
          }
          const repo = yield* repository();
          yield* git(["fetch", "origin", settings.baseBranch]);
          const token = yield* claimRun(run.runId);
          return { repo, cwd: host.root, token };
        }),
      );

      const outcome = yield* sandboxed(
        {
          name: "integration-host",
          branch: shared,
          baseBranch: `origin/${settings.baseBranch}`,
          cwd: preflight.cwd,
          provider: noSandbox(),
          hidden: [],
          hooks: { host: { onWorktreeReady: [{ command: commands.install, timeoutMs: 600_000 }] } },
        },
        Effect.suspend(() => {
          let previous: Outcome | undefined;
          // Kojo reviewed() fixes its choices to approve/reject. This three-choice exception loop uses
          // the same Activity.retry counter as reviewed(), so every retry has distinct durable phases
          // and gate askings. No author-invented asking counter or gate in a plain loop.
          return Activity.retry(
            Effect.gen(function* () {
              const epoch = yield* Activity.CurrentAttempt;
              const result = yield* coordinate(
                settings,
                preflight.repo,
                preflight.cwd,
                shared,
                epoch,
                previous,
              );
              if (result.failed.length === 0) return result;
              // coordinate drains every worker before returning. Branches are committed, host is back
              // on shared, and no active agent will lose uncommitted work when this gate suspends.
              const decision = yield* gate({
                name: "implementation-exceptions",
                actor: "engineer",
                choices: ["retry", "skip", "stop"],
                description: result.failed
                  .map((item) => `#${item.job.issue.number}: ${item.findings.join("; ")}`)
                  .join("\n"),
                deadline: Duration.days(2),
                onExpiry: OnExpiry.fail(),
              });
              if (decision.choice === "skip") return result;
              if (decision.choice !== "retry")
                return yield* new FactoryError({
                  message:
                    "Stopped at the implementation exception gate; shared branch and PR are preserved.",
                });
              previous = result;
              return yield* Effect.fail(new RetryIssues());
            }),
            { times: 2, while: (error) => error instanceof RetryIssues },
          );
        }).pipe(Effect.provide(agents)),
      );

      yield* phase("release-run-claim", Schema.String, releaseRun(preflight.token));
      return {
        branch: shared,
        pr: outcome.pr,
        completed: outcome.completed.map((item) => item.job.issue.number),
        pending: [
          ...outcome.pending,
          ...outcome.failed.map((item) => `#${item.job.issue.number}: ${item.findings.join("; ")}`),
        ],
      };
    }).pipe(Effect.mapError(failure)),
);
