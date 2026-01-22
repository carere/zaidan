import { MoonIcon } from "lucide-solid";
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
  BASE_COLORS,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
} from "./constants";

export default function BaseColorPicker() {
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
