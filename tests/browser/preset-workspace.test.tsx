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

const renderCreate = async (path = "/create", width = 1440, height = 900) => {
  dispose = render(
    () => (
      <iframe
        src={new URL(path, inject("builtAppUrl")).href}
        title="Built Create workspace"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    ),
    document.body,
  );
  await expect.element(page.getByTitle("Built Create workspace")).toBeVisible();
};

describe("built Create Workspace Preset Token behavior", () => {
  it("renders the approved desktop rail/canvas and mobile Preview-first flow", async () => {
    const { inspectCreateLayout } = commands as unknown as {
      inspectCreateLayout: () => Promise<{
        headerVisible: boolean;
        previewBeforeControls: boolean;
        controlsHorizontal: boolean;
        controlsPosition: string;
        configurablePickers: string[];
        fixedPickers: { label: string; disabled: boolean; value: string }[];
        controlGroups: string[];
        previewSrc: string | null;
        comingSoonVisible: boolean;
      }>;
    };

    await renderCreate("/create?preset=v1-gWzAn", 1440, 900);
    const desktop = await inspectCreateLayout();
    expect(desktop.headerVisible).toBe(true);
    expect(desktop.previewBeforeControls).toBe(false);
    expect(desktop.controlsHorizontal).toBe(false);
    expect(desktop.controlGroups).toEqual([
      "Fixed foundation",
      "Style",
      "Colors",
      "Typography",
      "Shape and navigation",
    ]);
    expect(desktop.configurablePickers).toEqual([
      "Style",
      "Base Color",
      "Theme",
      "Chart Color",
      "Heading Font",
      "Font",
      "Radius",
      "Menu Accent",
    ]);
    expect(desktop.fixedPickers).toEqual([
      { label: "Primitive", disabled: true, value: "Kobalte" },
      { label: "Icon Library", disabled: true, value: "Lucide" },
      { label: "Menu Color", disabled: true, value: "Default" },
    ]);
    expect(desktop.previewSrc).toContain("/preview/create?preset=v1-gWzAn");
    expect(desktop.comingSoonVisible).toBe(false);

    dispose?.();
    dispose = undefined;
    await renderCreate("/create", 390, 844);
    const mobile = await inspectCreateLayout();
    expect(mobile.headerVisible).toBe(true);
    expect(mobile.previewBeforeControls).toBe(true);
    expect(mobile.controlsHorizontal).toBe(true);
    expect(mobile.controlsPosition).toBe("static");
    expect(mobile.previewSrc).toBe("/preview/create");
  });

  it("commits every approved picker through canonical history and Preview state", async () => {
    await renderCreate();
    const { exerciseAllCreatePickers } = commands as unknown as {
      exerciseAllCreatePickers: () => Promise<{
        historyDelta: number;
        path: string;
        token: string;
        previewToken: string;
      }>;
    };
    const evidence = await exerciseAllCreatePickers();
    expect(evidence).toEqual({
      historyDelta: 8,
      path: "/create?preset=v1-gWzAn",
      token: "v1-gWzAn",
      previewToken: "v1-gWzAn",
    });
  }, 30_000);

  it("exposes canonical Preset, Share, and Get Code output without changing history", async () => {
    await renderCreate("/create?preset=v1-gWzAn");
    const { inspectCreateCopyActions } = commands as unknown as {
      inspectCreateCopyActions: () => Promise<{
        copied: string[];
        command: string;
        historyDelta: number;
        pathBefore: string;
        pathAfter: string;
      }>;
    };
    const evidence = await inspectCreateCopyActions();
    expect(evidence.copied).toEqual([
      "--preset v1-gWzAn",
      expect.stringMatching(/\/create\?preset=v1-gWzAn$/),
    ]);
    expect(evidence.command).toBe("bunx --bun shadcn@latest add @zaidan/preset-v1-gWzAn");
    expect(evidence.historyDelta).toBe(0);
    expect(evidence.pathAfter).toBe(evidence.pathBefore);
  });

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
        tokenAfterColorMode: string;
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
    expect(evidence.tokenAfterColorMode).toBe("v1-0");
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

  it("rejects forged messages, ignores stale acknowledgements, and recovers latest state", async () => {
    await renderCreate();
    const { exerciseCreatePreviewRecovery } = commands as unknown as {
      exerciseCreatePreviewRecovery: () => Promise<{
        tokenAfterForgery: string;
        appliedAfterStale: number;
        sentAfterStale: number;
        degraded: boolean;
        recoveredToken: string;
        recoveredPath: string;
        previewSrcBefore: string | null;
        previewSrcAfter: string | null;
        syncKeys: string[];
        readyKeys: string[];
        appliedKeys: string[];
      }>;
    };
    const evidence = await exerciseCreatePreviewRecovery();
    expect(evidence.tokenAfterForgery).toBe("v1-0");
    expect(evidence.appliedAfterStale).toBeLessThan(evidence.sentAfterStale);
    expect(evidence.degraded).toBe(true);
    expect(evidence.recoveredToken).toBe("v1-fVpmi");
    expect(evidence.recoveredPath).toBe("/create?preset=v1-fVpmi");
    expect(evidence.previewSrcAfter).toBe(evidence.previewSrcBefore);
    expect(evidence.syncKeys).toEqual([
      "channel",
      "colorMode",
      "protocolVersion",
      "revision",
      "token",
      "tokenVersion",
      "type",
    ]);
    expect(evidence.readyKeys).toEqual(["channel", "protocolVersion", "tokenVersion", "type"]);
    expect(evidence.appliedKeys).toEqual([
      "channel",
      "protocolVersion",
      "revision",
      "token",
      "tokenVersion",
      "type",
    ]);
  }, 30_000);

  it("hands off to Create and returns through exact browser locations without leaking state", async () => {
    await renderCreate("/components/button#examples");
    const { exerciseCreateReturnHandoff } = commands as unknown as {
      exerciseCreateReturnHandoff: () => Promise<{
        entryPath: string;
        configuredPath: string;
        destinationPath: string;
        configuredReturnPath: string;
        defaultReturnPath: string;
        sourceReturnPath: string;
      }>;
    };
    const evidence = await exerciseCreateReturnHandoff();
    expect(evidence).toEqual({
      entryPath: "/create",
      configuredPath: expect.stringMatching(/^\/create\?preset=v1-/),
      destinationPath: "/docs",
      configuredReturnPath: evidence.configuredPath,
      defaultReturnPath: "/create",
      sourceReturnPath: "/components/button#examples",
    });
  }, 30_000);
});
