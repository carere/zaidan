import { createSignal, For } from "solid-js";
import { match } from "ts-pattern";
import { Radius as RadiusIcon } from "@/components/icons/radius";
import type { Radius } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const radii = ["none", "small", "medium", "large"] satisfies Radius[];

export default function RadiusPicker() {
  const [selectedRadius, selectRadius] = createSignal<Radius | "default">("default");
  const isMobile = useIsMobile();

  const getLabel = (radius: Radius | "default") =>
    match(radius)
      .with("default", () => "Default")
      .with("none", () => "None")
      .with("small", () => "Small")
      .with("medium", () => "Medium")
      .with("large", () => "Large")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={isMobile() ? 8 : 0} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Radius</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedRadius())}</div>
          </div>
          <RadiusIcon class="size-4 rotate-90 text-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="md:w-58">
          <DropdownMenuRadioGroup value={selectedRadius()} onChange={selectRadius}>
            {/* Default Group */}
            <DropdownMenuRadioItem value="default">
              <div class="flex flex-col justify-start pointer-coarse:gap-1">
                <div>Default</div>
                <div class="pointer-coarse:text-sm text-muted-foreground text-xs">
                  Use radius from style
                </div>
              </div>
            </DropdownMenuRadioItem>

            <DropdownMenuSeparator class="my-1" />

            {/* Radius Values Group */}
            <For each={(radii as (Radius | "default")[]).filter((radius) => radius !== "default")}>
              {(radius) => (
                <DropdownMenuRadioItem value={radius as Radius}>
                  <span class="font-extralight text-sm">{getLabel(radius as Radius)}</span>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
