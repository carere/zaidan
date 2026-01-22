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
  ACCENT_COLORS,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
  THEME_COLORS,
} from "./constants";

export default function ThemePicker() {
  const currentValue = THEME_COLORS[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Theme</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{ "background-color": currentValue.color }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "max-h-80 min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            {/* Base Color Match Group */}
            <DropdownMenuGroup>
              <For each={THEME_COLORS}>
                {(theme) => (
                  <DropdownMenuRadioItem
                    value={theme.value}
                    class={cn(pickerRadioItemClass, "flex-col items-start")}
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="size-4 rounded-full border border-foreground/10"
                        style={{ "background-color": theme.color }}
                      />
                      <span class="text-sm">{theme.label}</span>
                    </div>
                    <p class="pl-6 text-muted-foreground text-xs">{theme.description}</p>
                  </DropdownMenuRadioItem>
                )}
              </For>
            </DropdownMenuGroup>

            <DropdownMenuSeparator class="my-1" />

            {/* Color Themes Group */}
            <DropdownMenuGroup>
              <For each={ACCENT_COLORS}>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
