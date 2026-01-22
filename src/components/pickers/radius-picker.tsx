import { CornerDownLeftIcon } from "lucide-solid";
import { For } from "solid-js";
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
import {
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
  RADIUS_OPTIONS,
  RADIUS_VALUES,
} from "./constants";

export default function RadiusPicker() {
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
