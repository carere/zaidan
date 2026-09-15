import type { Column, Header, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import type {
  PartialKeys,
  VirtualItem,
  Virtualizer,
  VirtualizerOptions,
} from "@tanstack/solid-virtual";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { JSX } from "solid-js";
import { children, createEffect, createMemo, createSignal, For, mergeProps, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Spinner } from "@/registry/kobalte/ui/spinner";
import type { DataGridFeatures, DataGridTableInstance } from "./data-grid";
import { useDataGrid } from "./data-grid";
import type { DataGridRefCallback } from "./data-grid-table";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRenderedRow,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridScrollAreaViewport,
  getDataGridTableMergedHeaderGroups,
  getDataGridTableRowSections,
  getPinningStyles,
  hasDataGridTableRightPinnedColumns,
} from "./data-grid-table";

type DataGridTableVirtualScrollElements = {
  containerElement: HTMLDivElement | null;
  scrollElement: HTMLElement | null;
};

type DataGridTableVirtualizerInstance = Virtualizer<HTMLElement, HTMLTableRowElement>;

type DataGridTableVirtualScrollAlignment = "auto" | "center" | "start" | "end";

type DataGridTableVirtualScrollRequest = {
  align: DataGridTableVirtualScrollAlignment;
  behavior: ScrollBehavior;
  containerElement: HTMLDivElement;
  headerSticky: boolean;
  isVirtualizationEnabled: boolean;
  rowId: string | undefined;
  rowIndex: number;
  scrollElement: HTMLElement;
};

function isSameDataGridTableScrollRequest(
  previous: DataGridTableVirtualScrollRequest | null,
  next: DataGridTableVirtualScrollRequest,
) {
  return (
    previous?.align === next.align &&
    previous.behavior === next.behavior &&
    previous.containerElement === next.containerElement &&
    previous.headerSticky === next.headerSticky &&
    previous.isVirtualizationEnabled === next.isVirtualizationEnabled &&
    previous.rowId === next.rowId &&
    previous.rowIndex === next.rowIndex &&
    previous.scrollElement === next.scrollElement
  );
}

function getDataGridTableScrollTarget({
  align,
  clientHeight,
  rowBottom,
  rowHeight,
  rowTop,
  scrollHeight,
  scrollTop,
  viewportTopOffset = 0,
}: {
  align: DataGridTableVirtualScrollAlignment;
  clientHeight: number;
  rowBottom: number;
  rowHeight: number;
  rowTop: number;
  scrollHeight: number;
  scrollTop: number;
  viewportTopOffset?: number;
}) {
  const visibleHeight = Math.max(0, clientHeight - viewportTopOffset);
  const viewportTop = scrollTop + viewportTopOffset;
  const viewportBottom = scrollTop + clientHeight;

  const targetTop =
    align === "auto"
      ? rowTop < viewportTop
        ? rowTop - viewportTopOffset
        : rowBottom > viewportBottom
          ? rowBottom - clientHeight
          : null
      : align === "start"
        ? rowTop - viewportTopOffset
        : align === "end"
          ? rowBottom - clientHeight
          : rowTop - viewportTopOffset - Math.max(0, (visibleHeight - rowHeight) / 2);

  if (targetTop === null) return null;

  return Math.min(Math.max(0, targetTop), Math.max(0, scrollHeight - clientHeight));
}

function getDataGridTableHeaderOffset({
  containerElement,
  headerSticky,
  scrollElement,
}: {
  containerElement: HTMLDivElement;
  headerSticky: boolean;
  scrollElement: HTMLElement;
}) {
  if (!headerSticky) return 0;

  const headerElement = containerElement.querySelector<HTMLElement>(
    ':scope > [data-slot="data-grid-table"] > thead',
  );

  if (!headerElement) return 0;

  const scrollRect = scrollElement.getBoundingClientRect();
  const headerRect = headerElement.getBoundingClientRect();
  const headerBottomOffset = headerRect.bottom - scrollRect.top;
  const overlapsViewportTop = headerRect.top <= scrollRect.top + 0.5 && headerBottomOffset > 0;

  if (!overlapsViewportTop) return 0;

  return Math.min(scrollElement.clientHeight, Math.max(0, headerBottomOffset));
}

