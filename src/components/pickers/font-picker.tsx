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
import { FONTS, pickerContentClass, pickerRadioItemClass, pickerTriggerClass } from "./constants";

export default function FontPicker() {
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
