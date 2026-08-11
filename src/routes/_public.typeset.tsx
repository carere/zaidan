import { createFileRoute, useNavigate, useRouter } from "@tanstack/solid-router";
import { SquareArrowOutUpRight } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { TypesetCodePanel } from "@/components/typeset-code-panel";
import { TypesetCustomizer } from "@/components/typeset-customizer";
import { createPageHead } from "@/lib/seo";
import {
  coerceTypesetValue,
  type LockableParam,
  serializeTypesetSearch,
  TYPESET_COMMAND_MESSAGE,
  TYPESET_CONTENT_OPTIONS,
  TYPESET_DEFAULTS,
  TYPESET_FLOWS,
  TYPESET_FONTS,
  TYPESET_LEADINGS,
  TYPESET_MEASURES,
  TYPESET_PARAMS_MESSAGE,
  TYPESET_SIZES,
  type TypesetItem,
  type TypesetParams,
} from "@/lib/typeset";
import {
  encodeTypesetCode,
  typesetParamsFromSearch,
  validateTypesetCodeSearch,
} from "@/lib/typeset-code";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/kobalte/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

/**
 * How long the pointer must settle before a hover preview applies. Every
 * mousemove over a picker item re-arms this trailing timer, so nothing applies
 * while the cursor is in motion. Clears are never debounced: reverting on
 * leave/Escape must feel instant.
 */
const PREVIEW_DEBOUNCE_MS = 50;

/** The design the URL describes when it carries no code at all. */
const DEFAULT_CODE = encodeTypesetCode(TYPESET_DEFAULTS);

