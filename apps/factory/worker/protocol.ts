import {
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
  spawn,
} from "node:child_process";

/** Pi acknowledges prompts before completion. Only agent_end ends a turn. */
export class PiRpc {
  pending = new Map<
    string,
    { resolve: (value: Record<string, unknown>) => void; reject: (reason: Error) => void }
  >();
  listeners = new Set<(event: Record<string, unknown>) => void>();
  nextId = 0;
  child: ChildProcessWithoutNullStreams;
  closed: Promise<unknown>;
  constructor(args: string[], options: SpawnOptionsWithoutStdio = {}) {
    this.child = spawn("pi", ["--mode", "rpc", ...args], {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    this.child.stderr.resume();
    this.child.stdout.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\n")) {
        const index = buffer.indexOf("\n");
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        const call = this.pending.get(String(event.id));
        if (event.type === "response" && call) {
          const { resolve, reject } = call;
          this.pending.delete(String(event.id));
          if (event.success) resolve(event.data as Record<string, unknown>);
          else reject(new Error(`Pi ${event.command} rejected: ${event.error ?? "unknown error"}`));
        }
        for (const listener of this.listeners) listener(event);
      }
    });
    this.closed = new Promise((resolve) => {
      this.child.once("error", () => resolve({ error: "Pi transport failed" }));
      this.child.once("close", (code) => resolve({ code }));
    }).then((result) => {
      for (const call of this.pending.values()) call.reject(new Error("Pi transport closed"));
      this.pending.clear();
      return result;
    });
  }
  send(type: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = String(++this.nextId);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ id, type, ...body })}\n`, (error) => {
        if (error) reject(error);
      });
    });
  }
  async prompt(message: string) {
    let finish = () => {};
    const ended = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const listener = (event: Record<string, unknown>) => {
      if (event.type === "agent_end") finish();
    };
    this.listeners.add(listener);
    try {
      await this.send("prompt", { message });
      const result = await Promise.race([
        ended.then(() => "ended"),
        this.closed.then(() => "closed"),
      ]);
      if (result !== "ended") throw new Error("Pi closed before typed completion");
    } finally {
      this.listeners.delete(listener);
    }
  }
  async stop() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await this.send("clear_queue").catch(() => {});
    await this.send("abort").catch(() => {});
    this.child.kill("SIGTERM");
    const timer = setTimeout(() => this.child.kill("SIGKILL"), 1000);
    await this.closed;
    clearTimeout(timer);
  }
}
