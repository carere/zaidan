import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { PiRpc } from "./protocol.ts";

const request = JSON.parse(readFileSync(process.env.FACTORY_REQUEST, "utf8"));
const phaseDirectory = process.env.FACTORY_PHASE;
const outcomePath = join(phaseDirectory, "outcome.json");
const manifest = JSON.parse(readFileSync("/resources/manifest.json", "utf8"));
const record = (outcome) => {
  if (existsSync(outcomePath)) return;
  const temporary = `${outcomePath}.tmp`;
  writeFileSync(temporary, JSON.stringify(outcome));
  renameSync(temporary, outcomePath);
};
const event = (value) =>
  appendFileSync(join(phaseDirectory, "events.jsonl"), `${JSON.stringify(value)}\n`);
const git = (...args) =>
  execFileSync("git", args, {
    cwd: "/state/checkout",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
let rpc;
try {
  mkdirSync(phaseDirectory, { recursive: true });
  if (!existsSync("/state/checkout/.git")) {
    execFileSync(
      "git",
      ["clone", "--no-hardlinks", "/source/repository.bundle", "/state/checkout"],
      { stdio: "ignore" },
    );
    git("checkout", "-b", `factory/${request.runId}`, request.issue.startingRevision);
    git("remote", "remove", "origin");
    git("config", "user.name", "Zaidan Factory");
    git("config", "user.email", "factory@localhost");
  }
  const reviewBase = git("rev-parse", `${request.issue.reviewBase}^{commit}`);
  if (existsSync("/state/identity.json")) {
    const identity = JSON.parse(readFileSync("/state/identity.json", "utf8"));
    if (
      identity.session !== request.session.id ||
      identity.snapshot !== request.resources.id ||
      identity.reviewBase !== reviewBase
    )
      throw new Error("Original session, snapshot or review base changed");
  } else
    writeFileSync(
      "/state/identity.json",
      JSON.stringify({ session: request.session.id, snapshot: request.resources.id, reviewBase }),
    );
  mkdirSync("/sessions", { recursive: true });
  const session = `/sessions/${request.session.id}.jsonl`;
  const instructions = manifest.instructions
    .map(
      (path) => `\n## Captured /resources/${path}\n${readFileSync(`/resources/${path}`, "utf8")}`,
    )
    .join("\n");
  writeFileSync(
    join(phaseDirectory, "context.md"),
    `Factory run ${request.runId}. Original issue and specification: /resources/manifest.json. Stable review base: ${reviewBase}. Snapshot: ${request.resources.id}.\nUse the captured original skills. Skill loads a captured skill; spawn_agent runs durable Pi delegates in this same sandbox. request_user_input persists a human checkpoint and terminates this phase; resume continues this exact session. Tracker reads come from captured issue resources; tracker writes require a human/coordinator action intent, never tokens. Before review, call checkpoint_commit; then run required checks with factory_validate. Load code-review and run independent standards/spec delegates with spawn_agent axis set accordingly; they end using review_result. Complete with factory_complete only after committed diff, required validation and both reviews. Missing resources fail explicitly. ${instructions}`,
  );
  const args = [
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
    session,
    "--append-system-prompt",
    join(phaseDirectory, "context.md"),
  ];
  for (const skill of manifest.skills)
    args.push("--skill", `/resources/${skill.relativePath}/SKILL.md`);
  rpc = new PiRpc(args, {
    cwd: "/state/checkout",
    env: { ...process.env, PI_CODING_AGENT_DIR: "/auth", FACTORY_REVIEW_BASE: reviewBase },
  });
  rpc.listeners.add((value) => {
    event(value);
    if (value.type === "extension_ui_request") {
      const question = {
        prompt: value.message ?? value.title ?? "Worker decision",
        allowFreeform: true,
      };
      if (value.method === "select")
        question.options = value.options.map((label, index) => ({ id: String(index), label }));
      if (value.method === "confirm")
        question.options = [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ];
      if (["select", "confirm", "input", "editor"].includes(value.method)) {
        record({ type: "checkpoint", question });
        rpc.stop().catch(() => {});
      }
    }
  });
  await rpc.send("set_auto_retry", { enabled: false });
  const commands = await rpc.send("get_commands");
  if (!commands.commands.some((command) => command.name === `skill:${manifest.entry}`))
    throw new Error("Captured native entry command unavailable");
  const state = await rpc.send("get_state");
  if (
    state.model?.provider !== "openai-codex" ||
    state.model?.id !== "gpt-6-astra" ||
    state.thinkingLevel !== "high"
  )
    throw new Error("Unsupported subscription settings; no fallback");
  event({
    type: "factory.session",
    session: request.session.id,
    path: session,
    snapshot: request.resources.id,
    commands: commands.commands.map((command) => command.name),
    provider: state.model.provider,
    model: state.model.id,
    reasoning: state.thinkingLevel,
  });
  const prompt = request.answer
    ? `Continue the original captured workflow. Durable checkpoint ${request.checkpoint.id}: ${request.checkpoint.question.prompt}\nAnswer ${request.checkpoint.answerId}: ${JSON.stringify(request.answer)}. Do not repeat the question or completed work.`
    : `/skill:${manifest.entry} Implement the admitted issue in /resources/manifest.json using the captured specification and resources. ${request.instruction ?? ""}`;
  await rpc.prompt(prompt);
  if (existsSync(join(phaseDirectory, "proposal.json")))
    record(JSON.parse(readFileSync(join(phaseDirectory, "proposal.json"), "utf8")));
  if (!existsSync(outcomePath))
    record({ type: "failed", reason: "Pi ended without a typed phase outcome" });
} catch (error) {
  // Transport/provider messages may contain sensitive details. Retain a bounded category only.
  event({
    type: "factory.error",
    category:
      error instanceof Error && /Original|Captured|Unsupported/.test(error.message)
        ? error.message
        : "Worker execution failed",
  });
  record({ type: "failed", reason: "Worker execution failed before a verified typed outcome" });
} finally {
  await rpc?.stop();
}
