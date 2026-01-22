import {
  CircleDotIcon,
  CornerDownLeftIcon,
  MoonIcon,
  PaintBucket,
  Settings2Icon,
  SquareIcon,
  SquareRoundCornerIcon,
} from "lucide-solid";
import { type ComponentProps, For } from "solid-js";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import { FieldGroup } from "@/registry/ui/field";

// ============================================================================
// Picker Options Data
// ============================================================================

const COMPONENT_LIBRARIES = [
  { value: "radix", label: "Radix UI" },
  { value: "base-ui", label: "Base UI" },
] as const;

const STYLES = [
  {
    value: "vega",
    label: "Vega",
    description: "The classic shadcn/ui look. Clean, neutral, and familiar.",
  },
  { value: "nova", label: "Nova", description: "Reduced padding and margins for compact layouts." },
  { value: "maia", label: "Maia", description: "Soft and rounded, with generous spacing." },
  { value: "lyra", label: "Lyra", description: "Boxy and sharp. Pairs well with mono fonts." },
  { value: "mira", label: "Mira", description: "Compact. Made for dense interfaces." },
] as const;

const BASE_COLORS = [
  { value: "neutral", label: "Neutral", color: "hsl(0 0% 45%)" },
  { value: "stone", label: "Stone", color: "hsl(25 5% 45%)" },
  { value: "zinc", label: "Zinc", color: "hsl(240 4% 46%)" },
  { value: "gray", label: "Gray", color: "hsl(220 9% 46%)" },
] as const;

const THEME_COLORS = [
  { value: "neutral", label: "Neutral", description: "Match base color", color: "hsl(0 0% 45%)" },
] as const;

const ACCENT_COLORS = [
  { value: "amber", label: "Amber", color: "hsl(45 93% 47%)" },
  { value: "blue", label: "Blue", color: "hsl(221 83% 53%)" },
  { value: "cyan", label: "Cyan", color: "hsl(189 94% 43%)" },
  { value: "emerald", label: "Emerald", color: "hsl(160 84% 39%)" },
  { value: "fuchsia", label: "Fuchsia", color: "hsl(293 69% 49%)" },
  { value: "green", label: "Green", color: "hsl(142 76% 36%)" },
  { value: "indigo", label: "Indigo", color: "hsl(239 84% 67%)" },
  { value: "lime", label: "Lime", color: "hsl(84 81% 44%)" },
  { value: "orange", label: "Orange", color: "hsl(25 95% 53%)" },
  { value: "pink", label: "Pink", color: "hsl(330 81% 60%)" },
  { value: "purple", label: "Purple", color: "hsl(271 81% 56%)" },
  { value: "red", label: "Red", color: "hsl(0 84% 60%)" },
  { value: "rose", label: "Rose", color: "hsl(347 77% 50%)" },
  { value: "sky", label: "Sky", color: "hsl(199 89% 48%)" },
  { value: "teal", label: "Teal", color: "hsl(173 80% 40%)" },
  { value: "violet", label: "Violet", color: "hsl(263 70% 50%)" },
  { value: "yellow", label: "Yellow", color: "hsl(48 96% 53%)" },
] as const;

const ICON_LIBRARIES = [
  { value: "lucide", label: "Lucide" },
  { value: "tabler", label: "Tabler Icons" },
  { value: "hugeicons", label: "HugeIcons" },
  { value: "phosphor", label: "Phosphor Icons" },
  { value: "remix", label: "Remix Icon" },
] as const;