export const Route = createFileRoute("/_public/typeset")({
  validateSearch: validateTypesetCodeSearch,
  head: () =>
    createPageHead({
      title: "Typeset",
      description: "Typography for markdown you don't control.",
      path: "/typeset",
    }),
  component: TypesetPage,
});

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function TypesetPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const { toggleColorMode } = useColorMode();

  const [locks, setLocks] = createSignal<ReadonlySet<LockableParam>>(new Set<LockableParam>());
  // Uncommitted params applied to the preview while hovering a picker item.
  // Kept out of the URL on purpose: the URL is what history snapshots, so
  // committing hovers would record a phantom undo entry per hovered item.
  const [override, setOverride] = createSignal<Partial<TypesetParams> | null>(null);
  const [pickerOpen, setPickerOpen] = createSignal(false);
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let iframeRef: HTMLIFrameElement | undefined;

  // The whole design lives in one search param, `?typeset=<code>`, the way
  // `?preset=` works on the create page. An absent code means the defaults.
  const params = createMemo(() => typesetParamsFromSearch(search()));
  const code = createMemo(() => search().typeset ?? DEFAULT_CODE);
  const merged = createMemo<TypesetParams>(() => {
    const current = override();
    return current ? { ...params(), ...current } : params();
  });

  // ---------------------------------------------------------------- history
  // A history entry is a typeset code — a snapshot of every param. Restoring
  // writes it back whole, so the empty entry returns to the defaults.
  const entries: string[] = [];
  let index = 0;
  let maxIndex = 0;
  let isNavigating = false;
  let seeded = false;

  const snapshot = createMemo(() => search().typeset ?? "");

  createEffect(
    on(snapshot, (next) => {
      if (!seeded) {
        seeded = true;
        entries.push(next);
        return;
      }
      if (isNavigating) {
        isNavigating = false;
        return;
      }
      if (next === entries[index]) return;

      entries.splice(index + 1);
      entries.push(next);
      index = entries.length - 1;
      maxIndex = index;
    }),
  );

  /** Single write path to the URL; also clears any live hover preview. */
  const apply = (next: TypesetParams, options: { replace?: boolean } = {}) => {
    const nextCode = encodeTypesetCode(next);
    setOverride(null);
    navigate({
      replace: options.replace,
      // The default design carries no code, so a fresh page and a reset both
      // leave `/typeset` clean.
      search: () => ({ typeset: nextCode === DEFAULT_CODE ? undefined : nextCode }),
    });
  };

  const restore = (entry: string) => {
    setOverride(null);
    navigate({ replace: true, search: () => ({ typeset: entry || undefined }) });
  };

  const goBack = () => {
    if (index <= 0) return;
    isNavigating = true;
    index -= 1;
    restore(entries[index]);
  };

  const goForward = () => {
    if (index >= maxIndex) return;
    isNavigating = true;
    index += 1;
    restore(entries[index]);
  };

  // ------------------------------------------------------------- mutations
  // Pickers hand back the raw radio value (always a string); coerce restores
  // the param's real type before it reaches the code.
  const commit = (key: LockableParam, value: string) => {
    const coerced = coerceTypesetValue(key, value);
    if (coerced === null) return;
    apply({ ...params(), [key]: coerced });
  };

  const preview = (key: LockableParam, value?: string) => {
    if (previewTimer) clearTimeout(previewTimer);
    if (!value) {
      setOverride(null);
      return;
    }
    const coerced = coerceTypesetValue(key, value);
    if (coerced === null) return;
    previewTimer = setTimeout(() => setOverride({ [key]: coerced }), PREVIEW_DEBOUNCE_MS);
  };

  const setItem = (item: TypesetItem) => {
    apply({ ...params(), item });
  };

  const toggleLock = (key: LockableParam) => {
    setLocks((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Randomize the type design. Leaves `item` (the specimen) alone; locked
  // params keep their current value.
  const shuffle = () => {
    const locked = locks();
    const bodyFonts = TYPESET_FONTS.filter((font) => font.type !== "mono").map((font) => font.id);
    const monoFonts = TYPESET_FONTS.filter((font) => font.type === "mono").map((font) => font.id);
    const next: Record<string, string | number> = {
      body: randomItem(bodyFonts),
      heading: randomItem(["inherit", ...bodyFonts]),
      mono: randomItem(monoFonts),
      scale: randomItem(TYPESET_SIZES.map((option) => option.value)),
      measure: randomItem(TYPESET_MEASURES.map((option) => option.value)),
      leading: randomItem(TYPESET_LEADINGS.map((option) => option.value)),
      flow: randomItem(TYPESET_FLOWS.map((option) => option.value)),
    };

    for (const key of locked) delete next[key];

    apply({ ...params(), ...next });
  };

  const reset = () => {
    apply({ ...TYPESET_DEFAULTS, item: params().item }, { replace: true });
  };

  const openCode = (next: string) => {
    setOverride(null);
    navigate({ search: () => ({ typeset: next }) });
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(`@zaidan/typeset-${code()}`);
  };

  // ------------------------------------------------------------ preview I/O
  // The iframe only reloads when the specimen changes; every other change
  // reaches it over postMessage. Params are read untracked so a reload still
  // starts from the current design instead of the one the page loaded with.
  const item = createMemo(() => params().item);
  const previewUrl = createMemo(() => {
    const current = item();
    return untrack(() => serializeTypesetSearch(`/preview/typeset/${current}`, params()));
  });

  const sendParams = () => {
    iframeRef?.contentWindow?.postMessage(
      { type: TYPESET_PARAMS_MESSAGE, data: merged() },
      window.location.origin,
    );
  };
  createEffect(on(merged, sendParams));

  onMount(() => {
    const commands: Record<string, () => void> = {
      shuffle,
      reset,
      undo: goBack,
      redo: goForward,
      "toggle-theme": toggleColorMode,
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef?.contentWindow ||
        event.data?.type !== TYPESET_COMMAND_MESSAGE
      ) {
        return;
      }
      commands[event.data.command as string]?.();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const target = event.target;
      if (
        (target instanceof HTMLElement && target.isContentEditable) ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "k" || key === "p") {
        event.preventDefault();
        setPickerOpen(true);
      } else if ((key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey)) {
        event.preventDefault();
        goForward();
      } else if (key === "z") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("keydown", handleKeyDown);
      if (previewTimer) clearTimeout(previewTimer);
    });
  });

  const openInNewTabHref = createMemo(
    () =>
      router.buildLocation({
        to: "/preview/typeset/$item",
        params: { item: params().item },
        search: params(),
      }).href,
  );

  return (
    <div class="section-soft relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden [--customizer-width:--spacing(48)] [--gap:--spacing(4)] md:[--gap:--spacing(6)] 2xl:[--customizer-width:--spacing(56)]">
      <div
        data-slot="designer"
        class="flex min-h-0 flex-1 flex-col items-start gap-(--gap) p-(--gap) pt-[calc(var(--gap)*0.25)] md:flex-row-reverse"
      >
        <TypesetCodePanel params={params()} />
        <section class="relative isolate flex min-h-112 size-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10 md:min-h-0">
          <iframe
            ref={iframeRef}
            src={previewUrl()}
            onLoad={sendParams}
            title="typeset preview"
            class="size-full border-0"
          />
          <div class="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-1.5">
            <div class="dark flex items-center gap-1 rounded-xl bg-card/90 p-1 shadow-xl backdrop-blur-xl">
              <For each={TYPESET_CONTENT_OPTIONS}>
                {(option, i) => (
                  <Tooltip placement="top" gutter={10}>
                    <TooltipTrigger
                      as="button"
                      type="button"
                      data-active={params().item === option.value}
                      onClick={() => setItem(option.value)}
                      class="h-7 min-w-7 cursor-pointer rounded-lg px-2 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      {String(i() + 1).padStart(2, "0")}
                    </TooltipTrigger>
                    <TooltipContent>{option.label}</TooltipContent>
                  </Tooltip>
                )}
              </For>
            </div>
            <div class="dark flex items-center gap-1 rounded-xl bg-card/90 p-1 shadow-xl backdrop-blur-xl">
              {/* The label has no room next to the specimen pills on narrow
                  screens, so it collapses to the icon below md. */}
              <a
                href={openInNewTabHref()}
                target="_blank"
                rel="noreferrer"
                class="flex h-7 cursor-pointer items-center whitespace-nowrap rounded-lg px-2.5 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              >
                <SquareArrowOutUpRight class="size-3.5 md:hidden" />
                <span class="max-md:sr-only">Open in New Tab</span>
              </a>
            </div>
          </div>
        </section>
        <TypesetCustomizer
          params={merged()}
          code={code()}
          locks={locks()}
          onCommit={commit}
          onPreview={preview}
          onToggleLock={toggleLock}
          onNavigate={() => setPickerOpen(true)}
          onOpenCode={openCode}
          onShuffle={shuffle}
          onToggleMode={toggleColorMode}
          onCopyCode={copyCode}
          onReset={reset}
          onUndo={goBack}
          onRedo={goForward}
          setupAction={<TypesetCodePanel params={params()} variant="drawer" />}
        />
      </div>
      <CommandDialog open={pickerOpen()} onOpenChange={setPickerOpen}>
        <Command autofocus={false}>
          <CommandInput placeholder="Search specimens..." />
          <CommandList>
            <CommandEmpty>No specimens found.</CommandEmpty>
            <CommandGroup heading="Specimen">
              <For each={TYPESET_CONTENT_OPTIONS}>
                {(option) => (
                  <CommandItem
                    value={option.label}
                    onSelect={() => {
                      setItem(option.value);
                      setPickerOpen(false);
                    }}
                  >
                    {option.label}
                  </CommandItem>
                )}
              </For>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
