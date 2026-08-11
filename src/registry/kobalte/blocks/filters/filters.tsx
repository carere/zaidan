import { Plus } from "lucide-solid";
import type { ValidComponent } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  mergeProps,
  on,
  onCleanup,
  Show,
} from "solid-js";

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
} from "./utils";

// Sera is an underline style: its group text and input group carry only a
// bottom border. Normalise the boxed segments (the operator, value and remove
// buttons) to the same treatment so the whole chip reads as one underlined
// group instead of mixing boxes and rules.
const FILTER_CHIP_CLASS =
  "style-sera:*:rounded-none style-sera:*:border-transparent style-sera:*:border-b-input";

const hasSubMenu = <T,>(field: FilterFieldConfig<T>): boolean =>
  (field.type === "select" || field.type === "multiselect") && fieldHasOptions(field);

const FiltersContent = <T = unknown>(props: FiltersContentProps<T>) => {
  const context = useFilterContext();
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

  return (
    <div
      class={cn(
        filtersContainerVariants({ variant: context.variant, size: context.size }),
        context.class,
      )}
    >
      <For each={props.filters}>
        {(filter) => (
          <Show when={fieldsMap()[filter.field]}>
            {(field) => (
              <ButtonGroup class={FILTER_CHIP_CLASS}>
                <ButtonGroupText>
                  {field().icon}
                  {field().label}
                </ButtonGroupText>

                <FilterOperatorDropdown<T>
                  field={field()}
                  operator={filter.operator}
                  values={filter.values}
                  onChange={(operator) => updateFilter(filter.id, { operator })}
                />

                <FilterValueSelector<T>
                  field={field()}
                  values={filter.values}
                  onChange={(values) => updateFilter(filter.id, { values })}
                  operator={filter.operator}
                  autofocus={false}
                />

                <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
              </ButtonGroup>
            )}
          </Show>
        )}
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

  const [addFilterOpen, setAddFilterOpen] = createSignal(false);
  const [menuSearchInput, setMenuSearchInput] = createSignal("");
  const [activeMenu, setActiveMenu] = createSignal<string>("root");
  const [openSubMenu, setOpenSubMenu] = createSignal<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  const [lastAddedFilterId, setLastAddedFilterId] = createSignal<string | null>(null);
  // Track which filter instance is being built in the current Add Filter menu
  // session. Maps fieldKey -> unique filterId created during this open session.
  const [sessionFilterIds, setSessionFilterIds] = createSignal<Record<string, string>>({});
  let rootInputRef: HTMLInputElement | undefined;
  const rootId = createUniqueId();

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
    if (addFilterOpen() && activeMenu() === "root") {
      rootInputRef?.focus();
    }
  });

  // The menu popup mounts after this component's effects have flushed, so the
  // effect above cannot focus the freshly created input. Claim focus from the
  // ref on the next tick, which lands after Kobalte's open auto-focus.
  const focusRootInput = (element: HTMLInputElement) => {
    rootInputRef = element;
    setTimeout(() => {
      if (activeMenu() === "root") element.focus();
    }, 0);
  };

  createEffect(
    on(menuSearchInput, () => {
      setHighlightedIndex(-1);
    }),
  );

  createEffect(() => {
    if (highlightedIndex() >= 0 && addFilterOpen()) {
      const element = document.getElementById(`${rootId}-item-${highlightedIndex()}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  });

  createEffect(() => {
    if (!addFilterOpen()) {
      setOpenSubMenu(null);
    }
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

  createEffect(() => {
    if (addFilterOpen() && filteredFields().length > 0) {
      setHighlightedIndex(0);
    }
  });

  const toggleSubMenu = (fieldKey: string) => {
    if (openSubMenu() === fieldKey) {
      setOpenSubMenu(null);
      setActiveMenu("root");
    } else {
      setOpenSubMenu(fieldKey);
      setActiveMenu(fieldKey);
    }
  };

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
              } else {
                setActiveMenu("root");
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
            <DropdownMenuContent class={cn("w-[220px]", props.menuPopupClassName)}>
              <Show when={props.showSearchInput}>
                <div class="relative">
                  <Input
                    ref={focusRootInput}
                    role="combobox"
                    aria-controls={`${rootId}-listbox`}
                    aria-activedescendant={
                      highlightedIndex() >= 0 ? `${rootId}-item-${highlightedIndex()}` : undefined
                    }
                    placeholder={mergedI18n().searchFields}
                    class={cn(
                      "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
                      "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
                      activeMenu() === "root" && "placeholder:text-foreground",
                    )}
                    value={menuSearchInput()}
                    onFocus={() => setActiveMenu("root")}
                    onMouseEnter={() => setActiveMenu("root")}
                    onBlur={() => {
                      if (activeMenu() === "root") rootInputRef?.focus();
                    }}
                    onInput={(event) => setMenuSearchInput(event.currentTarget.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        if (filteredFields().length > 0) {
                          setHighlightedIndex((previous) =>
                            previous < filteredFields().length - 1 ? previous + 1 : 0,
                          );
                        }
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        if (filteredFields().length > 0) {
                          setHighlightedIndex((previous) =>
                            previous > 0 ? previous - 1 : filteredFields().length - 1,
                          );
                        }
                      } else if (
                        (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
                        highlightedIndex() >= 0
                      ) {
                        const field = filteredFields()[highlightedIndex()];

                        if (event.key === "ArrowRight" && field && hasSubMenu(field)) {
                          event.preventDefault();
                          setOpenSubMenu(field.key || null);
                          setActiveMenu(field.key || "root");
                        } else if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          if (openSubMenu()) {
                            setOpenSubMenu(null);
                            setActiveMenu("root");
                          }
                        }
                      } else if (event.key === "Enter" && highlightedIndex() >= 0) {
                        event.preventDefault();
                        const field = filteredFields()[highlightedIndex()];
                        if (field?.key) {
                          if (hasSubMenu(field)) {
                            toggleSubMenu(field.key);
                          } else {
                            addFilter(field.key);
                          }
                        }
                      } else if (event.key === "Escape") {
                        setAddFilterOpen(false);
                      }
                      event.stopPropagation();
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
                <div
                  class="flex max-h-[min(var(--kb-popper-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
                  role="listbox"
                  id={`${rootId}-listbox`}
                  onMouseEnter={() => setActiveMenu("root")}
                >
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
                        {(field, index) => {
                          const isHighlighted = () => highlightedIndex() === index();
                          const itemId = () => `${rootId}-item-${index()}`;
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
                                  id={itemId()}
                                  role="option"
                                  aria-selected={isHighlighted()}
                                  data-highlighted={isHighlighted() || undefined}
                                  onMouseEnter={() => setHighlightedIndex(index())}
                                  onSelect={() => field.key && addFilter(field.key)}
                                  class="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                                >
                                  {field.icon}
                                  <span>{field.label}</span>
                                </DropdownMenuItem>
                              }
                            >
                              <DropdownMenuSub
                                open={openSubMenu() === fieldKey}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setOpenSubMenu(fieldKey);
                                  } else if (openSubMenu() === fieldKey) {
                                    setOpenSubMenu(null);
                                    setActiveMenu("root");
                                  }
                                }}
                              >
                                <DropdownMenuSubTrigger
                                  id={itemId()}
                                  role="option"
                                  aria-selected={isHighlighted()}
                                  data-highlighted={isHighlighted() || undefined}
                                  onMouseEnter={() => {
                                    setHighlightedIndex(index());
                                    setActiveMenu("root");
                                  }}
                                  class="data-expanded:bg-accent data-expanded:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                                >
                                  {field.icon}
                                  <span>{field.label}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent class="w-[200px]">
                                  <FilterSubmenuContent<T>
                                    field={field}
                                    currentValues={currentValues()}
                                    isMultiSelect={isMultiSelect}
                                    i18n={mergedI18n()}
                                    isActive={activeMenu() === fieldKey}
                                    onActive={() => {
                                      if (field.searchable !== false) {
                                        setActiveMenu(fieldKey);
                                      }
                                    }}
                                    onBack={() => {
                                      setOpenSubMenu(null);
                                      setActiveMenu("root");
                                    }}
                                    onClose={() => setAddFilterOpen(false)}
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

        <For each={props.filters}>
          {(filter) => (
            <Show when={fieldsMap()[filter.field]}>
              {(field) => (
                <ButtonGroup class={FILTER_CHIP_CLASS}>
                  <ButtonGroupText class="bg-background dark:bg-input/30">
                    {field().icon}
                    {field().label}
                  </ButtonGroupText>
                  <FilterOperatorDropdown<T>
                    field={field()}
                    operator={filter.operator}
                    values={filter.values}
                    onChange={(operator) => updateFilter(filter.id, { operator })}
                  />
                  <FilterValueSelector<T>
                    field={field()}
                    values={filter.values}
                    operator={filter.operator}
                    onChange={(values) => updateFilter(filter.id, { values })}
                    autofocus={filter.id === lastAddedFilterId()}
                  />
                  <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
                </ButtonGroup>
              )}
            </Show>
          )}
        </For>
      </div>
    </FilterContext.Provider>
  );
};

export { Filters, FiltersContent };
