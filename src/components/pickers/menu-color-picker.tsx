import { SquareIcon } from "lucide-solid";
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
  MENU_COLORS,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
} from "./constants";

export default function MenuColorPicker() {
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
