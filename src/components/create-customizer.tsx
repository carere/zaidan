import { Radius as RadiusIcon } from "lucide-solid";
import { createMemo, createSignal, For, type JSX, onCleanup, Show } from "solid-js";
import { CreateOpenPreset } from "@/components/create-open-preset";
import { MainMenu } from "@/components/designer/main-menu";
import { Picker, type PickerOption } from "@/components/designer/picker";
import {
  BASE_COLORS,
  CHART_COLORS,
  FONTS,
  MENU_ACCENTS,
  RADII,
  STYLES,
  THEMES,
} from "@/lib/config";
import type { DesignSystemConfig } from "@/lib/types";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import { FieldGroup, FieldSeparator } from "@/registry/kobalte/ui/field";

type ConfigKey = Exclude<keyof DesignSystemConfig, "primitive">;
type ColorOption = (typeof BASE_COLORS)[number] | (typeof THEMES)[number];

function ColorDot(props: { color?: string }) {
  return (
    <span
      class="size-4 shrink-0 rounded-full border border-foreground/10"
      style={{ "background-color": props.color }}
    />
  );
}

function ChartStrip(props: { colors: string[] }) {
  return (
    <span class="flex size-4 shrink-0 overflow-hidden rounded-full border border-foreground/10">
      <For each={props.colors}>
        {(color) => <span class="flex-1" style={{ background: color }} />}
      </For>
    </span>
  );
}

function StyleIcon(props: { style: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4" aria-hidden="true">
      <Show when={props.style === "vega"}>
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="7"
          stroke="currentColor"
          stroke-width="2"
        />
      </Show>
      <Show when={props.style === "nova"}>
        <rect x="2" y="4" width="20" height="16" rx="7" stroke="currentColor" stroke-width="2" />
      </Show>
      <Show when={props.style === "maia"}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
      </Show>
      <Show when={props.style === "lyra"}>
        <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" stroke="currentColor" stroke-width="2" />
      </Show>
      <Show when={props.style === "mira"}>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="5"
          transform="rotate(45 12 12)"
          stroke="currentColor"
          stroke-width="2"
        />
      </Show>
      <Show when={props.style === "luma"}>
        <rect x="2" y="5" width="20" height="14" rx="7" stroke="currentColor" stroke-width="2" />
      </Show>
      <Show when={props.style === "rhea"}>
        <path
          d="M3 12C3 9.79086 4.79086 8 7 8H17C19.2091 8 21 9.79086 21 12C21 14.2091 19.2091 16 17 16H7C4.79086 16 3 14.2091 3 12Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </Show>
      <Show when={props.style === "sera"}>
        <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="2" />
      </Show>
    </svg>
  );
}

function MenuAccentIcon(props: { accent: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4" aria-hidden="true">
      <path
        d="M19 12.13 12.94 18.2c-1.78 1.79-2.68 2.69-3.77 2.78a3 3 0 0 1-.54 0c-1.1-.1-1.99-.99-3.77-2.78l-2.02-2.02a2.87 2.87 0 0 1 0-4.05M19 12.13 10.92 4.03M19 12.13H2.84M10.92 4.03l-8.08 8.1M10.92 4.03 8.9 2"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={props.accent === "bold" ? "fill-foreground" : "fill-muted-foreground/30"}
      />
      <path
        d="M22 20a2 2 0 1 1-4 0c0-1.1 2-3 2-3s2 1.9 2 3Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={props.accent === "bold" ? "fill-foreground" : "fill-muted-foreground/30"}
      />
    </svg>
  );
}

