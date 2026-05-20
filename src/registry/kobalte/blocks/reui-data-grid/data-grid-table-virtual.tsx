import type { Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import type { VirtualItem, Virtualizer, VirtualizerOptions } from "@tanstack/solid-virtual";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { createEffect, createMemo, createSignal, For, type JSX, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Spinner } from "@/registry/kobalte/ui/spinner";

import { useDataGrid } from "./data-grid";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableEmpty,
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRenderedRow,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridTableRowSections,
} from "./data-grid-table";

type DataGridTableVirtualScrollElements = {
  containerElement: HTMLDivElement | null;
  scrollElement: HTMLElement | null;
};

type DataGridTableVirtualizerInstance = Virtualizer<HTMLElement, HTMLTableRowElement>;

type DataGridTableVirtualizerOptions<TData> = Omit<
  VirtualizerOptions<HTMLElement, HTMLTableRowElement>,
  "count" | "estimateSize" | "getItemKey" | "getScrollElement"
> & {
  estimateSize?: (index: number, row: Row<TData>) => number;
  getItemKey?: (index: number, row: Row<TData>) => string | number;
  getScrollElement?: (elements: DataGridTableVirtualScrollElements) => HTMLElement | null;
};

interface DataGridTableVirtualProps<TData> {
  height?: number | string;
  estimateSize?: number;
  overscan?: number;
  footerContent?: JSX.Element;
  renderHeader?: boolean;
  onFetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  fetchMoreOffset?: number;
  virtualizerOptions?: DataGridTableVirtualizerOptions<TData>;
}

function DataGridTableVirtualSpacer(props: { columnCount: number; height: number }) {
  return (
    <Show when={props.height > 0}>
      <tr aria-hidden="true" tabIndex={-1}>
        <td colSpan={props.columnCount} style={{ height: `${props.height}px`, padding: 0 }} />
      </tr>
    </Show>
  );
}

function DataGridTableVirtualStatusRow(props: {
  children: JSX.Element;
  class?: string;
  columnCount: number;
}) {
  return (
    <tr>
      <td
        colSpan={props.columnCount}
        class={cn("py-4 text-center text-muted-foreground text-sm", props.class)}
      >
        {props.children}
      </td>
    </tr>
  );
}

