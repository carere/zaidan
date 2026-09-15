import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { externalFiles, repository, sourceFiles } from "./scenario.ts";

/** Fixture-authored objects only. No checkout, hooks, credentials in Git config, or agent-written code. */
export function setupGit(directory: string, timestamp: string, token?: string) {
  // Execute only this repository's fixed fixture scaffolding, before any remote publication.
  // This directory is never a worker checkout or a source for arbitrary repository commands.
  const validation = mkdtempSync(join(directory, "validate-source-"));
  try {
    for (const [path, contents] of Object.entries({ ...sourceFiles, ...externalFiles })) {
      mkdirSync(dirname(join(validation, path)), { recursive: true });
      writeFileSync(join(validation, path), contents, { flag: "wx", mode: 0o600 });
    }
    for (const args of [
      ["--test"],
      ["--check", "src/greeting.mjs"],
      ["--check", "src/compose.mjs"],
      ["--check", "src/format.mjs"],
    ]) {
      const checked = spawnSync(process.execPath, args, {
        cwd: validation,
        env: { PATH: process.env.PATH, HOME: "/nonexistent" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
      });
      if (checked.status !== 0)
        throw Error(
          "Prepared fixture source validation failed; no remote publication is permitted",
        );
    }
  } finally {
    rmSync(validation, { recursive: true, force: true });
  }
  const bare = join(directory, "setup.git");
  mkdirSync(bare, { recursive: true, mode: 0o700 });
  const git = (args: string[], input?: string, authenticated = false) => {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: "/nonexistent",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_NO_LAZY_FETCH: "1",
      GIT_AUTHOR_NAME: "Factory fixture setup",
      GIT_AUTHOR_EMAIL: "factory-fixture@example.invalid",
      GIT_COMMITTER_NAME: "Factory fixture setup",
      GIT_COMMITTER_EMAIL: "factory-fixture@example.invalid",
      GIT_AUTHOR_DATE: timestamp,
      GIT_COMMITTER_DATE: timestamp,
    };
    if (authenticated && token) {
      env.GIT_CONFIG_COUNT = "1";
      env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
      env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
    }
    const result = spawnSync(
      "git",
      [
        `--git-dir=${bare}`,
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "credential.helper=",
        "-c",
        "http.followRedirects=false",
        "-c",
        "protocol.allow=never",
        "-c",
        "protocol.https.allow=always",
        ...args,
      ],
      { cwd: bare, env, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000 },
    );
    if (result.status !== 0)
      throw Error("Fixture trusted Git operation failed; reconcile the recorded action");
    return result.stdout.trim();
  };
  if (!existsSync(join(bare, "HEAD"))) git(["init", "--bare", "--template="]);
  if (git(["rev-parse", "--is-bare-repository"]) !== "true") throw Error("Setup Git must be bare");
  function commit(files: Record<string, string>, message: string, parent?: string) {
    const tree = (prefix: string): string => {
      const children = new Map<string, string | undefined>();
      for (const [path, contents] of Object.entries(files))
        if (path.startsWith(prefix)) {
          const suffix = path.slice(prefix.length);
          const first = suffix.split("/")[0];
          children.set(first, suffix.includes("/") ? undefined : contents);
        }
      const rows = [...children]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, contents]) =>
          contents === undefined
            ? `040000 tree ${tree(`${prefix}${name}/`)}\t${name}`
            : `100644 blob ${git(["hash-object", "-w", "--stdin"], contents)}\t${name}`,
        );
      return git(["mktree"], `${rows.join("\n")}\n`);
    };
    return git(["commit-tree", tree(""), ...(parent ? ["-p", parent] : []), "-m", message]);
  }
  const main = commit(sourceFiles, "test: bootstrap meaningful factory acceptance source");
  const external = commit(
    { ...sourceFiles, ...externalFiles },
    "test: stage human-owned external formatter",
    main,
  );
  for (const [ref, sha] of [
    ["main", main],
    ["external", external],
  ])
    git(["update-ref", `refs/heads/codex/fixture-${ref}`, sha]);
  return {
    main,
    external,
    async publish(branch: string, sha: string) {
      if (
        !/^(main|codex\/fixture-[a-f0-9-]+-external)$/.test(branch) ||
        ![main, external].includes(sha)
      )
        throw Error("Unknown fixture setup ref");
      const remote = `https://github.com/${repository}.git`;
      const observed = git(
        ["ls-remote", "--refs", remote, `refs/heads/${branch}`],
        undefined,
        true,
      );
      if (observed && observed.split(/\s+/)[0] !== sha)
        throw Error("Existing fixture branch differs from prepared source");
      if (!observed)
        git(
          [
            "push",
            `--force-with-lease=refs/heads/${branch}:`,
            remote,
            `${sha}:refs/heads/${branch}`,
          ],
          undefined,
          true,
        );
      return { sha };
    },
  };
}
