import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, posix } from "node:path";
import { promisify } from "node:util";
import {
  type CaptureOptions,
  captureResources,
  maintainerSkillDependencies,
} from "./captured-resources.ts";
import { createPublicationGit, type PublicationGitOptions } from "./publication-git.ts";
import type { IssueSnapshot } from "./workflow-contracts.ts";

const execute = promisify(execFile);
const objectId = (value: string) => /^[a-f0-9]{40}$/.test(value);
const safePath = (value: string) => {
  if (
    !value ||
    isAbsolute(value) ||
    value.includes("\\") ||
    value
      .split("/")
      .some((part) => !part || part === "." || part === ".." || part.toLowerCase() === ".git")
  )
    throw Error("Unsafe repository resource path");
  return value;
};
const instruction = (path: string) =>
  /(^|\/)AGENTS\.md$/.test(path) ||
  path === "README.md" ||
  /^docs\/(agents|context|adr)\//.test(path) ||
  /^\.out-of-scope\//.test(path);

export type ProductionCaptureSettings = Omit<
  CaptureOptions,
  "directory" | "issue" | "repositoryPath"
> & {
  /** Additional phase entries captured once with the admitted route, such as graph integration/review. */
  extraEntries?: string[];
};
export interface ObservedGitSource {
  /** A full observed heads/pull ref, or the exact commit for native external delivery evidence. */
  ref: string;
  commit: string;
}
export interface ProductionResourceOptions extends PublicationGitOptions {
  /** Coordinator-owned immutable capture storage; never an agent checkout. */
  directory: string;
}

