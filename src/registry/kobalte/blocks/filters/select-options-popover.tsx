import type { Accessor, JSX } from "solid-js";
import { createEffect, createSignal, createUniqueId, For, Match, on, Show, Switch } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroupText } from "@/registry/kobalte/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Input } from "@/registry/kobalte/ui/input";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import { useFilterContext } from "./context";
import { FilterInput } from "./filter-input";
import { DEFAULT_I18N } from "./i18n";
import type { FilterOption, FilterValueSelectorProps, SelectOptionsPopoverProps } from "./types";
import { createFieldOptions } from "./use-field-options";

const SelectOptionsPopover = <T = unknown>(props: SelectOptionsPopoverProps<T>) => {
  const [open, setOpen] = createSignal(false);
  const [searchInput, setSearchInput] = createSignal("");
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;
  const context = useFilterContext();
  const baseId = createUniqueId();

  const fieldOptions = createFieldOptions<T>(
    () => props.field,
    searchInput,
    () => Boolean(props.inline) || open(),
  );

  // Kobalte mounts the popup and moves focus to the content element only after
  // this component's own effects have flushed, so focusing from an `open()`
  // effect would run against a stale ref. Claim focus from the input's ref on
  // the next tick instead, which lands after Kobalte's open auto-focus.
  const focusSearchInput = (element: HTMLInputElement) => {
    inputRef = element;
    if (props.inline) return;
    setTimeout(() => element.focus(), 0);
  };

  createEffect(
    on([searchInput, open], () => {
      setHighlightedIndex(-1);
    }),
  );

  createEffect(() => {
    if (highlightedIndex() >= 0 && open()) {
      const element = document.getElementById(`${baseId}-item-${highlightedIndex()}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  });

  const isMultiSelect = () => props.field.type === "multiselect" || props.values.length > 1;
  const effectiveValues = () =>
    (props.field.value !== undefined ? props.field.value : props.values) || [];

  // Static fields read their list verbatim (unchanged legacy behavior). Async
  // fields resolve selected values from the value->label cache and take the
  // loader's (already query-filtered) result as the unselected list.
  const selectedOptions = () =>
    fieldOptions.isAsync()
      ? fieldOptions.resolveSelected(effectiveValues())
      : (props.field.options?.filter((option) => effectiveValues().includes(option.value)) ?? []);
  const unselectedOptions = () =>
    fieldOptions.isAsync()
      ? fieldOptions.options().filter((option) => !effectiveValues().includes(option.value))
      : (props.field.options?.filter((option) => !effectiveValues().includes(option.value)) ?? []);

  // Filter options based on search input (client-side for static lists; async
  // loaders have already filtered by the query).
  const filteredSelectedOptions = selectedOptions; // Keep all selected visible
  const filteredUnselectedOptions = () =>
    fieldOptions.isAsync()
      ? unselectedOptions()
      : unselectedOptions().filter((option) =>
          option.label.toLowerCase().includes(searchInput().toLowerCase()),
        );

  const allFilteredOptions = () => [...filteredSelectedOptions(), ...filteredUnselectedOptions()];

  const handleClose = () => {
    setOpen(false);
    props.onClose?.();
  };

  // Toggle a single option, shared by the plain and custom (renderOptionList)
  // renderers so both behave identically.
  const toggleOption = (option: FilterOption<T>) => {
    const values = effectiveValues();
    const isSelected = values.includes(option.value);
    const next = isSelected
      ? (values.filter((value) => value !== option.value) as T[])
      : isMultiSelect()
        ? ([...values, option.value] as T[])
        : ([option.value] as T[]);

    if (
      !isSelected &&
      isMultiSelect() &&
      props.field.maxSelections &&
      next.length > props.field.maxSelections
    ) {
      return;
    }

    if (props.field.onValueChange) {
      props.field.onValueChange(next);
    } else {
      props.onChange(next);
    }
    if (!isMultiSelect()) handleClose();
  };

  const renderOptionRow = (option: FilterOption<T>, index: Accessor<number>) => {
    const isSelected = () => effectiveValues().includes(option.value);
    const isHighlighted = () => highlightedIndex() === index();

    return (
      <DropdownMenuCheckboxItem
        id={`${baseId}-item-${index()}`}
        role="option"
        aria-selected={isHighlighted()}
        data-highlighted={isHighlighted() || undefined}
        onMouseEnter={() => setHighlightedIndex(index())}
        checked={isSelected()}
        closeOnSelect={!isMultiSelect()}
        class={cn(
          "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
          option.class,
        )}
        onChange={() => toggleOption(option)}
      >
        {option.icon}
        <span class="truncate">{option.label}</span>
      </DropdownMenuCheckboxItem>
    );
  };

  const renderOptionItem = (option: FilterOption<T>, index: number) =>
    renderOptionRow(option, () => index);

  const MenuContent = () => (
    <>
      <Show when={props.field.searchable !== false}>
        <Input
          ref={focusSearchInput}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={true}
          aria-haspopup="listbox"
          aria-controls={`${baseId}-listbox`}
          aria-activedescendant={
            highlightedIndex() >= 0 ? `${baseId}-item-${highlightedIndex()}` : undefined
          }
          placeholder={context.i18n.placeholders.searchField(props.field.label || "")}
          class={cn(
            "h-8 rounded-none border-0 border-input bg-transparent! px-2 text-sm shadow-none",
            "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
            open() && "placeholder:text-foreground",
          )}
          value={searchInput()}
          onInput={(event) => setSearchInput(event.currentTarget.value)}
          onBlur={() => {
            if (open()) inputRef?.focus();
          }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (allFilteredOptions().length > 0) {
                setHighlightedIndex((previous) =>
                  previous < allFilteredOptions().length - 1 ? previous + 1 : 0,
                );
              }
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              if (allFilteredOptions().length > 0) {
                setHighlightedIndex((previous) =>
                  previous > 0 ? previous - 1 : allFilteredOptions().length - 1,
                );
              }
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "Enter" && highlightedIndex() >= 0) {
              event.preventDefault();
              const option = allFilteredOptions()[highlightedIndex()];
              if (option) {
                toggleOption(option);
              }
            }
            event.stopPropagation();
          }}
        />
        <DropdownMenuSeparator />
      </Show>
      <div class="relative flex max-h-full">
        <div
          class="flex max-h-[min(var(--kb-popper-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
          role="listbox"
          id={`${baseId}-listbox`}
        >
          <Switch>
            <Match when={fieldOptions.loading() && allFilteredOptions().length === 0}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {context.i18n.loadingOptions ?? DEFAULT_I18N.loadingOptions}
              </div>
            </Match>
            <Match when={fieldOptions.error()}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {context.i18n.errorLoadingOptions ?? DEFAULT_I18N.errorLoadingOptions}
              </div>
            </Match>
            <Match when={allFilteredOptions().length === 0}>
              <div class="py-2 text-center text-muted-foreground text-sm">
                {context.i18n.noResultsFound}
              </div>
            </Match>
            <Match when={props.field.renderOptionList}>
              {(renderOptionList) =>
                renderOptionList()({
                  options: allFilteredOptions(),
                  highlightedIndex: highlightedIndex(),
                  renderOption: renderOptionItem,
                })
              }
            </Match>
            <Match when={true}>
              <ScrollArea class="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
                {/* Selected items */}
                <Show when={filteredSelectedOptions().length > 0}>
                  <DropdownMenuGroup class="px-1">
                    <For each={filteredSelectedOptions()}>
                      {(option, index) => renderOptionRow(option, index)}
                    </For>
                  </DropdownMenuGroup>
                </Show>

                {/* Separator */}
                <Show
                  when={
                    filteredSelectedOptions().length > 0 && filteredUnselectedOptions().length > 0
                  }
                >
                  <DropdownMenuSeparator class="mx-0" />
                </Show>

                {/* Available items */}
                <Show when={filteredUnselectedOptions().length > 0}>
                  <DropdownMenuGroup class="px-1">
                    <For each={filteredUnselectedOptions()}>
                      {(option, index) =>
                        renderOptionRow(option, () => index() + filteredSelectedOptions().length)
                      }
                    </For>
                  </DropdownMenuGroup>
                </Show>
              </ScrollArea>
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );

  return (
    <Show
      when={!props.inline}
      fallback={
        <div class="w-full">
          <MenuContent />
        </div>
      }
    >
      <DropdownMenu
        placement="bottom-start"
        open={open()}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setTimeout(() => setSearchInput(""), 200);
          }
        }}
      >
        <DropdownMenuTrigger as={Button} variant="outline" size={context.size}>
          <div class="flex items-center gap-1.5">
            <Show
              when={props.field.customValueRenderer}
              fallback={
                <>
                  <Show when={selectedOptions().length > 0}>
                    <div class="-space-x-1.5 flex items-center">
                      <For each={selectedOptions().slice(0, 3)}>
                        {(option) => <div>{option.icon}</div>}
                      </For>
                    </div>
                  </Show>
                  {selectedOptions().length === 1
                    ? selectedOptions()[0].label
                    : selectedOptions().length > 1
                      ? `${selectedOptions().length} ${context.i18n.selectedCount}`
                      : context.i18n.select}
                </>
              }
            >
              {(customValueRenderer) =>
                customValueRenderer()(
                  props.values,
                  fieldOptions.isAsync()
                    ? fieldOptions.resolveSelected(props.values)
                    : (props.field.options ?? []),
                )
              }
            </Show>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent class={cn("w-[200px] px-0", props.field.class)}>
          <MenuContent />
        </DropdownMenuContent>
      </DropdownMenu>
    </Show>
  );
};

const FilterValueSelector = <T = unknown>(props: FilterValueSelectorProps<T>): JSX.Element => {
  return (
    <Show when={props.operator !== "empty" && props.operator !== "not_empty"}>
      <Switch
        fallback={
          <SelectOptionsPopover
            field={props.field}
            values={props.values}
            onChange={props.onChange}
          />
        }
      >
        <Match when={props.field.customRenderer}>
          {(customRenderer) => (
            <ButtonGroupText class="whitespace-nowrap bg-background text-start outline-hidden hover:bg-accent aria-expanded:bg-accent dark:bg-input/30">
              {customRenderer()({
                field: props.field,
                values: props.values,
                onChange: props.onChange,
                operator: props.operator,
              })}
            </ButtonGroupText>
          )}
        </Match>
        <Match when={props.field.type === "text"}>
          <FilterInput
            type="text"
            value={(props.values[0] as string) || ""}
            onInput={(event) => props.onChange([event.currentTarget.value] as T[])}
            placeholder={props.field.placeholder}
            pattern={props.field.pattern}
            field={props.field}
            class={cn("w-36", props.field.class)}
            autofocus={props.autofocus}
          />
        </Match>
      </Switch>
    </Show>
  );
};

export { FilterValueSelector, SelectOptionsPopover };
