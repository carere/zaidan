import { ArrowRightIcon, ChevronRightIcon, FilterIcon } from "lucide-solid";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/kobalte/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterStrategy,
  FiltersState,
} from "../core/types";
import { isAnyOf } from "../lib/array";
import { getColumn } from "../lib/helpers";
import { type Locale, t } from "../lib/i18n";
import { FilterValueController } from "./filter-value";

interface FilterSelectorProps<TData> {
  filters: FiltersState;
  columns: Column<TData>[];
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

function isJSXElement(icon: JSX.Element | Component<any>): icon is JSX.Element {
  return typeof icon !== "function";
}

export function FilterSelector<TData>(props: FilterSelectorProps<TData>) {
  const locale = () => props.locale ?? "en";
  const [open, setOpen] = createSignal(false);
  const [value, setValue] = createSignal("");
  const [property, setProperty] = createSignal<string | undefined>(undefined);

  const column = () => (property() ? getColumn(props.columns, property()!) : undefined);
  const filter = () =>
    property() ? props.filters.find((f) => f.columnId === property()) : undefined;
  const hasFilters = () => props.filters.length > 0;

  createEffect(() => {
    if (property()) {
      setValue("");
    }
  });

  createEffect(() => {
    if (!open()) {
      setTimeout(() => setValue(""), 150);
    }
  });

  return (
    <Popover
      open={open()}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setTimeout(() => setProperty(undefined), 100);
      }}
    >
      <PopoverTrigger
        as={Button}
        variant="outline"
        class={cn("h-7", hasFilters() && "!px-2 w-fit")}
      >
        <FilterIcon class="size-4" />
        <Show when={!hasFilters()}>
          <span>{t("filter", locale())}</span>
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-fit origin-(--kb-popover-content-transform-origin) p-0">
        <Show
          when={property() && column()}
          fallback={
            <Command
              loop
              filter={(value, search, keywords) => {
                const extendValue = `${value} ${keywords?.join(" ")}`;
                return extendValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
              }}
            >
              <CommandInput
                value={value()}
                onValueChange={setValue}
                placeholder={t("search", locale())}
              />
              <CommandEmpty>{t("noresults", locale())}</CommandEmpty>
              <CommandList class="max-h-fit">
                <CommandGroup>
                  <For each={props.columns}>
                    {(col) => <FilterableColumn column={col} setProperty={setProperty} />}
                  </For>
                  <QuickSearchFilters
                    search={value()}
                    filters={props.filters}
                    columns={props.columns}
                    actions={props.actions}
                    strategy={props.strategy}
                    locale={locale()}
                  />
                </CommandGroup>
              </CommandList>
            </Command>
          }
        >
          <FilterValueController
            filter={filter()!}
            column={column() as Column<TData, ColumnDataType>}
            actions={props.actions}
            strategy={props.strategy}
            locale={locale()}
          />
        </Show>
      </PopoverContent>
    </Popover>
  );
}

export function FilterableColumn<TData, TType extends ColumnDataType, TVal>(props: {
  column: Column<TData, TType, TVal>;
  setProperty: (value: string) => void;
}) {
  let itemRef: HTMLDivElement | undefined;

  const prefetch = () => {
    props.column.prefetchOptions();
    props.column.prefetchValues();
    props.column.prefetchFacetedUniqueValues();
    props.column.prefetchFacetedMinMaxValues();
  };

  createEffect(() => {
    const target = itemRef;
    if (!target) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const isSelected = target.getAttribute("data-selected") === "true";
          if (isSelected) prefetch();
        }
      }
    });

    observer.observe(target, {
      attributes: true,
      attributeFilter: ["data-selected"],
    });

    onCleanup(() => observer.disconnect());
  });

  return (
    <CommandItem
      ref={itemRef}
      value={props.column.id}
      keywords={[props.column.displayName]}
      onSelect={() => props.setProperty(props.column.id)}
      class="group"
      onMouseEnter={prefetch}
    >
      <div class="flex w-full items-center justify-between">
        <div class="inline-flex items-center gap-1.5">
          <Dynamic component={props.column.icon} stroke-width={2.25} class="size-4" />
          <span>{props.column.displayName}</span>
        </div>
        <ArrowRightIcon class="size-4 opacity-0 group-aria-selected:opacity-100" />
      </div>
    </CommandItem>
  );
}

interface QuickSearchFiltersProps<TData> {
  search?: string;
  filters: FiltersState;
  columns: Column<TData>[];
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function QuickSearchFilters<TData>(props: QuickSearchFiltersProps<TData>) {
  const locale = () => props.locale ?? "en";

  const cols = createMemo(() =>
    props.columns.filter((c) => isAnyOf<ColumnDataType>(c.type, ["option", "multiOption"])),
  );

  return (
    <Show when={props.search && props.search.trim().length >= 2}>
      <For each={cols()}>
        {(column) => {
          const filter = () => props.filters.find((f) => f.columnId === column.id);
          const options = () => column.getOptions();
          const optionsCount = () => column.getFacetedUniqueValues();

          function handleOptionSelect(value: string, check: boolean) {
            if (check) props.actions.addFilterValue(column, [value]);
            else props.actions.removeFilterValue(column, [value]);
          }

          return (
            <For each={options()}>
              {(v) => {
                const checked = () => Boolean(filter()?.values.includes(v.value));
                const count = () => optionsCount()?.get(v.value) ?? 0;

                return (
                  <CommandItem
                    value={v.value}
                    keywords={[v.label, v.value]}
                    onSelect={() => {
                      handleOptionSelect(v.value, !checked());
                    }}
                    class="group"
                  >
                    <div class="group flex items-center gap-1.5">
                      <Checkbox
                        checked={checked()}
                        class="mr-1 opacity-0 data-[state=checked]:opacity-100 group-data-[selected=true]:opacity-100 dark:border-ring"
                      />
                      <div class="flex w-4 items-center justify-center">
                        <Show when={v.icon}>
                          {(icon) =>
                            isJSXElement(icon()) ? (
                              icon()
                            ) : (
                              <Dynamic
                                component={icon() as Component<any>}
                                class="size-4 text-primary"
                              />
                            )
                          }
                        </Show>
                      </div>
                      <div class="flex items-center gap-0.5">
                        <span class="text-muted-foreground">{column.displayName}</span>
                        <ChevronRightIcon class="size-3.5 text-muted-foreground/75" />
                        <span>
                          {v.label}
                          <sup
                            class={cn(
                              !optionsCount() && "hidden",
                              "ml-0.5 text-muted-foreground tabular-nums tracking-tight",
                              count() === 0 && "slashed-zero",
                            )}
                          >
                            {count() < 100 ? count() : "100+"}
                          </sup>
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                );
              }}
            </For>
          );
        }}
      </For>
    </Show>
  );
}
