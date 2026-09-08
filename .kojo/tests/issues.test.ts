import { ExecResult } from "@carere/kojo-runtime/contexts/sandbox/models/ExecResult";
import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Issue } from "../envelopes.ts";
import { discover, eligible, pendingReasons } from "../lib/issues.ts";
import { workspaceWith } from "./workspace.ts";

const issue = (changes: Partial<Issue> = {}): Issue => ({
  number: 1,
  url: "https://github.com/carere/zaidan/issues/1",
  state: "open",
  title: "Issue",
  body: "Spec",
  labels: ["ready-for-agent", "kojo"],
  blockers: [],
  children: [],
  ...changes,
});

describe("issue eligibility", () => {
  it("accepts a solo issue and requires both labels", () => {
    expect(eligible(issue())).toBe(true);
    expect(eligible(issue({ labels: ["ready-for-agent"] }))).toBe(false);
    expect(eligible(issue({ state: "closed" }))).toBe(false);
  });
  it("waits on open blockers and children, then admits a parent for verification", () => {
    const child = { number: 2, state: "open", url: "https://github.com/carere/zaidan/issues/2" };
    expect(eligible(issue({ blockers: [child] }))).toBe(false);
    expect(eligible(issue({ children: [child] }))).toBe(false);
    expect(eligible(issue({ children: [{ ...child, state: "closed" }] }))).toBe(true);
    expect(pendingReasons(issue({ blockers: [child] }))).toContain(`blocked by ${child.url}`);
  });
  it("traverses a cyclic graph once and keeps its members blocked", async () => {
    const requests: string[] = [];
    const raw = (n: number) => ({
      number: n,
      html_url: `https://github.com/carere/zaidan/issues/${n}`,
      state: "open",
      title: `Issue ${n}`,
      body: "Spec",
      labels: [{ name: "kojo" }, { name: "ready-for-agent" }],
    });
    const workspace = workspaceWith((argv) => {
      const path = argv[2] ?? "";
      requests.push(path);
      const n = Number(path.match(/issues\/(\d+)/)?.[1]);
      const data = path.includes("blocked_by")
        ? [[raw(n === 1 ? 2 : 1)]]
        : path.includes("sub_issues")
          ? [[]]
          : raw(n);
      return Effect.succeed(
        new ExecResult({ argv: [], stdout: JSON.stringify(data), stderr: "", exitCode: 0 }),
      );
    });
    const found = await Effect.runPromise(
      discover("carere/zaidan", [1]).pipe(Effect.provideService(Workspace, workspace)),
    );
    expect(found.map((i) => i.number)).toEqual([1, 2]);
    expect(found.every((i) => !eligible(i))).toBe(true);
    expect(requests).toHaveLength(6);
  });
  it("fails discovery when dependency metadata is unavailable", async () => {
    const workspace = workspaceWith(() =>
      Effect.succeed(
        new ExecResult({ argv: [], stdout: "", stderr: "API unavailable", exitCode: 503 }),
      ),
    );
    await expect(
      Effect.runPromise(
        discover("carere/zaidan", [1]).pipe(Effect.provideService(Workspace, workspace)),
      ),
    ).rejects.toThrow("API unavailable");
  });
});
