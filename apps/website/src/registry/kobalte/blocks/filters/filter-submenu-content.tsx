import type { Accessor } from "solid-js";
import { createSignal, For, Match, Show, Switch } from "solid-js";

import { cn } from "@/lib/utils";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
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

  const fieldOptions = createFieldOptions<T>(
    () => props.field,
    searchInput,
    () => true,
  );

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

    return (
      <DropdownMenuCheckboxItem
        onFocus={() => setHighlightedIndex(index())}
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

  return (
    <div class="flex flex-col">
      <Show when={props.field.searchable !== false}>
        <DropdownMenuItem
          as={Input}
          role="searchbox"
          closeOnSelect={false}
          textValue={props.i18n.placeholders.searchField(props.field.label || "")}
          type="search"
          placeholder={props.i18n.placeholders.searchField(props.field.label || "")}
          class={cn(
            "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
            "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
          value={searchInput()}
          onInput={(event) => setSearchInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Keep text editing in the search input; the submenu handles navigation.
            if (!["ArrowDown", "ArrowUp", "Escape", "Tab"].includes(event.key)) {
              event.stopPropagation();
            }
          }}
        />
        <DropdownMenuSeparator />
      </Show>
      <div class="relative flex max-h-full">
        <div class="flex max-h-[min(var(--kb-popper-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden">
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
