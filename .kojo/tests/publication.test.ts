import { ExecResult } from "@carere/kojo-runtime/contexts/sandbox/models/ExecResult";
import { Workspace } from "@carere/kojo-runtime/contexts/sandbox/ports/Workspace";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { JobResult } from "../envelopes.ts";
import { publish } from "../lib/integration.ts";
import { workspaceWith } from "./workspace.ts";

const result = (number: number): JobResult => ({
  job: {
    key: `issue-${number}`,
    branch: `issue-${number}`,
    base: "base",
    feedback: "",
    issue: {
      number,
      url: `https://github.com/carere/zaidan/issues/${number}`,
      state: "open",
      title: "Literal `title` $(text)",
      body: "Spec",
      labels: ["kojo", "ready-for-agent"],
      blockers: [],
      children: [],
    },
  },
  passed: true,
  sha: "verified",
  summary: "Reviewed and tested",
  findings: [],
});

describe("one cumulative PR", () => {
  it("creates once, then updates by branch without evaluating issue text as shell code", async () => {
    let created = false;
    const writes: string[][] = [];
    const pr = {
      number: 77,
      html_url: "https://github.com/carere/zaidan/pull/77",
      state: "open",
      merged_at: null,
    };
    const workspace = workspaceWith((argv) => {
      let answer: unknown = "";
      if (argv[0] === "gh") {
        if (argv.includes("--method")) {
          writes.push([...argv]);
          created = true;
          answer = pr;
        } else answer = created ? [pr] : [];
      }
      return Effect.succeed(
        new ExecResult({ argv, stdout: JSON.stringify(answer), stderr: "", exitCode: 0 }),
      );
    });
    const send = (completed: JobResult[]) =>
      Effect.runPromise(
        publish("carere/zaidan", "shared", "main", completed).pipe(
          Effect.provideService(Workspace, workspace),
        ),
      );
    expect(await send([result(1)])).toBe(pr.html_url);
    expect(await send([result(1), result(2)])).toBe(pr.html_url);
    expect(writes.map((args) => args[args.indexOf("--method") + 1])).toEqual(["POST", "PATCH"]);
    expect(writes[0]).toContain("title=Implement #1: Literal `title` $(text)");
    expect(writes[1]?.[2]).toBe("repos/carere/zaidan/pulls/77");
  });
  it("refuses to create another PR if the run's existing PR has been closed", async () => {
    const workspace = workspaceWith((argv) =>
      Effect.succeed(
        new ExecResult({
          argv,
          stdout: JSON.stringify(
            argv[0] === "gh"
              ? [{ number: 77, html_url: "url", state: "closed", merged_at: null }]
              : "",
          ),
          stderr: "",
          exitCode: 0,
        }),
      ),
    );
    await expect(
      Effect.runPromise(
        publish("carere/zaidan", "shared", "main", [result(1)]).pipe(
          Effect.provideService(Workspace, workspace),
        ),
      ),
    ).rejects.toThrow("second PR");
  });
});
