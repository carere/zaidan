import type { Accessor } from "solid-js";
import { createEffect, createSignal, createUniqueId, For, Match, on, Show, Switch } from "solid-js";

import { cn } from "@/lib/utils";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Input } from "@/registry/kobalte/ui/input";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import { DEFAULT_I18N } from "./i18n";
import type { FilterOption, FilterSubmenuContentProps } from "./types";
import { createFieldOptions } from "./use-field-options";
import { renderIcon } from "./utils";

const FilterSubmenuContent = <T = unknown>(props: FilterSubmenuContentProps<T>) => {
  const [searchInput, setSearchInput] = createSignal("");
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;
  const baseId = createUniqueId();

  const fieldOptions = createFieldOptions<T>(
    () => props.field,
    searchInput,
    () => true,
  );

  createEffect(() => {
    if (!props.isActive) return;
    if (props.field.searchable !== false) {
      inputRef?.focus();
    } else {
      const listbox = document.getElementById(`${baseId}-listbox`);
      listbox?.focus();
    }
  });

  createEffect(() => {
    if (highlightedIndex() >= 0 && props.isActive) {
      const element = document.getElementById(`${baseId}-item-${highlightedIndex()}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  });

  const filteredOptions = (): FilterOption<T>[] => {
    // Async fields: keep selected values first (resolved from cache so they
    // stay labelled), then the loader's already-query-filtered results.
    if (fieldOptions.isAsync()) {
      const selected = new Set(props.currentValues);
      return [
        ...fieldOptions.resolveSelected(props.currentValues),
        ...fieldOptions.options().filter((option) => !selected.has(option.value)),
      ];
    }
    return (
      props.field.options?.filter((option) => {
        const isSelected = props.currentValues.includes(option.value);
        if (isSelected) return true;
        if (!searchInput()) return true;
        return option.label.toLowerCase().includes(searchInput().toLowerCase());
      }) ?? []
    );
  };

  const renderOptionRow = (option: FilterOption<T>, index: Accessor<number>) => {
    const isSelected = () => props.currentValues.includes(option.value);
    const isHighlighted = () => highlightedIndex() === index();

    return (
      <DropdownMenuCheckboxItem
        id={`${baseId}-item-${index()}`}
        role="option"
        aria-selected={isHighlighted()}
        data-highlighted={isHighlighted() || undefined}
        onMouseEnter={() => setHighlightedIndex(index())}
        checked={isSelected()}
        closeOnSelect={!props.isMultiSelect}
        class={cn(
          "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
          option.class,
        )}
        onChange={() => props.onToggle(option.value as T, isSelected())}
      >
        {renderIcon(option.icon)}
        <span class="truncate">{option.label}</span>
      </DropdownMenuCheckboxItem>
    );
  };

  const renderOptionItem = (option: FilterOption<T>, index: number) =>
    renderOptionRow(option, () => index);

  // One deterministic rule instead of upstream's reset-then-rehighlight pair
  // (see the same note in filters.tsx): the first row is highlighted whenever
  // this submenu is active and something matches.
  createEffect(
    on([searchInput, () => props.isActive, filteredOptions], ([, isActive, options]) => {
      setHighlightedIndex(isActive && options.length > 0 ? 0 : -1);
    }),
  );

  const selectHighlighted = () => {
    const option = filteredOptions()[highlightedIndex()];
    if (!option) return;
    props.onToggle(option.value as T, props.currentValues.includes(option.value));
    if (!props.isMultiSelect) {
      props.onBack?.();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredOptions().length > 0) {
        setHighlightedIndex((previous) =>
          previous < filteredOptions().length - 1 ? previous + 1 : 0,
        );
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredOptions().length > 0) {
        setHighlightedIndex((previous) =>
          previous > 0 ? previous - 1 : filteredOptions().length - 1,
        );
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      props.onBack?.();
    } else if (event.key === "Enter" && highlightedIndex() >= 0) {
      event.preventDefault();
      selectHighlighted();
    } else if (event.key === "Escape") {
      event.preventDefault();
      props.onClose?.();
    }
    event.stopPropagation();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer hover mirrors the upstream submenu activation, keyboard is handled by the listbox below
    <div class="flex flex-col" onMouseEnter={() => props.onActive?.()}>
      <Show when={props.field.searchable !== false}>
        <Input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={true}
          aria-haspopup="listbox"
          aria-controls={`${baseId}-listbox`}
          aria-activedescendant={
            highlightedIndex() >= 0 ? `${baseId}-item-${highlightedIndex()}` : undefined
          }
          placeholder={props.i18n.placeholders.searchField(props.field.label || "")}
          class={cn(
            "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
            "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
            props.isActive && "placeholder:text-foreground",
          )}
          value={searchInput()}
          onBlur={() => {
            if (props.isActive) inputRef?.focus();
          }}
          onInput={(event) => setSearchInput(event.currentTarget.value)}
          onFocus={() => props.onActive?.()}
          onMouseEnter={(event) => {
            props.onActive?.();
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleListKeyDown}
        />
        <DropdownMenuSeparator />
      </Show>
      <div class="relative flex max-h-full">
        <div
          class="flex max-h-[min(var(--kb-popper-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          role="listbox"
          id={`${baseId}-listbox`}
          tabindex={props.field.searchable === false ? 0 : -1}
          onKeyDown={(event) => {
            if (props.field.searchable === false) {
              handleListKeyDown(event);
            }
          }}
        >
          <Switch>
            <Match when={fieldOptions.loading() && filteredOptions().length === 0}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {props.i18n.loadingOptions ?? DEFAULT_I18N.loadingOptions}
              </div>
            </Match>
            <Match when={fieldOptions.error()}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {props.i18n.errorLoadingOptions ?? DEFAULT_I18N.errorLoadingOptions}
              </div>
            </Match>
            <Match when={filteredOptions().length === 0}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {props.i18n.noResultsFound}
              </div>
            </Match>
            <Match when={props.field.renderOptionList}>
              {(renderOptionList) =>
                // Getters keep this `Match` from re-running (and re-creating the
                // consumer's list component) on every keystroke / highlight move.
                renderOptionList()({
                  get options() {
                    return filteredOptions();
                  },
                  get highlightedIndex() {
                    return highlightedIndex();
                  },
                  renderOption: renderOptionItem,
                })
              }
            </Match>
            <Match when={true}>
              <ScrollArea class="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
                <DropdownMenuGroup>
                  <For each={filteredOptions()}>
                    {(option, index) => renderOptionRow(option, index)}
                  </For>
                </DropdownMenuGroup>
              </ScrollArea>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  );
};

export { FilterSubmenuContent };
