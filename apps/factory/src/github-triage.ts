import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ApprovedBrief, DiscoveryAdapter } from "./discovery.ts";
import { createGitHubDiscovery, type GitHubDiscoveryOptions } from "./github-discovery.ts";
import {
  TRIAGE_DISCLAIMER,
  TRIAGE_STATES,
  type TriageAdapter,
  type TriageContext,
  type TriageReceipt,
  type TriageRequest,
  triageDocuments,
  validateTriageProposal,
} from "./triage.ts";
import type { IssueSnapshot } from "./workflow-contracts.ts";

export interface GitHubTriageOptions extends GitHubDiscoveryOptions {
  database: string;
  token: string;
  discovery?: DiscoveryAdapter;
}
interface Comment {
  id: number;
  body: string;
  user: { id: number; login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}
interface NativeIssue {
  node_id: string;
  title: string;
  body: string | null;
  state: string;
  state_reason?: string;
  labels: { name: string }[];
  user: { login: string };
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}
interface Intent {
  request: TriageRequest;
  attempted: string[];
  receipt?: TriageReceipt;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** The only triage writer. Its SQLite records are external-action receipts, never a second admission store. */
export function createGitHubTriage(options: GitHubTriageOptions): TriageAdapter & {
  close(): void;
  approvedBriefs(): Promise<ApprovedBrief[]>;
  pending(): { operationId: string; attempted: string[] }[];
  retryUncertain(request: TriageRequest, step: string): Promise<TriageReceipt>;
} {
  if (
    !isAbsolute(options.database) ||
    !/^[\w.-]+\/[\w.-]+$/.test(options.repository) ||
    !options.token
  )
    throw new Error(
      "Triage requires persistent storage, selected repository and coordinator token",
    );
  let actionGuard: ((runId: string) => void) | undefined;
  const base = new URL(`${(options.apiBase ?? "https://api.github.com").replace(/\/$/, "")}/`);
  if (
    base.protocol !== "https:" &&
    !(base.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname))
  )
    throw new Error("GitHub requires HTTPS or a loopback fixture");
  mkdirSync(dirname(options.database), { recursive: true });
  const db = new DatabaseSync(options.database);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS triage_actions (id TEXT PRIMARY KEY, data TEXT NOT NULL);",
  );
  const discovery = options.discovery ?? createGitHubDiscovery(options);
  const active = new Map<string, Promise<TriageReceipt>>();
  function trusted(path: string) {
    const url = new URL(path, base);
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname) ||
      url.username ||
      url.password
    )
      throw new Error("Untrusted GitHub triage URL");
    return url;
  }
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
    missing = false,
  ): Promise<{ data: unknown; next?: string }> {
    const url = trusted(path);
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          Authorization: `Bearer ${options.token}`,
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new Error(`GitHub triage ${method} response uncertain`);
    }
    if (missing && response.status === 404) return { data: undefined };
    if (!response.ok) throw new Error(`GitHub triage ${method} failed (${response.status})`);
    return {
      data: await response.json(),
      next: response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1],
    };
  }
  async function pages<T>(path: string): Promise<T[]> {
    const values: T[] = [];
    const visited = new Set<string>();
    let next: string | undefined = path;
    while (next) {
      const url = trusted(next).href;
      if (visited.has(url)) throw new Error("GitHub triage pagination loop");
      visited.add(url);
      const page = await api(url);
      if (!Array.isArray(page.data)) throw new Error("Malformed GitHub triage page");
      values.push(...page.data);
      next = page.next;
    }
    return values;
  }
  function source(issue: IssueSnapshot) {
    if (
      issue.repository !== options.repository ||
      !Number.isSafeInteger(issue.number) ||
      issue.number < 1 ||
      issue.route !== "triage"
    )
      throw new Error("Triage action outside configured issue scope");
    return `repos/${options.repository}/issues/${issue.number}`;
  }
  async function read(issue: IssueSnapshot) {
    const path = source(issue);
    const native = (await api(path)).data as NativeIssue;
    if (
      native.node_id !== issue.issueId ||
      native.pull_request ||
      typeof native.title !== "string" ||
      !(native.body === null || typeof native.body === "string") ||
      !Array.isArray(native.labels) ||
      native.labels.some((label) => typeof label.name !== "string") ||
      typeof native.user?.login !== "string" ||
      typeof native.created_at !== "string" ||
      typeof native.updated_at !== "string"
    )
      throw new Error("Malformed or replaced GitHub triage issue");
    const comments = await pages<Comment>(`${path}/comments?per_page=100`);
    if (
      comments.some(
        (comment) =>
          !Number.isSafeInteger(comment.id) ||
          typeof comment.body !== "string" ||
          typeof comment.user?.login !== "string" ||
          !Number.isSafeInteger(comment.user?.id) ||
          typeof comment.created_at !== "string" ||
          typeof comment.updated_at !== "string" ||
          typeof comment.html_url !== "string",
      )
    )
      throw new Error("Malformed GitHub triage comments");
    return {
      native,
      comments,
      contentRevision: hash({ title: native.title, body: native.body ?? "" }),
    };
  }
  const capturedComments = (comments: Comment[]): TriageContext["comments"] =>
    comments.map((comment) => ({
      id: comment.id,
      author: comment.user.login,
      body: comment.body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      url: comment.html_url,
    }));
  const save = (intent: Intent) =>
    db
      .prepare(
        "INSERT INTO triage_actions VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(intent.request.operationId, JSON.stringify(intent));
  const marker = (id: string) => `<!-- zaidan-triage:${hash(id)} -->`;
  async function applyOnce(request: TriageRequest): Promise<TriageReceipt> {
    validateTriageProposal(request.proposal);
    const path = source(request.issue);
    const context = request.issue.triageContext;
    if (!context) throw new Error("Triage action requires captured full context");
    const row = db.prepare("SELECT data FROM triage_actions WHERE id=?").get(request.operationId);
    const intent: Intent = row ? JSON.parse(row.data as string) : { request, attempted: [] };
    if (JSON.stringify(intent.request) !== JSON.stringify(request))
      throw new Error("Triage operation identity changed");
    save(intent);
    const actor = (await api("user")).data as { id: number };
    if (!Number.isSafeInteger(actor.id)) throw new Error("Missing GitHub publication identity");
    const checked = async () => {
      const state = await read(request.issue);
      const current = (await discovery.read()).issues.find(
        (issue) => issue.issueId === request.issue.issueId,
      );
      if (
        !current ||
        current.repository !== request.issue.repository ||
        (!intent.attempted.some((step) => ["comment", "labels", "close"].includes(step)) &&
          current.revision !== request.issue.revision) ||
        state.contentRevision !== context.contentRevision ||
        hash([...current.parentIds].sort()) !== hash([...(request.issue.parentIds ?? [])].sort()) ||
        hash([...current.dependencyIds].sort()) !==
          hash([...(request.issue.dependencyIds ?? [])].sort()) ||
        (context.childIds &&
          hash([...current.childIds].sort()) !== hash([...context.childIds].sort()))
      )
        throw new Error("Triage issue content or relationships changed; obtain a fresh decision");
      const ownedComments = state.comments.filter(
        (comment) =>
          comment.user.id === actor.id && comment.body.endsWith(marker(request.operationId)),
      );
      if (
        ownedComments.length > 1 ||
        hash(
          capturedComments(state.comments.filter((comment) => !ownedComments.includes(comment))),
        ) !== hash(context.comments)
      )
        throw new Error("Triage comments changed; reconcile before applying the decision");
      const originalStates = (request.issue.labels ?? [])
        .filter((label) => (TRIAGE_STATES as readonly string[]).includes(label))
        .sort();
      const currentStates = state.native.labels
        .map((label) => label.name)
        .filter((label) => (TRIAGE_STATES as readonly string[]).includes(label))
        .sort();
      if (
        hash(currentStates) !== hash(originalStates) &&
        hash(currentStates) !== hash([request.proposal.state])
      )
        throw new Error("Triage authorization labels changed");
      if (
        state.native.state !== "open" &&
        !(
          request.proposal.state === "wontfix" &&
          state.native.state === "closed" &&
          state.native.state_reason === "not_planned" &&
          intent.attempted.includes("close")
        )
      )
        throw new Error("Triage issue closure changed");
      return { state, ownedComments };
    };
    const initial = await checked();
    let state = initial.state;
    const ownedComments = initial.ownedComments;
    async function effect<T>(
      key: string,
      find: () => Promise<T | undefined>,
      write: () => Promise<T>,
    ): Promise<T> {
      const found = await find();
      if (found !== undefined) return found;
      if (intent.attempted.includes(key))
        throw new Error(
          `Triage ${key} outcome uncertain; reconcile remote evidence before retrying`,
        );
      await checked();
      actionGuard?.(request.runId);
      db.exec("BEGIN IMMEDIATE");
      try {
        const latestRow = db
          .prepare("SELECT data FROM triage_actions WHERE id=?")
          .get(request.operationId);
        const latest: Intent = latestRow ? JSON.parse(latestRow.data as string) : intent;
        if (latest.attempted.includes(key))
          throw new Error(`Triage ${key} is already in flight or uncertain`);
        intent.attempted = [...latest.attempted, key];
        save(intent);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return write();
    }
    let knowledgeRef: string | undefined;
    if (triageDocuments(request.proposal).length) {
      const repo = `repos/${options.repository}`;
      const branch = `factory/triage-${hash(request.operationId).slice(0, 24)}`;
      const main = (await api(`${repo}/git/ref/heads/main`)).data as { object: { sha: string } };
      await effect(
        "knowledge-branch",
        async () => (await api(`${repo}/git/ref/heads/${branch}`, "GET", undefined, true)).data,
        async () =>
          (
            await api(`${repo}/git/refs`, "POST", {
              ref: `refs/heads/${branch}`,
              sha: main.object.sha,
            })
          ).data,
      );
      for (const document of triageDocuments(request.proposal)) {
        const filePath = `${repo}/contents/${document.path}`;
        const original = (
          await api(
            `${filePath}?ref=${encodeURIComponent(request.issue.startingRevision)}`,
            "GET",
            undefined,
            true,
          )
        ).data as { content: string } | undefined;
        const baseline = (await api(`${filePath}?ref=main`, "GET", undefined, true)).data as
          | { content: string }
          | undefined;
        const decoded = (file?: { content: string }) =>
          file ? Buffer.from(file.content, "base64").toString() : undefined;
        if (decoded(original) !== decoded(baseline))
          throw new Error("Triage documentation base changed; reconcile before publication");
        let previousSha: string | undefined;
        await effect(
          `document:${document.path}`,
          async () => {
            const existing = (
              await api(`${filePath}?ref=${encodeURIComponent(branch)}`, "GET", undefined, true)
            ).data as { content: string; sha: string } | undefined;
            if (decoded(existing) === document.content) return existing;
            if (decoded(existing) !== decoded(baseline))
              throw new Error("Triage documentation branch changed");
            previousSha = existing?.sha;
            return undefined;
          },
          async () =>
            (
              await api(filePath, "PUT", {
                message: `docs: record triage decisions for #${request.issue.number}`,
                branch,
                content: Buffer.from(document.content).toString("base64"),
                ...(previousSha ? { sha: previousSha } : {}),
              })
            ).data,
        );
      }
      const comparison = (await api(`${repo}/compare/main...${branch}?per_page=100`)).data as {
        status: string;
        total_commits: number;
        files: { filename: string; status: string }[];
      };
      const documents = triageDocuments(request.proposal);
      if (
        comparison.status !== "ahead" ||
        comparison.total_commits > documents.length ||
        !Array.isArray(comparison.files) ||
        comparison.files.length !== documents.length ||
        comparison.files.some(
          (file) =>
            !documents.some((document) => document.path === file.filename) ||
            !["added", "modified"].includes(file.status),
        )
      )
        throw new Error("Triage documentation diff contains unrelated or missing changes");
      const prBody = `${TRIAGE_DISCLAIMER}\n\nRecord the approved triage documents for #${request.issue.number}.\n\n${marker(request.operationId)}`;
      const pr = await effect(
        "knowledge-pr",
        async () => {
          const prs = await pages<{
            body: string;
            html_url: string;
            user: { id: number };
            base: { ref: string };
          }>(
            `${repo}/pulls?state=all&head=${encodeURIComponent(`${options.repository.split("/")[0]}:${branch}`)}&per_page=100`,
          );
          if (
            prs.length > 1 ||
            prs.some(
              (item) =>
                item.body !== prBody || item.user.id !== actor.id || item.base.ref !== "main",
            )
          )
            throw new Error("Ambiguous rejection knowledge PR");
          return prs[0];
        },
        async () =>
          (
            await api(`${repo}/pulls`, "POST", {
              title: `docs: record triage decisions #${request.issue.number}`,
              body: prBody,
              head: branch,
              base: "main",
              draft: true,
            })
          ).data as { html_url: string },
      );
      knowledgeRef = pr.html_url;
    }
    const commentBody = `${request.proposal.comment}${knowledgeRef ? `\n\nTriage documents: ${knowledgeRef}` : ""}\n\n${marker(request.operationId)}`;
    const comment = await effect(
      "comment",
      async () => {
        if (ownedComments[0] && ownedComments[0].body !== commentBody)
          throw new Error("Published triage comment changed");
        return ownedComments[0];
      },
      async () => (await api(`${path}/comments`, "POST", { body: commentBody })).data as Comment,
    );
    // Preserve unrelated labels from the latest issue; category/state roles alone are replaced.
    state = (await checked()).state;
    const labels = state.native.labels
      .map((label) => label.name)
      .filter(
        (label) =>
          !(TRIAGE_STATES as readonly string[]).includes(label) &&
          !["bug", "enhancement"].includes(label),
      );
    labels.push(request.proposal.category, request.proposal.state);
    await effect(
      "labels",
      async () =>
        hash([...state.native.labels.map((label) => label.name)].sort()) ===
        hash([...labels].sort())
          ? true
          : undefined,
      async () => {
        await api(path, "PATCH", { labels });
        return true;
      },
    );
    if (request.proposal.state === "wontfix")
      await effect(
        "close",
        async () =>
          state.native.state === "closed" && state.native.state_reason === "not_planned"
            ? true
            : undefined,
        async () => {
          await api(path, "PATCH", { state: "closed", state_reason: "not_planned" });
          return true;
        },
      );
    const receipt: TriageReceipt = {
      commentRef: comment.html_url,
      ...(knowledgeRef ? { knowledgeRef } : {}),
      ...(request.proposal.state === "ready-for-agent"
        ? {
            approvedBrief: {
              issueId: request.issue.issueId,
              contentRevision: context.contentRevision,
              ref: comment.html_url,
              content: request.proposal.comment,
            },
          }
        : {}),
    };
    intent.receipt = receipt;
    save(intent);
    return receipt;
  }
  const adapter = {
    configureActionGuard(guard: (runId: string) => void) {
      actionGuard = guard;
    },
    close() {
      db.close();
    },
    pending() {
      return db
        .prepare("SELECT data FROM triage_actions")
        .all()
        .map((row) => JSON.parse(row.data as string) as Intent)
        .filter((intent) => !intent.receipt)
        .map((intent) => ({
          operationId: intent.request.operationId,
          attempted: intent.attempted,
        }));
    },
    async retryUncertain(request: TriageRequest, step: string) {
      if (active.has(request.operationId)) throw new Error("Triage action is still active");
      const row = db.prepare("SELECT data FROM triage_actions WHERE id=?").get(request.operationId);
      if (!row) throw new Error("Unknown triage action");
      const intent: Intent = JSON.parse(row.data as string);
      if (
        JSON.stringify(intent.request) !== JSON.stringify(request) ||
        intent.receipt ||
        !intent.attempted.includes(step)
      )
        throw new Error("Triage retry does not match an unresolved action");
      // Explicit operator choice only: the caller must surface possible duplicate creates.
      intent.attempted = intent.attempted.filter((item) => item !== step);
      save(intent);
      return adapter.apply(request);
    },
    async current(issue: IssueSnapshot) {
      const context = issue.triageContext;
      if (!context) return false;
      const state = await read(issue);
      const current = (await discovery.read()).issues.find(
        (item) => item.issueId === issue.issueId,
      );
      return Boolean(
        current &&
          current.revision === issue.revision &&
          state.contentRevision === context.contentRevision &&
          hash(capturedComments(state.comments)) === hash(context.comments),
      );
    },
    async prepare(issue: IssueSnapshot) {
      const initial = (await discovery.read()).issues.find(
        (item) => item.issueId === issue.issueId,
      );
      if (!initial || initial.revision !== issue.revision)
        throw new Error("Triage issue changed before context capture");
      const state = await read(issue);
      if (
        state.contentRevision !== initial.contentRevision ||
        (state.native.updated_at !== initial.updatedAt && initial.updatedAt)
      )
        throw new Error("Triage issue changed while capturing comments");
      return {
        ...issue,
        sourceContent: { ...issue.sourceContent, body: state.native.body ?? "" },
        triageContext: {
          title: state.native.title,
          author: state.native.user.login,
          createdAt: state.native.created_at,
          updatedAt: state.native.updated_at,
          contentRevision: state.contentRevision,
          childIds: initial.childIds,
          comments: capturedComments(state.comments),
        },
      };
    },
    apply(request: TriageRequest) {
      let promise = active.get(request.operationId);
      if (!promise) {
        promise = applyOnce(request).finally(() => active.delete(request.operationId));
        active.set(request.operationId, promise);
      }
      return promise;
    },
    async reconcile(request: TriageRequest) {
      const row = db.prepare("SELECT data FROM triage_actions WHERE id=?").get(request.operationId);
      // Reconciliation may finish outstanding authorized steps, but only for an existing intent.
      return row ? adapter.apply(request) : undefined;
    },
    async approvedBriefs(): Promise<ApprovedBrief[]> {
      const briefs: ApprovedBrief[] = [];
      for (const row of db.prepare("SELECT data FROM triage_actions").all()) {
        const intent: Intent = JSON.parse(row.data as string);
        const brief = intent.receipt?.approvedBrief;
        if (!brief) continue;
        const state = await read(intent.request.issue);
        const expected = `${intent.request.proposal.comment}\n\n${marker(intent.request.operationId)}`;
        if (
          state.contentRevision === brief.contentRevision &&
          state.comments.some(
            (comment) => comment.html_url === brief.ref && comment.body === expected,
          )
        )
          briefs.push(brief);
      }
      return briefs;
    },
  };
  return adapter;
}
