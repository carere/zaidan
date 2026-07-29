import { useNavigate } from "@tanstack/solid-router";
import {
  Check,
  Clipboard,
  Code2,
  Lock,
  LockOpen,
  RotateCcw,
  RotateCw,
  Share2,
  Shuffle,
} from "lucide-solid";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { BASE_COLORS, FONTS, MENU_ACCENTS, RADII, STYLES, THEMES } from "@/lib/config";
import {
  type CreateShortcut,
  createPresetSyncMessage,
  isCurrentPresetAcknowledgement,
  isEditableShortcutTarget,
  parsePreviewMessage,
  resolveCreateShortcut,
} from "@/lib/preset-protocol";
import {
  type CreateLocationResolution,
  copyPresetArgument,
  DEFAULT_PRESET_TOKEN,
  decodePresetToken,
  encodePresetToken,
  getPresetInstallCommand,
  normalizeOpenPresetInput,
  type PackageManager,
  PRESET_TABLES_V1,
  previewPathForPreset,
  resolveCreateLocation,
  sharePathForPreset,
  shufflePreset,
} from "@/lib/preset-token";
import type { DesignSystemConfig, LockableParam } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

const FIELD_OPTIONS = {
  style: STYLES.map(({ name, label }) => ({ value: name, label })),
  baseColor: BASE_COLORS.map(({ name, label }) => ({ value: name, label })),
  theme: [...BASE_COLORS, ...THEMES].map(({ name, label }) => ({ value: name, label })),
  chartColor: [...BASE_COLORS, ...THEMES].map(({ name, label }) => ({ value: name, label })),
  headingFont: FONTS.map(({ value, label }) => ({ value, label })),
  font: FONTS.map(({ value, label }) => ({ value, label })),
  radius: RADII.map(({ name, label }) => ({ value: name, label })),
  menuAccent: MENU_ACCENTS.map(({ name, label }) => ({ value: name, label })),
} as const;

const FIELD_LABELS: Record<LockableParam, string> = {
  style: "Style",
  baseColor: "Base Color",
  theme: "Theme",
  chartColor: "Chart Color",
  headingFont: "Heading Font",
  font: "Font",
  radius: "Radius",
  menuAccent: "Menu Accent",
};

const CONFIG_FIELDS = Object.keys(PRESET_TABLES_V1) as LockableParam[];

const writeClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

