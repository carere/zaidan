import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { kojoPi } from "@carere/kojo-runtime/contexts/agent/adapters/kojoPi";
import * as Invoker from "@carere/kojo-runtime/contexts/agent/adapters/SandcastleAgentInvoker";
import { docker } from "@carere/kojo-runtime/contexts/sandbox/adapters/providers";
import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { ArtifactPublisher } from "@carere/kojo-runtime/contexts/trace/ports/ArtifactPublisher";
import { withPermissions } from "@carere/kojo-runtime/contexts/workflow/guards/Permissions";
import { agent } from "@carere/kojo-runtime/contexts/workflow/services/phase/agent";
import { Effect, Option, Schema } from "effect";
import { commands } from "../commands.ts";
import { FactoryError, Review, UiReport } from "../envelopes.ts";
import { git, phase } from "./phases.ts";

export const agents = Invoker.fromConfig({
  config: ".kojo/kojo.config.yaml",
  provider: (definition) =>
    kojoPi({
      model: definition.model,
      system: `${definition.system}\nEvery nested Pi invocation must explicitly use --model ${definition.model}; never inherit a different global default.`,
      tools: definition.tools,
      thinking: "high",
    }),
});

export const issueProvider = () => {
  const piDirectory = join(homedir(), ".pi/agent");
  const globalSkills = join(homedir(), ".agents/skills");
  const piSkills = join(piDirectory, "skills");
  return docker({
    imageName: "kojo-zaidan:latest",
    // OAuth refresh uses an adjacent lock directory: mounting auth.json alone breaks locking.
    // All workers share Pi's auth lock and refreshed credentials, just like host Pi processes.
    mounts: [
      { hostPath: piDirectory, sandboxPath: "/home/agent/.pi/agent" },
      { hostPath: globalSkills, sandboxPath: "/home/agent/.agents/skills", readonly: true },
      ...(existsSync(piSkills)
        ? [{ hostPath: piSkills, sandboxPath: "/home/agent/.pi/agent/skills", readonly: true }]
        : []),
    ],
  });
};

export const hooks = {
  sandbox: { onSandboxReady: [{ command: commands.install, timeoutMs: 600_000 }] },
};

export const callAgent = <S extends Schema.Top>(
  name: string,
  who: string,
  prompt: string,
  envelope: S,
  writes = false,
) =>
  withPermissions(
    {
      agent: who,
      writes: writes ? { _tag: "Unrestricted" } : { _tag: "LimitedTo", patterns: [] },
      protectedPaths: [".kojo/", ".claude/skills/kojo/"],
      alwaysWritable: [],
    },
    agent({ name, description: name, agent: who, prompt, envelope, corrections: 1 }),
  );

export const mechanical = (name: string) =>
  phase(
    name,
    Schema.Array(Schema.String),
    Effect.gen(function* () {
      const workspace = yield* Workspace;
      const faults: string[] = [];
      const whitespace = yield* workspace.git(["diff", "--check", "HEAD~1", "HEAD"]);
      if (!whitespace.succeeded)
        faults.push(
          `Diff check (including conflict markers): ${whitespace.stdout}${whitespace.stderr}`,
        );
      // Build generates the Velite types required by tsc. Run all checks even after one fails.
      for (const key of ["install", "test", "lint", "build", "typecheck"] as const) {
        const result = yield* workspace.exec(["sh", "-c", commands[key]]);
        if (!result.succeeded)
          faults.push(`${key}: ${(result.stderr || result.stdout).slice(-4000)}`);
      }
      return faults;
    }),
  );

export const reviewCode = (name: string, prompt: string) =>
  Effect.gen(function* () {
    const reports = yield* Effect.all(
      ["standards", "spec"].map((axis) =>
        callAgent(`${name}/${axis}`, "reviewer", `${prompt}\nReview axis: ${axis}.`, Review),
      ),
      { concurrency: 2 },
    );
    return reports.flatMap(({ value }) =>
      value.passed && value.findings.length === 0 ? [] : [value.summary, ...value.findings],
    );
  });

