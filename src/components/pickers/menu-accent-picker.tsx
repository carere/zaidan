import { CircleDotIcon, PaintBucket } from "lucide-solid";
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
  MENU_ACCENTS,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
} from "./constants";

export default function MenuAccentPicker() {
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
