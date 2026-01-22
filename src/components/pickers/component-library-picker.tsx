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
  COMPONENT_LIBRARIES,
  pickerContentClass,
  pickerRadioItemClass,
  pickerTriggerClass,
} from "./constants";

export default function ComponentLibraryPicker() {
  const currentValue = COMPONENT_LIBRARIES[0];

  return (
    <div class="group/picker relative">
      <DropdownMenu>
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Component Library</div>
            <div class="font-medium text-foreground text-sm">{currentValue.label}</div>
          </div>
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 25 25"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z"
              fill="currentColor"
            />
            <path d="M12 0H4V8H12V0Z" fill="currentColor" />
            <path
              d="M20.5 8C22.9853 8 25 5.98528 25 3.5C25 1.01472 22.9853 -1 20.5 -1C18.0147 -1 16 1.01472 16 3.5C16 5.98528 18.0147 8 20.5 8Z"
              fill="currentColor"
            />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn(pickerContentClass, "min-w-48")}>
          <DropdownMenuRadioGroup value={currentValue.value}>
            <DropdownMenuGroup>
              <For each={COMPONENT_LIBRARIES}>
                {(lib) => (
                  <DropdownMenuRadioItem value={lib.value} class={pickerRadioItemClass}>
                    <div class="flex items-center gap-2">
                      {lib.value === "radix" ? (
                        <svg class="size-4" viewBox="0 0 25 25" fill="none" aria-hidden="true">
                          <path
                            d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z"
                            fill="currentColor"
                          />
                          <path d="M12 0H4V8H12V0Z" fill="currentColor" />
                          <path
                            d="M20.5 8C22.9853 8 25 5.98528 25 3.5C25 1.01472 22.9853 -1 20.5 -1C18.0147 -1 16 1.01472 16 3.5C16 5.98528 18.0147 8 20.5 8Z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                          <path
                            d="M2 17L12 22L22 17"
                            stroke="currentColor"
                            stroke-width="2"
                            fill="none"
                          />
                          <path
                            d="M2 12L12 17L22 12"
                            stroke="currentColor"
                            stroke-width="2"
                            fill="none"
                          />
                        </svg>
                      )}
                      <span class="text-sm">{lib.label}</span>
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
