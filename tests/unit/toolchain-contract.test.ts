import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contributor validation", () => {
  it("keeps package commands as compatibility aliases to Moon", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts).toMatchObject({
      build: "moon run zaidan:build",
      check: "moon run zaidan:check",
      compile: "moon run zaidan:tsc",
      deploy: "moon run zaidan:deploy",
      dev: "moon run zaidan:dev",
      preview: "moon run zaidan:preview",
      "r:build:kobalte": "moon run zaidan:registry-build",
      "r:validate:kobalte": "moon run zaidan:registry-validate",
      test: "moon run zaidan:test",
      "test:browser": "moon run zaidan:browser-test",
      validate: "moon run zaidan:validate",
    });
  });

  it("provides the integration verification target without a third test project", () => {
    const result = spawnSync("bun", ["moon", "project", "zaidan", "--json"], {
      cwd: new URL("../..", import.meta.url),
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);

    const project = JSON.parse(result.stdout) as {
      tasks: Record<
        string,
        {
          command: string;
          deps: Array<{ target: string }>;
          outputs?: Array<{ glob: string }>;
        }
      >;
    };

    expect(project.tasks["integration-test"]).toMatchObject({
      command: "noop",
      deps: [{ target: "zaidan:test" }, { target: "zaidan:browser-test" }],
    });
    expect(project.tasks.build?.outputs).toEqual([{ glob: ".output/**/*" }]);
  });

  it("keeps the retained quality gate aligned with Moon artifacts", () => {
    const workflow = readFileSync(
      new URL("../../.github/workflows/quality-assurance.yml", import.meta.url),
      "utf8",
    );

    expect(workflow).toContain(".moon/cache");
    expect(workflow).toContain(".output");
    expect(workflow).toContain("public/r/kobalte");
    expect(workflow).toContain("'.moon/**'");
    expect(workflow).toContain("'moon.yml'");
    expect(workflow).not.toContain("if: steps.cache.outputs.cache-hit != 'true'");
    expect(workflow).not.toMatch(/^\s+dist$/m);
  });

  it("keeps public branch previews isolated from production traffic", () => {
    const wrangler = JSON.parse(
      readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8"),
    ) as { preview_urls?: boolean; workers_dev?: boolean };

    expect(wrangler).toMatchObject({
      preview_urls: true,
      workers_dev: false,
    });
  });

  it("retains existing GitHub validation and release files during expansion", () => {
    const retainedFiles = [
      ".github/workflows/quality-assurance.yml",
      ".github/workflows/pre-release.yml",
      ".github/workflows/release.yml",
      "knope.toml",
    ];

    for (const file of retainedFiles) {
      expect(existsSync(new URL(`../../${file}`, import.meta.url))).toBe(true);
    }

    const workflow = readFileSync(
      new URL("../../.github/workflows/quality-assurance.yml", import.meta.url),
      "utf8",
    );

    expect(workflow).toMatch(/^\s{2}static-test:/m);
  });
});
