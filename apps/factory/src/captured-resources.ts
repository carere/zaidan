import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { IssueSnapshot } from "./workflow-contracts.ts";

export interface ResourceSnapshotReference {
  id: string;
  path: string;
}
export interface CapturedFile {
  path: string;
  hash: string;
  executable: boolean;
  source: string;
  resolvedSource: string;
}
export interface ResourceManifest {
  version: 1;
  issue: IssueSnapshot;
  entry: string;
  skills: {
    name: string;
    source: string;
    resolvedSource: string;
    relativePath: string;
    hash: string;
  }[];
  files: CapturedFile[];
  instructions: string[];
  checks: string[];
}
export interface CaptureOptions {
  directory: string;
  issue: IssueSnapshot;
  entry: string;
  /** Explicit source selection disambiguates the same frontmatter name in multiple catalogs. */
  skills: { path: string; selected?: boolean; target?: string }[];
  dependencies?: Record<string, string[]>;
  requiredResources?: Record<string, string[]>;
  /** Complete additional directories/files with preserved logical paths. */
  resources?: { path: string; target: string; instruction?: boolean }[];
  checks?: string[];
  repositoryPath?: string;
}
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const inside = (root: string, path: string) =>
  path === root || (!relative(root, path).startsWith("..") && !isAbsolute(relative(root, path)));
const safePath = (path: string) => {
  if (!path || isAbsolute(path) || path.split(/[\\/]/).some((part) => part === ".."))
    throw new Error(`Unsafe captured path: ${path}`);
  return path;
};
/** Declared closure of the existing maintainer skills, including conditional invocations. */
export const maintainerSkillDependencies: Record<string, string[]> = {
  implement: ["tdd", "code-review"],
  tdd: ["codebase-design"],
  triage: ["grilling", "domain-modeling"],
  "code-review": [],
  "codebase-design": [],
  grilling: [],
  "domain-modeling": [],
  research: [],
  "shadcn-to-zaidan": ["react-to-solid", "zaidan"],
  "react-to-solid": ["shadcn-to-zaidan"],
  zaidan: [],
};

