import { createSignal, For } from "solid-js";
import { match } from "ts-pattern";
import type { Theme } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const themes = [
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
] satisfies Theme[];

export default function ThemePicker() {
  const [selectedTheme, selectTheme] = createSignal<Theme>("amber");
  const isMobile = useIsMobile();

  const getLabel = (theme: Theme | "neutral") =>
    match(theme)
      .with("neutral", () => "Neutral")
      .with("amber", () => "Amber")
      .with("blue", () => "Blue")
      .with("cyan", () => "Cyan")
      .with("emerald", () => "Emerald")
      .with("fuchsia", () => "Fuchsia")
      .with("green", () => "Green")
      .with("indigo", () => "Indigo")
      .with("lime", () => "Lime")
      .with("orange", () => "Orange")
      .with("pink", () => "Pink")
      .with("purple", () => "Purple")
      .with("red", () => "Red")
      .with("rose", () => "Rose")
      .with("sky", () => "Sky")
      .with("teal", () => "Teal")
      .with("violet", () => "Violet")
      .with("yellow", () => "Yellow")
      .exhaustive();

  const getColor = (theme: Theme | "neutral") =>
    match(theme)
      .with("neutral", () => "hsl(0 0% 45%)")
      .with("amber", () => "hsl(45 93% 47%)")
      .with("blue", () => "hsl(221 83% 53%)")
      .with("cyan", () => "hsl(189 94% 43%)")
      .with("emerald", () => "hsl(160 84% 39%)")
      .with("fuchsia", () => "hsl(293 69% 49%)")
      .with("green", () => "hsl(142 76% 36%)")
      .with("indigo", () => "hsl(239 84% 67%)")
      .with("lime", () => "hsl(84 81% 44%)")
      .with("orange", () => "hsl(25 95% 53%)")
      .with("pink", () => "hsl(330 81% 60%)")
      .with("purple", () => "hsl(271 81% 56%)")
      .with("red", () => "hsl(0 84% 60%)")
      .with("rose", () => "hsl(347 77% 50%)")
      .with("sky", () => "hsl(199 89% 48%)")
      .with("teal", () => "hsl(173 80% 40%)")
      .with("violet", () => "hsl(263 70% 50%)")
      .with("yellow", () => "hsl(48 96% 53%)")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Theme</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedTheme())}</div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{ "background-color": getColor(selectedTheme()) }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*4)] md:w-52">
          <DropdownMenuRadioGroup value={selectedTheme()} onChange={selectTheme}>
            {/* Base Color Match Group */}
            <DropdownMenuRadioItem value="neutral">
              <div class="flex items-start gap-2">
                <div
                  class="size-4 translate-y-1 rounded-full border border-foreground/10"
                  style={{ "background-color": "hsl(0 0% 45%)" }}
                />
                <span class="flex flex-col justify-start pointer-coarse:gap-1">
                  <span>Neutral</span>
                  <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                    Match base color
                  </span>
                </span>
              </div>
            </DropdownMenuRadioItem>

            <DropdownMenuSeparator class="my-1" />

            {/* Color Themes Group */}
            <For each={(themes as string[]).filter((theme) => theme !== "neutral")}>
              {(theme) => (
                <DropdownMenuRadioItem value={theme}>
                  <div class="flex items-center gap-2">
                    <div
                      class="size-4 rounded-full border border-foreground/10"
                      style={{ "background-color": getColor(theme as Theme) }}
                    />
                    <span class="text-sm">{getLabel(theme as Theme)}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
