import { X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Separator } from "@/registry/kobalte/ui/separator";
import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
  FiltersState,
} from "../core/types";
import { getColumn } from "../lib/helpers";
import type { Locale } from "../lib/i18n";
import { FilterOperator } from "./filter-operator";
import { FilterSubject } from "./filter-subject";
import { FilterValue } from "./filter-value";

interface ActiveFiltersProps<TData> {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function ActiveFilters<TData>(props: ActiveFiltersProps<TData>) {
  return (
    <For each={props.filters}>
      {(filter) => {
        const id = filter.columnId;
        const column = getColumn(props.columns, id);

        return (
          <Show when={filter.values}>
            <ActiveFilter
              filter={filter}
              column={column}
              actions={props.actions}
              strategy={props.strategy}
              locale={props.locale}
            />
          </Show>
        );
      }}
    </For>
  );
}

interface ActiveFilterProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function ActiveFilter<TData, TType extends ColumnDataType>(
  props: ActiveFilterProps<TData, TType>,
) {
  return (
    <div class="flex h-7 items-center rounded-2xl border border-border bg-background text-xs shadow-xs">
      <FilterSubject column={props.column} />
      <Separator orientation="vertical" />
      <FilterOperator
        filter={props.filter}
        column={props.column}
        actions={props.actions}
        locale={props.locale}
      />
      <Separator orientation="vertical" />
      <FilterValue
        filter={props.filter}
        column={props.column}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
      <Separator orientation="vertical" />
      <Button
        variant="ghost"
        class="h-full w-7 rounded-none rounded-r-2xl text-xs"
        onClick={() => props.actions.removeFilter(props.filter.columnId)}
      >
        <X class="size-4 -translate-x-0.5" />
      </Button>
    </div>
  );
}

export function ActiveFiltersMobileContainer(props: { children: JSX.Element }) {
  let scrollContainerRef: HTMLDivElement | undefined;
  const [showLeftBlur, setShowLeftBlur] = createSignal(false);
  const [showRightBlur, setShowRightBlur] = createSignal(true);

  const checkScroll = () => {
    if (scrollContainerRef) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef;

      setShowLeftBlur(scrollLeft > 0);
      setShowRightBlur(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  createEffect(() => {
    if (scrollContainerRef) {
      const resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(scrollContainerRef);
      onCleanup(() => {
        resizeObserver.disconnect();
      });
    }
  });

  createEffect(
    on(
      () => props.children,
      () => {
        checkScroll();
      },
    ),
  );

  return (
    <div class="relative w-full overflow-x-hidden">
      <Show when={showLeftBlur()}>
        <div class="fade-in-0 pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-16 animate-in bg-gradient-to-r from-background to-transparent" />
      </Show>

      <div
        ref={(el) => {
          scrollContainerRef = el;
        }}
        class="no-scrollbar flex gap-2 overflow-x-scroll"
        onScroll={checkScroll}
      >
        {props.children}
      </div>

      <Show when={showRightBlur()}>
        <div class="fade-in-0 pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-16 animate-in bg-gradient-to-l from-background to-transparent" />
      </Show>
    </div>
  );
}
