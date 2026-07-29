import { render } from "solid-js/web";
import { afterEach, describe, expect, inject, it } from "vitest";
import { commands, page } from "vitest/browser";
import { DEFAULT_CONFIG } from "@/lib/config";
import { encodePresetToken } from "@/lib/preset-token";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

const renderCreate = async (path = "/create") => {
  dispose = render(
    () => (
      <iframe
        src={new URL(path, inject("builtAppUrl")).href}
        title="Built Create workspace"
        style={{ width: "1440px", height: "900px" }}
      />
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Built Create workspace")).toBeVisible();
};

describe("built Create Workspace Preset Token behavior", () => {
  it("pushes picker changes, replaces Undo/Redo, restores Back, and syncs Preview", async () => {
    await renderCreate();
    const { exerciseCreateHistory } = commands as unknown as {
      exerciseCreateHistory: () => Promise<{
        defaultPath: string;
        selectedPath: string;
        undoPath: string;
        redoPath: string;
        backPath: string;
        historyDelta: number;
        previewPreset: string;
      }>;
    };
    const evidence = await exerciseCreateHistory();
    const novaToken = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });

    expect(evidence).toEqual({
      defaultPath: "/create",
      selectedPath: `/create?preset=${novaToken}`,
      undoPath: "/create",
      redoPath: `/create?preset=${novaToken}`,
      backPath: "/create",
      historyDelta: 1,
      previewPreset: "v1-0",
    });
  });

  it("keeps invalid Open Preset input visible and Get Code state-free", async () => {
    await renderCreate();
    const { inspectCreateActions } = commands as unknown as {
      inspectCreateActions: () => Promise<{
        invalidError: string;
        command: string;
        pathBefore: string;
        pathAfter: string;
      }>;
    };
    const evidence = await inspectCreateActions();

    expect(evidence.invalidError).toContain("valid v1 Preset Token");
    expect(evidence.command).toBe("bunx --bun shadcn@latest add @zaidan/preset-v1-0");
    expect(evidence.pathAfter).toBe(evidence.pathBefore);
  });

  it("replaces invalid URLs and migrates recognized legacy fields", async () => {
    const novaToken = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });
    const base = inject("builtAppUrl");
    const { inspectCreateCanonicalization } = commands as unknown as {
      inspectCreateCanonicalization: (urls: string[]) => Promise<string[]>;
    };
    const paths = await inspectCreateCanonicalization([
      new URL("/create?preset=v2-0&style=nova", base).href,
      new URL("/create?primitive=base&style=nova&unknown=1", base).href,
    ]);
    expect(paths).toEqual(["/create", `/create?preset=${novaToken}`]);
  });
});
