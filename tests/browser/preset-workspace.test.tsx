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
  it("keeps Undo/Redo coherent across Back/Forward interleavings and syncs Preview", async () => {
    await renderCreate();
    const { exerciseCreateHistory } = commands as unknown as {
      exerciseCreateHistory: () => Promise<{
        defaultPath: string;
        selectedPath: string;
        undoPath: string;
        redoPath: string;
        backPath: string;
        forwardPath: string;
        undoDisabledAfterBack: boolean;
        undoDisabledAfterForward: boolean;
        interleavedSelectedPath: string;
        interleavedUndoPath: string;
        interleavedRedoPath: string;
        historyDelta: number;
        previewPreset: string;
      }>;
    };
    const evidence = await exerciseCreateHistory();
    const novaToken = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });
    const novaZincToken = encodePresetToken({
      ...DEFAULT_CONFIG,
      style: "nova",
      baseColor: "zinc",
    });

    expect(evidence).toEqual({
      defaultPath: "/create",
      selectedPath: `/create?preset=${novaToken}`,
      undoPath: "/create",
      redoPath: `/create?preset=${novaToken}`,
      backPath: "/create",
      forwardPath: `/create?preset=${novaToken}`,
      undoDisabledAfterBack: true,
      undoDisabledAfterForward: true,
      interleavedSelectedPath: `/create?preset=${novaZincToken}`,
      interleavedUndoPath: `/create?preset=${novaToken}`,
      interleavedRedoPath: `/create?preset=${novaZincToken}`,
      historyDelta: 1,
      previewPreset: novaZincToken,
    });
  }, 30_000);

  it("covers invalid/valid Open, locked Shuffle, Reset history, and state-free Get Code", async () => {
    await renderCreate();
    const { inspectCreateActions } = commands as unknown as {
      inspectCreateActions: () => Promise<{
        invalidError: string;
        command: string;
        openFocusTrapped: boolean;
        openFocusRestored: boolean;
        keyboardSelectedManager: string | null;
        keyboardSelectedCommand: string;
        getCodeFocusRestored: boolean;
        pathBefore: string;
        pathAfter: string;
        validOpenPath: string;
        shuffledPath: string;
        shuffledToken: string;
        lockedStyle: string;
        resetPath: string;
        lockCleared: boolean;
        undoResetPath: string;
      }>;
    };
    const evidence = await inspectCreateActions();

    expect(evidence.invalidError).toContain("valid v1 Preset Token");
    expect(evidence.command).toBe("bunx --bun shadcn@latest add @zaidan/preset-v1-0");
    expect(evidence.openFocusTrapped).toBe(true);
    expect(evidence.openFocusRestored).toBe(true);
    expect(evidence.keyboardSelectedManager).toBe("true");
    expect(evidence.keyboardSelectedCommand).toBe("yarn dlx shadcn@latest add @zaidan/preset-v1-0");
    expect(evidence.getCodeFocusRestored).toBe(true);
    expect(evidence.pathAfter).toBe(evidence.pathBefore);
    expect(evidence.validOpenPath).toBe("/create?preset=v1-gWzAn");
    expect(evidence.shuffledToken).toMatch(/^v1-[0-9A-Za-z]{1,6}$/);
    expect(evidence.shuffledToken).not.toBe("v1-gWzAn");
    expect(evidence.shuffledPath).toBe(`/create?preset=${evidence.shuffledToken}`);
    expect(evidence.lockedStyle).toBe("nova");
    expect(evidence.resetPath).toBe("/create");
    expect(evidence.lockCleared).toBe(true);
    expect(evidence.undoResetPath).toBe(evidence.shuffledPath);
  }, 30_000);

  it("forwards global and editor shortcuts from Preview while excluding editable controls", async () => {
    await renderCreate();
    const { exerciseCreatePreviewShortcuts } = commands as unknown as {
      exerciseCreatePreviewShortcuts: () => Promise<{
        commandSearchForwarded: boolean;
        initialDarkMode: boolean;
        toggledDarkMode: boolean;
        previewDarkMode: boolean;
        tokenBeforeEditableShortcut: string;
        editableShortcutToken: string;
        shuffledToken: string;
        undoToken: string;
        redoToken: string;
      }>;
    };
    const evidence = await exerciseCreatePreviewShortcuts();

    expect(evidence.commandSearchForwarded).toBe(true);
    expect(evidence.toggledDarkMode).toBe(!evidence.initialDarkMode);
    expect(evidence.previewDarkMode).toBe(evidence.toggledDarkMode);
    expect(evidence.editableShortcutToken).toBe(evidence.tokenBeforeEditableShortcut);
    expect(evidence.shuffledToken).not.toBe("v1-0");
    expect(evidence.undoToken).toBe("v1-0");
    expect(evidence.redoToken).toBe(evidence.shuffledToken);
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