export function CreateWorkspace(props: { initial: CreateLocationResolution }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const [configuration, setConfiguration] = createSignal(props.initial.config);
  const [locks, setLocks] = createSignal<ReadonlySet<LockableParam>>(new Set<LockableParam>());
  const [openPreset, setOpenPreset] = createSignal(false);
  const [openValue, setOpenValue] = createSignal("");
  const [openError, setOpenError] = createSignal("");
  const [getCode, setGetCode] = createSignal(false);
  const [packageManager, setPackageManager] = createSignal<PackageManager>("bun");
  const [copied, setCopied] = createSignal<string>();
  const [canUndo, setCanUndo] = createSignal(false);
  const [canRedo, setCanRedo] = createSignal(false);
  const [frameStatus, setFrameStatus] = createSignal<"booting" | "ready" | "degraded">("booting");
  const [appliedRevision, setAppliedRevision] = createSignal(0);
  const token = createMemo(() => encodePresetToken(configuration()));
  const initialPreviewPath = previewPathForPreset(props.initial.token);
  const past: DesignSystemConfig[] = [];
  const future: DesignSystemConfig[] = [];
  let iframe: HTMLIFrameElement | undefined;
  let revision = 0;
  let latestMessage = createPresetSyncMessage(
    revision,
    props.initial.token === DEFAULT_PRESET_TOKEN ? null : props.initial.token,
    colorMode(),
  );
  let degradedTimer: ReturnType<typeof setTimeout> | undefined;

  const syncEditorHistory = () => {
    setCanUndo(past.length > 0);
    setCanRedo(future.length > 0);
  };

  const clearEditorHistory = () => {
    past.length = 0;
    future.length = 0;
    syncEditorHistory();
  };

  const replaceUrl = (nextToken: string) => {
    void navigate({ href: sharePathForPreset(nextToken), replace: true, resetScroll: false });
  };

  const commit = (next: DesignSystemConfig, historyMode: "push" | "replace" = "push") => {
    const current = configuration();
    const nextToken = encodePresetToken(next);
    if (nextToken === encodePresetToken(current)) return false;
    if (historyMode === "push") {
      past.push(current);
      future.length = 0;
      syncEditorHistory();
      setConfiguration(next);
      void navigate({ href: sharePathForPreset(nextToken), resetScroll: false });
    } else {
      setConfiguration(next);
      replaceUrl(nextToken);
    }
    return true;
  };

  const toggleLock = (field: LockableParam) => {
    setLocks((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const undo = () => {
    const previous = past.pop();
    if (!previous) return;
    future.push(configuration());
    commit(previous, "replace");
    syncEditorHistory();
  };

  const redo = () => {
    const next = future.pop();
    if (!next) return;
    past.push(configuration());
    commit(next, "replace");
    syncEditorHistory();
  };

  const shuffle = () => commit(shufflePreset(configuration(), locks()));

  const performShortcut = (action: CreateShortcut) => {
    if (action === "command-search") {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, cancelable: true }),
      );
    } else if (action === "toggle-color-mode") toggleColorMode();
    else if (action === "shuffle") shuffle();
    else if (action === "undo") undo();
    else redo();
  };

  const reset = () => {
    if (!window.confirm("Reset the complete Design Configuration?")) return;
    setLocks(new Set<LockableParam>());
    commit(decodePresetToken(DEFAULT_PRESET_TOKEN) as DesignSystemConfig);
  };

  const submitOpenPreset = (event: SubmitEvent) => {
    event.preventDefault();
    const candidate = normalizeOpenPresetInput(openValue());
    const next = candidate ? decodePresetToken(candidate) : null;
    if (!candidate || !next) {
      setOpenError("Enter a valid v1 Preset Token or --preset flag.");
      return;
    }
    commit(next);
    setOpenValue("");
    setOpenError("");
    setOpenPreset(false);
  };

  const sendLatestSnapshot = () => {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(latestMessage, window.location.origin);
    clearTimeout(degradedTimer);
    degradedTimer = setTimeout(() => {
      if (appliedRevision() < latestMessage.revision) setFrameStatus("degraded");
    }, 2_000);
  };

  createEffect(() => {
    const nextToken = token();
    const nextColorMode = colorMode();
    revision += 1;
    latestMessage = createPresetSyncMessage(
      revision,
      nextToken === DEFAULT_PRESET_TOKEN ? null : nextToken,
      nextColorMode,
    );
    if (typeof window !== "undefined") sendLatestSnapshot();
  });

  onMount(() => {
    if (props.initial.replace) {
      void navigate({ href: props.initial.canonicalPath, replace: true, resetScroll: false });
    }
    const handlePopState = () => {
      const resolution = resolveCreateLocation(
        `${window.location.pathname}${window.location.search}`,
      );
      if (resolution.replace) {
        void navigate({ href: resolution.canonicalPath, replace: true, resetScroll: false });
      }
      clearEditorHistory();
      setConfiguration(resolution.config);
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe?.contentWindow) return;
      const message = parsePreviewMessage(event.data);
      if (!message) return;
      if (message.type === "preview-ready") {
        setFrameStatus("ready");
        sendLatestSnapshot();
      } else if (message.type === "preset-applied") {
        if (!isCurrentPresetAcknowledgement(message, latestMessage)) return;
        clearTimeout(degradedTimer);
        setAppliedRevision(message.revision);
        setFrameStatus("ready");
      } else if (message.type === "preview-shortcut") {
        performShortcut(message.action);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableShortcutTarget(event.target)) return;
      const action = resolveCreateShortcut(event);
      if (!action) return;
      // Command Search owns the parent document shortcut. Only redispatch it
      // when it originates inside Preview and arrives through postMessage.
      if (action === "command-search") return;
      event.preventDefault();
      performShortcut(action);
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      clearTimeout(degradedTimer);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const copyWithFeedback = async (kind: string, value: string) => {
    await writeClipboard(value);
    setCopied(kind);
    setTimeout(() => setCopied(undefined), 1_200);
  };

  return (
    <main
      data-create-workspace=""
      data-product-surface="create"
      data-preset={token()}
      class="flex min-h-[calc(100svh-4rem)] flex-col gap-3 bg-background p-3 md:flex-row md:gap-5 md:p-5"
    >
      <aside class="order-2 flex shrink-0 flex-col overflow-hidden rounded-xl border bg-card md:order-1 md:w-56">
        <div class="no-scrollbar flex flex-row overflow-x-auto md:flex-col md:overflow-y-auto">
          <div class="shrink-0 border-r p-3 md:border-r-0 md:border-b">
            <label class="block min-w-44 rounded-lg border bg-background px-3 py-2 md:min-w-0">
              <span class="block text-muted-foreground text-xs">Primitive</span>
              <select class="w-full bg-transparent font-medium text-sm" disabled>
                <option>Kobalte</option>
              </select>
            </label>
          </div>
          <For each={CONFIG_FIELDS}>
            {(field) => (
              <div class="shrink-0 border-r p-3 md:border-r-0 md:border-b">
                <label class="block min-w-44 rounded-lg border bg-background px-3 py-2 md:min-w-0">
                  <span class="block text-muted-foreground text-xs">{FIELD_LABELS[field]}</span>
                  <span class="flex items-center gap-1">
                    <select
                      aria-label={FIELD_LABELS[field]}
                      class="min-w-0 flex-1 bg-transparent font-medium text-sm"
                      value={configuration()[field]}
                      onChange={(event) =>
                        commit({
                          ...configuration(),
                          [field]: event.currentTarget.value,
                        } as DesignSystemConfig)
                      }
                    >
                      <For each={FIELD_OPTIONS[field]}>
                        {(option) => <option value={option.value}>{option.label}</option>}
                      </For>
                    </select>
                    <button
                      type="button"
                      aria-label={`${locks().has(field) ? "Unlock" : "Lock"} ${FIELD_LABELS[field]}`}
                      aria-pressed={locks().has(field)}
                      class="rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleLock(field)}
                    >
                      <Show when={locks().has(field)} fallback={<LockOpen class="size-3.5" />}>
                        <Lock class="size-3.5" />
                      </Show>
                    </button>
                  </span>
                </label>
              </div>
            )}
          </For>
        </div>
        <div class="grid gap-2 border-t p-3">
          <Button
            variant="outline"
            size="sm"
            class="font-mono"
            onClick={() => copyWithFeedback("preset", copyPresetArgument(token()))}
          >
            <Show when={copied() === "preset"} fallback={<Clipboard />}>
              <Check />
            </Show>
            --preset {token()}
          </Button>
          <div class="grid grid-cols-2 gap-2">
            <Dialog open={openPreset()} onOpenChange={setOpenPreset}>
              <DialogTrigger as={Button} variant="outline" size="sm">
                Open Preset
              </DialogTrigger>
              <DialogContent class="w-[calc(100%-2rem)] max-w-lg rounded-xl border bg-background p-4 shadow-2xl">
                <DialogHeader class="mb-4">
                  <DialogTitle class="font-heading font-semibold text-lg">Open Preset</DialogTitle>
                </DialogHeader>
                <form class="grid gap-3" onSubmit={submitOpenPreset}>
                  <label class="grid gap-1 text-sm">
                    Preset Token
                    <input
                      autofocus
                      value={openValue()}
                      aria-invalid={Boolean(openError())}
                      aria-describedby="open-preset-error"
                      placeholder="v1-… or --preset v1-…"
                      class="rounded-md border bg-background px-3 py-2 font-mono"
                      onInput={(event) => {
                        setOpenValue(event.currentTarget.value);
                        setOpenError("");
                      }}
                    />
                  </label>
                  <Show when={openError()}>
                    <p id="open-preset-error" class="text-destructive text-sm">
                      {openError()}
                    </p>
                  </Show>
                  <Button type="submit">Open Preset</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyWithFeedback(
                  "share",
                  new URL(sharePathForPreset(token()), window.location.origin).href,
                )
              }
            >
              <Share2 /> Share
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={!canUndo()} onClick={undo}>
              <RotateCcw /> Undo
            </Button>
            <Button variant="outline" size="sm" disabled={!canRedo()} onClick={redo}>
              <RotateCw /> Redo
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={shuffle}>
              <Shuffle /> Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
          <Dialog open={getCode()} onOpenChange={setGetCode}>
            <DialogTrigger as={Button} size="sm">
              <Code2 /> Get Code
            </DialogTrigger>
            <DialogContent class="w-[calc(100%-2rem)] max-w-lg rounded-xl border bg-background p-4 shadow-2xl">
              <DialogHeader class="mb-4">
                <DialogTitle class="font-heading font-semibold text-lg">Get Code</DialogTitle>
              </DialogHeader>
              <div class="grid gap-3">
                <Tabs
                  value={packageManager()}
                  onChange={(value) => setPackageManager(value as PackageManager)}
                >
                  <TabsList aria-label="Package manager" class="grid w-full grid-cols-4 gap-1">
                    <For each={["pnpm", "npm", "yarn", "bun"] as const}>
                      {(manager) => (
                        <TabsTrigger value={manager} class="h-8 rounded-sm px-2 text-xs">
                          {manager === "bun" ? "Bun" : manager}
                        </TabsTrigger>
                      )}
                    </For>
                  </TabsList>
                  <For each={["pnpm", "npm", "yarn", "bun"] as const}>
                    {(manager) => (
                      <TabsContent value={manager} class="mt-3">
                        <code class="block overflow-x-auto rounded-md border bg-muted p-3 text-xs">
                          {getPresetInstallCommand(manager, token())}
                        </code>
                      </TabsContent>
                    )}
                  </For>
                </Tabs>
                <Button
                  onClick={() =>
                    copyWithFeedback("command", getPresetInstallCommand(packageManager(), token()))
                  }
                >
                  <Show when={copied() === "command"} fallback={<Clipboard />}>
                    <Check />
                  </Show>
                  Copy command
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <section class="relative order-1 min-h-[28rem] flex-1 overflow-hidden rounded-xl border bg-muted/30 md:order-2">
        <div class="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b bg-background/90 px-3 py-2 text-xs backdrop-blur">
          <span>Live Create Preview</span>
          <span role="status" data-preview-status={frameStatus()}>
            {frameStatus() === "ready"
              ? `Applied revision ${appliedRevision()}`
              : frameStatus() === "degraded"
                ? "Preview degraded — reload to retry"
                : "Connecting…"}
          </span>
        </div>
        <iframe
          ref={iframe}
          title="Create Preview"
          src={initialPreviewPath}
          class="h-full min-h-[28rem] w-full pt-9"
          onLoad={() => {
            setFrameStatus("booting");
            sendLatestSnapshot();
          }}
        />
      </section>
    </main>
  );
}
