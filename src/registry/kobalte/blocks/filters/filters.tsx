import { Plus } from "lucide-solid";
import type { ValidComponent } from "solid-js";
import { createEffect, createMemo, createSignal, For, mergeProps, onCleanup, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/registry/kobalte/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Input } from "@/registry/kobalte/ui/input";
import { Kbd } from "@/registry/kobalte/ui/kbd";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import { FilterContext, useFilterContext } from "./context";
import { FilterRemoveButton } from "./filter-input";
import { FilterOperatorDropdown } from "./filter-operator-dropdown";
import { FilterSubmenuContent } from "./filter-submenu-content";
import { mergeI18n } from "./i18n";
import { FilterValueSelector } from "./select-options-popover";
import type {
  Filter,
  FilterContextValue,
  FilterFieldConfig,
  FilterRadius,
  FilterSize,
  FiltersContentProps,
  FiltersProps,
  FilterVariant,
} from "./types";
import {
  createFilter,
  fieldHasOptions,
  filtersContainerVariants,
  flattenFields,
  getFieldsMap,
  renderIcon,
} from "./utils";

// Sera is an underline style: its group text and input group carry only a
// bottom border. Normalize the boxed segments (the operator, value and remove
// buttons) to the same treatment so the whole chip reads as one underlined
// group instead of mixing boxes and rules.
const FILTER_CHIP_CLASS =
  "style-sera:*:rounded-none style-sera:*:border-transparent style-sera:*:border-b-input";

const hasSubMenu = <T,>(field: FilterFieldConfig<T>): boolean =>
  (field.type === "select" || field.type === "multiselect") && fieldHasOptions(field);

const FiltersContent = <T = unknown>(props: FiltersContentProps<T>) => {
  const context = useFilterContext();
  const fieldsMap = createMemo(() => getFieldsMap(props.fields));
  // `<For>` diffs by reference and every update replaces the filter object, so
  // iterating the filters directly would tear down and rebuild a chip on each
  // keystroke (losing input focus and any custom control's internal state).
  // Iterate the stable string ids instead — the React `key={filter.id}` this
  // was ported from behaves the same way.
  const filterIds = createMemo(() => props.filters.map((filter) => filter.id));

  const updateFilter = (filterId: string, updates: Partial<Filter<T>>) => {
    props.onChange(
      props.filters.map((filter) => {
        if (filter.id === filterId) {
          const updatedFilter = { ...filter, ...updates };
          if (updates.operator === "empty" || updates.operator === "not_empty") {
            updatedFilter.values = [] as T[];
          }
          return updatedFilter;
        }
        return filter;
      }),
    );
  };

  const removeFilter = (filterId: string) => {
    props.onChange(props.filters.filter((filter) => filter.id !== filterId));
  };

  return (
    <div
      class={cn(
        filtersContainerVariants({ variant: context.variant, size: context.size }),
        context.class,
      )}
    >
      <For each={filterIds()}>
        {(filterId) => {
          const filter = () => props.filters.find((entry) => entry.id === filterId);

          return (
            <Show when={filter()}>
              {(currentFilter) => (
                <Show when={fieldsMap()[currentFilter().field]}>
                  {(field) => (
                    <ButtonGroup class={FILTER_CHIP_CLASS}>
                      <ButtonGroupText>
                        {renderIcon(field().icon)}
                        {field().label}
                      </ButtonGroupText>

                      <FilterOperatorDropdown<T>
                        field={field()}
                        operator={currentFilter().operator}
                        values={currentFilter().values}
                        onChange={(operator) => updateFilter(filterId, { operator })}
                      />

                      <FilterValueSelector<T>
                        field={field()}
                        values={currentFilter().values}
                        onChange={(values) => updateFilter(filterId, { values })}
                        operator={currentFilter().operator}
                        autofocus={false}
                      />

                      <FilterRemoveButton onClick={() => removeFilter(filterId)} />
                    </ButtonGroup>
                  )}
                </Show>
              )}
            </Show>
          );
        }}
      </For>
    </div>
  );
};