function DataGridTableVirtual<TData>(props: DataGridTableVirtualProps<TData>) {
  const ctx = useDataGrid();
  const renderHeader = () => props.renderHeader !== false;
  const estimateSizeDefault = () => props.estimateSize ?? 48;
  const overscanDefault = () => props.overscan ?? 10;
  const fetchMoreOffsetDefault = () => Math.max(0, props.fetchMoreOffset ?? 0);

  const sections = createMemo(() =>
    getDataGridTableRowSections(ctx.table, ctx.props.tableLayout?.rowsPinnable),
  );
  const topRows = () => sections().topRows;
  const centerRows = () => sections().centerRows;
  const bottomRows = () => sections().bottomRows;

  const columnCount = () =>
    ctx.table.getVisibleFlatColumns().length + (ctx.props.tableLayout?.columnsResizable ? 1 : 0);

  const isInfiniteMode = () => typeof props.onFetchMore === "function";

  const [viewportElements, setViewportElements] = createSignal<DataGridTableVirtualScrollElements>({
    containerElement: null,
    scrollElement: null,
  });

  const handleViewportRef = (node: HTMLDivElement | null) => {
    setViewportElements({
      containerElement: node,
      scrollElement:
        (node?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ?? node,
    });
  };

  const usesExternalScrollArea = () =>
    viewportElements().scrollElement !== null &&
    viewportElements().scrollElement !== viewportElements().containerElement;

  const isVirtualizationEnabled = () => props.virtualizerOptions?.enabled !== false;

  const loadingMoreMessage = () =>
    props.virtualizerOptions
      ? ctx.props.fetchingMoreMessage || ctx.props.loadingMessage || "Loading..."
      : ctx.props.fetchingMoreMessage || ctx.props.loadingMessage || "Loading...";

  const allRowsLoadedMessage = () => ctx.props.allRowsLoadedMessage || "All records loaded";

  const resolveScrollElement = () => {
    if (props.virtualizerOptions?.getScrollElement) {
      return props.virtualizerOptions.getScrollElement(viewportElements());
    }
    return viewportElements().scrollElement;
  };

  const resolveItemKey = (index: number) => {
    const row = centerRows()[index];
    if (!row) return index;
    return (
      props.virtualizerOptions?.getItemKey?.(index, row as unknown as Row<TData>) ?? row.id ?? index
    );
  };

  const resolveEstimateSize = (index: number) => {
    const row = centerRows()[index];
    return row
      ? (props.virtualizerOptions?.estimateSize?.(index, row as unknown as Row<TData>) ??
          estimateSizeDefault())
      : estimateSizeDefault();
  };

  const virtualizer = createVirtualizer({
    get count() {
      return centerRows().length;
    },
    getScrollElement: resolveScrollElement,
    getItemKey: resolveItemKey,
    estimateSize: resolveEstimateSize,
    get overscan() {
      return props.virtualizerOptions?.overscan ?? overscanDefault();
    },
    measureElement: props.virtualizerOptions?.measureElement,
  }) as DataGridTableVirtualizerInstance;

  const virtualItems = () => (isVirtualizationEnabled() ? virtualizer.getVirtualItems() : []);
  const totalSize = () => (isVirtualizationEnabled() ? virtualizer.getTotalSize() : 0);

  const measureRowRef = () =>
    isVirtualizationEnabled() && props.virtualizerOptions?.measureElement
      ? virtualizer.measureElement
      : undefined;

  createEffect(() => {
    if (
      !isVirtualizationEnabled() ||
      !isInfiniteMode() ||
      props.hasMore === false ||
      props.isFetchingMore
    ) {
      return;
    }

    const items = virtualItems();
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= centerRows().length - 1 - fetchMoreOffsetDefault()) {
      props.onFetchMore?.();
    }
  });

  const VirtualBody = () => {
    const totalRows = () => topRows().length + centerRows().length + bottomRows().length;
    const hasCenterRows = () => centerRows().length > 0;
    const showFetchingRow = () => isInfiniteMode() && !!props.isFetchingMore;
    const showCompleteRow = () => isInfiniteMode() && props.hasMore === false && totalRows() > 0;
    const hasMiddleSection = () => hasCenterRows() || showFetchingRow() || showCompleteRow();
    const leadingSpacerHeight = () =>
      isVirtualizationEnabled() && hasCenterRows() && virtualItems().length > 0
        ? (virtualItems()[0]?.start ?? 0)
        : 0;
    const trailingSpacerHeight = () =>
      isVirtualizationEnabled() && hasCenterRows() && virtualItems().length > 0
        ? Math.max(0, totalSize() - (virtualItems()[virtualItems().length - 1]?.end ?? 0))
        : 0;

    return (
      <Show when={totalRows()} fallback={<DataGridTableEmpty />}>
        <For each={topRows()}>
          {(row, index) => (
            <DataGridTableRenderedRow
              row={row}
              pinnedBoundary={
                index() === topRows().length - 1 && hasMiddleSection() ? "top" : undefined
              }
            />
          )}
        </For>

        <Show
          when={isVirtualizationEnabled()}
          fallback={
            <For each={centerRows()}>{(row) => <DataGridTableRenderedRow row={row} />}</For>
          }
        >
          <DataGridTableVirtualSpacer columnCount={columnCount()} height={leadingSpacerHeight()} />
          <For each={virtualItems()}>
            {(virtualRow: VirtualItem) => {
              const row = centerRows()[virtualRow.index];
              return (
                <Show when={row}>
                  <DataGridTableRenderedRow row={row} rowRef={measureRowRef()} />
                </Show>
              );
            }}
          </For>
          <DataGridTableVirtualSpacer columnCount={columnCount()} height={trailingSpacerHeight()} />
        </Show>

        <Show when={showFetchingRow()}>
          <DataGridTableVirtualStatusRow columnCount={columnCount()}>
            <div class="flex items-center justify-center gap-2">
              <Spinner class="size-4 opacity-60" />
              {loadingMoreMessage()}
            </div>
          </DataGridTableVirtualStatusRow>
        </Show>

        <Show when={showCompleteRow()}>
          <DataGridTableVirtualStatusRow columnCount={columnCount()} class="py-3 text-xs">
            {allRowsLoadedMessage()}
          </DataGridTableVirtualStatusRow>
        </Show>

        <For each={bottomRows()}>
          {(row, index) => (
            <DataGridTableRenderedRow
              row={row}
              pinnedBoundary={
                index() === 0 && (topRows().length > 0 || hasMiddleSection()) ? "bottom" : undefined
              }
            />
          )}
        </For>
      </Show>
    );
  };

  return (
    <DataGridTableViewport
      viewportRef={handleViewportRef}
      class={!usesExternalScrollArea() ? "block" : undefined}
      style={
        usesExternalScrollArea()
          ? undefined
          : {
              height: typeof props.height === "number" ? `${props.height}px` : props.height,
              overflow: "auto",
              position: "relative",
            }
      }
    >
      <DataGridTableBase>
        <Show when={renderHeader()}>
          <DataGridTableHead>
            <For each={ctx.table.getHeaderGroups()}>
              {(headerGroup) => (
                <DataGridTableHeadRow headerGroup={headerGroup}>
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <DataGridTableHeadRowCell header={header}>
                        <Show when={!header.isPlaceholder} fallback={null}>
                          <Show
                            when={
                              ctx.props.tableLayout?.columnsResizable &&
                              header.column.getCanResize()
                            }
                            fallback={flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          >
                            <div class="truncate">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                          </Show>
                        </Show>
                        <Show
                          when={
                            ctx.props.tableLayout?.columnsResizable && header.column.getCanResize()
                          }
                        >
                          <DataGridTableHeadRowCellResize header={header} />
                        </Show>
                      </DataGridTableHeadRowCell>
                    )}
                  </For>
                </DataGridTableHeadRow>
              )}
            </For>
          </DataGridTableHead>
        </Show>

        <Show
          when={
            renderHeader() && (ctx.props.tableLayout?.stripped || !ctx.props.tableLayout?.rowBorder)
          }
        >
          <DataGridTableRowSpacer />
        </Show>

        <DataGridTableBody>
          <VirtualBody />
        </DataGridTableBody>

        <Show when={props.footerContent}>
          <DataGridTableFoot>{props.footerContent}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

export type {
  DataGridTableVirtualizerOptions,
  DataGridTableVirtualProps,
  DataGridTableVirtualScrollElements,
};
export { DataGridTableVirtual };
