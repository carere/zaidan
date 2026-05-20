import { ChevronLeftIcon, ChevronRightIcon } from "lucide-solid";
import { type JSX, mergeProps, Show } from "solid-js";

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

function DataGridPagination(props: DataGridPaginationProps) {
  const ctx = useDataGrid();

  const merged = mergeProps(
    {
      sizes: [5, 10, 25, 50, 100],
      sizesLabel: "Show",
      sizesDescription: "per page",
      sizesSkeleton: (<Skeleton class="h-8 w-44" />) as JSX.Element,
      moreLimit: 5,
      more: false,
      info: "{from} - {to} of {count}",
      infoSkeleton: (<Skeleton class="h-8 w-60" />) as JSX.Element,
      rowsPerPageLabel: "Rows per page",
      previousPageLabel: "Go to previous page",
      nextPageLabel: "Go to next page",
      ellipsisText: "...",
    } as Required<DataGridPaginationProps>,
    props,
  );

  const btnBaseClasses = "size-7 p-0 text-sm";
  const btnArrowClasses = `${btnBaseClasses} rtl:transform rtl:rotate-180`;

  const pageIndex = () => ctx.table.getState().pagination.pageIndex;
  const pageSize = () => ctx.table.getState().pagination.pageSize;
  const from = () => pageIndex() * pageSize() + 1;
  const to = () => Math.min((pageIndex() + 1) * pageSize(), ctx.recordCount);
  const pageCount = () => ctx.table.getPageCount();

  const paginationInfo = () =>
    merged.info
      ? merged.info
          .replace("{from}", from().toString())
          .replace("{to}", to().toString())
          .replace("{count}", ctx.recordCount.toString())
      : `${from()} - ${to()} of ${ctx.recordCount}`;

  const paginationMoreLimit = () => merged.moreLimit || 5;

  const currentGroupStart = () =>
    Math.floor(pageIndex() / paginationMoreLimit()) * paginationMoreLimit();
  const currentGroupEnd = () => Math.min(currentGroupStart() + paginationMoreLimit(), pageCount());

  const renderPageButtons = () => {
    const buttons: JSX.Element[] = [];
    for (let i = currentGroupStart(); i < currentGroupEnd(); i++) {
      const targetIndex = i;
      buttons.push(
        <Button
          size="icon-sm"
          variant="ghost"
          class={cn(btnBaseClasses, "text-muted-foreground", {
            "bg-accent text-accent-foreground": pageIndex() === targetIndex,
          })}
          onClick={() => {
            if (pageIndex() !== targetIndex) {
              ctx.table.setPageIndex(targetIndex);
            }
          }}
        >
          {targetIndex + 1}
        </Button>,
      );
    }
    return buttons;
  };

  return (
    <div
      data-slot="data-grid-pagination"
      class={cn(
        "flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0",
        merged.class,
      )}
    >
      <div class="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 sm:order-1 sm:pb-0">
        <Show when={!ctx.isLoading} fallback={merged.sizesSkeleton}>
          <div class="style-lyra:text-xs style-maia:text-sm style-mira:text-xs/relaxed style-nova:text-sm style-vega:text-sm text-muted-foreground">
            {merged.rowsPerPageLabel}
          </div>
          <Select<number>
            value={pageSize()}
            onChange={(value) => {
              if (value === null) return;
              ctx.table.setPageSize(Number(value));
            }}
            options={merged.sizes ?? []}
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>{itemProps.item.rawValue}</SelectItem>
            )}
          >
            <SelectTrigger class="w-14" size="sm">
              <SelectValue<number>>{(state) => state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent class="min-w-18" />
          </Select>
        </Show>
      </div>
      <div class="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <Show when={!ctx.isLoading} fallback={merged.infoSkeleton}>
          <div class="order-2 text-nowrap style-lyra:text-xs style-maia:text-sm style-mira:text-xs/relaxed style-nova:text-sm style-vega:text-sm text-muted-foreground sm:order-1">
            {paginationInfo()}
          </div>
          <Show when={pageCount() > 1}>
            <div class="order-1 flex items-center space-x-1 sm:order-2">
              <Button
                size="icon-sm"
                variant="ghost"
                class={btnArrowClasses}
                onClick={() => ctx.table.previousPage()}
                disabled={!ctx.table.getCanPreviousPage()}
              >
                <span class="sr-only">{merged.previousPageLabel}</span>
                <ChevronLeftIcon class="size-4" />
              </Button>

              <Show when={currentGroupStart() > 0}>
                <Button
                  size="icon-sm"
                  class={btnBaseClasses}
                  variant="ghost"
                  onClick={() => ctx.table.setPageIndex(currentGroupStart() - 1)}
                >
                  {merged.ellipsisText}
                </Button>
              </Show>

              {renderPageButtons()}

              <Show when={currentGroupEnd() < pageCount()}>
                <Button
                  class={btnBaseClasses}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => ctx.table.setPageIndex(currentGroupEnd())}
                >
                  {merged.ellipsisText}
                </Button>
              </Show>

              <Button
                size="icon-sm"
                variant="ghost"
                class={btnArrowClasses}
                onClick={() => ctx.table.nextPage()}
                disabled={!ctx.table.getCanNextPage()}
              >
                <span class="sr-only">{merged.nextPageLabel}</span>
                <ChevronRightIcon class="size-4" />
              </Button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

export { DataGridPagination, type DataGridPaginationProps };
