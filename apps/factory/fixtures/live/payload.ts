import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join } from "node:path";

/** Metadata for explicitly selected skill trees. Credentials and unrelated home files are never visited. */
export function skillInventory(skills: { path: string }[]) {
  return skills.map((skill) => {
    if (!isAbsolute(skill.path))
      throw Error("Live fixture payload selects absolute maintainer skill trees only");
    const source = skill.path;
    const files: {
      path: string;
      resolvedSource: string;
      bytes: number;
      sha256: string;
      executable: boolean;
    }[] = [];
    const visit = (path: string, logical: string, ancestors = new Set<string>()) => {
      const real = realpathSync(path);
      if (ancestors.has(real)) throw Error("Cyclic selected fixture skill source");
      const stat = lstatSync(real);
      if (stat.isDirectory()) {
        const parents = new Set(ancestors).add(real);
        for (const name of readdirSync(real).sort())
          visit(join(path, name), logical ? `${logical}/${name}` : name, parents);
      } else if (stat.isFile()) {
        const bytes = readFileSync(real);
        files.push({
          path: logical,
          resolvedSource: real,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          executable: Boolean(stat.mode & 0o111),
        });
      } else throw Error("Unsupported selected fixture skill source");
    };
    const definition = readFileSync(join(source, "SKILL.md"), "utf8");
    const name = /^name:\s*["']?([a-z0-9-]+)["']?\s*$/m.exec(definition)?.[1];
    if (!name) throw Error("Selected source lacks a valid skill identity");
    visit(source, "");
    return { name, source, resolvedSource: realpathSync(source), files };
  });
}
