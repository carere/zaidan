import { For } from "solid-js";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import {
  ICON_LIBRARIES,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
} from "./constants";

export default function IconLibraryPicker() {
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
