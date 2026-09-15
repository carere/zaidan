import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { PiRpc } from "./protocol.ts";

export default function bridge(pi: ExtensionAPI) {
  const manifest = JSON.parse(readFileSync("/resources/manifest.json", "utf8"));
  const requestPath = process.env.FACTORY_REQUEST;
  const directory = process.env.FACTORY_PHASE;
  if (!requestPath || !directory) throw new Error("Missing durable worker request or phase");
  const request = JSON.parse(readFileSync(requestPath, "utf8"));
  const evidenceDirectory = "/state/evidence";
  mkdirSync(evidenceDirectory, { recursive: true });
  const axis = process.env.FACTORY_REVIEW_AXIS;
  const children = new Set<PiRpc>();
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: "/state/checkout",
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const save = (path: string, value: unknown) => {
    writeFileSync(`${path}.tmp`, JSON.stringify(value));
    renameSync(`${path}.tmp`, path);
  };
  const result = (details: unknown, terminate = false) => ({
    content: [{ type: "text" as const, text: JSON.stringify(details) }],
    details,
    terminate,
  });
  const outcome = (value: unknown) => {
    save(join(directory, "proposal.json"), value);
    return result(value, true);
  };
  const binding = () => ({
    commit: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    reviewBase: process.env.FACTORY_REVIEW_BASE,
    snapshot: request.resources.id,
    issueRevision: request.issue.revision,
    provider: "openai-codex",
    model: "gpt-6-astra",
    reasoning: "high",
  });
  const committed = () => {
    if (git("status", "--porcelain")) throw new Error("Candidate checkout is dirty");
    if (!git("diff", "--name-only", `${process.env.FACTORY_REVIEW_BASE}...HEAD`))
      throw new Error("Candidate contains no implementation diff");
    return binding();
  };
  const checkpointCommit = () => {
    if (axis) throw new Error("Review delegates cannot checkpoint implementation");
    if (git("status", "--porcelain")) {
      git("add", "--all");
      git("commit", "-m", `feat: checkpoint issue ${request.issue.number}`);
    }
    return committed();
  };
  pi.on("tool_call", () => {
    if (existsSync(join(directory, "proposal.json")))
      return { block: true, reason: "Phase has reached its durable outcome", terminate: true };
  });
  pi.on("session_shutdown", async () => {
    await Promise.all([...children].map((child) => child.stop()));
  });
  // #516 can attach one global model-call permit transport at these exact lifecycle hooks.
  // message_end (assistant), rather than turn_end, releases before delegated tool waits.
  pi.on("before_provider_request", async () => {
    if (process.env.FACTORY_PERMIT_URL) {
      const response = await fetch(`${process.env.FACTORY_PERMIT_URL}/acquire`, {
        method: "POST",
        body: JSON.stringify({
          runId: request.runId,
          operationId: process.env.FACTORY_MODEL_OWNER ?? request.operationId,
        }),
      });
      if (!response.ok) throw new Error("Model permit unavailable");
    }
  });
  const release = async () => {
    if (process.env.FACTORY_PERMIT_URL)
      await fetch(`${process.env.FACTORY_PERMIT_URL}/release`, {
        method: "POST",
        body: JSON.stringify({
          runId: request.runId,
          operationId: process.env.FACTORY_MODEL_OWNER ?? request.operationId,
        }),
      });
  };
  pi.on("message_end", async (event) => {
    if (event.message.role === "assistant") await release();
  });
  pi.on("agent_end", release);
  pi.on("session_shutdown", release);
  pi.registerTool({
    name: "Skill",
    label: "Load captured skill",
    description:
      "Load an original captured skill and its base directory. Missing dependencies terminate explicitly.",
    parameters: Type.Object({ name: Type.String() }),
    async execute(_id, args) {
      const skill = manifest.skills.find((item: { name: string }) => item.name === args.name);
      if (!skill)
        return outcome({ type: "failed", reason: `Missing captured skill: ${args.name}` });
      if (args.name === "code-review" && !axis) checkpointCommit();
      return result({
        name: args.name,
        baseDirectory: `/resources/${skill.relativePath}`,
        content: readFileSync(`/resources/${skill.relativePath}/SKILL.md`, "utf8"),
      });
    },
  });
  pi.registerTool({
    name: "checkpoint_commit",
    label: "Checkpoint commit",
    description:
      "Commit current implementation before review and return its stable evidence identity. This does not publish or close the issue.",
    parameters: Type.Object({}),
    async execute() {
      return result(checkpointCommit());
    },
  });
  pi.registerTool({
    name: "request_user_input",
    label: "Durable human question",
    description:
      "Persist a required human decision and stop the phase. The coordinator resumes this original session with a durable answer.",
    parameters: Type.Object({
      prompt: Type.String({ minLength: 1 }),
      options: Type.Optional(
        Type.Array(
          Type.Object({
            id: Type.String(),
            label: Type.String(),
            description: Type.Optional(Type.String()),
          }),
        ),
      ),
      allowFreeform: Type.Optional(Type.Boolean()),
    }),
    async execute(_id, args) {
      if (axis) throw new Error("Delegate must report unresolved question to parent");
      pi.appendEntry("factory-checkpoint", args);
      return outcome({ type: "checkpoint", question: args });
    },
  });
  pi.registerTool({
    name: "factory_validate",
    label: "Validate candidate",
    description:
      "Run all admission-selected validation commands against committed HEAD; retain exact commit, tree, exit code and output.",
    parameters: Type.Object({}),
    async execute(_id, _args, signal) {
      const candidate = committed();
      const checks = [];
      for (const command of manifest.checks) {
        signal?.throwIfAborted();
        const child = spawn("sh", ["-lc", command], {
          cwd: "/state/checkout",
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.on("data", (data) => {
          output += data;
        });
        child.stderr.on("data", (data) => {
          output += data;
        });
        const abort = () => child.kill("SIGKILL");
        signal?.addEventListener("abort", abort, { once: true });
        const exitCode = await new Promise((resolve, reject) => {
          child.once("exit", resolve);
          child.once("error", reject);
        });
        signal?.removeEventListener("abort", abort);
        signal?.throwIfAborted();
        checks.push({ ...candidate, command, exitCode, output });
        if (exitCode !== 0) {
          save(join(evidenceDirectory, "validation.json"), checks);
          return result({ type: "validation.failed", checks });
        }
      }
      if (JSON.stringify(candidate) !== JSON.stringify(committed()))
        throw new Error("Candidate changed during validation");
      save(join(evidenceDirectory, "validation.json"), checks);
      return result({ type: "validation.completed", checks });
    },
  });
  pi.registerTool({
    name: "spawn_agent",
    label: "Sandboxed durable delegate",
    description:
      "Run a delegated agent inside this sandbox, using captured resources and a separate durable session. For independent review set axis standards or spec. Tasks can run in parallel.",
    parameters: Type.Object({
      task: Type.String(),
      axis: Type.Optional(Type.Union([Type.Literal("standards"), Type.Literal("spec")])),
    }),
    async execute(id, args, signal) {
      if (axis)
        throw new Error(
          "Review delegate must finish its bounded review without further delegation",
        );
      signal?.throwIfAborted();
      const identity = createHash("sha256").update(`${request.session.id}:${id}`).digest("hex");
      const childDirectory = join(directory, "delegates", identity);
      mkdirSync(childDirectory, { recursive: true });
      const receipt = join(childDirectory, "result.json");
      if (existsSync(receipt)) return result(JSON.parse(readFileSync(receipt, "utf8")));
      const candidate = args.axis ? committed() : undefined;
      const childArgs = [
        "--provider",
        "openai-codex",
        "--model",
        "gpt-6-astra",
        "--thinking",
        "high",
        "--no-extensions",
        "--no-context-files",
        "--no-skills",
        "--no-prompt-templates",
        "--no-themes",
        "-e",
        "/runtime/bridge.ts",
        "--session",
        `/sessions/delegate-${identity}.jsonl`,
        "--append-system-prompt",
        join(directory, "context.md"),
      ];
      if (args.axis) childArgs.push("--tools", "read,bash,grep,find,ls,review_result,Skill");
      for (const skill of manifest.skills)
        childArgs.push("--skill", `/resources/${skill.relativePath}/SKILL.md`);
      const child = new PiRpc(childArgs, {
        cwd: "/state/checkout",
        env: {
          ...process.env,
          FACTORY_REVIEW_AXIS: args.axis ?? "",
          FACTORY_DELEGATE_RESULT: receipt,
          FACTORY_MODEL_OWNER: identity,
        },
      });
      child.listeners.add((event) => {
        appendFileSync(
          join(directory, "events.jsonl"),
          `${JSON.stringify({ type: "factory.delegate", delegateId: identity, event })}\n`,
        );
      });
      children.add(child);
      const abort = () => {
        child.stop().catch(() => {});
      };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        await child.prompt(
          `${args.task}\n${candidate ? `Review only ${args.axis} against fixed base ${candidate.reviewBase}, candidate ${candidate.commit}. End with review_result including concrete findings; pass only with none. Do not modify files.` : "End with delegate_result containing your findings."}`,
        );
        signal?.throwIfAborted();
        if (!existsSync(receipt)) throw new Error("Delegate ended without typed result");
        const value = JSON.parse(readFileSync(receipt, "utf8"));
        if (candidate && JSON.stringify(candidate) !== JSON.stringify(committed()))
          throw new Error("Candidate changed during review");
        if (args.axis)
          save(join(evidenceDirectory, `review-${args.axis}.json`), {
            ...value,
            ...candidate,
            delegateSession: identity,
          });
        return result(value);
      } finally {
        signal?.removeEventListener("abort", abort);
        await child.stop();
        children.delete(child);
      }
    },
  });
  pi.registerTool({
    name: "review_result",
    label: "Review result",
    description: "Independent delegate records its standards/spec findings and terminates.",
    parameters: Type.Object({ passed: Type.Boolean(), findings: Type.Array(Type.String()) }),
    async execute(_id, args) {
      if (!axis || !process.env.FACTORY_DELEGATE_RESULT)
        throw new Error("Only independent review delegates can record review evidence");
      const value = {
        ...binding(),
        axis,
        passed: args.passed && args.findings.length === 0,
        findings: args.findings,
      };
      save(process.env.FACTORY_DELEGATE_RESULT, value);
      return result(value, true);
    },
  });
  pi.registerTool({
    name: "delegate_result",
    label: "Delegate result",
    description: "Finish a non-review delegated task with concrete findings.",
    parameters: Type.Object({ summary: Type.String() }),
    async execute(_id, args) {
      if (!process.env.FACTORY_DELEGATE_RESULT || axis) throw new Error("Not a general delegate");
      save(process.env.FACTORY_DELEGATE_RESULT, args);
      return result(args, true);
    },
  });
  pi.registerTool({
    name: "factory_complete",
    label: "Complete candidate",
    description:
      "Verify clean committed work and successful checks plus independent standards/spec review all identify current candidate, then finish this phase.",
    parameters: Type.Object({}),
    async execute() {
      if (axis || process.env.FACTORY_DELEGATE_RESULT)
        throw new Error("Delegates cannot complete the issue");
      const candidate = committed();
      if (!manifest.checks.length)
        throw new Error("Candidate requires admission-selected validation commands");
      const checks = JSON.parse(readFileSync(join(evidenceDirectory, "validation.json"), "utf8"));
      const reviews = ["standards", "spec"].map((name) =>
        JSON.parse(readFileSync(join(evidenceDirectory, `review-${name}.json`), "utf8")),
      );
      const matches = (item: Record<string, unknown>) =>
        Object.entries(candidate).every(([key, value]) => item[key] === value);
      if (
        checks.length !== manifest.checks.length ||
        checks.some(
          (check: Record<string, unknown>, index: number) =>
            check.exitCode !== 0 || check.command !== manifest.checks[index] || !matches(check),
        )
      )
        throw new Error("Validation does not cover candidate");
      if (
        reviews.some((review) => !review.passed || review.findings.length || !matches(review)) ||
        reviews[0].delegateSession === reviews[1].delegateSession
      )
        throw new Error("Independent reviews do not cover candidate");
      const bundlePath = `candidates/${candidate.commit}.bundle`;
      mkdirSync("/state/candidates", { recursive: true });
      git("bundle", "create", `/state/${bundlePath}`, "HEAD");
      const artifact = {
        kind: "git-bundle",
        relativePath: bundlePath,
        sha256: createHash("sha256")
          .update(readFileSync(`/state/${bundlePath}`))
          .digest("hex"),
      };
      return outcome({
        type: "completed",
        candidate: {
          ...candidate,
          checks,
          reviews,
          artifact,
          branch: git("branch", "--show-current"),
        },
      });
    },
  });
  pi.registerTool({
    name: "factory_failed",
    label: "Fail phase",
    description:
      "End with explicit failure when implementation, resources, checks or reviews cannot complete.",
    parameters: Type.Object({ reason: Type.String() }),
    async execute(_id, args) {
      return outcome({ type: "failed", reason: args.reason });
    },
  });
}
