import { execFileSync } from "node:child_process";
import { ExecResult } from "@carere/kojo-runtime/contexts/sandbox/models/ExecResult";
import type { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect, Option } from "effect";

export const workspaceWith = (exec: typeof Workspace.Service.exec): typeof Workspace.Service => ({
  root: "/fixture",
  hostPath: Option.some("/fixture"),
  exec,
  git: (args) => exec(["git", ...args]),
  read: () => Effect.die("unexpected read"),
  write: () => Effect.die("unexpected write"),
  stat: () => Effect.succeed(Option.none()),
  unlink: () => Effect.die("unexpected unlink"),
});

export const localWorkspace = (root: string): typeof Workspace.Service => ({
  ...workspaceWith((argv) =>
    Effect.sync(() => {
      try {
        return new ExecResult({
          argv: [],
          stdout: execFileSync(argv[0] ?? "false", [...argv.slice(1)], {
            cwd: root,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          }),
          stderr: "",
          exitCode: 0,
        });
      } catch (error) {
        const result = error as { stdout?: string; stderr?: string; status?: number };
        return new ExecResult({
          argv: [],
          stdout: String(result.stdout ?? ""),
          stderr: String(result.stderr ?? ""),
          exitCode: result.status ?? 1,
        });
      }
    }),
  ),
  root,
  hostPath: Option.some(root),
});
