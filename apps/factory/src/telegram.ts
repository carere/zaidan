import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import type { IssueWorkflow } from "./issue-workflow.ts";
import type { Answer, NotificationAdapter, NotificationRequest } from "./workflow-contracts.ts";

export interface TelegramOptions {
  database: string;
  token: string;
  maintainerId: number;
  apiBase?: string;
}
export interface TelegramCommand {
  /** Handler must reconcile this durable identity before repeating any external action. */
  id: string;
  name: "scan" | "status" | "pause" | "resume" | "cancel" | "retry";
  argument: string;
}
type CommandHandler = (command: TelegramCommand) => Promise<void>;
interface Message {
  message_id: number;
  from?: { id: number; is_bot?: boolean };
  chat: { id: number; type: string };
  text?: string;
  reply_to_message?: { message_id: number };
}
interface Update {
  update_id: number;
  message?: Message;
  callback_query?: {
    id: string;
    from: { id: number; is_bot?: boolean };
    data?: string;
    message?: Message;
  };
}
interface Notice {
  operationId: string;
  token: string;
  request: NotificationRequest;
  parts: { text: string; state: "pending" | "uncertain" | "sent"; messageId?: number }[];
}
/** Telegram has no send idempotency key or bot history API: uncertain sends stop for reconciliation. */
export class TelegramControl implements NotificationAdapter {
  private db: DatabaseSync;
  private options: TelegramOptions;
  private controller?: AbortController;
  private polling?: Promise<void>;
  constructor(options: TelegramOptions) {
    if (
      !isAbsolute(options.database) ||
      !Number.isSafeInteger(options.maintainerId) ||
      options.maintainerId <= 0 ||
      !options.token ||
      /[\s/]/.test(options.token)
    )
      throw new Error(
        "Telegram requires an absolute database, selected token and numeric maintainer identity",
      );
    const base = new URL(options.apiBase ?? "https://api.telegram.org");
    if (
      base.username ||
      base.password ||
      (base.protocol !== "https:" &&
        !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))
    )
      throw new Error("Telegram requires HTTPS or a loopback fixture");
    this.options = options;
    mkdirSync(dirname(options.database), { recursive: true });
    this.db = new DatabaseSync(options.database);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS telegram_notices (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS telegram_updates (id INTEGER PRIMARY KEY, data TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS telegram_settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    const identity = JSON.stringify({
      maintainerId: options.maintainerId,
      bot: options.token.split(":")[0],
      apiBase: base.href,
    });
    const previous = this.db
      .prepare("SELECT value FROM telegram_settings WHERE id='identity'")
      .get();
    if (previous && previous.value !== identity) {
      this.db.close();
      throw new Error("Telegram durable state belongs to another bot or maintainer");
    }
    this.db.prepare("INSERT OR IGNORE INTO telegram_settings VALUES ('identity', ?)").run(identity);
  }
  close() {
    if (this.controller) throw new Error("Stop Telegram polling before closing its store");
    this.db.close();
  }
  status() {
    const row = this.db.prepare("SELECT value FROM telegram_settings WHERE id='offset'").get();
    return {
      offset: Number(row?.value ?? 0),
      uncertain: this.notices()
        .filter((notice) => notice.parts.some((part) => part.state === "uncertain"))
        .map((notice) => notice.operationId),
    };
  }
  private notices(): Notice[] {
    return this.db
      .prepare("SELECT data FROM telegram_notices")
      .all()
      .map((row) => JSON.parse(row.data as string));
  }
  private save(notice: Notice) {
    this.db
      .prepare("UPDATE telegram_notices SET data=? WHERE id=?")
      .run(JSON.stringify(notice), notice.operationId);
  }
  private async api(method: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetch(
        `${(this.options.apiBase ?? "https://api.telegram.org").replace(/\/$/, "")}/bot${this.options.token}/${method}`,
        {
          method: "POST",
          redirect: "error",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(35000)])
            : AbortSignal.timeout(35000),
        },
      );
      const payload = (await response.json()) as { ok: boolean; result: unknown };
      if (!response.ok || payload.ok !== true) throw new Error("rejected");
      return payload.result;
    } catch {
      throw new Error(`Telegram ${method} failed; delivery may be uncertain`);
    }
  }
  async reconcile(operationId: string) {
    const notice = this.notices().find((item) => item.operationId === operationId);
    if (!notice) return undefined;
    if (notice.parts.some((part) => part.state === "uncertain"))
      throw new Error(
        "Telegram notification delivery is uncertain; reconcile a maintainer reply or explicitly retry",
      );
    return notice.parts.every((part) => part.state === "sent") ? notice.token : undefined;
  }
  async send(request: NotificationRequest) {
    const token = createHash("sha256").update(request.operationId).digest("hex").slice(0, 32);
    let notice = this.notices().find((item) => item.operationId === request.operationId);
    if (notice && JSON.stringify(notice.request) !== JSON.stringify(request))
      throw new Error("Telegram operation identity changed");
    if (!notice) {
      const question = request.checkpoint.question;
      const options = question.options
        ?.map((option) => `${option.label}${option.description ? `: ${option.description}` : ""}`)
        .join("\n");
      const content = `${request.issue.repository}#${request.issue.number}\n\n${question.prompt}${options ? `\n\n${options}` : ""}\n\nReply to this message or use /answer ${token} <answer>.`;
      // Leave room for a stable checkpoint marker on every part; never truncate required context.
      const characters = Array.from(content);
      const parts: Notice["parts"] = [];
      while (characters.length)
        parts.push({
          text: `[checkpoint ${token}]\n${characters.splice(0, 3000).join("")}`,
          state: "pending",
        });
      notice = { operationId: request.operationId, token, request, parts };
      this.db
        .prepare("INSERT OR IGNORE INTO telegram_notices VALUES (?, ?, ?)")
        .run(request.operationId, token, JSON.stringify(notice));
    }
    for (let index = 0; index < notice.parts.length; index++) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const stored = this.notices().find((item) => item.operationId === request.operationId);
        if (!stored || JSON.stringify(stored.request) !== JSON.stringify(request))
          throw new Error("Telegram operation changed while sending");
        notice = stored;
        const part = notice.parts[index];
        if (!part) throw new Error("Missing Telegram message part");
        if (part.state === "uncertain")
          throw new Error("Telegram send is uncertain; automatic resend is disabled");
        if (part.state === "sent") {
          this.db.exec("COMMIT");
          continue;
        }
        part.state = "uncertain";
        this.save(notice);
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
      const part = notice.parts[index];
      if (!part) throw new Error("Missing Telegram message part");
      const buttons = request.checkpoint.question.options?.map((option, optionIndex) => [
        { text: option.label.slice(0, 100), callback_data: `a:${token}:${optionIndex}` },
      ]);
      const message = (await this.api("sendMessage", {
        chat_id: this.options.maintainerId,
        text: part.text,
        ...(index === notice.parts.length - 1 && buttons?.length
          ? { reply_markup: { inline_keyboard: buttons } }
          : {}),
      })) as Message;
      if (
        !Number.isSafeInteger(message?.message_id) ||
        message.chat?.id !== this.options.maintainerId
      )
        throw new Error("Malformed Telegram send receipt");
      notice.parts[index] = {
        ...part,
        state: "sent",
        messageId: message.message_id,
      };
      this.save(notice);
    }
    return token;
  }
  /** Explicit operator recovery may duplicate the notification, but can never duplicate its decision. */
  async retryUncertain(operationId: string) {
    const notice = this.notices().find((item) => item.operationId === operationId);
    if (!notice) throw new Error("Unknown Telegram notification");
    for (const part of notice.parts) if (part.state === "uncertain") part.state = "pending";
    this.save(notice);
    return this.send(notice.request);
  }
  private async handle(
    update: Update,
    workflow: Pick<IssueWorkflow, "answer" | "admissions">,
    command?: CommandHandler,
  ) {
    const callback = update.callback_query;
    const message = callback?.message ?? update.message;
    const author = callback?.from ?? message?.from;
    if (
      author?.id !== this.options.maintainerId ||
      author.is_bot ||
      message?.chat.id !== this.options.maintainerId ||
      message.chat.type !== "private"
    )
      return;
    let token: string | undefined;
    let answer: Answer | undefined;
    const button = callback?.data?.match(/^a:([a-f0-9]{32}):(\d+)$/);
    if (button) {
      token = button[1];
      const notice = this.notices().find((item) => item.token === token);
      const option = notice?.request.checkpoint.question.options?.[Number(button[2])];
      if (option) answer = { optionId: option.id };
    } else if (!callback && message.text) {
      const explicit = message.text.match(/^\/answer\s+([a-f0-9]{32})\s+([\s\S]+)$/);
      if (explicit) {
        token = explicit[1];
        answer = { text: explicit[2] };
      } else if (message.reply_to_message) {
        token = this.notices().find((item) =>
          item.parts.some((part) => part.messageId === message.reply_to_message?.message_id),
        )?.token;
        answer = { text: message.text };
      } else {
        const control = message.text.match(
          /^\/(scan|status|pause|resume|cancel|retry)(?:\s+(.*))?$/,
        );
        if (control && command)
          await command({
            id: `telegram:${update.update_id}`,
            name: control[1] as TelegramCommand["name"],
            argument: control[2] ?? "",
          });
      }
    }
    const notice = this.notices().find((item) => item.token === token);
    if (
      notice &&
      answer &&
      (notice.parts.every((part) => part.state === "sent") ||
        (notice.parts.length === 1 && notice.parts[0]?.state === "uncertain"))
    ) {
      // A valid reply is evidence of delivery even when sendMessage's response was lost.
      const request = notice.request;
      const run = workflow.admissions().find((item) => item.runId === request.runId);
      if (run)
        await workflow.answer({
          runId: request.runId,
          issueId: request.issue.issueId,
          revision: request.issue.revision,
          checkpointId: request.checkpoint.id,
          answerId: `telegram:${update.update_id}`,
          answer,
        });
      const part = notice.parts[0];
      if (notice.parts.length === 1 && part?.state === "uncertain") {
        part.state = "sent";
        part.messageId = message.message_id;
        this.save(notice);
      }
    }
    if (callback)
      await this.api("answerCallbackQuery", { callback_query_id: callback.id }).catch(() => {});
  }
  pollOnce(
    workflow: Pick<IssueWorkflow, "answer" | "admissions">,
    command?: CommandHandler,
    signal?: AbortSignal,
  ): Promise<void> {
    if (this.polling) return this.polling;
    this.polling = this.poll(workflow, command, signal).finally(() => {
      this.polling = undefined;
    });
    return this.polling;
  }
  private async poll(
    workflow: Pick<IssueWorkflow, "answer" | "admissions">,
    command?: CommandHandler,
    signal?: AbortSignal,
  ) {
    const replay = async () => {
      const rows = this.db
        .prepare("SELECT id,data FROM telegram_updates WHERE done=0 ORDER BY id")
        .all();
      for (const row of rows) {
        await this.handle(JSON.parse(row.data as string), workflow, command);
        this.db.exec("BEGIN IMMEDIATE");
        try {
          this.db.prepare("UPDATE telegram_updates SET done=1 WHERE id=?").run(Number(row.id));
          this.db
            .prepare(
              "INSERT INTO telegram_settings VALUES ('offset', ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
            )
            .run(String(Number(row.id) + 1));
          this.db.exec("COMMIT");
        } catch (error) {
          this.db.exec("ROLLBACK");
          throw error;
        }
      }
    };
    await replay();
    const updates = await this.api(
      "getUpdates",
      {
        offset: this.status().offset,
        timeout: 25,
        limit: 100,
        allowed_updates: ["message", "callback_query"],
      },
      signal,
    );
    if (
      !Array.isArray(updates) ||
      updates.some((update) => !Number.isSafeInteger(update?.update_id) || update.update_id < 0)
    )
      throw new Error("Malformed Telegram update page");
    for (const update of updates)
      this.db
        .prepare("INSERT OR IGNORE INTO telegram_updates (id,data) VALUES (?,?)")
        .run(update.update_id, JSON.stringify(update));
    await replay();
  }
  async run(workflow: Pick<IssueWorkflow, "answer" | "admissions">, command?: CommandHandler) {
    if (this.controller) throw new Error("Telegram poller is already running");
    this.controller = new AbortController();
    const signal = this.controller.signal;
    try {
      while (!signal.aborted) {
        try {
          await this.pollOnce(workflow, command, signal);
        } catch {
          if (!signal.aborted) await delay(5000, undefined, { signal }).catch(() => {});
        }
      }
    } finally {
      this.controller = undefined;
    }
  }
  stop() {
    this.controller?.abort();
  }
}