function scrollDataGridTableToOffset({
  behavior,
  scrollElement,
  targetTop,
  virtualizer,
}: {
  behavior: ScrollBehavior;
  scrollElement: HTMLElement;
  targetTop: number;
  virtualizer?: DataGridTableVirtualizerInstance;
}) {
  if (virtualizer) {
    virtualizer.scrollToOffset(targetTop, { align: "start", behavior });
  } else if (typeof scrollElement.scrollTo === "function") {
    scrollElement.scrollTo({ behavior, top: targetTop });
  } else {
    scrollElement.scrollTop = targetTop;
  }
}

function scrollDataGridTableRowIntoView({
  align,
  behavior,
  cancelPendingScroll = false,
  containerElement,
  headerSticky,
  rowIndex,
  scrollElement,
  virtualizer,
}: {
  align: DataGridTableVirtualScrollAlignment;
  behavior: ScrollBehavior;
  cancelPendingScroll?: boolean;
  containerElement: HTMLDivElement | null;
  headerSticky: boolean;
  rowIndex: number;
  scrollElement: HTMLElement | null;
  virtualizer?: DataGridTableVirtualizerInstance;
}) {
  if (!containerElement || !scrollElement) return false;

  const rowElement = containerElement.querySelector<HTMLTableRowElement>(
    `:scope > [data-slot="data-grid-table"] > tbody > tr[data-index="${rowIndex}"]`,
  );

  if (!rowElement) return false;

  const scrollRect = scrollElement.getBoundingClientRect();
  const rowRect = rowElement.getBoundingClientRect();
  const viewportTopOffset = getDataGridTableHeaderOffset({
    containerElement,
    headerSticky,
    scrollElement,
  });
  const rowTop = scrollElement.scrollTop + rowRect.top - scrollRect.top;
  const rowBottom = scrollElement.scrollTop + rowRect.bottom - scrollRect.top;
  const targetTop = getDataGridTableScrollTarget({
    align,
    clientHeight: scrollElement.clientHeight,
    rowBottom,
    rowHeight: rowRect.height || rowElement.offsetHeight,
    rowTop,
    scrollHeight: scrollElement.scrollHeight,
    scrollTop: scrollElement.scrollTop,
    viewportTopOffset,
  });

  if (targetTop === null || Math.abs(targetTop - scrollElement.scrollTop) < 0.5) {
    if (cancelPendingScroll) {
      scrollDataGridTableToOffset({
        behavior: "auto",
        scrollElement,
        targetTop: scrollElement.scrollTop,
        virtualizer,
      });
    }

    return true;
  }

  scrollDataGridTableToOffset({
    behavior,
    scrollElement,
    targetTop,
    virtualizer,
  });

  return true;
}

/**
 * The virtualizer knobs a consumer may override.
 *
 * `observeElementRect` / `observeElementOffset` / `scrollToFn` are optional
 * here, exactly as the Solid adapter's own signature makes them - upstream's
 * plain `Omit` left them required, so passing `virtualizerOptions` at all
 * forced a consumer to supply three internals they never meant to touch.
 */
type DataGridTableVirtualizerOptions<TData extends object> = Omit<
  PartialKeys<
    VirtualizerOptions<HTMLElement, HTMLTableRowElement>,
    "observeElementRect" | "observeElementOffset" | "scrollToFn"
  >,
  "count" | "estimateSize" | "getItemKey" | "getScrollElement"
> & {
  estimateSize?: (index: number, row: Row<DataGridFeatures, TData>) => number;
  getItemKey?: (index: number, row: Row<DataGridFeatures, TData>) => string | number;
  getScrollElement?: (elements: DataGridTableVirtualScrollElements) => HTMLElement | null;
};

interface DataGridTableVirtualProps<TData extends object> {
  height?: number | string;
  estimateSize?: number;
  overscan?: number;
  /** Scroll animation used when revealing a controlled target row. */
  scrollBehavior?: ScrollBehavior;
  /** Alignment used when revealing a controlled target row. Defaults to auto. */
  scrollToRowAlign?: DataGridTableVirtualScrollAlignment;
  /** Index within the center (non-pinned) row section to reveal. */
  scrollToRowIndex?: number;
  footerContent?: JSX.Element;
  renderHeader?: boolean;
  onFetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  fetchMoreOffset?: number;
  virtualizerOptions?: DataGridTableVirtualizerOptions<TData>;
}

