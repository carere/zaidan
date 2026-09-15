import { For, Show } from "solid-js";
import { pickerContentClass, pickerSeparatorClass } from "@/components/designer/picker";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

/** One row in the designer menu; `separatorBefore` opens a new block. */
export type MenuAction = {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
};

function Menu09Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-5" aria-hidden="true">
      <path
        d="M4 8.5L20 8.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4 15.5L20 15.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** The header menu shared by the create and typeset builders. */
export function MainMenu(props: { items: MenuAction[] }) {
  return (
    <DropdownMenu placement="right-start" gutter={12}>
      <DropdownMenuTrigger class="relative flex w-36 shrink-0 touch-manipulation justify-between rounded-xl p-3 ring-1 ring-foreground/10 select-none hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:px-2.5 md:py-2">
        <span class="font-normal text-sm">Menu</span>
        <span class="pointer-events-none absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center text-foreground select-none">
          <Menu09Icon />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent class={cn(pickerContentClass, "w-52")}>
        <For each={props.items}>
          {(item) => (
            <>
              <Show when={item.separatorBefore}>
                <DropdownMenuSeparator class={pickerSeparatorClass} />
              </Show>
              <DropdownMenuItem
                class="rounded-lg px-2 py-1.5 font-medium text-sm data-highlighted:bg-neutral-600"
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                {item.label}
                <Show when={item.shortcut}>
                  <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
                </Show>
              </DropdownMenuItem>
            </>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