export function CreateCustomizer(props: {
  config: DesignSystemConfig;
  preset: string;
  onCommit: (key: ConfigKey, value: string) => void;
  onPreview: (key: ConfigKey, value?: string) => void;
  onNavigate: () => void;
  onOpenPreset: (preset: string) => void;
  onShuffle: (locks?: ReadonlySet<ConfigKey>) => void;
  onToggleMode: () => void;
  onCopyPreset: () => void | Promise<void>;
  onReset: () => void;
  setupAction: JSX.Element;
}) {
  const [presetOpen, setPresetOpen] = createSignal(false);
  const [locks, setLocks] = createSignal<Set<ConfigKey>>(new Set());
  const [hasCopiedPreset, setHasCopiedPreset] = createSignal(false);
  const copyPresetLabel = createMemo(() =>
    hasCopiedPreset() ? "Copied" : `--preset ${props.preset}`,
  );
  let copyPresetTimer: ReturnType<typeof setTimeout> | undefined;

  const handleCopyPreset = async () => {
    await props.onCopyPreset();
    setHasCopiedPreset(true);
    if (copyPresetTimer) clearTimeout(copyPresetTimer);
    copyPresetTimer = setTimeout(() => setHasCopiedPreset(false), 2000);
  };

  onCleanup(() => {
    if (copyPresetTimer) clearTimeout(copyPresetTimer);
  });

  const toggleLock = (key: ConfigKey) => {
    setLocks((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const handleShuffle = () => props.onShuffle(locks());

  const colorOptions = (items: readonly ColorOption[]): PickerOption[] =>
    items.map((item) => ({
      value: item.name,
      label: item.label,
      preview: () => <ColorDot color={item.color} />,
    }));

  return (
    <Card
      size="sm"
      class="dark isolate z-10 max-h-full min-h-0 w-full self-start rounded-2xl bg-card/90 pb-0 text-card-foreground shadow-sm backdrop-blur-xl md:h-full md:w-(--customizer-width)"
    >
      <CardHeader class="hidden border-border border-b px-3 md:flex">
        <MainMenu
          items={[
            { label: "Navigate…", shortcut: "⌘P", onSelect: props.onNavigate },
            { label: "Open Preset…", shortcut: "O", onSelect: () => setPresetOpen(true) },
            { label: "Shuffle", shortcut: "R", onSelect: handleShuffle },
            { label: "Light/Dark", shortcut: "D", onSelect: props.onToggleMode },
            {
              label: "Reset",
              shortcut: "⇧R",
              separatorBefore: true,
              onSelect: props.onReset,
            },
          ]}
        />
      </CardHeader>
      <CardContent class="no-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-3 md:overflow-y-auto">
        <FieldGroup class="flex-row gap-2.5 py-px **:data-[slot=field-separator]:-mx-3 **:data-[slot=field-separator]:w-auto **:data-[slot=separator]:bg-border **:data-[slot=separator]:border-0 md:flex-col md:gap-3.25">
          <Picker
            label="Style"
            configKey="style"
            value={props.config.style}
            options={STYLES.map((item) => ({
              value: item.name,
              label: item.label,
              preview: () => <StyleIcon style={item.name} />,
            }))}
            locked={locks().has("style")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <FieldSeparator class="hidden md:block" />
          <Picker
            label="Base Color"
            configKey="baseColor"
            value={props.config.baseColor}
            options={colorOptions(BASE_COLORS)}
            locked={locks().has("baseColor")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <Picker
            label="Theme"
            configKey="theme"
            value={props.config.theme}
            options={[
              {
                value: props.config.baseColor,
                label:
                  BASE_COLORS.find((item) => item.name === props.config.baseColor)?.label ??
                  "Match base color",
                preview: () => (
                  <ColorDot
                    color={BASE_COLORS.find((item) => item.name === props.config.baseColor)?.color}
                  />
                ),
              },
              ...colorOptions(THEMES),
            ]}
            locked={locks().has("theme")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <Picker
            label="Chart Color"
            configKey="chartColor"
            value={props.config.chartColor}
            options={CHART_COLORS.map((item) => ({
              value: item.name,
              label: item.label,
              preview: () => <ChartStrip colors={item.chart} />,
            }))}
            locked={locks().has("chartColor")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <FieldSeparator class="hidden md:block" />
          <Picker
            label="Heading"
            configKey="headingFont"
            value={props.config.headingFont}
            options={FONTS.map((item) => ({
              value: item.value,
              label: item.label,
              preview: () => <span style={{ "font-family": item.fontFamily }}>Aa</span>,
            }))}
            locked={locks().has("headingFont")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <Picker
            label="Font"
            configKey="font"
            value={props.config.font}
            options={FONTS.map((item) => ({
              value: item.value,
              label: item.label,
              preview: () => <span style={{ "font-family": item.fontFamily }}>Aa</span>,
            }))}
            locked={locks().has("font")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <FieldSeparator class="hidden md:block" />
          <Picker
            label="Radius"
            configKey="radius"
            value={props.config.radius}
            options={RADII.map((item) => ({ value: item.name, label: item.label }))}
            icon={() => <RadiusIcon class="size-4 rotate-90" />}
            locked={locks().has("radius")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
          <FieldSeparator class="hidden md:block" />
          <Picker
            label="Menu Accent"
            configKey="menuAccent"
            value={props.config.menuAccent}
            options={MENU_ACCENTS.map((item) => ({ value: item.name, label: item.label }))}
            icon={() => <MenuAccentIcon accent={props.config.menuAccent} />}
            locked={locks().has("menuAccent")}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={toggleLock}
          />
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex min-w-0 gap-2 border-border border-t bg-muted/50 p-3 md:flex-col md:rounded-b-none md:**:[button,a]:w-full">
        <Button
          variant="outline"
          class="min-w-0 flex-1 touch-manipulation bg-transparent px-2 font-normal text-sm transition-none md:flex-none"
          title={copyPresetLabel()}
          onClick={handleCopyPreset}
        >
          <span class="block min-w-0 truncate" aria-live="polite">
            {copyPresetLabel()}
          </span>
        </Button>
        <CreateOpenPreset
          open={presetOpen()}
          onOpenChange={setPresetOpen}
          onOpenPreset={props.onOpenPreset}
        />
        <Button
          variant="outline"
          class="min-w-0 flex-1 touch-manipulation bg-transparent px-2 font-normal text-sm transition-none md:flex-none"
          onClick={handleShuffle}
        >
          <span class="w-full truncate text-center font-normal">Shuffle</span>
        </Button>
        <div class="hidden w-full min-w-0 md:flex md:flex-col">{props.setupAction}</div>
      </CardFooter>
    </Card>
  );
}
