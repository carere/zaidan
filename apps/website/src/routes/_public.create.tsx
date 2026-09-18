import { createFileRoute, useNavigate, useRouter } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import { CliButton } from "@/components/cli-button";
import { CreateCustomizer } from "@/components/create-customizer";
import {
  BASE_COLORS,
  CHART_COLORS,
  DEFAULT_CONFIG,
  FONTS,
  MENU_ACCENTS,
  RADII,
  STYLES,
  THEMES,
} from "@/lib/config";
import { isCreateShowcase } from "@/lib/create-previews";
import { decodeDesignSystemPreset, encodeDesignSystemPreset } from "@/lib/preset";
import { getPreviewEntries } from "@/lib/registry-entries";
import { createPageHead } from "@/lib/seo";
import type { DesignSystemConfig, IframeMessage } from "@/lib/types";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/kobalte/ui/command";

type CreateSearch = { preset?: string; item?: string };
type ConfigKey = Exclude<keyof DesignSystemConfig, "primitive">;

export const Route = createFileRoute("/_public/create")({
  validateSearch: (search: Record<string, unknown>): CreateSearch => ({
    preset: typeof search.preset === "string" ? search.preset : undefined,
    item: typeof search.item === "string" ? search.item : undefined,
  }),
  head: () =>
    createPageHead({
      title: "Create",
      description: "Build and preview your Zaidan design system.",
      path: "/create",
    }),
  component: CreatePage,
});

function CreatePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();
  const [override, setOverride] = createSignal<Partial<DesignSystemConfig>>({});
  const [pickerOpen, setPickerOpen] = createSignal(false);
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let iframeRef: HTMLIFrameElement | undefined;

  const decoded = createMemo(() =>
    search().preset ? decodeDesignSystemPreset(search().preset ?? "") : DEFAULT_CONFIG,
  );
  const config = createMemo(() => decoded() ?? DEFAULT_CONFIG);
  const presetCode = createMemo(() => {
    const preset = search().preset;
    return preset && decoded() ? preset : encodeDesignSystemPreset(config());
  });
  const previewConfig = createMemo(() => ({ ...config(), ...override() }));
  const entries = getPreviewEntries();
  const currentItem = createMemo(() =>
    entries
      .flatMap((entry) => entry.items.map((item) => ({ ...item, kind: entry.kind })))
      .find((item) => item.slug === search().item),
  );

  createEffect(() => {
    if (search().preset && !decoded()) {
      navigate({ replace: true, search: (previous) => ({ ...previous, preset: undefined }) });
    }
  });

  const sendPreview = () => {
    iframeRef?.contentWindow?.postMessage(
      { type: "design-system-params-sync", data: previewConfig() } satisfies IframeMessage,
      window.location.origin,
    );
    iframeRef?.contentWindow?.postMessage(
      { type: "color-mode-sync", data: colorMode() } satisfies IframeMessage,
      window.location.origin,
    );
  };
  createEffect(sendPreview);

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef?.contentWindow)
        return;
      const message = event.data;
      if (message.type === "preview-ready") {
        sendPreview();
      } else if (message.type === "showcase-change") {
        navigate({ search: (previous) => ({ ...previous, item: message.data }) });
      } else if (message.type === "dark-mode-forward" || message.type === "cmd-k-forward") {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: message.key,
            metaKey: message.type === "cmd-k-forward",
            bubbles: true,
          }),
        );
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "p")) {
        event.preventDefault();
        setPickerOpen(true);
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

  const commit = (key: Exclude<keyof DesignSystemConfig, "primitive">, value: string) => {
    const next = { ...config(), [key]: value } as DesignSystemConfig;
    setOverride({});
    navigate({ search: (previous) => ({ ...previous, preset: encodeDesignSystemPreset(next) }) });
  };
  const preview = (key: Exclude<keyof DesignSystemConfig, "primitive">, value?: string) => {
    if (previewTimer) clearTimeout(previewTimer);
    if (!value) {
      setOverride({});
      return;
    }
    previewTimer = setTimeout(() => setOverride({ [key]: value }), 50);
  };
  const reset = () => {
    setOverride({});
    navigate({ search: (previous) => ({ ...previous, preset: undefined }) });
  };
  const randomItem = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
  const shuffle = (locks: ReadonlySet<ConfigKey> = new Set<ConfigKey>()) => {
    const current = config();
    const next: DesignSystemConfig = {
      primitive: "kobalte",
      style: locks.has("style")
        ? current.style
        : (randomItem(STYLES)?.name ?? DEFAULT_CONFIG.style),
      baseColor: locks.has("baseColor")
        ? current.baseColor
        : (randomItem(BASE_COLORS)?.name ?? DEFAULT_CONFIG.baseColor),
      theme: locks.has("theme")
        ? current.theme
        : (randomItem(THEMES)?.name ?? DEFAULT_CONFIG.theme),
      chartColor: locks.has("chartColor")
        ? current.chartColor
        : (randomItem(CHART_COLORS)?.name ?? DEFAULT_CONFIG.chartColor),
      font: locks.has("font") ? current.font : (randomItem(FONTS)?.value ?? DEFAULT_CONFIG.font),
      headingFont: locks.has("headingFont")
        ? current.headingFont
        : (randomItem(FONTS)?.value ?? DEFAULT_CONFIG.headingFont),
      radius: locks.has("radius")
        ? current.radius
        : (randomItem(RADII)?.name ?? DEFAULT_CONFIG.radius),
      menuAccent: locks.has("menuAccent")
        ? current.menuAccent
        : (randomItem(MENU_ACCENTS)?.name ?? DEFAULT_CONFIG.menuAccent),
    };
    const nextPreset = encodeDesignSystemPreset(next);
    if (nextPreset === encodeDesignSystemPreset(current)) return;

    setOverride({});
    navigate({ search: (previous) => ({ ...previous, preset: nextPreset }) });
  };
  const iframeHref = createMemo(() =>
    (() => {
      const requestedItem = search().item;
      const showcase = requestedItem
        ? isCreateShowcase(requestedItem)
          ? requestedItem
          : undefined
        : "preview-02";
      if (showcase) {
        return router.buildLocation({ to: "/preview/create", search: { showcase } }).href;
      }

      const item = currentItem();
      return router.buildLocation({
        to: "/preview/$kind/$primitive/$slug",
        params: {
          kind: item?.kind ?? "ui",
          primitive: "kobalte",
          slug: requestedItem ?? "missing",
        },
      }).href;
    })(),
  );

  const copyPreset = async () => {
    await navigator.clipboard.writeText(`--preset ${presetCode()}`);
  };

  return (
    <div class="section-soft relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden [--customizer-width:--spacing(48)] [--gap:--spacing(4)] md:[--gap:--spacing(6)] 2xl:[--customizer-width:--spacing(56)]">
      <div
        data-slot="designer"
        class="flex min-h-0 flex-1 flex-col gap-(--gap) p-(--gap) pt-[calc(var(--gap)*0.25)] md:flex-row-reverse"
      >
        <section class="relative flex min-h-112 flex-1 flex-col justify-center overflow-hidden rounded-2xl ring ring-foreground/10 md:min-h-0 md:ring-muted dark:ring-foreground/10">
          <div class="relative z-0 mx-auto flex w-full flex-1 flex-col overflow-hidden">
            <div class="absolute inset-0 bg-muted dark:bg-muted/30" />
            <iframe
              ref={iframeRef}
              src={iframeHref()}
              onLoad={sendPreview}
              class="z-10 size-full flex-1 border-0"
              title={currentItem()?.title ?? "Components"}
            />
          </div>
        </section>
        <CreateCustomizer
          config={config()}
          preset={presetCode()}
          onCommit={commit}
          onPreview={preview}
          onNavigate={() => setPickerOpen(true)}
          onOpenPreset={(preset) => navigate({ search: (previous) => ({ ...previous, preset }) })}
          onShuffle={shuffle}
          onToggleMode={toggleColorMode}
          onCopyPreset={copyPreset}
          onReset={reset}
          setupAction={
            <CliButton preset={search().preset} config={config()} class="w-full" label="Get Code" />
          }
        />
      </div>
      <CommandDialog open={pickerOpen()} onOpenChange={setPickerOpen}>
        <Command autofocus={false}>
          <CommandInput placeholder="Search previews..." />
          <CommandList>
            <CommandEmpty>No previews found.</CommandEmpty>
            <CommandGroup heading="Showcase">
              <CommandItem
                value="preview 01 showcase"
                onSelect={() => {
                  navigate({ search: (previous) => ({ ...previous, item: "preview-02" }) });
                  setPickerOpen(false);
                }}
              >
                Preview 01
              </CommandItem>
              <CommandItem
                value="preview 02 showcase"
                onSelect={() => {
                  navigate({ search: (previous) => ({ ...previous, item: "preview" }) });
                  setPickerOpen(false);
                }}
              >
                Preview 02
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <For each={entries}>
              {(entry) => (
                <CommandGroup heading={entry.title}>
                  <For each={entry.items}>
                    {(item) => (
                      <CommandItem
                        value={`${entry.title} ${item.title}`}
                        onSelect={() => {
                          navigate({ search: (previous) => ({ ...previous, item: item.slug }) });
                          setPickerOpen(false);
                        }}
                      >
                        {item.title}
                      </CommandItem>
                    )}
                  </For>
                </CommandGroup>
              )}
            </For>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