interface VirtualBodyProps<TData extends object> {
  table: DataGridTableInstance<TData>;
  topRows: Row<DataGridFeatures, TData>[];
  centerRows: Row<DataGridFeatures, TData>[];
  bottomRows: Row<DataGridFeatures, TData>[];
  virtualItems: VirtualItem[];
  totalSize: number;
  isVirtualizationEnabled: boolean;
  isInfiniteMode: boolean;
  isFetchingMore: boolean;
  hasMore?: boolean;
  loadingMoreMessage: JSX.Element;
  allRowsLoadedMessage: JSX.Element;
  measureRowRef?: DataGridRefCallback<HTMLTableRowElement>;
}

function DataGridTableVirtualPinnedPlaceholderCell<TData extends object>(props: {
  column: Column<DataGridFeatures, TData, unknown>;
}) {
  const grid = useDataGrid<TData>();
  const isPinned = () => props.column.getIsPinned();
  const isLastStartPinned = () => isPinned() === "start" && props.column.getIsLastColumn("start");
  const isFirstEndPinned = () => isPinned() === "end" && props.column.getIsFirstColumn("end");

  return (
    <td
      aria-hidden="true"
      style={{
        ...(grid.props.tableLayout?.columnsPinnable && props.column.getCanPin()
          ? getPinningStyles(props.column)
          : undefined),
        ...(grid.props.tableLayout?.columnsResizable
          ? { width: `calc(var(--col-${props.column.id}-size) * 1px)` }
          : undefined),
      }}
      data-pinned={isPinned() || undefined}
      data-last-col={isLastStartPinned() ? "start" : isFirstEndPinned() ? "end" : undefined}
      class={cn(
        "p-0",
        grid.props.tableLayout?.cellBorder && "border-e",
        grid.props.tableLayout?.columnsPinnable &&
          props.column.getCanPin() &&
          "data-pinned:bg-background data-pinned:isolate [&[data-pinned=end][data-last-col=end]]:shadow-[inset_1px_0_0_0_var(--border)] [&[data-pinned=start][data-last-col=start]]:shadow-[inset_-1px_0_0_0_var(--border)]",
      )}
    />
  );
}

function DataGridTableVirtualUtilityRow<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
  children: JSX.Element;
  centerCellClass?: string;
  centerCellStyle?: JSX.CSSProperties;
  rowClass?: string;
  ariaHidden?: boolean;
}) {
  const grid = useDataGrid<TData>();
  const leftVisibleColumns = () => props.table.getStartVisibleLeafColumns();
  const centerVisibleColumns = () => props.table.getCenterVisibleLeafColumns();
  const rightVisibleColumns = () => props.table.getEndVisibleLeafColumns();
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(props.table);

  return (
    <tr aria-hidden={props.ariaHidden || undefined} class={props.rowClass}>
      <For each={leftVisibleColumns()}>
        {(column) => <DataGridTableVirtualPinnedPlaceholderCell column={column} />}
      </For>
      <td
        colSpan={Math.max(centerVisibleColumns().length, 1)}
        class={props.centerCellClass}
        style={props.centerCellStyle}
      >
        {props.children}
      </td>
      <Show when={grid.props.tableLayout?.columnsResizable && hasRightPinnedColumns()}>
        <DataGridTableFillBodyCell />
      </Show>
      <For each={rightVisibleColumns()}>
        {(column) => <DataGridTableVirtualPinnedPlaceholderCell column={column} />}
      </For>
      <Show when={grid.props.tableLayout?.columnsResizable && !hasRightPinnedColumns()}>
        <DataGridTableFillBodyCell />
      </Show>
    </tr>
  );
}

function DataGridTableVirtualSpacer<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
  height: number;
}) {
  return (
    <Show when={props.height > 0}>
      <DataGridTableVirtualUtilityRow
        table={props.table}
        ariaHidden
        centerCellClass="p-0"
        centerCellStyle={{ height: `${props.height}px`, padding: "0px" }}
      >
        {null}
      </DataGridTableVirtualUtilityRow>
    </Show>
  );
}

