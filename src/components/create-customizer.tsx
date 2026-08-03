import { Radius as RadiusIcon } from "lucide-solid";
import { createMemo, createSignal, For, type JSX, onCleanup, Show } from "solid-js";
import { CreateOpenPreset } from "@/components/create-open-preset";
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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { FieldGroup, FieldSeparator } from "@/registry/kobalte/ui/field";

type ConfigKey = Exclude<keyof DesignSystemConfig, "primitive">;
type PickerOption = {
  value: string;
  label: string;
  preview?: () => JSX.Element;
};
type ColorOption = (typeof BASE_COLORS)[number] | (typeof THEMES)[number];

const pickerContentClass =
  "dark no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*6)] min-w-32 overflow-y-auto rounded-xl border-0 bg-neutral-950/80 p-1.5 text-neutral-100 ring-1 ring-neutral-950/80 shadow-xl backdrop-blur-xl md:w-52 dark:bg-neutral-800/90 dark:ring-neutral-700/50";
const pickerTriggerClass =
  "relative w-36 shrink-0 touch-manipulation rounded-xl p-3 ring-1 ring-foreground/10 select-none hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:px-2.5 md:py-2";

function Picker(props: {
  label: string;
  configKey: ConfigKey;
  value: string;
  options: PickerOption[];
  icon?: () => JSX.Element;
  locked: boolean;
  onCommit: (key: ConfigKey, value: string) => void;
  onPreview: (key: ConfigKey, value?: string) => void;
  onToggleLock: (key: ConfigKey) => void;
}) {
  const isMobile = useIsMobile();
  const current = createMemo(() => props.options.find((option) => option.value === props.value));

  return (
    <div class="group/picker relative">
      <DropdownMenu
        placement={isMobile() ? "top" : "right-start"}
        gutter={isMobile() ? 16 : 20}
        onOpenChange={(open) => !open && props.onPreview(props.configKey)}
      >
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <span class="flex flex-col justify-start text-left">
            <span class="font-normal text-muted-foreground text-xs">{props.label}</span>
            <span class="line-clamp-1 max-w-[80%] truncate font-normal text-foreground text-sm">
              {current()?.label}
            </span>
          </span>
          <span class="pointer-events-none absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center text-foreground select-none md:right-2.5">
            {props.icon?.() ?? current()?.preview?.()}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class={pickerContentClass}
          onMouseLeave={() => props.onPreview(props.configKey)}
        >
          <DropdownMenuRadioGroup
            value={props.value}
            onChange={(value) => props.onCommit(props.configKey, value)}
          >
            <For each={props.options}>
              {(option) => (
                <DropdownMenuRadioItem
                  value={option.value}
                  class="rounded-lg py-1.5 pr-8 pl-2 font-medium text-sm **:text-neutral-100 data-highlighted:bg-neutral-600 data-highlighted:text-neutral-100 pointer-coarse:py-2.5 pointer-coarse:pl-3 pointer-coarse:text-base"
                  onMouseMove={() => !isMobile() && props.onPreview(props.configKey, option.value)}
                  onFocus={() => !isMobile() && props.onPreview(props.configKey, option.value)}
                >
                  <span class="flex min-w-0 flex-1 items-center gap-2">
                    {option.preview?.()}
                    <span>{option.label}</span>
                  </span>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton
        locked={props.locked}
        onToggle={() => props.onToggleLock(props.configKey)}
        class="absolute top-1/2 right-8 -translate-y-1/2"
      />
    </div>
  );
}

function SquareLockIcon(props: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-5 text-foreground" aria-hidden="true">
      <path
        d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12104 13.2453 4 14.3624 4 15.5C4 16.6376 4.12104 17.7547 4.26781 18.8447Z"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d={
          props.locked
            ? "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9"
            : "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C13.9593 2 15.5 3.5 16 5"
        }
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12.125 15.5H12M12.25 15.5C12.25 15.6381 12.1381 15.75 12 15.75C11.8619 15.75 11.75 15.6381 11.75 15.5C11.75 15.3619 11.8619 15.25 12 15.25C12.1381 15.25 12.25 15.3619 12.25 15.5Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

function LockButton(props: { locked: boolean; onToggle: () => void; class?: string }) {
  const label = () => (props.locked ? "Unlock" : "Lock");

  return (
    <button
      type="button"
      title={label()}
      aria-label={label()}
      onClick={props.onToggle}
      data-locked={props.locked}
      class={cn(
        "flex size-4 cursor-pointer items-center justify-center rounded opacity-0 ring-foreground/60 transition-opacity outline-none group-focus-within/picker:opacity-100 group-hover/picker:opacity-100 focus:opacity-100 focus-visible:ring-1 data-[locked=true]:opacity-100 pointer-coarse:hidden",
        props.class,
      )}
    >
      <SquareLockIcon locked={props.locked} />
    </button>
  );
}

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

function Menu09Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-5" aria-hidden="true">
      <path
        d="M4 8.5L20 8.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4 15.5L20 15.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function MainMenu(props: {
  onNavigate: () => void;
  onOpenPreset: () => void;
  onShuffle: () => void;
  onToggleMode: () => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu placement="right-start" gutter={12}>
      <DropdownMenuTrigger class="relative w-36 flex justify-between shrink-0 touch-manipulation rounded-xl p-3 ring-1 ring-foreground/10 select-none hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:px-2.5 md:py-2">
        <span class="font-normal text-sm">Menu</span>
        <span class="pointer-events-none absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center text-foreground select-none">
          <Menu09Icon />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent class={cn(pickerContentClass, "w-52")}>
        <DropdownMenuItem
          class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
          onSelect={props.onNavigate}
        >
          Navigate… <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
          onSelect={props.onOpenPreset}
        >
          Open Preset… <DropdownMenuShortcut>O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
          onSelect={props.onShuffle}
        >
          Shuffle <DropdownMenuShortcut>R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
          onSelect={props.onToggleMode}
        >
          Light/Dark <DropdownMenuShortcut>D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator class="-mx-1.5 my-1.5 bg-neutral-600 dark:bg-neutral-700" />
        <DropdownMenuItem
          class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
          onSelect={props.onReset}
        >
          Reset <DropdownMenuShortcut>⇧R</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
          onNavigate={props.onNavigate}
          onOpenPreset={() => setPresetOpen(true)}
          onShuffle={handleShuffle}
          onToggleMode={props.onToggleMode}
          onReset={props.onReset}
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
        <div class="hidden min-w-0 w-full md:flex md:flex-col">{props.setupAction}</div>
      </CardFooter>
    </Card>
  );
}
