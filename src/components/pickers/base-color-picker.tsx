import { useColorMode } from "@kobalte/core";
import { createSignal, For } from "solid-js";
import { match } from "ts-pattern";
import type { BaseColor } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const colors = ["neutral", "stone", "zinc", "gray"] satisfies BaseColor[];

export default function BaseColorPicker() {
  const [selectedColor, selectColor] = createSignal<BaseColor>("neutral");
  const { colorMode, toggleColorMode } = useColorMode();
  const isMobile = useIsMobile();

  const getLabel = (color: BaseColor) =>
    match(color)
      .with("neutral", () => "Neutral")
      .with("stone", () => "Stone")
      .with("zinc", () => "Zinc")
      .with("gray", () => "Gray")
      .exhaustive();

  const getColor = (color: BaseColor) =>
    match(color)
      .with("neutral", () => "hsl(0 0% 45%)")
      .with("stone", () => "hsl(25 5% 45%)")
      .with("zinc", () => "hsl(240 4% 46%)")
      .with("gray", () => "hsl(220 9% 46%)")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={4} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Base Color</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedColor())}</div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{ "background-color": getColor(selectedColor()) }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="md:w-52">
          <DropdownMenuRadioGroup value={selectedColor()} onChange={selectColor}>
            <For each={colors}>
              {(color) => (
                <DropdownMenuRadioItem value={color}>
                  <div class="flex items-center gap-2">
                    <div
                      class="size-4 rounded-full border border-foreground/10"
                      style={{ "background-color": getColor(color) }}
                    />
                    <span class="text-sm">{getLabel(color)}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator class="my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={toggleColorMode}>
              <div class="flex flex-col justify-start pointer-coarse:gap-1">
                <span class="text-sm">
                  Switch to {colorMode() === "dark" ? "Light" : "Dark"} Mode
                </span>
                <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                  Base colors are easier to see in dark mode.
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
