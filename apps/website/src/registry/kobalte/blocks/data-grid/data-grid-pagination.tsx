import { ChevronLeft, ChevronRight } from "lucide-solid";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";
import { useDataGrid } from "./data-grid";

interface DataGridPaginationProps {
  sizes?: number[];
  sizesInfo?: string;
  sizesLabel?: string;
  sizesDescription?: string;
  sizesSkeleton?: JSX.Element;
  more?: boolean;
  moreLimit?: number;
  info?: string;
  infoSkeleton?: JSX.Element;
  class?: string;
  rowsPerPageLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  ellipsisText?: string;
}

const DATA_GRID_PAGINATION_DEFAULT_SIZES = [5, 10, 25, 50, 100];

function DataGridPagination(props: DataGridPaginationProps): JSX.Element {
  const grid = useDataGrid();

  // Upstream spreads a `defaultProps` object over the incoming props. The two
  // JSX defaults are resolved lazily instead, so the skeleton nodes are only
  // built when the grid is actually loading.
  const sizes = () => props.sizes ?? DATA_GRID_PAGINATION_DEFAULT_SIZES;
  const sizesSkeleton = () => props.sizesSkeleton ?? <Skeleton class="h-8 w-44" />;
  const infoSkeleton = () => props.infoSkeleton ?? <Skeleton class="h-8 w-60" />;
  const moreLimitProp = () => props.moreLimit ?? 5;
  const info = () => props.info ?? "{from} - {to} of {count}";
  const rowsPerPageLabel = () => props.rowsPerPageLabel ?? "Rows per page";
  const previousPageLabel = () => props.previousPageLabel ?? "Go to previous page";
  const nextPageLabel = () => props.nextPageLabel ?? "Go to next page";
  const ellipsisText = () => props.ellipsisText ?? "...";

  const btnBaseClasses = "p-0 text-sm";
  const btnArrowClasses = `${btnBaseClasses} rtl:transform rtl:rotate-180`;

  // v9 has no `table.state`; every slice is read off the reactive store, which
  // is what makes these derivations update when the page changes.
  const pagination = () => grid.table.store.state.pagination;
  const pageIndex = () => pagination().pageIndex;
  const pageSize = () => pagination().pageSize;
  const from = () => (grid.recordCount === 0 ? 0 : pageIndex() * pageSize() + 1);
  const to = () => Math.min((pageIndex() + 1) * pageSize(), grid.recordCount);
  const pageCount = () => grid.table.getPageCount();

  // Replace placeholders in paginationInfo
  const paginationInfo = () =>
    info()
      .replaceAll("{from}", from().toString())
      .replaceAll("{to}", to().toString())
      .replaceAll("{count}", grid.recordCount.toString());

  // Pagination limit logic
  const paginationMoreLimit = () => moreLimitProp() || 5;

  // Determine the start and end of the pagination group
  const currentGroupStart = () =>
    Math.floor(pageIndex() / paginationMoreLimit()) * paginationMoreLimit();
  const currentGroupEnd = () => Math.min(currentGroupStart() + paginationMoreLimit(), pageCount());

  // Render page buttons based on the current group
  const pageButtonIndexes = () => {
    const buttons: number[] = [];
    for (let i = currentGroupStart(); i < currentGroupEnd(); i++) {
      buttons.push(i);
    }
    return buttons;
  };

  return (
    <div
      data-slot="data-grid-pagination"
      class={cn(
        "flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0",
        props.class,
      )}
    >
      <div class="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 sm:order-1 sm:pb-0">
        <Show when={!grid.isLoading} fallback={sizesSkeleton()}>
          <div class="text-muted-foreground text-sm">{rowsPerPageLabel()}</div>
          <Select
            options={sizes()}
            value={pageSize()}
            onChange={(value: number | null) => {
              if (value === null) return;
              grid.table.setPageSize(value);
            }}
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>{itemProps.item.rawValue}</SelectItem>
            )}
            placement="bottom-start"
          >
            <SelectTrigger class="w-16" size="sm" aria-label={rowsPerPageLabel()}>
              <SelectValue<number>>{(state) => state.selectedOption()}</SelectValue>
            </SelectTrigger>
            {/*
              Kobalte anchors the listbox itself, so upstream's
              `alignItemWithTrigger={false}` has no counterpart; the anchor
              width variable is Kobalte's rather than Base UI's.
            */}
            <SelectContent class="min-w-(--kb-popper-anchor-width)" />
          </Select>
        </Show>
      </div>
      <div class="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <Show when={!grid.isLoading} fallback={infoSkeleton()}>
          <div class="text-muted-foreground order-2 text-sm text-nowrap sm:order-1">
            {paginationInfo()}
          </div>
          <Show when={pageCount() > 1}>
            <div class="order-1 flex items-center space-x-1">
              <Button
                size="icon-sm"
                variant="ghost"
                class={btnArrowClasses}
                onClick={() => grid.table.previousPage()}
                disabled={!grid.table.getCanPreviousPage()}
              >
                <span class="sr-only">{previousPageLabel()}</span>
                <ChevronLeft class="size-4" />
              </Button>

              <Show when={currentGroupStart() > 0}>
                <Button
                  size="icon-sm"
                  class={btnBaseClasses}
                  variant="ghost"
                  onClick={() => grid.table.setPageIndex(currentGroupStart() - 1)}
                >
                  {ellipsisText()}
                </Button>
              </Show>

              <For each={pageButtonIndexes()}>
                {(index) => (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    class={cn(btnBaseClasses, "text-muted-foreground", {
                      "bg-accent text-accent-foreground": pageIndex() === index,
                    })}
                    onClick={() => {
                      if (pageIndex() !== index) {
                        grid.table.setPageIndex(index);
                      }
                    }}
                  >
                    {index + 1}
                  </Button>
                )}
              </For>

              <Show when={currentGroupEnd() < pageCount()}>
                <Button
                  class={btnBaseClasses}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => grid.table.setPageIndex(currentGroupEnd())}
                >
                  {ellipsisText()}
                </Button>
              </Show>

              <Button
                size="icon-sm"
                variant="ghost"
                class={btnArrowClasses}
                onClick={() => grid.table.nextPage()}
                disabled={!grid.table.getCanNextPage()}
              >
                <span class="sr-only">{nextPageLabel()}</span>
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

export type { DataGridPaginationProps };
export { DataGridPagination };
