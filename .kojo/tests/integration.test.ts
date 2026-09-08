import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { claimRun, releaseRun } from "../lib/coordinator.ts";
import { advanceShared, prepareMerge } from "../lib/integration.ts";
import { localWorkspace } from "./workspace.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "zaidan-kojo-"));
  dirs.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Factory Test");
  git("config", "user.email", "factory@example.test");
  writeFileSync(join(root, "file.txt"), "base\n");
  git("add", ".");
  git("commit", "-m", "base");
  const base = git("rev-parse", "HEAD");
  git("branch", "shared");
  const workspace = localWorkspace(root);
  return { root, git, base, workspace };
};

describe("serial host integration", () => {
  it("keeps shared unchanged until a validated candidate is advanced", async () => {
    const { root, git, base, workspace } = fixture();
    git("switch", "-c", "issue");
    writeFileSync(join(root, "new.txt"), "implemented\n");
    git("add", ".");
    git("commit", "-m", "feat: issue");
    const issue = git("rev-parse", "HEAD");
    git("switch", "shared");
    const prepared = await Effect.runPromise(
      prepareMerge("shared", "candidate", issue).pipe(Effect.provideService(Workspace, workspace)),
    );
    expect(prepared.conflicts).toBe("");
    expect(git("rev-parse", "shared")).toBe(base);
    git("commit", "-m", "merge candidate");
    await Effect.runPromise(
      advanceShared("shared", "candidate", base).pipe(Effect.provideService(Workspace, workspace)),
    );
    expect(git("show", "shared:new.txt")).toBe("implemented");
    expect(git("rev-parse", "main")).toBe(base);
  });
  it("surfaces real conflicts and leaves shared unchanged", async () => {
    const { root, git, workspace } = fixture();
    git("switch", "-c", "issue");
    writeFileSync(join(root, "file.txt"), "issue\n");
    git("commit", "-am", "issue");
    const incoming = git("rev-parse", "HEAD");
    git("switch", "shared");
    writeFileSync(join(root, "file.txt"), "shared\n");
    git("commit", "-am", "shared");
    const before = git("rev-parse", "HEAD");
    const prepared = await Effect.runPromise(
      prepareMerge("shared", "candidate", incoming).pipe(
        Effect.provideService(Workspace, workspace),
      ),
    );
    expect(prepared.conflicts).toBe("file.txt");
    expect(git("rev-parse", "shared")).toBe(before);
    writeFileSync(join(root, "file.txt"), "shared and issue\n");
    git("add", ".");
    git("commit", "-m", "fix: preserve both intents");
    await Effect.runPromise(
      advanceShared("shared", "candidate", before).pipe(
        Effect.provideService(Workspace, workspace),
      ),
    );
    expect(git("show", "shared:file.txt")).toBe("shared and issue");
  });
  it("refuses to advance a shared branch that moved during validation", async () => {
    const { git, base, workspace } = fixture();
    git("branch", "candidate");
    git("switch", "shared");
    git("commit", "--allow-empty", "-m", "unexpected change");
    await expect(
      Effect.runPromise(
        advanceShared("shared", "candidate", base).pipe(
          Effect.provideService(Workspace, workspace),
        ),
      ),
    ).rejects.toThrow("moved");
  });
  it("claims the clone atomically, allows owner replay and rejects a second run", async () => {
    const { workspace } = fixture();
    const run = <A, E>(effect: Effect.Effect<A, E, Workspace>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(Workspace, workspace)));
    const token = await run(claimRun("run-A"));
    expect(await run(claimRun("run-A"))).toBe(token);
    await expect(run(claimRun("run-B"))).rejects.toThrow("Another implement run");
    await run(releaseRun(token));
    expect(await run(claimRun("run-B"))).not.toBe(token);
  });
});