/** Trusted object acquisition and exact-commit resources. No checkout or repository code execution. */
export function createProductionResources(options: ProductionResourceOptions) {
  if (!isAbsolute(options.directory)) throw Error("Production resource storage must be absolute");
  const publication = createPublicationGit(options);
  const command = async (args: string[], authenticated = false) => {
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
          {
            cwd: options.trustedGitDirectory,
            env,
            encoding: "buffer",
            timeout: 60000,
            maxBuffer: 64 * 1024 * 1024,
          },
        )
      ).stdout;
    } catch {
      throw Error("Trusted Git resource operation failed; refresh observed source state");
    }
  };
  const text = async (args: string[], authenticated = false) =>
    (await command(args, authenticated)).toString("utf8").trim();
  let initialization: Promise<void> | undefined;
  const ensure = () =>
    (initialization ??= (async () => {
      await mkdir(options.trustedGitDirectory, { recursive: true, mode: 0o700 });
      if ((await readdir(options.trustedGitDirectory)).length === 0)
        await command(["init", "--bare", "--template="]);
      if ((await text(["rev-parse", "--is-bare-repository"])) !== "true")
        throw Error("Production resources require a trusted bare repository");
    })());
  const prepare = async (sources: ObservedGitSource[]) => {
    await ensure();
    for (const source of sources) {
      if (
        !objectId(source.commit) ||
        !(
          source.ref === source.commit ||
          /^refs\/(heads\/[a-zA-Z0-9][a-zA-Z0-9/_-]*|pull\/[1-9][0-9]*\/(head|merge))$/.test(
            source.ref,
          )
        ) ||
        source.ref.includes("//")
      )
        throw Error("Source requires an exact observed Git ref and commit");
      const temporary = `refs/factory/fetches/${randomUUID()}`;
      try {
        await command(
          [
            "fetch",
            "--no-tags",
            "--no-write-fetch-head",
            "--no-recurse-submodules",
            options.remote,
            `${source.ref}:${temporary}`,
          ],
          true,
        );
        if ((await text(["rev-parse", temporary])) !== source.commit)
          throw Error("Observed source head changed during fetch");
        if ((await text(["cat-file", "-t", source.commit])) !== "commit")
          throw Error("Observed source is not a commit");
        await command([
          "update-ref",
          `refs/heads/codex/factory-source-${source.commit}`,
          source.commit,
        ]);
      } finally {
        await command(["update-ref", "-d", temporary]);
      }
    }
  };
  const git = {
    ...publication,
    async branchHead(branch: string) {
      await ensure();
      const head = await publication.branchHead(branch);
      if (head) await prepare([{ ref: `refs/heads/${branch}`, commit: head }]);
      return head;
    },
  };

  return {
    git,
    prepare,
    async capture(issue: IssueSnapshot, settings: ProductionCaptureSettings) {
      await ensure();
      if (!objectId(issue.startingRevision))
        throw Error("Capture requires an exact admitted commit");
      if (issue.route !== "triage" && !settings.checks?.some((check) => check.trim()))
        throw Error("Implementation capture requires approved checks");
      if ((await text(["cat-file", "-t", issue.startingRevision])) !== "commit")
        throw Error("Missing admitted source commit");
      const tree = new Map<string, { mode: string; type: string; id: string }>();
      for (const row of (await command(["ls-tree", "-rz", "--full-tree", issue.startingRevision]))
        .toString("utf8")
        .split("\0")
        .filter(Boolean)) {
        const tab = row.indexOf("\t");
        const [mode, type, id] = row.slice(0, tab).split(" ");
        const path = safePath(row.slice(tab + 1));
        if (!mode || !type || !id || !objectId(id)) throw Error("Malformed tracked resource tree");
        tree.set(path, { mode, type, id });
      }
      const catalog = await Promise.all(
        settings.skills.map(async (skill) => {
          let content: string;
          if (isAbsolute(skill.path))
            content = await readFile(join(skill.path, "SKILL.md"), "utf8");
          else {
            const path = `${safePath(skill.path)}/SKILL.md`;
            const entry = tree.get(path);
            if (entry?.type !== "blob" || !["100644", "100755"].includes(entry.mode))
              throw Error(`Missing tracked skill definition: ${path}`);
            content = (await command(["cat-file", "blob", entry.id])).toString("utf8");
          }
          const name = /^name:\s*["']?([a-z0-9-]+)["']?\s*$/m.exec(content)?.[1];
          if (!name) throw Error(`Missing valid skill name: ${skill.path}`);
          return { ...skill, name };
        }),
      );
      const selectedSkills = new Map<string, (typeof catalog)[number]>();
      const dependencies = settings.dependencies ?? maintainerSkillDependencies;
      const select = (name: string) => {
        if (selectedSkills.has(name)) return;
        const choices = catalog.filter((skill) => skill.name === name);
        if (!choices.length) throw Error(`Missing dependency or entry skill: ${name}`);
        const explicit = choices.filter((skill) => skill.selected);
        if (choices.length > 1 && explicit.length !== 1)
          throw Error(`Ambiguous skill ${name}; select one source`);
        const chosen = explicit[0] ?? choices[0];
        if (!chosen) throw Error(`Missing entry skill: ${name}`);
        selectedSkills.set(name, chosen);
        for (const dependency of dependencies[name] ?? []) select(dependency);
      };
      for (const entry of [settings.entry, ...(settings.extraEntries ?? [])]) select(entry);
      const skills = [...selectedSkills.values()];
      const repoSkills = skills
        .filter((skill) => !isAbsolute(skill.path))
        .map((skill) => safePath(skill.path));
      const repoResources = (settings.resources ?? [])
        .filter((resource) => !isAbsolute(resource.path))
        .map((resource) => safePath(resource.path));
      const selected = [...repoSkills, ...repoResources];
      const includes = (root: string, path: string) => path === root || path.startsWith(`${root}/`);
      for (const root of selected)
        if (![...tree.keys()].some((path) => includes(root, path)))
          throw Error(`Missing tracked repository resource: ${root}`);
      const paths = [...tree.keys()].filter(
        (path) => instruction(path) || selected.some((root) => includes(root, path)),
      );
      await mkdir(join(options.directory, "sources"), { recursive: true, mode: 0o700 });
      const source = await mkdtemp(
        join(options.directory, "sources", `${issue.startingRevision}-`),
      );
      // Resolve Git symlinks as data, never through the host filesystem. Retain exact source object provenance.
      const provenance: { path: string; resolvedPath: string; mode: string; objectId: string }[] =
        [];
      const materialize = async (path: string, target: string, ancestors = new Set<string>()) => {
        if (ancestors.has(path)) throw Error("Cyclic tracked resource symlink");
        const parents = new Set(ancestors).add(path);
        const entry = tree.get(path);
        if (!entry) {
          const children = [...tree.keys()].filter((child) => includes(path, child));
          if (!children.length) throw Error("Missing tracked resource symlink target");
          for (const child of children)
            await materialize(child, `${target}/${child.slice(path.length + 1)}`, parents);
          return;
        }
        if (entry.type !== "blob") throw Error("Repository resources cannot include submodules");
        const bytes = await command(["cat-file", "blob", entry.id]);
        if (entry.mode === "120000") {
          const link = bytes.toString("utf8");
          if (isAbsolute(link) || link.includes("\\"))
            throw Error("Unsafe tracked resource symlink");
          let resolved: string;
          try {
            resolved = safePath(posix.normalize(posix.join(posix.dirname(path), link)));
          } catch {
            throw Error("Unsafe tracked resource symlink");
          }
          if (!paths.includes(resolved) && !selected.some((root) => includes(root, resolved)))
            throw Error("Unselected tracked resource symlink dependency");
          provenance.push({
            path: target,
            resolvedPath: path,
            mode: entry.mode,
            objectId: entry.id,
          });
          await materialize(resolved, target, parents);
          return;
        }
        if (entry.mode !== "100644" && entry.mode !== "100755")
          throw Error("Unsupported tracked resource mode");
        await mkdir(dirname(join(source, target)), { recursive: true });
        await writeFile(join(source, target), bytes, {
          flag: "wx",
          mode: entry.mode === "100755" ? 0o555 : 0o444,
        });
        provenance.push({ path: target, resolvedPath: path, mode: entry.mode, objectId: entry.id });
      };
      try {
        for (const path of paths) await materialize(path, path);
        await writeFile(
          join(source, "factory-source.json"),
          JSON.stringify({ version: 1, commit: issue.startingRevision, files: provenance }),
          { mode: 0o444, flag: "wx" },
        );
        return captureResources({
          ...settings,
          directory: join(options.directory, "snapshots"),
          issue,
          skills: skills.map((skill) =>
            isAbsolute(skill.path)
              ? skill
              : {
                  ...skill,
                  path: join(source, skill.path),
                  target: skill.target ?? `repository/${skill.path}`,
                },
          ),
          resources: [
            ...(settings.resources ?? []).map((resource) =>
              isAbsolute(resource.path)
                ? resource
                : { ...resource, path: join(source, resource.path) },
            ),
            ...paths
              .filter((path) => instruction(path) && !selected.some((root) => includes(root, path)))
              .map((path) => ({
                path: join(source, path),
                target: `repository/${path}`,
                instruction: !path.startsWith(".out-of-scope/"),
              })),
            { path: join(source, "factory-source.json"), target: "factory-source.json" },
          ],
        });
      } catch (error) {
        await rm(source, { recursive: true, force: true });
        throw error;
      }
    },
  };
}
