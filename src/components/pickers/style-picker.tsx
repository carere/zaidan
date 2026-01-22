import { SquareRoundCornerIcon } from "lucide-solid";
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
import { pickerContentClass, pickerRadioItemClass, pickerTriggerClass, STYLES } from "./constants";

export default function StylePicker() {
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