function DataGridTableVirtualStatusRow<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <DataGridTableVirtualUtilityRow
      table={props.table}
      centerCellClass={cn("text-muted-foreground py-4 text-center text-sm", props.class)}
    >
      {props.children}
    </DataGridTableVirtualUtilityRow>
  );
}

/**
 * Virtual body rows.
 *
 * Upstream memoizes this component so an active column resize does not
 * re-render every row; Solid updates only the attributes that changed, so the
 * memo has no counterpart and the guard against `columnResizing` disappears
 * with it.
 */
function DataGridTableVirtualBody<TData extends object>(props: VirtualBodyProps<TData>) {
  const grid = useDataGrid<TData>();
  const totalRows = () => props.topRows.length + props.centerRows.length + props.bottomRows.length;
  const hasCenterRows = () => props.centerRows.length > 0;
  const showFetchingRow = () => props.isInfiniteMode && props.isFetchingMore;
  const showCompleteRow = () => props.isInfiniteMode && props.hasMore === false && totalRows() > 0;
  const hasMiddleSection = () => hasCenterRows() || showFetchingRow() || showCompleteRow();
  const leadingSpacerHeight = () =>
    props.isVirtualizationEnabled && hasCenterRows() && props.virtualItems.length > 0
      ? (props.virtualItems[0]?.start ?? 0)
      : 0;
  const trailingSpacerHeight = () =>
    props.isVirtualizationEnabled && hasCenterRows() && props.virtualItems.length > 0
      ? Math.max(0, props.totalSize - (props.virtualItems[props.virtualItems.length - 1]?.end ?? 0))
      : 0;

  return (
    <Show
      when={totalRows() > 0}
      fallback={
        // Initial load must not flash the empty state as if the query returned
        // nothing.
        <Show when={grid.isLoading} fallback={<DataGridTableEmpty />}>
          <DataGridTableVirtualStatusRow table={props.table}>
            <div class="flex items-center justify-center gap-2">
              <Spinner class="size-4 opacity-60" />
              {props.loadingMoreMessage}
            </div>
          </DataGridTableVirtualStatusRow>
        </Show>
      }
    >
      <For each={props.topRows}>
        {(row, index) => (
          <DataGridTableRenderedRow
            row={row}
            pinnedBoundary={
              index() === props.topRows.length - 1 && hasMiddleSection() ? "top" : undefined
            }
          />
        )}
      </For>

      <Show
        when={props.isVirtualizationEnabled}
        fallback={
          <For each={props.centerRows}>
            {(row, rowIndex) => <DataGridTableRenderedRow row={row} rowIndex={rowIndex()} />}
          </For>
        }
      >
        <DataGridTableVirtualSpacer table={props.table} height={leadingSpacerHeight()} />
        <For each={props.virtualItems}>
          {(virtualRow) => (
            <Show when={props.centerRows[virtualRow.index]}>
              {(row) => (
                <DataGridTableRenderedRow
                  row={row()}
                  rowRef={props.measureRowRef}
                  rowIndex={virtualRow.index}
                />
              )}
            </Show>
          )}
        </For>
        <DataGridTableVirtualSpacer table={props.table} height={trailingSpacerHeight()} />
      </Show>

      <Show when={showFetchingRow()}>
        <DataGridTableVirtualStatusRow table={props.table}>
          <div class="flex items-center justify-center gap-2">
            <Spinner class="size-4 opacity-60" />
            {props.loadingMoreMessage}
          </div>
        </DataGridTableVirtualStatusRow>
      </Show>

      <Show when={showCompleteRow()}>
        <DataGridTableVirtualStatusRow table={props.table} class="py-3 text-xs">
          {props.allRowsLoadedMessage}
        </DataGridTableVirtualStatusRow>
      </Show>

      <For each={props.bottomRows}>
        {(row, index) => (
          <DataGridTableRenderedRow
            row={row}
            pinnedBoundary={
              index() === 0 && (props.topRows.length > 0 || hasMiddleSection())
                ? "bottom"
                : undefined
            }
          />
        )}
      </For>
    </Show>
  );
}

