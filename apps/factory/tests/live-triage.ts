/** Explicit disposable GitHub-write fixture. No provider calls; Telegram and human responses are synthetic. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGitHubDiscovery,
  createGitHubTriage,
  IssueWorkflow,
  SqliteWorkflowStore,
  TelegramControl,
  TRIAGE_DISCLAIMER,
} from "../src/index.ts";

const repository = "carere/zaidan-factory-fixture";
const token = execFileSync("gh", ["auth", "token"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const directory = process.argv[2] ?? mkdtempSync(join(tmpdir(), "live-triage-518-"));
async function github(path: string, body?: unknown) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "content-type": "application/json",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.ok, true, `Fixture GitHub operation failed (${response.status})`);
  return response.json();
}
const created = (
  existsSync(join(directory, "created.json"))
    ? JSON.parse(readFileSync(join(directory, "created.json"), "utf8"))
    : await github("issues", {
        title: "[factory #518 fixture] Durable triage of a missing greeting",
        body: `${TRIAGE_DISCLAIMER}\n\nDisposable synthetic-worker fixture for Zaidan #518. This test does not use live Telegram, a real maintainer answer or model inference.\n\n## Request\nAdd a greeting component; preserve this fixture for final factory acceptance.`,
        labels: ["needs-triage"],
      })
) as { node_id: string; number: number; html_url: string };
writeFileSync(join(directory, "created.json"), JSON.stringify(created));
const discovery = createGitHubDiscovery({ repository, token });
let triage = createGitHubTriage({
  database: join(directory, "triage.sqlite"),
  repository,
  token,
  discovery,
});
const sent: { text: string; reply_markup?: { inline_keyboard: { callback_data: string }[][] } }[] =
  [];
const updates: unknown[] = [];
const server = createServer(async (req, res) => {
  let text = "";
  for await (const chunk of req) text += chunk;
  const body = JSON.parse(text);
  let result: unknown = true;
  if (req.url?.endsWith("sendMessage")) {
    sent.push(body);
    result = { message_id: sent.length, chat: { id: 42, type: "private" } };
  }
  if (req.url?.endsWith("getUpdates")) result = updates.splice(0);
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ ok: true, result }));
});
await new Promise<void>((resolve) =>
  server.listen(Number(process.argv[3] ?? 0), "127.0.0.1", resolve),
);
const address = server.address();
assert.ok(address && typeof address !== "string");
const telegramOptions = {
  database: join(directory, "telegram.sqlite"),
  maintainerId: 42,
  token: "synthetic-fixture-token",
  apiBase: `http://127.0.0.1:${address.port}`,
};
let telegram = new TelegramControl(telegramOptions);
let store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
const worker = {
  reconcile: async () => undefined,
  dispatch: async () => ({
    type: "checkpoint" as const,
    question: {
      prompt:
        "Synthetic investigation found no greeting component. Recommend enhancement / ready-for-agent. Continue to verification?",
      allowFreeform: true,
    },
  }),
  resume: async () => ({
    type: "triage-proposed" as const,
    proposal: {
      category: "enhancement" as const,
      state: "ready-for-agent" as const,
      investigation:
        "Synthetic fixture investigation: missing greeting component; no prior rejection. No live repository code investigation claimed.",
      recommendation: "A bounded greeting component fixture suitable for an agent.",
      verification:
        "Synthetic controlled-worker verification; actual provider/human acceptance remains pending.",
      comment: `${TRIAGE_DISCLAIMER}\n\n## Agent brief\nCreate a greeting component in this disposable fixture. This is synthetic-worker transport evidence for #518.\n\n## Acceptance criteria\nThe greeting renders the agreed text.\n\n## Evidence limitation\nHuman responses and Telegram transport were simulated; no live model inference occurred.`,
    },
  }),
};
const engine = {
  find: async () => "controlled-eve",
  start: async () => "controlled-eve",
  wake: async () => {},
};
let lose = true;
const make = () =>
  new IssueWorkflow({
    store,
    discovery,
    worker,
    engine,
    notifications: telegram,
    triage: {
      prepare: (issue) => triage.prepare(issue),
      current: (issue) => triage.current?.(issue) ?? Promise.resolve(false),
      reconcile: (request) => triage.reconcile(request),
      apply: async (request) => {
        const receipt = await triage.apply(request);
        if (lose) {
          lose = false;
          throw new Error("Injected lost coordinator receipt after actual GitHub writes");
        }
        return receipt;
      },
    },
  });
try {
  let workflow = make();
  const scan = await workflow.scan();
  const decision = scan.decisions.find((item) => item.issue.issueId === created.node_id);
  assert.equal(decision?.route, "triage");
  assert.ok(decision?.admission);
  const run = await workflow.admit({
    ...decision.admission,
    startingRevision: "synthetic-no-code-worker",
    reviewBase: "synthetic-no-code-worker",
  });
  await workflow.drive(run.runId);
  store.close();
  telegram.close();
  triage.close();
  store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  telegram = new TelegramControl(telegramOptions);
  triage = createGitHubTriage({
    database: join(directory, "triage.sqlite"),
    repository,
    token,
    discovery,
  });
  workflow = make();
  updates.push({
    update_id: 1,
    message: {
      message_id: 10,
      from: { id: 42 },
      chat: { id: 42, type: "private" },
      reply_to_message: { message_id: 1 },
      text: "Synthetic maintainer reply: verify the fixture claim",
    },
  });
  await telegram.pollOnce(workflow);
  await workflow.drive(run.runId);
  const last = sent.at(-1);
  assert.ok(last?.reply_markup);
  const data = last.reply_markup.inline_keyboard[0]?.[0]?.callback_data;
  assert.ok(data);
  updates.push({
    update_id: 2,
    callback_query: {
      id: "synthetic-apply",
      from: { id: 42 },
      data,
      message: { message_id: sent.length, chat: { id: 42, type: "private" } },
    },
  });
  await telegram.pollOnce(workflow);
  await workflow.drive(run.runId);
  store.close();
  store = new SqliteWorkflowStore(join(directory, "workflow.sqlite"));
  workflow = make();
  await workflow.drive(run.runId);
  const completed = workflow.observe(run.runId);
  assert.equal(completed.status, "completed");
  assert.equal(completed.session.id, run.session.id);
  const native = (await github(`issues/${created.number}`)) as { labels: { name: string }[] };
  assert.deepEqual(native.labels.map((label) => label.name).sort(), [
    "enhancement",
    "ready-for-agent",
  ]);
  const comments = (await github(`issues/${created.number}/comments`)) as { body: string }[];
  assert.equal(comments.length, 1);
  assert.ok(comments[0]?.body.startsWith(TRIAGE_DISCLAIMER));
  const evidence = {
    issue: created.html_url,
    number: created.number,
    issueId: created.node_id,
    runId: run.runId,
    originalSessionId: run.session.id,
    stateDirectory: directory,
    actualGitHubWrites: [
      "create disposable needs-triage issue",
      "post one disclaimer-prefixed approved brief",
      "set enhancement and ready-for-agent",
    ],
    verified: [
      "original session after store restart",
      "synthetic Telegram free-text and button answers persisted",
      "lost coordinator receipt reconciled without duplicate comment",
      "canonical labels",
      "native full source capture",
    ],
    limitations: [
      "Synthetic worker, synthetic Telegram server and scripted human answers",
      "No live Telegram, real human decision or provider call",
    ],
    ...completed.triage?.receipt,
  };
  writeFileSync(join(directory, "evidence.json"), JSON.stringify(evidence, null, 2));
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  store.close();
  telegram.close();
  triage.close();
  server.close();
}