const Filters = <T = unknown>(rawProps: FiltersProps<T>) => {
  const props = mergeProps(
    {
      variant: "default" as FilterVariant,
      size: "default" as FilterSize,
      radius: "default" as FilterRadius,
      showSearchInput: true,
      allowMultiple: true,
      enableShortcut: false,
      shortcutKey: "f",
      shortcutLabel: "F",
    },
    rawProps,
  );

  // See `FiltersContent`: iterate stable ids so a chip survives its filter
  // object being replaced by an update.
  const filterIds = createMemo(() => props.filters.map((filter) => filter.id));
  const [addFilterOpen, setAddFilterOpen] = createSignal(false);
  const [menuSearchInput, setMenuSearchInput] = createSignal("");
  const [lastAddedFilterId, setLastAddedFilterId] = createSignal<string | null>(null);
  // Track which filter instance is being built in the current Add Filter menu
  // session. Maps fieldKey -> unique filterId created during this open session.
  const [sessionFilterIds, setSessionFilterIds] = createSignal<Record<string, string>>({});

  createEffect(() => {
    if (!props.enableShortcut) return;
    const shortcutKey = props.shortcutKey;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen() &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        event.preventDefault();
        setAddFilterOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    if (!lastAddedFilterId()) return;
    const timer = setTimeout(() => setLastAddedFilterId(null), 1000);
    onCleanup(() => clearTimeout(timer));
  });

  const mergedI18n = createMemo(() => mergeI18n(props.i18n));

  const fieldsMap = createMemo(() => getFieldsMap(props.fields));

  const updateFilter = (filterId: string, updates: Partial<Filter<T>>) => {
    props.onChange(
      props.filters.map((filter) => {
        if (filter.id === filterId) {
          const updatedFilter = { ...filter, ...updates };
          if (updates.operator === "empty" || updates.operator === "not_empty") {
            updatedFilter.values = [] as T[];
          }
          return updatedFilter;
        }
        return filter;
      }),
    );
  };

  const removeFilter = (filterId: string) => {
    props.onChange(props.filters.filter((filter) => filter.id !== filterId));
  };

  const addFilter = (fieldKey: string) => {
    const field = fieldsMap()[fieldKey];
    if (field?.key) {
      const defaultOperator =
        field.defaultOperator || (field.type === "multiselect" ? "is_any_of" : "is");
      const defaultValues: unknown[] = field.type === "text" ? [""] : [];
      const newFilter = createFilter<T>(fieldKey, defaultOperator, defaultValues as T[]);
      setLastAddedFilterId(newFilter.id);
      props.onChange([...props.filters, newFilter]);
      setAddFilterOpen(false);
      setMenuSearchInput("");
    }
  };

  const selectableFields = createMemo(() => {
    const flatFields = flattenFields(props.fields);
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") return false;
      if (props.allowMultiple) return true;
      return !props.filters.some((filter) => filter.field === field.key);
    });
  });

  const filteredFields = createMemo(() =>
    selectableFields().filter(
      (field) =>
        !menuSearchInput() || field.label?.toLowerCase().includes(menuSearchInput().toLowerCase()),
    ),
  );

  const contextValue: FilterContextValue = {
    get variant() {
      return props.variant;
    },
    get size() {
      return props.size;
    },
    get radius() {
      return props.radius;
    },
    get i18n() {
      return mergedI18n();
    },
    get class() {
      return props.class;
    },
    get showSearchInput() {
      return props.showSearchInput;
    },
    get trigger() {
      return props.trigger;
    },
    get allowMultiple() {
      return props.allowMultiple;
    },
  };

  return (
    <FilterContext.Provider value={contextValue}>
      <div
        class={cn(
          filtersContainerVariants({ variant: props.variant, size: props.size }),
          props.class,
        )}
      >
        <Show when={selectableFields().length > 0}>
          <DropdownMenu
            placement="bottom-start"
            open={addFilterOpen()}
            onOpenChange={(open) => {
              setAddFilterOpen(open);
              if (!open) {
                setMenuSearchInput("");
                setSessionFilterIds({});
              }
            }}
          >
            <Show
              when={props.trigger}
              fallback={
                <DropdownMenuTrigger as={Button} variant="outline">
                  <Plus />
                  {mergedI18n().addFilter}
                </DropdownMenuTrigger>
              }
            >
              {/* Solid has no `cloneElement`: the consumer supplies a component
                  and Kobalte's polymorphic `as` forwards the trigger props to it. */}
              {(trigger) => (
                <DropdownMenuTrigger as={trigger() as ValidComponent} class={undefined} />
              )}
            </Show>
            <DropdownMenuContent class={cn("w-55", props.menuPopupClassName)}>
              <Show when={props.showSearchInput}>
                <div class="relative">
                  <DropdownMenuItem
                    as={Input}
                    role="searchbox"
                    closeOnSelect={false}
                    textValue={mergedI18n().searchFields}
                    type="search"
                    placeholder={mergedI18n().searchFields}
                    class={cn(
                      "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
                      "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
                    )}
                    value={menuSearchInput()}
                    onInput={(event) => setMenuSearchInput(event.currentTarget.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      // Keep text editing in the search input; the menu handles navigation.
                      if (!["ArrowDown", "ArrowUp", "Escape", "Tab"].includes(event.key)) {
                        event.stopPropagation();
                      }
                    }}
                  />
                  <Show when={props.enableShortcut && props.shortcutLabel}>
                    <Kbd class="-translate-y-1/2 absolute top-1/2 right-2 border bg-background">
                      {props.shortcutLabel}
                    </Kbd>
                  </Show>
                </div>
                <DropdownMenuSeparator />
              </Show>

              <div class="relative flex max-h-full">
                <div class="flex max-h-[min(var(--kb-popper-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain">
                  <ScrollArea class="**:data-[slot=scroll-area-scrollbar]:m-0">
                    <Show
                      when={filteredFields().length > 0}
                      fallback={
                        <div class="py-2 text-center text-muted-foreground text-sm">
                          {mergedI18n().noFieldsFound}
                        </div>
                      }
                    >
                      <For each={filteredFields()}>
                        {(field) => {
                          const fieldKey = field.key as string;
                          const isMultiSelect = field.type === "multiselect";
                          const sessionFilter = () => {
                            const sessionFilterId = sessionFilterIds()[fieldKey];
                            return sessionFilterId
                              ? props.filters.find((filter) => filter.id === sessionFilterId)
                              : undefined;
                          };
                          const currentValues = () => sessionFilter()?.values ?? [];

                          return (
                            <Show
                              when={hasSubMenu(field)}
                              fallback={
                                <DropdownMenuItem
                                  onSelect={() => field.key && addFilter(field.key)}
                                  class="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                                >
                                  {renderIcon(field.icon)}
                                  <span>{field.label}</span>
                                </DropdownMenuItem>
                              }
                            >
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger class="data-expanded:bg-accent data-expanded:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                                  {renderIcon(field.icon)}
                                  <span>{field.label}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent class="w-50">
                                  <FilterSubmenuContent<T>
                                    field={field}
                                    currentValues={currentValues()}
                                    isMultiSelect={isMultiSelect}
                                    i18n={mergedI18n()}
                                    onToggle={(value, isSelected) => {
                                      if (isMultiSelect) {
                                        const nextValues = isSelected
                                          ? (currentValues().filter(
                                              (current) => current !== value,
                                            ) as T[])
                                          : ([...currentValues(), value] as T[]);
                                        const filter = sessionFilter();

                                        if (filter) {
                                          if (nextValues.length === 0) {
                                            props.onChange(
                                              props.filters.filter(
                                                (current) => current.id !== filter.id,
                                              ),
                                            );
                                            setSessionFilterIds((previous) => ({
                                              ...previous,
                                              [fieldKey]: "",
                                            }));
                                          } else {
                                            props.onChange(
                                              props.filters.map((current) =>
                                                current.id === filter.id
                                                  ? { ...current, values: nextValues }
                                                  : current,
                                              ),
                                            );
                                          }
                                        } else {
                                          const newFilter = createFilter<T>(
                                            fieldKey,
                                            field.defaultOperator || "is_any_of",
                                            nextValues,
                                          );
                                          props.onChange([...props.filters, newFilter]);
                                          setSessionFilterIds((previous) => ({
                                            ...previous,
                                            [fieldKey]: newFilter.id,
                                          }));
                                        }
                                      } else {
                                        const newFilter = createFilter<T>(
                                          fieldKey,
                                          field.defaultOperator || "is",
                                          [value] as T[],
                                        );
                                        setLastAddedFilterId(newFilter.id);
                                        props.onChange([...props.filters, newFilter]);
                                        setAddFilterOpen(false);
                                      }
                                    }}
                                  />
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </Show>
                          );
                        }}
                      </For>
                    </Show>
                  </ScrollArea>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </Show>

        <For each={filterIds()}>
          {(filterId) => {
            // Read once at creation: the chip is mounted the moment its filter
            // is added, so this mirrors React's mount-time `autoFocus`.
            const autofocus = filterId === lastAddedFilterId();

            return (
              <Show when={props.filters.find((entry) => entry.id === filterId)}>
                {(currentFilter) => (
                  <Show when={fieldsMap()[currentFilter().field]}>
                    {(field) => (
                      <ButtonGroup class={FILTER_CHIP_CLASS}>
                        <ButtonGroupText class="bg-background dark:bg-input/30">
                          {renderIcon(field().icon)}
                          {field().label}
                        </ButtonGroupText>
                        <FilterOperatorDropdown<T>
                          field={field()}
                          operator={currentFilter().operator}
                          values={currentFilter().values}
                          onChange={(operator) => updateFilter(filterId, { operator })}
                        />
                        <FilterValueSelector<T>
                          field={field()}
                          values={currentFilter().values}
                          operator={currentFilter().operator}
                          onChange={(values) => updateFilter(filterId, { values })}
                          autofocus={autofocus}
                        />
                        <FilterRemoveButton onClick={() => removeFilter(filterId)} />
                      </ButtonGroup>
                    )}
                  </Show>
                )}
              </Show>
            );
          }}
        </For>
      </div>
    </FilterContext.Provider>
  );
};

export { Filters, FiltersContent };
