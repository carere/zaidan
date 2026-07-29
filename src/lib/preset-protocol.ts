import { decodePresetToken } from "@/lib/preset-token";
import type { ColorMode } from "@/registry/kobalte/components/color-mode";

export const CREATE_PREVIEW_CHANNEL = "zaidan-create-preview";
export const CREATE_PREVIEW_PROTOCOL_VERSION = 1;
export const CREATE_PREVIEW_TOKEN_VERSION = 1;

export type PreviewReadyMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  tokenVersion: typeof CREATE_PREVIEW_TOKEN_VERSION;
  type: "preview-ready";
};

export type PresetSyncMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  tokenVersion: typeof CREATE_PREVIEW_TOKEN_VERSION;
  type: "preset-sync";
  revision: number;
  token: string | null;
  colorMode: ColorMode;
};

export type PresetAppliedMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  tokenVersion: typeof CREATE_PREVIEW_TOKEN_VERSION;
  type: "preset-applied";
  revision: number;
  token: string | null;
};

export type CreateShortcut = "command-search" | "toggle-color-mode" | "shuffle" | "undo" | "redo";

export type PreviewShortcutMessage = {
  channel: typeof CREATE_PREVIEW_CHANNEL;
  protocolVersion: typeof CREATE_PREVIEW_PROTOCOL_VERSION;
  tokenVersion: typeof CREATE_PREVIEW_TOKEN_VERSION;
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
const hasExactFields = (value: Record<string, unknown>, fields: readonly string[]) => {
  const keys = Object.keys(value);
  return keys.length === fields.length && keys.every((key) => fields.includes(key));
};

const ENVELOPE_FIELDS = ["channel", "protocolVersion", "tokenVersion", "type"] as const;

export function parsePreviewMessage(input: unknown): CreatePreviewMessage | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (
    value.channel !== CREATE_PREVIEW_CHANNEL ||
    value.protocolVersion !== CREATE_PREVIEW_PROTOCOL_VERSION ||
    value.tokenVersion !== CREATE_PREVIEW_TOKEN_VERSION
  ) {
    return null;
  }
  if (value.type === "preview-ready") {
    return hasExactFields(value, ENVELOPE_FIELDS) ? (value as PreviewReadyMessage) : null;
  }
  if (value.type === "preview-shortcut") {
    return hasExactFields(value, [...ENVELOPE_FIELDS, "action"]) &&
      (value.action === "command-search" ||
        value.action === "toggle-color-mode" ||
        value.action === "shuffle" ||
        value.action === "undo" ||
        value.action === "redo")
      ? (value as PreviewShortcutMessage)
      : null;
  }
  if (value.type === "preset-applied") {
    return hasExactFields(value, [...ENVELOPE_FIELDS, "revision", "token"]) &&
      validRevision(value.revision) &&
      validToken(value.token)
      ? (value as PresetAppliedMessage)
      : null;
  }
  if (value.type === "preset-sync") {
    return hasExactFields(value, [...ENVELOPE_FIELDS, "revision", "token", "colorMode"]) &&
      validRevision(value.revision) &&
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
  tokenVersion: CREATE_PREVIEW_TOKEN_VERSION,
  type: "preset-sync",
  revision,
  token,
  colorMode,
});

export const createPreviewReadyMessage = (): PreviewReadyMessage => ({
  channel: CREATE_PREVIEW_CHANNEL,
  protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
  tokenVersion: CREATE_PREVIEW_TOKEN_VERSION,
  type: "preview-ready",
});

export const createPresetAppliedMessage = (
  revision: number,
  token: string | null,
): PresetAppliedMessage => ({
  channel: CREATE_PREVIEW_CHANNEL,
  protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
  tokenVersion: CREATE_PREVIEW_TOKEN_VERSION,
  type: "preset-applied",
  revision,
  token,
});

/** Prevents a delayed iframe acknowledgement from marking a newer preset as applied. */
export const isCurrentPresetAcknowledgement = (
  acknowledgement: PresetAppliedMessage,
  latest: PresetSyncMessage,
) => acknowledgement.revision === latest.revision && acknowledgement.token === latest.token;

/** Accepts monotonic snapshots while restricting duplicate revisions to idempotent resends. */
export const canApplyPresetSync = (candidate: PresetSyncMessage, applied?: PresetSyncMessage) =>
  !applied ||
  candidate.revision > applied.revision ||
  (candidate.revision === applied.revision &&
    candidate.token === applied.token &&
    candidate.colorMode === applied.colorMode);

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
  if (key === "k" && command && !input.shiftKey) return "command-search";
  if (key === "d" && !command && !input.shiftKey) return "toggle-color-mode";
  if (key === "r" && !command && !input.shiftKey) return "shuffle";
  if (key === "z" && command) return input.shiftKey ? "redo" : "undo";
  return null;
}

export function isEditableShortcutTarget(target: EventTarget | null) {
  return (
    typeof HTMLElement !== "undefined" &&
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

export const createPreviewShortcutMessage = (action: CreateShortcut): PreviewShortcutMessage => ({
  channel: CREATE_PREVIEW_CHANNEL,
  protocolVersion: CREATE_PREVIEW_PROTOCOL_VERSION,
  tokenVersion: CREATE_PREVIEW_TOKEN_VERSION,
  type: "preview-shortcut",
  action,
});