export function captureResources(options: CaptureOptions): ResourceSnapshotReference {
  if (!isAbsolute(options.directory)) throw new Error("Snapshot storage must be absolute");
  const candidates = options.skills.map((skill) => {
    const source = resolve(skill.path);
    const text = readFileSync(join(source, "SKILL.md"), "utf8");
    const name = /^name:\s*["']?([a-z0-9-]+)["']?\s*$/m.exec(text)?.[1];
    if (!name) throw new Error(`Missing valid skill name: ${source}`);
    return { ...skill, source, name, resolvedSource: realpathSync(source) };
  });
  const selected = new Map<string, (typeof candidates)[number]>();
  for (const name of new Set(candidates.map((skill) => skill.name))) {
    const choices = candidates.filter((skill) => skill.name === name);
    const explicit = choices.filter((skill) => skill.selected);
    if (choices.length > 1 && explicit.length !== 1)
      throw new Error(`Ambiguous skill ${name}; select one source`);
    const choice = explicit[0] ?? choices[0];
    if (!choice) throw new Error(`Missing selected skill: ${name}`);
    selected.set(name, choice);
  }
  if (!selected.has(options.entry)) throw new Error(`Missing entry skill: ${options.entry}`);
  const dependencies = options.dependencies ?? maintainerSkillDependencies;
  for (const skill of selected.values()) {
    for (const dependency of dependencies[skill.name] ?? []) {
      if (!selected.has(dependency))
        throw new Error(`Missing dependency ${dependency} of ${skill.name}`);
    }
  }
  const requiredResources = options.requiredResources ?? {
    tdd: ["tests.md", "mocking.md"],
    "codebase-design": ["DEEPENING.md", "DESIGN-IT-TWICE.md"],
    triage: ["AGENT-BRIEF.md", "OUT-OF-SCOPE.md"],
    "domain-modeling": ["CONTEXT-FORMAT.md", "ADR-FORMAT.md"],
  };
  for (const skill of selected.values()) {
    for (const path of requiredResources[skill.name] ?? []) {
      if (!existsSync(join(skill.source, safePath(path))))
        throw new Error(`Missing referenced resource ${path} in ${skill.name}`);
    }
  }
  const sources = [...selected.values()].map((skill) => skill.resolvedSource);
  const extras = [...(options.resources ?? [])];
  if (options.repositoryPath) {
    const paths = execFileSync("git", ["ls-files", "-z"], {
      cwd: options.repositoryPath,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean);
    for (const path of paths.filter(
      (path) =>
        /(^|\/)AGENTS\.md$/.test(path) ||
        path === "README.md" ||
        /^docs\/(agents|context|adr)\//.test(path) ||
        /^\.out-of-scope\//.test(path),
    )) {
      extras.push({
        path: join(options.repositoryPath, path),
        target: `repository/${path}`,
        instruction: /AGENTS\.md$/.test(path) || path.startsWith("docs/") || path === "README.md",
      });
    }
  }
  sources.push(...extras.map((resource) => realpathSync(resource.path)));
  mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  const pending = join(options.directory, `.capture-${randomUUID()}`);
  mkdirSync(pending, { mode: 0o700 });
  const files: CapturedFile[] = [];
  const directories = new Map<string, string[]>();
  const copy = (source: string, target: string, ancestors = new Set<string>()) => {
    safePath(target);
    const real = realpathSync(source);
    if (!sources.some((root) => inside(root, real)))
      throw new Error(`Unselected symlink dependency: ${source}`);
    if (ancestors.has(real)) throw new Error(`Cyclic resource: ${source}`);
    const stat = lstatSync(real);
    if (stat.isDirectory()) {
      mkdirSync(join(pending, target), { recursive: true });
      const parents = new Set(ancestors).add(real);
      const names = readdirSync(real).sort();
      directories.set(source, names);
      for (const name of names) copy(join(source, name), join(target, name), parents);
    } else if (stat.isFile()) {
      if (files.some((file) => file.path === target))
        throw new Error(`Overlapping captured resource: ${target}`);
      const bytes = readFileSync(real);
      mkdirSync(dirname(join(pending, target)), { recursive: true });
      const executable = !!(stat.mode & 0o111);
      writeFileSync(join(pending, target), bytes, { mode: executable ? 0o555 : 0o444 });
      files.push({ path: target, hash: hash(bytes), executable, source, resolvedSource: real });
    } else throw new Error(`Unsupported resource type: ${source}`);
  };
  try {
    const skills: ResourceManifest["skills"] = [];
    for (const skill of [...selected.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = safePath(
        skill.target ??
          (options.repositoryPath &&
          inside(realpathSync(options.repositoryPath), skill.resolvedSource)
            ? `repository/${relative(realpathSync(options.repositoryPath), skill.resolvedSource)}`
            : `skills/${skill.name}`),
      );
      copy(skill.source, relativePath);
      skills.push({
        name: skill.name,
        source: skill.source,
        resolvedSource: skill.resolvedSource,
        relativePath,
        hash: hash(
          JSON.stringify(files.filter((file) => file.path.startsWith(`${relativePath}/`))),
        ),
      });
    }
    for (const resource of extras) copy(resolve(resource.path), safePath(resource.target));
    // Fixed relative Markdown resource references must resolve in the captured tree.
    // Dynamic/glob/example paths require explicit CaptureOptions.resources rather than guessing.
    for (const file of files.filter(
      (file) => file.path.startsWith("skills/") && file.path.endsWith(".md"),
    )) {
      const text = readFileSync(join(pending, file.path), "utf8");
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const link = match[1]?.split("#")[0];
        if (!link || /^[a-z]+:/i.test(link) || /[<>*{}]/.test(link) || link.startsWith("/"))
          continue;
        const target = resolve(pending, dirname(file.path), link);
        if (!inside(pending, target) || !existsSync(target))
          throw new Error(`Missing referenced resource ${link} in ${file.source}`);
      }
    }
    for (const file of files) {
      if (
        realpathSync(file.source) !== file.resolvedSource ||
        hash(readFileSync(file.source)) !== file.hash
      )
        throw new Error(`Resource changed during capture: ${file.source}`);
    }
    for (const [source, names] of directories) {
      if (JSON.stringify(readdirSync(source).sort()) !== JSON.stringify(names))
        throw new Error(`Resource directory changed during capture: ${source}`);
    }
    const manifest: ResourceManifest = {
      version: 1,
      issue: options.issue,
      entry: options.entry,
      skills,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
      instructions: extras.filter((item) => item.instruction).map((item) => item.target),
      checks: options.checks ?? [],
    };
    const serialized = JSON.stringify(manifest);
    const id = hash(serialized);
    writeFileSync(join(pending, "manifest.json"), serialized, { mode: 0o444 });
    const path = join(options.directory, id);
    if (existsSync(path)) rmSync(pending, { recursive: true });
    else renameSync(pending, path);
    return { id, path };
  } catch (error) {
    rmSync(pending, { recursive: true, force: true });
    throw error;
  }
}

export function readResourceSnapshot(reference: ResourceSnapshotReference): ResourceManifest {
  const bytes = readFileSync(join(reference.path, "manifest.json"), "utf8");
  if (hash(bytes) !== reference.id) throw new Error("Captured resource manifest hash mismatch");
  const manifest = JSON.parse(bytes) as ResourceManifest;
  if (manifest.version !== 1) throw new Error("Unsupported resource manifest");
  for (const file of manifest.files) {
    const path = join(reference.path, safePath(file.path));
    if (
      !inside(realpathSync(reference.path), realpathSync(path)) ||
      lstatSync(path).isSymbolicLink() ||
      Boolean(lstatSync(path).mode & 0o111) !== file.executable ||
      hash(readFileSync(path)) !== file.hash
    )
      throw new Error(`Captured resource modified: ${file.path}`);
  }
  return manifest;
}
