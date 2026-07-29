import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/lib/config";
import {
  CREATE_PREVIEW_CHANNEL,
  CREATE_PREVIEW_PROTOCOL_VERSION,
  createPresetSyncMessage,
  createPreviewShortcutMessage,
  isCurrentPresetAcknowledgement,
  parsePreviewMessage,
  resolveCreateShortcut,
} from "@/lib/preset-protocol";
import { encodePresetToken } from "@/lib/preset-token";

describe("Create Preview message protocol", () => {
  const token = encodePresetToken({ ...DEFAULT_CONFIG, style: "nova" });

  it("validates ready, sync, and applied messages including revisions and payload", () => {
    expect(
      parsePreviewMessage({
        channel: CREATE_PREVIEW_CHANNEL,
        protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
        type: "preview-ready",
      }),
    ).toMatchObject({ type: "preview-ready" });
    expect(parsePreviewMessage(createPresetSyncMessage(3, token, "dark"))).toMatchObject({
      type: "preset-sync",
      revision: 3,
      token,
      colorMode: "dark",
    });
    expect(
      parsePreviewMessage({
        channel: CREATE_PREVIEW_CHANNEL,
        protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
        type: "preset-applied",
        revision: 3,
        token,
      }),
    ).toMatchObject({ type: "preset-applied", revision: 3 });
    expect(parsePreviewMessage(createPreviewShortcutMessage("shuffle"))).toMatchObject({
      type: "preview-shortcut",
      action: "shuffle",
    });
    expect(parsePreviewMessage(createPreviewShortcutMessage("command-search"))).toMatchObject({
      type: "preview-shortcut",
      action: "command-search",
    });
    expect(parsePreviewMessage(createPreviewShortcutMessage("toggle-color-mode"))).toMatchObject({
      type: "preview-shortcut",
      action: "toggle-color-mode",
    });
  });

  it.each([
    null,
    {},
    { channel: "wrong", protocolVersion: 1, type: "preview-ready" },
    { channel: CREATE_PREVIEW_CHANNEL, protocolVersion: 2, type: "preview-ready" },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: -1,
      token: null,
      colorMode: "light",
    },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: 1,
      token: "v2-0",
      colorMode: "light",
    },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preset-sync",
      revision: 1,
      token: null,
      colorMode: "system",
    },
    {
      channel: CREATE_PREVIEW_CHANNEL,
      protocolVersion: 1,
      type: "preview-shortcut",
      action: "reset",
    },
  ])("rejects malformed message payloads %#", (message) => {
    expect(parsePreviewMessage(message)).toBeNull();
  });

  it("re-sends the latest snapshot after readiness and ignores stale acknowledgements", () => {
    const latest = createPresetSyncMessage(4, token, "dark");
    expect(
      isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied", revision: 3 }, latest),
    ).toBe(false);
    expect(
      isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied", token: null }, latest),
    ).toBe(false);
    expect(isCurrentPresetAcknowledgement({ ...latest, type: "preset-applied" }, latest)).toBe(
      true,
    );
  });

  it("maps Preview and parent keyboard events to the preserved Create shortcuts", () => {
    expect(resolveCreateShortcut({ key: "k", metaKey: true })).toBe("command-search");
    expect(resolveCreateShortcut({ key: "K", ctrlKey: true })).toBe("command-search");
    expect(resolveCreateShortcut({ key: "k", metaKey: true, shiftKey: true })).toBeNull();
    expect(resolveCreateShortcut({ key: "d" })).toBe("toggle-color-mode");
    expect(resolveCreateShortcut({ key: "D", ctrlKey: true })).toBeNull();
    expect(resolveCreateShortcut({ key: "r" })).toBe("shuffle");
    expect(resolveCreateShortcut({ key: "R", shiftKey: true })).toBeNull();
    expect(resolveCreateShortcut({ key: "z", metaKey: true })).toBe("undo");
    expect(resolveCreateShortcut({ key: "z", ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(resolveCreateShortcut({ key: "r", repeat: true })).toBeNull();
    expect(resolveCreateShortcut({ key: "r", altKey: true })).toBeNull();
  });
});
