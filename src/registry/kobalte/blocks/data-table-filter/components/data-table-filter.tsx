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
  const locale = () => props.locale ?? "en";

  return (
    <Show
      when={!isMobile()}
      fallback={
        <div class="flex w-full items-start justify-between gap-2">
          <div class="flex gap-1">
            <FilterSelector
              columns={props.columns}
              filters={props.filters}
              actions={props.actions}
              strategy={props.strategy}
              locale={locale()}
            />
            <FilterActions
              hasFilters={props.filters.length > 0}
              actions={props.actions}
              locale={locale()}
            />
          </div>
          <ActiveFiltersMobileContainer>
            <ActiveFilters
              columns={props.columns}
              filters={props.filters}
              actions={props.actions}
              strategy={props.strategy}
              locale={locale()}
            />
          </ActiveFiltersMobileContainer>
        </div>
      }
    >
      <div class="flex w-full items-start justify-between gap-2">
        <div class="flex w-full flex-1 gap-2 md:flex-wrap">
          <FilterSelector
            columns={props.columns}
            filters={props.filters}
            actions={props.actions}
            strategy={props.strategy}
            locale={locale()}
          />
          <ActiveFilters
            columns={props.columns}
            filters={props.filters}
            actions={props.actions}
            strategy={props.strategy}
            locale={locale()}
          />
        </div>
        <FilterActions
          hasFilters={props.filters.length > 0}
          actions={props.actions}
          locale={locale()}
        />
      </div>
    </Show>
  );
}
