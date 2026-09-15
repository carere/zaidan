import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { GraphPublicationGit } from "./graph-integration.ts";
import type { Candidate } from "./workflow-contracts.ts";

const execute = promisify(execFile);
const objectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
export interface PublicationGit {
  importCandidate(
    candidate: Candidate,
    reviewBase: string,
    startingRevision: string,
  ): Promise<{ meaningful: boolean; tree: string }>;
  branchHead(branch: string): Promise<string | undefined>;
  publishBranch(branch: string, commit: string, expectedHead?: string): Promise<void>;
}
export interface PublicationGitOptions {
  /** Coordinator-owned bare repository, outside every worker-writable mount. */
  trustedGitDirectory: string;
  /** Trusted GitHub HTTPS URL or absolute local fixture repository. Never worker input. */
  remote: string;
  token?: string;
}
/** Object transfer only: no host checkout, repository scripts, worker Git config or hooks. */
export function createPublicationGit(options: PublicationGitOptions): GraphPublicationGit {
  if (!isAbsolute(options.trustedGitDirectory))
    throw new Error("Trusted Git directory must be absolute");
  const local = isAbsolute(options.remote);
  if (!local && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/.test(options.remote))
    throw new Error("Publication remote must be a trusted GitHub HTTPS repository");
  if (local && options.token)
    throw new Error("Fixture remotes cannot receive publication credentials");
  const git = async (args: string[], authenticated = false) => {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: "/nonexistent",
      LANG: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_NO_LAZY_FETCH: "1",
      GIT_TERMINAL_PROMPT: "0",
    };
    if (authenticated && options.token) {
      env.GIT_CONFIG_COUNT = "1";
      env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
      env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${options.token}`).toString("base64")}`;
    }
    try {
      return (
        await execute(
          "git",
          [
            `--git-dir=${options.trustedGitDirectory}`,
            "-c",
            "core.hooksPath=/dev/null",
            "-c",
            "credential.helper=",
            "-c",
            "http.followRedirects=false",
            "-c",
            "protocol.allow=never",
            "-c",
            "protocol.file.allow=always",
            "-c",
            "protocol.https.allow=always",
            ...args,
          ],
          { env, cwd: options.trustedGitDirectory, timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
        )
      ).stdout.trim();
    } catch {
      throw new Error("Trusted Git publication operation failed; reconcile remote state");
    }
  };
  const verify = async () => {
    if ((await git(["rev-parse", "--is-bare-repository"])) !== "true")
      throw new Error("Publication requires a trusted bare repository");
  };
  const branchRef = (branch: string) => {
    if (
      (branch !== "main" && !/^codex\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(branch)) ||
      branch.includes("//")
    )
      throw new Error("Unsafe publication branch");
    return `refs/heads/${branch}`;
  };
  return {
    async tree(commit) {
      await verify();
      if (!objectId(commit)) throw Error("Tree lookup requires a full Git revision");
      if ((await git(["cat-file", "-t", commit])) !== "commit") throw Error("Missing graph commit");
      return git(["rev-parse", `${commit}^{tree}`]);
    },
    async contains(head, commit) {
      await verify();
      if (!objectId(head) || !objectId(commit))
        throw Error("Containment requires full Git revisions");
      for (const revision of [head, commit])
        if ((await git(["cat-file", "-t", revision])) !== "commit")
          throw Error("Missing commit object");
      return (await git(["merge-base", head, commit])) === commit;
    },
    async exportBundle(commit) {
      await verify();
      if (!objectId(commit)) throw Error("Export requires a full Git revision");
      const directory = join(options.trustedGitDirectory, "factory-exports");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const path = join(directory, `${randomUUID()}.bundle`);
      await git(["update-ref", `refs/heads/codex/factory-export-${commit}`, commit]);
      await git(["bundle", "create", path, `refs/heads/codex/factory-export-${commit}`]);
      return {
        kind: "git-bundle",
        path,
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      };
    },
    async importCandidate(candidate, reviewBase, startingRevision) {
      await verify();
      if (![candidate.commit, reviewBase, startingRevision].every(objectId))
        throw new Error("Candidate requires immutable full Git revisions");
      const artifact = candidate.artifact as
        | { kind?: string; path?: string; sha256?: string }
        | undefined;
      if (
        artifact?.kind !== "git-bundle" ||
        !artifact.path ||
        !isAbsolute(artifact.path) ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? "")
      )
        throw new Error("A verified sandbox Git bundle is required");
      const bytes = await readFile(artifact.path);
      if (createHash("sha256").update(bytes).digest("hex") !== artifact.sha256)
        throw new Error("Candidate bundle hash changed");
      const directory = join(options.trustedGitDirectory, "factory-imports");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const path = join(directory, `${randomUUID()}.bundle`);
      await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
      try {
        await git(["bundle", "verify", path]);
        await git([
          "fetch",
          "--no-tags",
          "--no-write-fetch-head",
          path,
          `${candidate.commit}:refs/factory/candidates/${candidate.commit}`,
        ]);
        for (const revision of [candidate.commit, reviewBase, startingRevision])
          if ((await git(["cat-file", "-t", revision])) !== "commit")
            throw new Error("Expected commit object");
        await git(["merge-base", "--is-ancestor", reviewBase, candidate.commit]);
        await git(["merge-base", "--is-ancestor", startingRevision, candidate.commit]);
        const tree = await git(["rev-parse", `${candidate.commit}^{tree}`]);
        if (tree !== candidate.tree) throw new Error("Candidate tree differs from covered tree");
        return { meaningful: tree !== (await git(["rev-parse", `${reviewBase}^{tree}`])), tree };
      } finally {
        await rm(path, { force: true });
      }
    },
    async branchHead(branch) {
      await verify();
      const ref = branchRef(branch);
      const output = await git(["ls-remote", "--refs", options.remote, ref], true);
      if (!output) return undefined;
      const rows = output.split("\n");
      const [head, name] = rows[0].split(/\s+/);
      if (rows.length !== 1 || name !== ref || !objectId(head))
        throw new Error("Ambiguous remote branch");
      return head;
    },
    async publishBranch(branch, commit, expectedHead) {
      if (branch === "main") throw new Error("Factory cannot publish main");
      await verify();
      if (!objectId(commit) || (expectedHead !== undefined && !objectId(expectedHead)))
        throw new Error("Invalid publication commit");
      const ref = branchRef(branch);
      const observed = await git(["ls-remote", "--refs", options.remote, ref], true);
      const observedHead = observed ? observed.split(/\s+/)[0] : undefined;
      if (observedHead !== expectedHead)
        throw Error("Publication expected head changed; reconcile remote state");
      await git(
        [
          "push",
          `--force-with-lease=${ref}:${expectedHead ?? ""}`,
          options.remote,
          `${commit}:${ref}`,
        ],
        true,
      );
    },
  };
}