const FONTS = [
  { value: "inter", label: "Inter", family: "Inter, sans-serif" },
  { value: "noto-sans", label: "Noto Sans", family: "'Noto Sans', sans-serif" },
  { value: "nunito-sans", label: "Nunito Sans", family: "'Nunito Sans', sans-serif" },
  { value: "figtree", label: "Figtree", family: "Figtree, sans-serif" },
  { value: "roboto", label: "Roboto", family: "Roboto, sans-serif" },
  { value: "raleway", label: "Raleway", family: "Raleway, sans-serif" },
  { value: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif" },
  { value: "public-sans", label: "Public Sans", family: "'Public Sans', sans-serif" },
  { value: "outfit", label: "Outfit", family: "Outfit, sans-serif" },
  { value: "jetbrains-mono", label: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
] as const;

const RADIUS_OPTIONS = [
  { value: "default", label: "Default", description: "Use radius from style" },
] as const;

const RADIUS_VALUES = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const;

const MENU_COLORS = [
  { value: "default", label: "Default" },
  { value: "inverted", label: "Inverted" },
] as const;

const MENU_ACCENTS = [
  { value: "subtle", label: "Subtle" },
  { value: "bold", label: "Bold" },
] as const;

// ============================================================================
// Picker Trigger Styles
// ============================================================================

const pickerTriggerClass = cn(
  "border-foreground/10 hover:bg-muted data-expanded:bg-muted",
  "relative w-[160px] shrink-0 rounded-xl border bg-muted/50 p-2",
  "md:w-full md:rounded-lg md:border-transparent md:bg-transparent",
  "flex cursor-pointer items-center justify-between",
);

const pickerContentClass = cn("rounded-xl border-0 p-1 shadow-md");

const pickerRadioItemClass = cn("cursor-pointer rounded-lg py-1.5 pr-8 pl-2");

// ============================================================================
// Component Library Picker
// ============================================================================

function ComponentLibraryPicker() {
  const currentValue = COMPONENT_LIBRARIES[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Component Library</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 25 25"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z"
              fill="currentColor"
            />
            <path d="M12 0H4V8H12V0Z" fill="currentColor" />
            <path
              d="M20.5 8C22.9853 8 25 5.98528 25 3.5C25 1.01472 22.9853 -1 20.5 -1C18.0147 -1 16 1.01472 16 3.5C16 5.98528 18.0147 8 20.5 8Z"
              fill="currentColor"
            />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={COMPONENT_LIBRARIES}>
                {(lib) => (
                  <DropdownMenuRadioItem value={lib.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      {lib.value === "radix" ? (
                        <svg class="size-4" viewBox="0 0 25 25" fill="none" aria-hidden="true">
                          <path
                            d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z"
                            fill="currentColor"
                          />
                          <path d="M12 0H4V8H12V0Z" fill="currentColor" />
                          <path
                            d="M20.5 8C22.9853 8 25 5.98528 25 3.5C25 1.01472 22.9853 -1 20.5 -1C18.0147 -1 16 1.01472 16 3.5C16 5.98528 18.0147 8 20.5 8Z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                          <path
                            d="M2 17L12 22L22 17"
                            stroke="currentColor"
                            stroke-width="2"
                            fill="none"
                          />
                          <path
                            d="M2 12L12 17L22 12"
                            stroke="currentColor"
                            stroke-width="2"
                            fill="none"
                          />
                        </svg>
                      )}
                      <span class="text-sm">{lib.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Style Picker
// ============================================================================

function StylePicker() {
  const currentValue = STYLES[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Style</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <SquareRoundCornerIcon class="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-64")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={STYLES}>
                {(style) => (
                  <DropdownMenuRadioItem
                    value={style.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start py-2")}
                  >
                    <div class="flex items-center gap-2">
                      <SquareRoundCornerIcon class="size-4" />
                      <span class="font-medium text-sm">{style.label}</span>
                    </div>
                    <p class="mt-0.5 pl-6 text-muted-foreground text-xs">{style.description}</p>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Base Color Picker
// ============================================================================

function BaseColorPicker() {
  const currentValue = BASE_COLORS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Base Color</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{ "background-color": currentValue.color }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={BASE_COLORS}>
                {(color) => (
                  <DropdownMenuRadioItem value={color.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      <div
                        class="size-4 rounded-full border border-foreground/10"
                        style={{ "background-color": color.color }}
                      />
                      <span class="text-sm">{color.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator class="my-1" />
          <DropdownMenuGroup>
            <div class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
              <MoonIcon class="size-4" />
              <span class="text-sm">Switch to Dark Mode</span>
            </div>
            <p class="px-2 pb-1 text-muted-foreground text-xs">
              Base colors are easier to see in dark mode.
            </p>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Theme Picker
// ============================================================================

function ThemePicker() {
  const currentValue = THEME_COLORS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Theme</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{ "background-color": currentValue.color }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "max-h-80 min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            {/* Base Color Match Group */}
            <DropdownMenuGroup>
              <For each={THEME_COLORS}>
                {(theme) => (
                  <DropdownMenuRadioItem
                    value={theme.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start")}
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="size-4 rounded-full border border-foreground/10"
                        style={{ "background-color": theme.color }}
                      />
                      <span class="text-sm">{theme.label}</span>
                    </div>
                    <p class="pl-6 text-muted-foreground text-xs">{theme.description}</p>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>

            <DropdownMenuSeparator class="my-1" />

            {/* Color Themes Group */}
            <DropdownMenuGroup>
              <For each={ACCENT_COLORS}>
                {(color) => (
                  <DropdownMenuRadioItem value={color.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      <div
                        class="size-4 rounded-full border border-foreground/10"
                        style={{ "background-color": color.color }}
                      />
                      <span class="text-sm">{color.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Icon Library Picker
// ============================================================================

function IconLibraryPicker() {
  const currentValue = ICON_LIBRARIES[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Icon Library</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="21.17" y1="8" x2="12" y2="8" />
            <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
            <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-56")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={ICON_LIBRARIES}>
                {(lib) => (
                  <DropdownMenuRadioItem
                    value={lib.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start py-2")}
                  >
                    <div class="flex items-center gap-2">
                      <svg
                        class="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                      <span class="font-medium text-sm">{lib.label}</span>
                    </div>
                    {/* Icon preview grid placeholder */}
                    <div class="mt-1.5 grid grid-cols-7 gap-1 pl-6">
                      <For each={Array(14).fill(0)}>
                        {() => <div class="size-3 rounded-sm bg-muted-foreground/20" />}
                      </For>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Font Picker
// ============================================================================

function FontPicker() {
  const currentValue = FONTS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Font</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <div class="font-medium text-muted-foreground text-sm">Aa</div>
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "max-h-80 min-w-72")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={FONTS}>
                {(font) => (
                  <DropdownMenuRadioItem
                    value={font.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start py-2")}
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class="w-6 text-muted-foreground text-xs"
                        style={{ "font-family": font.family }}
                      >
                        Aa
                      </span>
                      <span class="font-medium text-sm">{font.label}</span>
                    </div>
                    <p
                      class="mt-0.5 max-w-full truncate pl-8 text-muted-foreground text-xs"
                      style={{ "font-family": font.family }}
                    >
                      Designers love packing quirky glyphs into test phrases.
                    </p>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Radius Picker
// ============================================================================

function RadiusPicker() {
  const currentValue = RADIUS_OPTIONS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Radius</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <CornerDownLeftIcon class="size-4 -rotate-90 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            {/* Default Group */}
            <DropdownMenuGroup>
              <For each={RADIUS_OPTIONS}>
                {(option) => (
                  <DropdownMenuRadioItem
                    value={option.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start")}
                  >
                    <span class="text-sm">{option.label}</span>
                    <p class="text-muted-foreground text-xs">{option.description}</p>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>

            <DropdownMenuSeparator class="my-1" />

            {/* Radius Values Group */}
            <DropdownMenuGroup>
              <For each={RADIUS_VALUES}>
                {(radius) => (
                  <DropdownMenuRadioItem value={radius.value} class={pickerRadioItemClass}>
                    <span class="text-sm">{radius.label}</span>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Menu Color Picker
// ============================================================================

function MenuColorPicker() {
  const currentValue = MENU_COLORS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Menu Color</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <SquareIcon class="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-40")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={MENU_COLORS}>
                {(menu) => (
                  <DropdownMenuRadioItem value={menu.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      {menu.value === "default" ? (
                        <SquareIcon class="size-4" />
                      ) : (
                        <div class="size-4 rounded-sm bg-foreground" />
                      )}
                      <span class="text-sm">{menu.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Menu Accent Picker
// ============================================================================

function MenuAccentPicker() {
  const currentValue = MENU_ACCENTS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Menu Accent</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <PaintBucket class="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-36")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={MENU_ACCENTS}>
                {(accent) => (
                  <DropdownMenuRadioItem value={accent.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      <CircleDotIcon
                        class="size-4"
                        classList={{
                          "text-muted-foreground": accent.value === "subtle",
                          "text-primary": accent.value === "bold",
                        }}
                      />
                      <span class="text-sm">{accent.label}</span>
                    </div>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Main Customizer Component
// ============================================================================

export function Customizer(props: ComponentProps<"div">) {
  return (
    <div
      class={cn(
        "no-scrollbar -mx-2.5 flex flex-col overflow-y-auto p-1 md:mx-0 md:h-[calc(100svh-var(--header-height)-2rem)] md:w-48 md:gap-0 md:py-0",
        props.class,
      )}
    >
      <div class="hidden items-center gap-2 px-[calc(--spacing(2.5))] pb-1 md:flex md:flex-col md:items-start">
        <Settings2Icon class="size-4" strokeWidth={2} />
        <div class="relative flex flex-col gap-1 rounded-lg text-[13px]/snug">
          <div class="flex items-center gap-1 text-balance font-medium">
            Build your own shadcn/ui
          </div>
          <div class="hidden md:flex">
            When you&apos;re done, click Create Project to start a new project.
          </div>
        </div>
      </div>
      <div class="no-scrollbar h-14 overflow-x-auto overflow-y-hidden p-px md:h-full md:overflow-y-auto md:overflow-x-hidden">
        <FieldGroup class="flex h-full flex-1 flex-row gap-2 md:flex-col md:gap-0">
          <ComponentLibraryPicker />
          <StylePicker />
          <BaseColorPicker />
          <ThemePicker />
          <IconLibraryPicker />
          <FontPicker />
          <RadiusPicker />
          <MenuColorPicker />
          <MenuAccentPicker />
        </FieldGroup>
      </div>
    </div>
  );
}