export const testUi = (name: string, prompt: string) =>
  Effect.gen(function* () {
    const report = yield* callAgent(
      name,
      "ui-tester",
      `${prompt}\nStart the app with: ${commands.dev}\n` +
        `Use a fresh agent-browser session named ${name.replace(/[^a-zA-Z0-9]/g, "-")}. ` +
        `Store evidence under test-results/${name}/. Shut down your own server and browser when done.`,
      UiReport,
    );
    return yield* phase(
      `${name}/evidence`,
      Schema.Array(Schema.String),
      Effect.gen(function* () {
        const workspace = yield* Workspace;
        const faults = [...report.value.findings];
        if (!report.value.passed) faults.push(report.value.summary);
        if (report.value.scenarios.length === 0) faults.push("No UI scenarios were exercised");
        if (report.value.evidence.length === 0) faults.push("No UI evidence was produced");
        for (const file of report.value.evidence) {
          if (!file.startsWith(`test-results/${name}/`) || file.split("/").includes("..")) {
            faults.push(`Evidence outside this UI attempt: ${file}`);
            continue;
          }
          const stat = yield* workspace.stat(file);
          if (Option.isNone(stat) || stat.value.kind !== "file" || stat.value.size === 0)
            faults.push(`Missing or empty evidence: ${file}`);
        }
        const artifacts = yield* ArtifactPublisher;
        yield* artifacts.publishText({
          name: `${name}/report.json`,
          mediaType: "application/json",
          content: JSON.stringify(report.value),
        });
        // Retain text logs before the sandbox worktree is released. Screenshots are encoded into
        // bounded text chunks because Kojo alpha.3's public artifact port accepts text only.
        if (faults.length === 0)
          for (const file of report.value.evidence) {
            const encoded = yield* workspace.exec([
              "bun",
              "-e",
              "const {realpathSync}=require('node:fs'); const {resolve}=require('node:path'); const p=process.argv[1]; if(realpathSync(p)!==resolve(p)) process.exit(1); const b=await Bun.file(p).bytes(); console.log(b.length)",
              file,
            ]);
            const size = Number(encoded.stdout.trim());
            if (!encoded.succeeded || !Number.isSafeInteger(size) || size > 5_000_000) {
              faults.push(`Evidence must be readable and at most 5 MB: ${file}`);
              continue;
            }
            for (let offset = 0; offset < size; offset += 24_000) {
              const chunk = yield* workspace.exec([
                "bun",
                "-e",
                "const b = await Bun.file(process.argv[1]).slice(Number(process.argv[2]), Number(process.argv[2])+24000).arrayBuffer(); console.log(Buffer.from(b).toString('base64'))",
                file,
                String(offset),
              ]);
              if (!chunk.succeeded) {
                faults.push(`Unable to retain evidence: ${file}`);
                break;
              }
              yield* artifacts.publishText({
                name: `${file}/${offset}.base64`,
                mediaType: "text/plain",
                content: chunk.stdout.trim(),
              });
            }
          }
        return faults;
      }),
    );
  });

// Git operations are owned by code. Check both refs and protected committed paths because a
// working-tree-only permission guard would miss an agent that committed its own changes.
export const assertAgentBoundary = (name: string, expectedHead: string) =>
  phase(
    name,
    Schema.Void,
    Effect.gen(function* () {
      if ((yield* git(["rev-parse", "HEAD"])) !== expectedHead)
        return yield* new FactoryError({
          message: "Agent changed HEAD; preserve workspace for inspection",
        });
      const diff = yield* git([
        "diff",
        "--name-only",
        "HEAD",
        "--",
        ".kojo",
        ".claude/skills/kojo",
      ]);
      if (diff)
        return yield* new FactoryError({ message: `Agent modified factory files: ${diff}` });
    }),
  );
