import { createHook } from "workflow";
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

export async function compatibilityWorkflow(root: string, questionId: string) {
  "use workflow";
  const first = await phase(root, "first");
  using question = createHook<{ questionId: string; answer: "blue" }>({ token: questionId });
  await record(root, "question.persisted", { questionId, sessionId: first.sessionId });
  const answer = await question;
  if (answer.questionId !== questionId || answer.answer !== "blue")
    throw new Error("Unmatched fixture answer");
  await record(root, "answer.persisted", answer);
  const resumed = await phase(root, "resume", answer.answer);
  return { sessionId: resumed.sessionId, questionId, completed: true };
}
async function phase(root: string, name: string, answer = "") {
  "use step";
  const result = spawnSync(
    process.execPath,
    [join(process.env.COMPAT_SOURCE!, "run.mjs"), "worker", root, name, answer],
    { encoding: "utf8", timeout: 240000 },
  );
  if (result.status !== 0)
    throw new Error(`Fixture ${name} failed (inspect local sanitized evidence)`);
  return JSON.parse(result.stdout);
}
async function record(root: string, type: string, data: object) {
  "use step";
  appendFileSync(join(root, "coordinator-events.jsonl"), `${JSON.stringify({ type, ...data })}\n`);
}
