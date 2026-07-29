import { decodePresetToken } from "@/lib/preset-token";
import type { ColorMode } from "@/registry/kobalte/components/color-mode";

export const CREATE_PREVIEW_CHANNEL = "zaidan-create-preview";
export const CREATE_PREVIEW_PROTOCOL_VERSION = 1;

export type PreviewReadyMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  type: "preview-ready";
};

export type PresetSyncMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  type: "preset-sync";
  revision: number;
  token: string | null;
  colorMode: ColorMode;
};

export type PresetAppliedMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  type: "preset-applied";
  revision: number;
  token: string | null;
};

export type CreateShortcut = "shuffle" | "undo" | "redo";

export type PreviewShortcutMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  type: "preview-shortcut";
  action: CreateShortcut;
};

export type CreatePreviewMessage =
  | PreviewReadyMessage
  | PresetSyncMessage
  | PresetAppliedMessage
  | PreviewShortcutMessage;

const validToken = (value: unknown) =>
  value === null || (typeof value === "string" && decodePresetToken(value) !== null);
const validRevision = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function parsePreviewMessage(input: unknown): CreatePreviewMessage | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (
    value.channel !== CREATE_PREVIEW_CHANNEL ||
    value.protocolVersion !== CREATE_PREVIEW_PROTOCOL_VERSION
  ) {
    return null;
  }
  if (value.type === "preview-ready") return value as PreviewReadyMessage;
  if (value.type === "preview-shortcut") {
    return value.action === "shuffle" || value.action === "undo" || value.action === "redo"
      ? (value as PreviewShortcutMessage)
      : null;
  }
  if (value.type === "preset-applied") {
    return validRevision(value.revision) && validToken(value.token)
      ? (value as PresetAppliedMessage)
      : null;
  }
  if (value.type === "preset-sync") {
    return validRevision(value.revision) &&
      validToken(value.token) &&
      (value.colorMode === "light" || value.colorMode === "dark")
      ? (value as PresetSyncMessage)
      : null;
  }
  return null;
}

export const createPresetSyncMessage = (
  revision: number,
  token: string | null,
  colorMode: ColorMode,
): PresetSyncMessage => ({
  channel: CREATE_PREVIEW_CHANNEL,
  protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
  type: "preset-sync",
  revision,
  token,
  colorMode,
});

/** Prevents a delayed iframe acknowledgement from marking a newer preset as applied. */
export const isCurrentPresetAcknowledgement = (
  acknowledgement: PresetAppliedMessage,
  latest: PresetSyncMessage,
) => acknowledgement.revision === latest.revision && acknowledgement.token === latest.token;

export function resolveCreateShortcut(input: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
}): CreateShortcut | null {
  if (input.repeat || input.altKey) return null;
  const key = input.key.toLowerCase();
  const command = Boolean(input.ctrlKey || input.metaKey);
  if (key === "r" && !command && !input.shiftKey) return "shuffle";
  if (key === "z" && command) return input.shiftKey ? "redo" : "undo";
  return null;
}

export const createPreviewShortcutMessage = (action: CreateShortcut): PreviewShortcutMessage => ({
  channel: CREATE_PREVIEW_CHANNEL,
  protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
  type: "preview-shortcut",
  action,
});
