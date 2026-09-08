import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { code } from "@carere/kojo-runtime/contexts/workflow/services/phase/code";
import { Effect, Schema } from "effect";
import { FactoryError, failure } from "../envelopes.ts";

export const phase = <S extends Schema.Top, E, R>(
  name: string,
  success: S,
  body: Effect.Effect<S["Type"], E, R>,
) =>
  code(
    { name, description: name, success, error: FactoryError },
    body.pipe(Effect.mapError(failure)),
  );

export const exec = (argv: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const workspace = yield* Workspace;
    const result = yield* workspace.exec(argv);
    if (!result.succeeded)
      return yield* new FactoryError({
        message: `${argv[0]} exited ${result.exitCode}: ${(result.stderr || result.stdout).slice(-6000)}`,
      });
    return result.stdout.trim();
  });
export const git = (args: ReadonlyArray<string>) => exec(["git", ...args]);
export const head = () => git(["rev-parse", "HEAD"]);

export const checkpoint = (name: string, message: string) =>
  phase(
    name,
    Schema.String,
    Effect.gen(function* () {
      yield* git(["add", "--all"]);
      const workspace = yield* Workspace;
      const staged = yield* workspace.git(["diff", "--cached", "--quiet"]);
      const merging = yield* workspace.git(["rev-parse", "--verify", "MERGE_HEAD"]);
      if (!staged.succeeded || merging.succeeded) yield* git(["commit", "-m", message]);
      return yield* head();
    }),
  );
