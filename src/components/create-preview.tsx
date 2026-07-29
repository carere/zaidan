import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { RootComponents } from "@/components/home";
import {
  canApplyPresetSync,
  createPresetAppliedMessage,
  createPreviewReadyMessage,
  createPreviewShortcutMessage,
  isEditableShortcutTarget,
  type PresetSyncMessage,
  parsePreviewMessage,
  resolveCreateShortcut,
} from "@/lib/preset-protocol";
import { projectPresetTheme } from "@/lib/preset-theme";
import { DEFAULT_PRESET_TOKEN, decodePresetToken, encodePresetToken } from "@/lib/preset-token";
import type { DesignSystemConfig } from "@/lib/types";

const STYLE_ELEMENT_ID = "create-preview-preset-vars";

export function applyPreviewConfiguration(config: DesignSystemConfig, mode?: "light" | "dark") {
  const projection = projectPresetTheme(config);
  if (!projection) return false;

  for (const className of [...document.body.classList]) {
    if (className.startsWith("style-")) document.body.classList.remove(className);
  }
  document.body.classList.add(`style-${projection.style}`);
  if (mode) {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
  }

  let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    document.head.appendChild(style);
  }
  const rules = (selector: string, variables: Record<string, string>) =>
    `${selector}{${Object.entries(variables)
      .map(([key, value]) => `--${key}:${value}`)
      .join(";")}}`;
  style.textContent = `${rules(":root", projection.cssVars.light)}${rules(".dark", projection.cssVars.dark)}`;
  return true;
}

export function CreatePreviewSurface(props: { preset?: string }) {
  const initial = props.preset
    ? decodePresetToken(props.preset)
    : decodePresetToken(DEFAULT_PRESET_TOKEN);
  const [configuration, setConfiguration] = createSignal(initial as DesignSystemConfig);
  let lastApplied: PresetSyncMessage | undefined;

  createEffect(() => {
    if (typeof document !== "undefined") applyPreviewConfiguration(configuration());
  });

  onMount(() => {
    const parentOrigin = window.location.origin;
    const postReady = () => window.parent.postMessage(createPreviewReadyMessage(), parentOrigin);
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return;
      const message = parsePreviewMessage(event.data);
      if (!message || message.type !== "preset-sync" || !canApplyPresetSync(message, lastApplied)) {
        return;
      }
      const next = message.token
        ? decodePresetToken(message.token)
        : decodePresetToken(DEFAULT_PRESET_TOKEN);
      if (!next || !applyPreviewConfiguration(next, message.colorMode)) return;
      lastApplied = message;
      setConfiguration(next);
      window.parent.postMessage(
        createPresetAppliedMessage(message.revision, message.token),
        parentOrigin,
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return;
      const action = resolveCreateShortcut(event);
      if (!action) return;
      event.preventDefault();
      window.parent.postMessage(createPreviewShortcutMessage(action), parentOrigin);
    };
    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKeyDown);
    Promise.resolve(document.fonts?.ready).then(postReady);
    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleKeyDown);
      document.getElementById(STYLE_ELEMENT_ID)?.remove();
    });
  });

  return (
    <main
      data-preview-kind="create"
      data-preset={encodePresetToken(configuration())}
      class="min-h-svh p-6 md:p-10"
      tabIndex={-1}
    >
      <RootComponents />
    </main>
  );
}
