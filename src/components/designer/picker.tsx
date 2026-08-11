import { createMemo, For, type JSX, Show } from "solid-js";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

/**
 * The designer picker, shared by the create and typeset builders: a labelled
 * trigger showing the current pick, a radio menu that previews on hover and
 * commits on select, and a lock toggle for shuffle.
 *
 * Both builders render the same control, so styling and behaviour changes land
 * on both at once.
 */

export const pickerContentClass =
  "dark no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*6)] min-w-32 overflow-y-auto rounded-xl border-0 bg-neutral-950/80 p-1.5 text-neutral-100 ring-1 ring-neutral-950/80 shadow-xl backdrop-blur-xl md:w-52 dark:bg-neutral-800/90 dark:ring-neutral-700/50";
export const pickerTriggerClass =
  "relative w-36 shrink-0 touch-manipulation rounded-xl p-3 ring-1 ring-foreground/10 select-none hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:px-2.5 md:py-2";
export const pickerItemClass =
  "rounded-lg py-1.5 pr-8 pl-2 font-medium text-sm **:text-neutral-100 data-highlighted:bg-neutral-600 data-highlighted:text-neutral-100 pointer-coarse:py-2.5 pointer-coarse:pl-3 pointer-coarse:text-base";
export const pickerSeparatorClass = "-mx-1.5 my-1.5 bg-neutral-600 dark:bg-neutral-700";

export type PickerOption = {
  value: string;
  label: string;
  preview?: () => JSX.Element;
};

/** An optional heading above a run of options; used by the font pickers. */
export type PickerGroup = {
  label?: string;
  options: PickerOption[];
};

export function Picker<K extends string>(props: {
  label: string;
  configKey: K;
  value: string;
  /** Flat list; use `groups` instead when the menu needs headings. */
  options?: PickerOption[];
  groups?: PickerGroup[];
  /** Overrides the trigger glyph, which otherwise mirrors the current option. */
  icon?: () => JSX.Element;
  locked: boolean;
  class?: string;
  onCommit: (key: K, value: string) => void;
  onPreview: (key: K, value?: string) => void;
  onToggleLock: (key: K) => void;
}) {
  const isMobile = useIsMobile();
  const groups = createMemo<PickerGroup[]>(
    () => props.groups ?? [{ options: props.options ?? [] }],
  );
  const current = createMemo(() =>
    groups()
      .flatMap((group) => group.options)
      .find((option) => option.value === props.value),
  );

  return (
    <div class={cn("group/picker relative", props.class)}>
      <DropdownMenu
        placement={isMobile() ? "top" : "right-start"}
        gutter={isMobile() ? 16 : 20}
        onOpenChange={(open) => !open && props.onPreview(props.configKey)}
      >
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <span class="flex flex-col justify-start text-left">
            <span class="font-normal text-muted-foreground text-xs">{props.label}</span>
            <span class="line-clamp-1 max-w-[80%] truncate font-normal text-foreground text-sm">
              {current()?.label}
            </span>
          </span>
          <span class="pointer-events-none absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center text-foreground select-none md:right-2.5">
            {props.icon?.() ?? current()?.preview?.()}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class={pickerContentClass}
          onMouseLeave={() => props.onPreview(props.configKey)}
        >
          <DropdownMenuRadioGroup
            value={props.value}
            onChange={(value) => props.onCommit(props.configKey, value)}
          >
            <For each={groups()}>
              {(group, index) => (
                <>
                  <Show when={index() > 0}>
                    <DropdownMenuSeparator class={pickerSeparatorClass} />
                  </Show>
                  <DropdownMenuGroup>
                    <Show when={group.label}>
                      <DropdownMenuLabel class="px-2 py-1.5 font-medium text-neutral-400 text-xs">
                        {group.label}
                      </DropdownMenuLabel>
                    </Show>
                    <For each={group.options}>
                      {(option) => (
                        <DropdownMenuRadioItem
                          value={option.value}
                          // Kobalte defaults radio items to staying open on
                          // select; upstream's picker closes, and so does this.
                          closeOnSelect
                          class={pickerItemClass}
                          onMouseMove={() =>
                            !isMobile() && props.onPreview(props.configKey, option.value)
                          }
                          onFocus={() =>
                            !isMobile() && props.onPreview(props.configKey, option.value)
                          }
                        >
                          <span class="flex min-w-0 flex-1 items-center gap-2">
                            {option.preview?.()}
                            <span>{option.label}</span>
                          </span>
                        </DropdownMenuRadioItem>
                      )}
                    </For>
                  </DropdownMenuGroup>
                </>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton
        locked={props.locked}
        onToggle={() => props.onToggleLock(props.configKey)}
        class="absolute top-1/2 right-8 -translate-y-1/2"
      />
    </div>
  );
}

export function LockButton(props: { locked: boolean; onToggle: () => void; class?: string }) {
  const label = () => (props.locked ? "Unlock" : "Lock");

  return (
    <button
      type="button"
      title={label()}
      aria-label={label()}
      onClick={props.onToggle}
      data-locked={props.locked}
      class={cn(
        "flex size-4 cursor-pointer items-center justify-center rounded opacity-0 ring-foreground/60 transition-opacity outline-none group-focus-within/picker:opacity-100 group-hover/picker:opacity-100 focus:opacity-100 focus-visible:ring-1 data-[locked=true]:opacity-100 pointer-coarse:hidden",
        props.class,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" class="size-5 text-foreground" aria-hidden="true">
        <path
          d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12104 13.2453 4 14.3624 4 15.5C4 16.6376 4.12104 17.7547 4.26781 18.8447Z"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d={
            props.locked
              ? "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9"
              : "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C13.9593 2 15.5 3.5 16 5"
          }
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12.125 15.5H12M12.25 15.5C12.25 15.6381 12.1381 15.75 12 15.75C11.8619 15.75 11.75 15.6381 11.75 15.5C11.75 15.3619 11.8619 15.25 12 15.25C12.1381 15.25 12.25 15.3619 12.25 15.5Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}
