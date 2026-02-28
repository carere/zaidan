import { Show } from "solid-js";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import type { Column, DataTableFilterActions, FilterStrategy, FiltersState } from "../core/types";
import type { Locale } from "../lib/i18n";
import { ActiveFilters, ActiveFiltersMobileContainer } from "./active-filters";
import { FilterActions } from "./filter-actions";
import { FilterSelector } from "./filter-selector";

interface DataTableFilterProps<TData> {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function DataTableFilter<TData>(props: DataTableFilterProps<TData>) {
  const isMobile = useIsMobile();

  return (
    <Show
      when={!isMobile()}
      fallback={
        <div data-slot="data-table-filter" class="flex w-full items-start justify-between gap-2">
          <div class="flex gap-1">
            <FilterSelector
              columns={props.columns}
              filters={props.filters}
              actions={props.actions}
              strategy={props.strategy}
              locale={props.locale}
            />
            <FilterActions
              hasFilters={props.filters.length > 0}
              actions={props.actions}
              locale={props.locale}
            />
          </div>
          <ActiveFiltersMobileContainer>
            <ActiveFilters
              columns={props.columns}
              filters={props.filters}
              actions={props.actions}
              strategy={props.strategy}
              locale={props.locale}
            />
          </ActiveFiltersMobileContainer>
        </div>
      }
    >
      <div data-slot="data-table-filter" class="flex w-full items-start justify-between gap-2">
        <div class="flex w-full flex-1 gap-2 md:flex-wrap">
          <FilterSelector
            columns={props.columns}
            filters={props.filters}
            actions={props.actions}
            strategy={props.strategy}
            locale={props.locale}
          />
          <ActiveFilters
            columns={props.columns}
            filters={props.filters}
            actions={props.actions}
            strategy={props.strategy}
            locale={props.locale}
          />
        </div>
        <FilterActions
          hasFilters={props.filters.length > 0}
          actions={props.actions}
          locale={props.locale}
        />
      </div>
    </Show>
  );
}