function DataGridTableVirtual<TData extends object>(props: DataGridTableVirtualProps<TData>) {
  const grid = useDataGrid<TData>();

  const estimateSize = () => props.estimateSize ?? 48;
  const overscan = () => props.overscan ?? 10;
  const scrollBehavior = () => props.scrollBehavior ?? "auto";
  const scrollToRowAlign = () => props.scrollToRowAlign ?? "auto";
  const renderHeader = () => props.renderHeader ?? true;
  const isFetchingMore = () => props.isFetchingMore ?? false;
  const fetchMoreOffset = () => props.fetchMoreOffset ?? 0;

  const mergedHeaderGroups = createMemo(() => getDataGridTableMergedHeaderGroups(grid.table));
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(grid.table);
  const rowSections = createMemo(() =>
    getDataGridTableRowSections(grid.table, grid.props.tableLayout?.rowsPinnable),
  );
  const topRows = () => rowSections().topRows;
  const centerRows = () => rowSections().centerRows;
  const bottomRows = () => rowSections().bottomRows;
  const isInfiniteMode = () => typeof props.onFetchMore === "function";

  // Solid ref callbacks fire before the node is attached, so the scroll
  // element is resolved in an effect rather than inside the callback: the
  // `closest()` walk in getDataGridScrollAreaViewport needs a mounted node.
  const [containerElement, setContainerElement] = createSignal<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = createSignal<HTMLElement | null>(null);

  createEffect(() => {
    const node = containerElement();
    setScrollElement(node ? (getDataGridScrollAreaViewport(node) ?? node) : null);
  });

  const viewportElements = (): DataGridTableVirtualScrollElements => ({
    containerElement: containerElement(),
    scrollElement: scrollElement(),
  });

  const customEstimateSize = () => props.virtualizerOptions?.estimateSize;
  const customGetItemKey = () => props.virtualizerOptions?.getItemKey;
  const customGetScrollElement = () => props.virtualizerOptions?.getScrollElement;
  const customMeasureElement = () => props.virtualizerOptions?.measureElement;
  const customOverscan = () => props.virtualizerOptions?.overscan;

  // Everything the grid does not own itself is forwarded verbatim, mirroring
  // upstream's `...virtualizerOptionsRest`.
  const virtualizerOptionsRest = () => {
    const options = props.virtualizerOptions;
    if (!options) return {};
    const {
      estimateSize: _estimateSize,
      getItemKey: _getItemKey,
      getScrollElement: _getScrollElement,
      measureElement: _measureElement,
      overscan: _overscan,
      ...rest
    } = options;
    return rest;
  };

  const isVirtualizationEnabled = () => props.virtualizerOptions?.enabled !== false;
  const loadingMoreMessage = () =>
    grid.props.fetchingMoreMessage || grid.props.loadingMessage || "Loading...";
  const allRowsLoadedMessage = () => grid.props.allRowsLoadedMessage || "All records loaded";

  const usesExternalScrollArea = () =>
    scrollElement() !== null && scrollElement() !== containerElement();

  const resolveScrollElement = () => {
    const custom = customGetScrollElement();

    if (custom) {
      return custom(viewportElements());
    }

    return scrollElement();
  };

  const resolveItemKey = (index: number) => {
    const row = centerRows()[index];

    if (!row) return index;

    return customGetItemKey()?.(index, row) ?? row.id ?? index;
  };

  const resolveEstimateSize = (index: number) => {
    const row = centerRows()[index];

    return row ? (customEstimateSize()?.(index, row) ?? estimateSize()) : estimateSize();
  };

  // The Solid adapter takes a plain options object whose reactive fields are
  // getters, then re-reads them inside its own `createComputed`.
  const virtualizer = createVirtualizer<HTMLElement, HTMLTableRowElement>(
    mergeProps(
      {
        get count() {
          return centerRows().length;
        },
        getScrollElement: resolveScrollElement,
        getItemKey: resolveItemKey,
        estimateSize: resolveEstimateSize,
        get overscan() {
          return customOverscan() ?? overscan();
        },
        get measureElement() {
          return customMeasureElement();
        },
      },
      virtualizerOptionsRest,
    ),
  ) as DataGridTableVirtualizerInstance;

  const virtualItems = () => (isVirtualizationEnabled() ? virtualizer.getVirtualItems() : []);
  const totalSize = () => (isVirtualizationEnabled() ? virtualizer.getTotalSize() : 0);
  const measureRowRef = () =>
    isVirtualizationEnabled() && customMeasureElement()
      ? (virtualizer.measureElement as DataGridRefCallback<HTMLTableRowElement>)
      : undefined;
  const resolvedFetchMoreOffset = () => Math.max(0, fetchMoreOffset());
  const scrollToRowId = () =>
    props.scrollToRowIndex !== undefined ? centerRows()[props.scrollToRowIndex]?.id : undefined;
  const scrollToRowVirtualItem = () =>
    isVirtualizationEnabled() && props.scrollToRowIndex !== undefined
      ? virtualItems().find((item) => item.index === props.scrollToRowIndex)
      : undefined;

  let pendingScrollToRowIndex: number | null = null;
  let lastScrollRequest: DataGridTableVirtualScrollRequest | null = null;
  // Latch onFetchMore per row count: the virtual item list changes identity on
  // every scroll frame, so without it the effect fires duplicate page requests
  // before the consumer flips isFetchingMore, and loops at end-of-data when
  // hasMore is never set.
  let fetchMoreFiredAtCount: number | null = null;

  // The request signature is what keeps this from re-scrolling on unrelated
  // state changes; upstream needed the same guard because its effect had no
  // dependency list at all.
  createEffect(() => {
    const previousRequest = lastScrollRequest;
    const rowIndex = props.scrollToRowIndex;

    if (rowIndex === undefined || rowIndex < 0 || rowIndex >= centerRows().length) {
      pendingScrollToRowIndex = null;
      lastScrollRequest = null;

      if (previousRequest) {
        const resolvedScrollElement = resolveScrollElement();

        if (resolvedScrollElement) {
          scrollDataGridTableToOffset({
            behavior: "auto",
            scrollElement: resolvedScrollElement,
            targetTop: resolvedScrollElement.scrollTop,
            virtualizer: isVirtualizationEnabled() ? virtualizer : undefined,
          });
        }
      }

      return;
    }

    const resolvedScrollElement = resolveScrollElement();
    const resolvedContainerElement = containerElement();
    if (!resolvedContainerElement || !resolvedScrollElement) return;

    const headerSticky = renderHeader() && !!grid.props.tableLayout?.headerSticky;
    const nextRequest: DataGridTableVirtualScrollRequest = {
      align: scrollToRowAlign(),
      behavior: scrollBehavior(),
      containerElement: resolvedContainerElement,
      headerSticky,
      isVirtualizationEnabled: isVirtualizationEnabled(),
      rowId: scrollToRowId(),
      rowIndex,
      scrollElement: resolvedScrollElement,
    };

    if (isSameDataGridTableScrollRequest(previousRequest, nextRequest)) return;

    pendingScrollToRowIndex = null;

    const rowWasHandled = scrollDataGridTableRowIntoView({
      align: scrollToRowAlign(),
      behavior: scrollBehavior(),
      cancelPendingScroll: previousRequest !== null,
      containerElement: resolvedContainerElement,
      headerSticky,
      rowIndex,
      scrollElement: resolvedScrollElement,
      virtualizer: isVirtualizationEnabled() ? virtualizer : undefined,
    });

    if (rowWasHandled) {
      lastScrollRequest = nextRequest;
      return;
    }

    if (!isVirtualizationEnabled()) return;

    pendingScrollToRowIndex = rowIndex;
    lastScrollRequest = nextRequest;
    virtualizer.scrollToIndex(rowIndex, {
      align: scrollToRowAlign(),
      behavior: scrollBehavior(),
    });
  });

  // Second pass: the virtualizer has now mounted the target row, so the
  // measured scroll can replace the estimated one.
  createEffect(() => {
    const rowIndex = props.scrollToRowIndex;

    if (
      !isVirtualizationEnabled() ||
      rowIndex === undefined ||
      pendingScrollToRowIndex !== rowIndex ||
      !scrollToRowVirtualItem()
    ) {
      return;
    }

    const rowWasHandled = scrollDataGridTableRowIntoView({
      align: scrollToRowAlign(),
      behavior: "auto",
      cancelPendingScroll: true,
      containerElement: containerElement(),
      headerSticky: renderHeader() && !!grid.props.tableLayout?.headerSticky,
      rowIndex,
      scrollElement: resolveScrollElement(),
      virtualizer,
    });

    if (rowWasHandled) {
      pendingScrollToRowIndex = null;
    }
  });

  createEffect(() => {
    if (
      !isVirtualizationEnabled() ||
      !isInfiniteMode() ||
      props.hasMore === false ||
      isFetchingMore()
    ) {
      return;
    }

    const items = virtualItems();
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    const rowCount = centerRows().length;

    if (fetchMoreFiredAtCount === rowCount) return;

    if (lastItem.index >= rowCount - 1 - resolvedFetchMoreOffset()) {
      fetchMoreFiredAtCount = rowCount;
      props.onFetchMore?.();
    }
  });

  // Resolve once: the footer is JSX handed in as a prop, and testing it for
  // presence must not build it a second time.
  const footerContent = children(() => props.footerContent);

  const headerCell = (header: Header<DataGridFeatures, TData, unknown>) => (
    <DataGridTableHeadRowCell header={header}>
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      <Show when={grid.props.tableLayout?.columnsResizable && header.column.getCanResize()}>
        <DataGridTableHeadRowCellResize header={header} />
      </Show>
    </DataGridTableHeadRowCell>
  );

  return (
    <DataGridTableViewport
      viewportRef={setContainerElement}
      class={!usesExternalScrollArea() ? "block" : undefined}
      style={
        usesExternalScrollArea()
          ? undefined
          : {
              height: typeof props.height === "number" ? `${props.height}px` : props.height,
              overflow: "auto",
              position: "relative",
              // Standalone mode: this node IS the scroll container, so it
              // must stay at its parent's width (not the resizable table
              // width) or horizontal scrolling becomes impossible.
              width: "auto",
            }
      }
    >
      <DataGridTableBase>
        <Show when={renderHeader()}>
          <DataGridTableHead>
            <For each={mergedHeaderGroups()}>
              {(headerGroup) => (
                <DataGridTableHeadRow rowId={headerGroup.id}>
                  <For
                    each={headerGroup.headers.filter(
                      (header) => header.column.getIsPinned() !== "end",
                    )}
                  >
                    {headerCell}
                  </For>
                  <Show when={grid.props.tableLayout?.columnsResizable && hasRightPinnedColumns()}>
                    <DataGridTableFillHeadCell />
                  </Show>
                  <For
                    each={headerGroup.headers.filter(
                      (header) => header.column.getIsPinned() === "end",
                    )}
                  >
                    {headerCell}
                  </For>
                  <Show when={grid.props.tableLayout?.columnsResizable && !hasRightPinnedColumns()}>
                    <DataGridTableFillHeadCell />
                  </Show>
                </DataGridTableHeadRow>
              )}
            </For>
          </DataGridTableHead>
        </Show>

        <Show
          when={
            renderHeader() &&
            (grid.props.tableLayout?.stripped || !grid.props.tableLayout?.rowBorder)
          }
        >
          <DataGridTableRowSpacer />
        </Show>

        <DataGridTableBody>
          <DataGridTableVirtualBody
            table={grid.table}
            topRows={topRows()}
            centerRows={centerRows()}
            bottomRows={bottomRows()}
            virtualItems={virtualItems()}
            totalSize={totalSize()}
            isVirtualizationEnabled={isVirtualizationEnabled()}
            isInfiniteMode={isInfiniteMode()}
            isFetchingMore={isFetchingMore()}
            hasMore={props.hasMore}
            loadingMoreMessage={loadingMoreMessage()}
            allRowsLoadedMessage={allRowsLoadedMessage()}
            measureRowRef={measureRowRef()}
          />
        </DataGridTableBody>

        <Show when={footerContent()}>
          <DataGridTableFoot>{footerContent()}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

export type {
  DataGridTableVirtualizerOptions,
  DataGridTableVirtualProps,
  DataGridTableVirtualScrollAlignment,
  DataGridTableVirtualScrollElements,
};
export { DataGridTableVirtual };
