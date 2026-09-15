import type { Cell, Column, Header, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
  untrack,
} from "solid-js";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Spinner } from "@/registry/kobalte/ui/spinner";
import type { DataGridFeatures, DataGridTableInstance } from "./data-grid";
import { useDataGrid } from "./data-grid";

// Static spacing lookups; called once per cell, so they stay plain string
// picks instead of runtime variant machinery.
const headerCellSpacingVariants = ({ size }: { size?: "dense" | "default" }) =>
  size === "dense" ? "px-2 h-8" : "px-3";

const bodyCellSpacingVariants = ({ size }: { size?: "dense" | "default" }) =>
  size === "dense" ? "px-2 py-1.5" : "px-3 py-2";

const footerCellSpacingVariants = ({ size }: { size?: "dense" | "default" }) =>
  size === "dense" ? "px-2 py-1.5" : "px-3 py-2";

/**
 * Solid applies `style` objects through `setProperty`, so every declaration
 * below is written in hyphenated CSS form with explicit units.
 */
function getPinningStyles<TData extends object>(
  column: Column<DataGridFeatures, TData, unknown>,
): JSX.CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    // Logical offsets: TanStack's "left"/"right" buckets are start/end
    // semantics, so pinned columns stick to the correct edge in RTL too
    // (identical to left/right in LTR).
    "inset-inline-start": isPinned === "start" ? `${column.getStart("start")}px` : undefined,
    "inset-inline-end": isPinned === "end" ? `${column.getAfter("end")}px` : undefined,
    position: isPinned ? "sticky" : undefined,
    transform: isPinned ? "translateZ(0)" : undefined,
    contain: isPinned ? "paint" : undefined,
    width: `${column.getSize()}px`,
    "z-index": isPinned ? 30 : undefined,
    "background-clip": isPinned ? "padding-box" : undefined,
  };
}

// Shared indent contract for tree rows: DataGridTableRowExpand consumes it,
// and fully custom cells can reuse it for depth alignment without the
// built-in toggle.
function getDataGridTreeIndentStyle<TData extends object>(
  row: Row<DataGridFeatures, TData>,
  indent = 20,
): JSX.CSSProperties {
  return {
    "--data-grid-tree-padding": `${row.depth * indent}px`,
  };
}

/**
 * Solid refs are plain callbacks, so the grid's optional ref props are too.
 * Unlike React they are never called with `null`; teardown belongs in
 * `onCleanup`.
 */
type DataGridRefCallback<T> = (element: T) => void;

function assignRef<T>(ref: DataGridRefCallback<T> | undefined, value: T) {
  ref?.(value);
}

/**
 * Nearest scroll-area viewport that belongs to THIS grid. A viewport outside
 * the grid's own container (e.g. a page-level ScrollArea) would make the
 * width measurement - and the virtualizer - bind the wrong box.
 */
function getDataGridScrollAreaViewport(node: HTMLElement): HTMLElement | null {
  const scrollViewport = node.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;

  if (!scrollViewport) return null;

  const gridContainer = node.closest('[data-slot="data-grid"]');
  if (gridContainer && !gridContainer.contains(scrollViewport)) return null;

  return scrollViewport;
}

type DataGridResizeStartEvent =
  | (MouseEvent & { currentTarget: HTMLDivElement })
  | (TouchEvent & { currentTarget: HTMLDivElement });

type DataGridResizeDocumentEvent = globalThis.MouseEvent | globalThis.TouchEvent;

function isDataGridTouchEvent(
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent,
): event is (TouchEvent & { currentTarget: HTMLDivElement }) | globalThis.TouchEvent {
  return "touches" in event;
}

type DataGridTouchListLike = {
  length: number;
  item: (index: number) => { identifier: number; clientX: number } | null;
};

function findTouchClientX(list: DataGridTouchListLike, identifier: number) {
  for (let i = 0; i < list.length; i++) {
    const touch = list.item(i);
    if (touch && touch.identifier === identifier) return touch.clientX;
  }

  return undefined;
}

function getDataGridResizeEventClientX(
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent,
  touchIdentifier?: number,
) {
  if (isDataGridTouchEvent(event)) {
    if (typeof touchIdentifier === "number") {
      return (
        findTouchClientX(event.touches, touchIdentifier) ??
        findTouchClientX(event.changedTouches, touchIdentifier)
      );
    }

    return event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX;
  }

  return event.clientX;
}

function startDataGridColumnResizeOnEnd<TData extends object>(
  event: DataGridResizeStartEvent,
  header: Header<DataGridFeatures, TData, unknown>,
  table: DataGridTableInstance<TData>,
): (() => void) | undefined {
  const column = table.getColumn(header.column.id);

  if (!column?.getCanResize()) return;
  const isTouchSession = isDataGridTouchEvent(event);
  if (isTouchSession && event.touches.length > 1) return;

  const ownerDocument = event.currentTarget.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const previousBodyCursor = ownerDocument.body.style.cursor;
  const previousDocumentCursor = ownerDocument.documentElement.style.cursor;
  const startSize = header.getSize();
  // Track the initiating finger so a second touch cannot move or commit the
  // resize with the wrong clientX.
  const touchIdentifier = isTouchSession ? event.touches[0]?.identifier : undefined;
  const dragStartClientX = getDataGridResizeEventClientX(event, touchIdentifier);
  const headerCell = event.currentTarget.closest("th");
  const headerRect = headerCell?.getBoundingClientRect();
  const startOffset =
    headerRect &&
    Number.isFinite(
      table.options.columnResizeDirection === "rtl" ? headerRect.left : headerRect.right,
    )
      ? table.options.columnResizeDirection === "rtl"
        ? headerRect.left
        : headerRect.right
      : dragStartClientX;

  if (typeof dragStartClientX !== "number" || typeof startOffset !== "number") {
    return;
  }

  ownerDocument.body.style.cursor = "col-resize";
  ownerDocument.documentElement.style.cursor = "col-resize";

  const columnSizingStart = header
    .getLeafHeaders()
    .map((leafHeader) => [leafHeader.column.id, leafHeader.column.getSize()] as [string, number]);
  const directionMultiplier = table.options.columnResizeDirection === "rtl" ? -1 : 1;

  // Clamp the drag to the leaf columns' min/max sizes so the preview
  // indicator matches what the commit will produce (no overshoot followed by
  // a snap-back on release). columnDef always carries resolved defaults.
  let minDeltaPercentage = -0.999999;
  let maxDeltaPercentage = Number.POSITIVE_INFINITY;
  for (const [columnId, headerSize] of columnSizingStart) {
    if (headerSize <= 0) continue;

    const leafColumn = table.getColumn(columnId);
    const minSize = leafColumn?.columnDef.minSize;
    const maxSize = leafColumn?.columnDef.maxSize;

    if (typeof minSize === "number") {
      minDeltaPercentage = Math.max(minDeltaPercentage, minSize / headerSize - 1);
    }
    if (typeof maxSize === "number" && Number.isFinite(maxSize)) {
      maxDeltaPercentage = Math.min(maxDeltaPercentage, maxSize / headerSize - 1);
    }
  }

  let lastClientX = dragStartClientX;
  let ended = false;
  const stopListeners: Array<() => void> = [];

  const updateOffset = (clientXPos?: number, commit = false) => {
    if (typeof clientXPos !== "number") return;

    lastClientX = clientXPos;

    const nextColumnSizing: Record<string, number> = {};
    const deltaPercentage = Math.min(
      Math.max(
        ((clientXPos - dragStartClientX) * directionMultiplier) / startSize,
        minDeltaPercentage,
      ),
      maxDeltaPercentage,
    );
    const deltaOffset = deltaPercentage * startSize;

    for (const [columnId, headerSize] of columnSizingStart) {
      nextColumnSizing[columnId] =
        Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
    }

    table.setColumnResizing((old) => ({
      ...old,
      startOffset,
      startSize,
      deltaOffset,
      deltaPercentage,
      columnSizingStart,
      isResizingColumn: column.id,
    }));

    if (commit) {
      table.setColumnSizing((old) => ({
        ...old,
        ...nextColumnSizing,
      }));
    }
  };

  // Single teardown path: commits at the given position, removes every
  // document/window listener, and restores cursors. Safe to call more than
  // once (blur + mouseup + unmount can race).
  const endResize = (clientXPos?: number) => {
    if (ended) return;
    ended = true;

    for (const stop of stopListeners) stop();
    updateOffset(clientXPos, true);
    table.setColumnResizing((old) => ({
      ...old,
      isResizingColumn: false,
      startOffset: null,
      startSize: null,
      deltaOffset: null,
      deltaPercentage: null,
      columnSizingStart: [],
    }));
    ownerDocument.body.style.cursor = previousBodyCursor;
    ownerDocument.documentElement.style.cursor = previousDocumentCursor;
  };

  const mouseMoveHandler = (moveEvent: globalThis.MouseEvent) => {
    updateOffset(moveEvent.clientX);
  };
  const mouseUpHandler = (upEvent: globalThis.MouseEvent) => {
    endResize(upEvent.clientX);
  };
  const touchMoveHandler = (moveEvent: globalThis.TouchEvent) => {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
    }

    updateOffset(getDataGridResizeEventClientX(moveEvent, touchIdentifier));
  };
  const touchEndHandler = (endEvent: globalThis.TouchEvent) => {
    // Ignore other fingers lifting; only the initiating touch ends the drag.
    const clientXPos =
      typeof touchIdentifier === "number"
        ? findTouchClientX(endEvent.changedTouches, touchIdentifier)
        : getDataGridResizeEventClientX(endEvent);

    if (typeof clientXPos !== "number") return;

    if (endEvent.cancelable) {
      endEvent.preventDefault();
      endEvent.stopPropagation();
    }

    endResize(clientXPos);
  };
  // System-interrupted gestures and window focus loss would otherwise leave
  // the session (and its document listeners) live with no pointer held.
  const touchCancelHandler = () => {
    endResize(lastClientX);
  };
  const windowBlurHandler = () => {
    endResize(lastClientX);
  };

  const passiveIfSupported = { passive: false } as const;

  if (isTouchSession) {
    ownerDocument.addEventListener("touchmove", touchMoveHandler, passiveIfSupported);
    ownerDocument.addEventListener("touchend", touchEndHandler, passiveIfSupported);
    ownerDocument.addEventListener("touchcancel", touchCancelHandler);
    stopListeners.push(() => {
      ownerDocument.removeEventListener("touchmove", touchMoveHandler);
      ownerDocument.removeEventListener("touchend", touchEndHandler);
      ownerDocument.removeEventListener("touchcancel", touchCancelHandler);
    });
  } else {
    ownerDocument.addEventListener("mousemove", mouseMoveHandler, passiveIfSupported);
    ownerDocument.addEventListener("mouseup", mouseUpHandler, passiveIfSupported);
    stopListeners.push(() => {
      ownerDocument.removeEventListener("mousemove", mouseMoveHandler);
      ownerDocument.removeEventListener("mouseup", mouseUpHandler);
    });
  }

  if (ownerWindow) {
    ownerWindow.addEventListener("blur", windowBlurHandler);
    stopListeners.push(() => ownerWindow.removeEventListener("blur", windowBlurHandler));
  }

  table.setColumnResizing((old) => ({
    ...old,
    startOffset,
    startSize,
    deltaOffset: 0,
    deltaPercentage: 0,
    columnSizingStart,
    isResizingColumn: column.id,
  }));

  return () => endResize(lastClientX);
}

type DataGridTablePinnedBoundary = "top" | "bottom";

function getDataGridTableRowSections<TData extends object>(
  table: DataGridTableInstance<TData>,
  rowsPinnable?: boolean,
) {
  if (!rowsPinnable) {
    return {
      topRows: [] as Row<DataGridFeatures, TData>[],
      centerRows: table.getRowModel().rows as Row<DataGridFeatures, TData>[],
      bottomRows: [] as Row<DataGridFeatures, TData>[],
    };
  }

  return {
    topRows: table.getTopRows() as Row<DataGridFeatures, TData>[],
    centerRows: table.getCenterRows() as Row<DataGridFeatures, TData>[],
    bottomRows: table.getBottomRows() as Row<DataGridFeatures, TData>[],
  };
}

function getDataGridTableResolvedRows<TData extends object>(
  table: DataGridTableInstance<TData>,
  rowsPinnable?: boolean,
) {
  const { topRows, centerRows, bottomRows } = getDataGridTableRowSections(table, rowsPinnable);
  const resolvedRows: Array<{
    row: Row<DataGridFeatures, TData>;
    pinnedBoundary?: DataGridTablePinnedBoundary;
  }> = [];

  topRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === topRows.length - 1 && (centerRows.length > 0 || bottomRows.length > 0)
          ? "top"
          : undefined,
    });
  });

  for (const row of centerRows) {
    resolvedRows.push({ row });
  }

  bottomRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === 0 && (centerRows.length > 0 || topRows.length > 0) ? "bottom" : undefined,
    });
  });

  return resolvedRows;
}

function getDataGridTableOrderedVisibleColumns<TData extends object>(
  table: DataGridTableInstance<TData>,
) {
  return [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ] as Column<DataGridFeatures, TData, unknown>[];
}

function getDataGridTableOrderedVisibleCells<TData extends object>(
  row: Row<DataGridFeatures, TData>,
) {
  return [
    ...row.getStartVisibleCells(),
    ...row.getCenterVisibleCells(),
    ...row.getEndVisibleCells(),
  ] as Cell<DataGridFeatures, TData, unknown>[];
}

function getDataGridTableMergedHeaderGroups<TData extends object>(
  table: DataGridTableInstance<TData>,
) {
  const leftHeaderGroups = table.getStartHeaderGroups();
  const centerHeaderGroups = table.getCenterHeaderGroups();
  const rightHeaderGroups = table.getEndHeaderGroups();
  const headerGroupCount = Math.max(
    leftHeaderGroups.length,
    centerHeaderGroups.length,
    rightHeaderGroups.length,
  );

  return Array.from({ length: headerGroupCount }, (_, index) => {
    const leftGroup = leftHeaderGroups[index];
    const centerGroup = centerHeaderGroups[index];
    const rightGroup = rightHeaderGroups[index];

    return {
      id:
        [leftGroup?.id, centerGroup?.id, rightGroup?.id].filter(Boolean).join(":") ||
        `header-group-${index}`,
      headers: [
        ...(leftGroup?.headers ?? []),
        ...(centerGroup?.headers ?? []),
        ...(rightGroup?.headers ?? []),
      ] as Header<DataGridFeatures, TData, unknown>[],
    };
  });
}

function hasDataGridTableRightPinnedColumns<TData extends object>(
  table: DataGridTableInstance<TData>,
) {
  return (table.store.state.columnPinning.end?.length ?? 0) > 0;
}

function DataGridTableFillCol() {
  const grid = useDataGrid();

  return (
    <Show when={grid.props.tableLayout?.columnsResizable}>
      <col
        data-slot="data-grid-table-fill-col"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
      />
    </Show>
  );
}

function DataGridTableFillHeadCell() {
  const grid = useDataGrid();

  return (
    <Show when={grid.props.tableLayout?.columnsResizable}>
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: spacer cell with no content and no tabindex; hiding it keeps the header row's column count honest for screen readers. */}
      <th
        aria-hidden="true"
        data-slot="data-grid-table-fill-head-cell"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
        class={cn("p-0", grid.props.tableLayout?.headerBackground && "bg-muted")}
      />
    </Show>
  );
}

function DataGridTableFillBodyCell() {
  const grid = useDataGrid();

  return (
    <Show when={grid.props.tableLayout?.columnsResizable}>
      <td
        aria-hidden="true"
        data-slot="data-grid-table-fill-body-cell"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
        class="p-0"
      />
    </Show>
  );
}

function DataGridTableFillFootCell() {
  const grid = useDataGrid();

  return (
    <Show when={grid.props.tableLayout?.columnsResizable}>
      <td
        aria-hidden="true"
        data-slot="data-grid-table-fill-foot-cell"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
        class="p-0"
      />
    </Show>
  );
}

function DataGridTableBase(props: { children: JSX.Element }) {
  const grid = useDataGrid();
  const leftVisibleColumns = () => grid.table.getStartVisibleLeafColumns();
  const centerVisibleColumns = () => grid.table.getCenterVisibleLeafColumns();
  const rightVisibleColumns = () => grid.table.getEndVisibleLeafColumns();
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(grid.table);

  /**
   * Column widths are published once as CSS custom properties. Cells reference
   * these via calc(var(--col-X-size) * 1px) so the browser handles width
   * propagation without a per-cell getSize() read.
   */
  const columnSizeVars = createMemo(() => {
    if (!grid.props.tableLayout?.columnsResizable) return undefined;
    const colSizes: JSX.CSSProperties = {};
    for (const header of grid.table.getFlatHeaders()) {
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  });

  // Structural on purpose: v9 declares `TData` invariant, so annotating this
  // against a concrete row type would reject the erased columns the context
  // hands back.
  const columnStyle = (column: { id: string; getSize: () => number }) =>
    grid.props.tableLayout?.columnsResizable
      ? { width: `calc(var(--col-${column.id}-size) * 1px)` }
      : grid.props.tableLayout?.width === "fixed"
        ? { width: `${column.getSize()}px` }
        : undefined;

  return (
    <table
      data-slot="data-grid-table"
      class={cn(
        "text-foreground caption-bottom text-left align-middle text-sm font-normal rtl:text-right",
        grid.props.tableLayout?.columnsResizable ? "min-w-0" : "w-full min-w-full",
        grid.props.tableLayout?.width === "auto" ? "table-auto" : "table-fixed",
        !grid.props.tableLayout?.columnsDraggable && "border-separate border-spacing-0",
        grid.props.tableClassNames?.base,
      )}
      style={
        grid.props.tableLayout?.columnsResizable
          ? {
              ...columnSizeVars(),
              width: `calc(${grid.table.getTotalSize()}px + var(--data-grid-fill-size, 0px))`,
            }
          : undefined
      }
    >
      <colgroup>
        <For each={[...leftVisibleColumns(), ...centerVisibleColumns()]}>
          {(column) => <col style={columnStyle(column)} />}
        </For>
        <Show when={hasRightPinnedColumns()}>
          <DataGridTableFillCol />
        </Show>
        <For each={rightVisibleColumns()}>{(column) => <col style={columnStyle(column)} />}</For>
        <Show when={!hasRightPinnedColumns()}>
          <DataGridTableFillCol />
        </Show>
      </colgroup>
      {props.children}
    </table>
  );
}

function DataGridTableViewport(props: {
  children: JSX.Element;
  class?: string;
  viewportRef?: DataGridRefCallback<HTMLDivElement>;
  style?: JSX.CSSProperties;
}) {
  const grid = useDataGrid();
  const isColumnsResizable = () => !!grid.props.tableLayout?.columnsResizable;
  const [viewportNode, setViewportNode] = createSignal<HTMLDivElement>();
  const fillState = { containerWidth: 0, appliedFill: -1 };

  // Free space is written as a CSS variable directly on the viewport node so
  // container resizes and column-size commits reach the fill column without
  // any state round-trip.
  const syncFillWidth = () => {
    const node = viewportNode();
    if (!node) return;

    const fillWidth = Math.max(0, fillState.containerWidth - grid.table.getTotalSize());

    if (fillState.appliedFill !== fillWidth) {
      fillState.appliedFill = fillWidth;
      node.style.setProperty("--data-grid-fill-size", `${fillWidth}px`);
    }

    // The coordinator writes column sizing; keeping its reads out of the
    // effect's dependency set is what stops that write from re-triggering it.
    untrack(() => grid.autoSize?.apply(fillWidth));
  };

  createEffect(() => {
    const node = viewportNode();
    if (!node) return;

    if (!isColumnsResizable()) {
      fillState.appliedFill = -1;
      node.style.removeProperty("--data-grid-fill-size");
      return;
    }

    const scrollViewport = getDataGridScrollAreaViewport(node) ?? node.parentElement;
    const measurementTarget = scrollViewport ?? node;

    const measure = () => {
      fillState.containerWidth = measurementTarget.clientWidth;
      untrack(syncFillWidth);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(measurementTarget);
      onCleanup(() => observer.disconnect());
    }
  });

  // Column sizing commits and visibility changes alter the table's total size
  // without moving the container, so the fill var must re-sync on changes the
  // ResizeObserver never sees. No-ops when the value is unchanged.
  createEffect(() => {
    if (!isColumnsResizable()) return;
    syncFillWidth();
  });

  return (
    <div
      data-slot="data-grid-table-viewport"
      ref={(node) => {
        setViewportNode(node);
        assignRef(props.viewportRef, node);
      }}
      class={cn("relative min-w-full align-top", props.class)}
      style={{
        ...(isColumnsResizable()
          ? {
              width: `calc(${grid.table.getTotalSize()}px + var(--data-grid-fill-size, 0px))`,
            }
          : undefined),
        ...props.style,
      }}
    >
      {props.children}
      <DataGridTableResizeIndicator viewportNode={viewportNode} />
    </div>
  );
}

function DataGridTableHead(props: { children: JSX.Element }) {
  const grid = useDataGrid();

  return (
    <thead
      class={cn(
        grid.props.tableClassNames?.header,
        grid.props.tableLayout?.headerSticky && grid.props.tableClassNames?.headerSticky,
      )}
    >
      {props.children}
    </thead>
  );
}

function DataGridTableHeadRow(props: { children: JSX.Element; rowId: string }) {
  const grid = useDataGrid();

  return (
    <tr
      class={cn(
        grid.props.tableLayout?.headerBorder && "[&>th]:border-b",
        grid.props.tableLayout?.cellBorder && "*:last:border-e-0",
        grid.props.tableLayout?.stripped && "bg-transparent",
        grid.props.tableLayout?.headerBackground === false && "bg-transparent",
        grid.props.tableClassNames?.headerRow,
      )}
    >
      {props.children}
    </tr>
  );
}

function DataGridTableHeadRowCell<TData extends object>(props: {
  children: JSX.Element;
  header: Header<DataGridFeatures, TData, unknown>;
  dndRef?: DataGridRefCallback<HTMLTableCellElement>;
  dndStyle?: JSX.CSSProperties;
}) {
  const grid = useDataGrid<TData>();

  const column = () => props.header.column;
  const isPinned = () => column().getIsPinned();
  const isFirstStartPinned = () => isPinned() === "start" && column().getIsFirstColumn("start");
  const isLastStartPinned = () => isPinned() === "start" && column().getIsLastColumn("start");
  const isFirstEndPinned = () => isPinned() === "end" && column().getIsFirstColumn("end");
  const isLastEndPinned = () => isPinned() === "end" && column().getIsLastColumn("end");
  const isLastVisibleColumn = () =>
    column().getIndex() === props.header.getContext().table.getVisibleLeafColumns().length - 1;
  const headerCellSpacing = () =>
    headerCellSpacingVariants({
      size: grid.props.tableLayout?.dense ? "dense" : "default",
    });

  const sortDirection = () => column().getIsSorted();

  return (
    <th
      ref={(node) => assignRef(props.dndRef, node)}
      scope="col"
      colSpan={props.header.colSpan > 1 ? props.header.colSpan : undefined}
      aria-sort={
        sortDirection() === "asc"
          ? "ascending"
          : sortDirection() === "desc"
            ? "descending"
            : undefined
      }
      style={{
        ...(grid.props.tableLayout?.width === "fixed" && !grid.props.tableLayout?.columnsResizable
          ? { width: `${props.header.getSize()}px` }
          : undefined),
        ...(grid.props.tableLayout?.columnsPinnable && column().getCanPin()
          ? getPinningStyles(column())
          : undefined),
        ...(grid.props.tableLayout?.columnsResizable
          ? { width: `calc(var(--header-${props.header.id}-size) * 1px)` }
          : undefined),
        ...props.dndStyle,
      }}
      data-pinned={isPinned() || undefined}
      data-outer-pinned-col={isFirstStartPinned() ? "start" : isLastEndPinned() ? "end" : undefined}
      data-last-col={isLastStartPinned() ? "start" : isFirstEndPinned() ? "end" : undefined}
      class={cn(
        "text-foreground relative h-10 text-left align-middle font-medium rtl:text-right [&:has([role=checkbox])]:pe-0",
        headerCellSpacing(),
        grid.props.tableLayout?.headerBackground && "bg-muted",
        grid.props.tableLayout?.cellBorder && "border-e",
        grid.props.tableLayout?.columnsResizable &&
          column().getCanResize() &&
          (isPinned() ? "overflow-hidden" : "overflow-visible"),
        grid.props.tableLayout?.columnsResizable &&
          column().getCanResize() &&
          isLastVisibleColumn() &&
          "pe-8",
        grid.props.tableLayout?.columnsPinnable &&
          column().getCanPin() &&
          cn(
            "data-pinned:bg-muted data-outer-pinned-col:bg-clip-padding data-pinned:isolate",
            "[&[data-pinned=end]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=end][data-last-col=end]]:shadow-[inset_1px_0_0_0_var(--border)] [&[data-pinned=start][data-last-col=start]]:shadow-[inset_-1px_0_0_0_var(--border)]",
            "[&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=start]_div.cursor-col-resize:last-child]:opacity-0",
          ),
        props.header.column.columnDef.meta?.headerClassName,
        // Edge detection spans the full visible leaf order; the header's own
        // group only covers one pinning bucket.
        column().getIndex() === 0 || isLastVisibleColumn()
          ? grid.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </th>
  );
}

/**
 * TanStack's own default, restated here on purpose.
 *
 * v8 merged each feature's default table options into `table.options`, so
 * reading `table.options.columnResizeMode` gave you `"onEnd"` even when the
 * consumer never set it. v9 resolves feature defaults internally and leaves
 * the option `undefined` on the instance, so the old `?? table.options...`
 * fallback quietly produced `undefined` - and every grid that had not opted
 * into a mode explicitly lost the onEnd drag session: no cursor lock, no
 * vertical indicator, and an immediate commit instead of a deferred one.
 */
const DATA_GRID_DEFAULT_COLUMN_RESIZE_MODE = "onEnd" as const;

function getDataGridColumnResizeMode(
  layoutMode: "onChange" | "onEnd" | undefined,
  tableMode: "onChange" | "onEnd" | undefined,
) {
  return layoutMode ?? tableMode ?? DATA_GRID_DEFAULT_COLUMN_RESIZE_MODE;
}

function DataGridTableHeadRowCellResize<TData extends object>(props: {
  header: Header<DataGridFeatures, TData, unknown>;
}) {
  const grid = useDataGrid<TData>();
  const column = () => props.header.column;
  const isPinned = () => column().getIsPinned();
  const isLastVisibleColumn = () =>
    column().getIndex() === props.header.getContext().table.getVisibleLeafColumns().length - 1;
  const isResizeModeOnEnd = () =>
    getDataGridColumnResizeMode(
      grid.props.tableLayout?.columnsResizeMode,
      grid.table.options.columnResizeMode,
    ) === "onEnd";

  let stopResizeSession: (() => void) | undefined;

  // End a live drag if the handle unmounts mid-resize so document listeners
  // and the app-wide col-resize cursor don't outlive the grid.
  onCleanup(() => {
    stopResizeSession?.();
    stopResizeSession = undefined;
  });

  const startSession = (event: DataGridResizeStartEvent) => {
    stopResizeSession?.();
    stopResizeSession = startDataGridColumnResizeOnEnd(event, props.header, grid.table);
  };

  const handleMouseDown = (event: MouseEvent & { currentTarget: HTMLDivElement }) => {
    // Only the primary button starts a resize; guard before preventDefault so
    // right-click still opens the context menu.
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    if (isResizeModeOnEnd()) {
      startSession(event);
      return;
    }

    props.header.getResizeHandler()(event);
  };

  const handleTouchStart = (event: TouchEvent & { currentTarget: HTMLDivElement }) => {
    event.preventDefault();
    event.stopPropagation();

    if (isResizeModeOnEnd()) {
      startSession(event);
      return;
    }

    props.header.getResizeHandler()(event);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only resize affordance, kept role-less to match the upstream accessibility tree; keyboard resizing is not part of the component's contract.
    <div
      onDblClick={() => column().resetSize()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      class={cn(
        "absolute top-0 h-full cursor-col-resize user-select-none touch-none z-10 flex",
        isLastVisibleColumn()
          ? "end-0 w-5 justify-end before:hidden"
          : isPinned()
            ? cn(
                // A pinned column is sticky, so the handle sits inside the
                // cell instead of straddling the boundary, where the next
                // sticky cell would paint over it.
                "end-0 w-5 justify-end",
                // With the pin affordance on, the pinned edge already draws
                // its own separator and a resize line would double it. But
                // pinning is also usable purely as an ordering lock, with no
                // affordance and no separator -- and there this line is the
                // only thing marking the edge, so hiding it left a resizable
                // column showing a resize cursor and no indicator at all.
                grid.props.tableLayout?.columnsPinnable
                  ? "before:hidden"
                  : "before:absolute before:inset-y-0 before:end-0 before:w-px before:bg-border",
              )
            : "-end-2 w-5 justify-center before:absolute before:inset-y-0 before:w-px before:-translate-x-px before:bg-border",
        column().getIsResizing() &&
          (isResizeModeOnEnd()
            ? "opacity-100"
            : isLastVisibleColumn()
              ? "before:absolute before:end-0 before:block before:inset-y-0 before:w-0.5 before:bg-primary opacity-100"
              : "before:block before:bg-primary before:w-0.5 opacity-100"),
      )}
    />
  );
}

function DataGridTableResizeIndicator(props: { viewportNode: () => HTMLDivElement | undefined }) {
  const grid = useDataGrid();
  const [indicator, setIndicator] = createSignal<HTMLDivElement>();
  const [indicatorHead, setIndicatorHead] = createSignal<HTMLDivElement>();
  // Header height is stable for the duration of a drag; caching it per session
  // avoids a forced layout (querySelector + getBoundingClientRect) on every
  // pointer move.
  const headerHeightCache: { key: string | false; value: number } = { key: false, value: 0 };
  const columnResizing = () => grid.table.store.state.columnResizing;
  const resizingColumnId = () => columnResizing().isResizingColumn;
  const resizeMode = () =>
    getDataGridColumnResizeMode(
      grid.props.tableLayout?.columnsResizeMode,
      grid.table.options.columnResizeMode,
    );
  const isActive = () =>
    !!(grid.props.tableLayout?.columnsResizable && resizeMode() === "onEnd" && resizingColumnId());

  // Positioning happens imperatively on each drag frame: layout reads
  // (viewport rect, thead height) and node access belong outside the render
  // path, and writing styles directly keeps the viewport node out of state.
  createEffect(() => {
    const indicatorElement = indicator();
    const indicatorHeadElement = indicatorHead();
    const viewportElement = props.viewportNode();
    const activeColumnId = resizingColumnId();

    if (!isActive() || !indicatorElement || !indicatorHeadElement || !activeColumnId) return;

    const resizingHeader = grid.table
      .getFlatHeaders()
      .find((header) => header.column.id === activeColumnId || header.id === activeColumnId);

    if (!resizingHeader) return;

    // deltaOffset is a logical delta (already direction-adjusted); translate
    // by the physical pointer movement so the indicator follows the cursor
    // in RTL instead of mirroring it.
    const directionMultiplier = grid.table.options.columnResizeDirection === "rtl" ? -1 : 1;
    const deltaOffset = (columnResizing().deltaOffset ?? 0) * directionMultiplier;

    if (headerHeightCache.key !== activeColumnId) {
      headerHeightCache.key = activeColumnId;
      headerHeightCache.value =
        viewportElement
          ?.querySelector('[data-slot="data-grid-table"] thead')
          ?.getBoundingClientRect().height ?? 0;
    }

    const headerHeight = headerHeightCache.value;
    const startOffset = columnResizing().startOffset;
    const indicatorLeft =
      typeof startOffset === "number" && viewportElement
        ? startOffset - viewportElement.getBoundingClientRect().left
        : resizingHeader.getStart() + resizingHeader.getSize();

    indicatorElement.style.left = `${indicatorLeft}px`;
    indicatorElement.style.transform = `translateX(${deltaOffset}px)`;
    indicatorHeadElement.style.height = `${Math.max(headerHeight, 6)}px`;
  });

  return (
    <Show when={isActive()}>
      <div
        ref={setIndicator}
        aria-hidden="true"
        data-slot="data-grid-table-resize-indicator"
        class="pointer-events-none absolute inset-y-0 z-50"
      >
        <div class="bg-primary/85 absolute inset-y-0 left-0 w-px -translate-x-1/2" />
        <div
          ref={setIndicatorHead}
          class="bg-primary style-vega:rounded-b-sm style-nova:rounded-b-sm style-maia:rounded-b-md style-lyra:rounded-b-none style-mira:rounded-b-sm style-luma:rounded-b-lg style-sera:rounded-b-none style-rhea:rounded-b-lg absolute top-0 left-0 -translate-x-1/2 shadow-xs"
          style={{ width: "5px" }}
        />
      </div>
    </Show>
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" class="h-2" data-slot="data-grid-table-body-spacer" />;
}

function DataGridTableBody(props: { children: JSX.Element }) {
  const grid = useDataGrid();

  return (
    <tbody
      data-slot="data-grid-table-body"
      class={cn(
        grid.props.tableLayout?.rowRounded &&
          "style-vega:[&_td:first-child]:rounded-l-lg style-nova:[&_td:first-child]:rounded-l-lg style-maia:[&_td:first-child]:rounded-l-2xl style-lyra:[&_td:first-child]:rounded-l-none style-mira:[&_td:first-child]:rounded-l-lg style-luma:[&_td:first-child]:rounded-l-3xl style-sera:[&_td:first-child]:rounded-l-none style-rhea:[&_td:first-child]:rounded-l-2xl",
        grid.props.tableLayout?.rowRounded &&
          "style-vega:[&_td:last-child]:rounded-r-lg style-nova:[&_td:last-child]:rounded-r-lg style-maia:[&_td:last-child]:rounded-r-2xl style-lyra:[&_td:last-child]:rounded-r-none style-mira:[&_td:last-child]:rounded-r-lg style-luma:[&_td:last-child]:rounded-r-3xl style-sera:[&_td:last-child]:rounded-r-none style-rhea:[&_td:last-child]:rounded-r-2xl",
        grid.props.tableClassNames?.body,
      )}
    >
      {props.children}
    </tbody>
  );
}

function DataGridTableFoot(props: { children: JSX.Element }) {
  const grid = useDataGrid();

  return (
    <tfoot data-slot="data-grid-table-foot" class={cn(grid.props.tableClassNames?.footer)}>
      {props.children}
    </tfoot>
  );
}

function DataGridTableFootRow(props: { children: JSX.Element }) {
  const grid = useDataGrid();
  const footRowBottomBorderClasses = "[&:not(:last-child)>td]:border-b";

  return (
    <tr
      data-slot="data-grid-table-foot-row"
      class={cn(
        grid.props.tableLayout?.footerBackground && "bg-muted/40 dark:bg-background",
        grid.props.tableLayout?.rowBorder && footRowBottomBorderClasses,
        grid.props.tableLayout?.cellBorder && "*:last:border-e-0",
      )}
    >
      {props.children}
      <DataGridTableFillFootCell />
    </tr>
  );
}

function DataGridTableFootRowCell(props: {
  children?: JSX.Element;
  colSpan?: number;
  class?: string;
}) {
  const grid = useDataGrid();
  const spacing = () =>
    footerCellSpacingVariants({
      size: grid.props.tableLayout?.dense ? "dense" : "default",
    });

  return (
    <td
      colSpan={props.colSpan}
      class={cn(
        "text-secondary-foreground/80 align-middle font-medium",
        spacing(),
        grid.props.tableLayout?.footerBackground && "bg-muted/40 dark:bg-background",
        grid.props.tableLayout?.cellBorder && "border-e",
        props.class,
      )}
    >
      {props.children}
    </td>
  );
}

function DataGridTableBodyRowSkeleton(props: { children: JSX.Element }) {
  const grid = useDataGrid();

  return (
    <tr
      class={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        grid.props.onRowClick && "cursor-pointer",
        !grid.props.tableLayout?.stripped &&
          grid.props.tableLayout?.rowBorder &&
          "border-border border-b [&:not(:last-child)>td]:border-b",
        grid.props.tableLayout?.cellBorder && "*:last:border-e-0",
        grid.props.tableLayout?.stripped &&
          "odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent",
        grid.table.options.enableRowSelection && "*:first:relative",
        grid.props.tableClassNames?.bodyRow,
      )}
    >
      {props.children}
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData extends object>(props: {
  children: JSX.Element;
  column: Column<DataGridFeatures, TData, unknown>;
}) {
  const grid = useDataGrid<TData>();
  const bodyCellSpacing = () =>
    bodyCellSpacingVariants({
      size: grid.props.tableLayout?.dense ? "dense" : "default",
    });

  return (
    <td
      style={
        grid.props.tableLayout?.columnsResizable
          ? { width: `calc(var(--col-${props.column.id}-size) * 1px)` }
          : undefined
      }
      class={cn(
        "align-middle",
        bodyCellSpacing(),
        grid.props.tableLayout?.cellBorder && "border-e",
        grid.props.tableLayout?.columnsResizable && props.column.getCanResize() && "truncate",
        props.column.columnDef.meta?.cellClassName,
        grid.props.tableLayout?.columnsPinnable &&
          props.column.getCanPin() &&
          "data-pinned:bg-background data-pinned:isolate [&[data-pinned=end][data-last-col=end]]:shadow-[inset_1px_0_0_0_var(--border)] [&[data-pinned=start][data-last-col=start]]:shadow-[inset_-1px_0_0_0_var(--border)]",
        props.column.getIndex() === 0 ||
          props.column.getIndex() === grid.table.getVisibleLeafColumns().length - 1
          ? grid.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </td>
  );
}

const bodyRowBottomBorderClasses =
  "[&:not(:last-child)>td]:border-b [tbody:has(+tfoot)_&:last-child>td]:border-b [*:has(>[data-slot=data-grid]+[data-slot=data-grid-pagination])_[data-slot=data-grid]_&:last-child>td]:border-b";

function DataGridTableBodyRow<TData extends object>(props: {
  children: JSX.Element;
  row: Row<DataGridFeatures, TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: DataGridRefCallback<HTMLTableRowElement>;
  dndRef?: DataGridRefCallback<HTMLTableRowElement>;
  dndStyle?: JSX.CSSProperties;
  dataIndex?: number;
}) {
  const grid = useDataGrid<TData>();
  const isRowPinned = () => props.row.getIsPinned();

  return (
    <tr
      ref={(node) => {
        assignRef(props.rowRef, node);
        assignRef(props.dndRef, node);
      }}
      style={{ ...props.dndStyle }}
      data-state={
        grid.table.options.enableRowSelection && props.row.getIsSelected() ? "selected" : undefined
      }
      data-index={props.dataIndex}
      data-row-id={props.row.id}
      data-depth={props.row.depth || undefined}
      data-row-pinned={isRowPinned() || undefined}
      data-row-pinned-boundary={props.pinnedBoundary}
      onClick={() => grid.props.onRowClick?.(props.row.original)}
      class={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        grid.props.onRowClick && "cursor-pointer",
        !grid.props.tableLayout?.stripped &&
          grid.props.tableLayout?.rowBorder &&
          bodyRowBottomBorderClasses,
        grid.props.tableLayout?.cellBorder && `*:last:border-e-0 ${bodyRowBottomBorderClasses}`,
        // Virtualized rows stripe by absolute row index (CSS :nth-child
        // parity flips as spacer rows resize while scrolling).
        grid.props.tableLayout?.stripped &&
          (typeof props.dataIndex === "number"
            ? cn("hover:bg-transparent", props.dataIndex % 2 === 0 && "bg-muted/90 hover:bg-muted")
            : "odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent"),
        grid.table.options.enableRowSelection && "*:first:relative",
        grid.props.tableLayout?.rowsPinnable && isRowPinned() && "bg-muted/30 hover:bg-muted/50",
        props.pinnedBoundary === "top" &&
          "[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)] dark:[&>td]:shadow-[0_2px_0_rgba(255,255,255,0.06)]",
        props.pinnedBoundary === "bottom" &&
          "[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)] dark:[&>td]:shadow-[0_2px_0_rgba(255,255,255,0.06)]",
        grid.props.tableClassNames?.bodyRow,
      )}
    >
      {props.children}
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
}) {
  const grid = useDataGrid<TData>();
  const expandedContent = () =>
    grid.table.getAllColumns().find((column) => column.columnDef.meta?.expandedContent)?.columnDef
      .meta?.expandedContent;

  // Tree and grouped rows share row.getIsExpanded() with detail expansion.
  // Without a detail column there is nothing to render, and an empty <tr>
  // would break striping parity, rowBorder, and virtual row measurement.
  return (
    <Show when={expandedContent()}>
      {(content) => (
        <tr class={cn(grid.props.tableLayout?.rowBorder && bodyRowBottomBorderClasses)}>
          <td
            colSpan={
              getDataGridTableOrderedVisibleCells(props.row).length +
              (grid.props.tableLayout?.columnsResizable ? 1 : 0)
            }
          >
            {content()(props.row.original)}
          </td>
        </tr>
      )}
    </Show>
  );
}

function DataGridTableBodyRowCell<TData extends object>(props: {
  children: JSX.Element;
  cell: Cell<DataGridFeatures, TData, unknown>;
  dndRef?: DataGridRefCallback<HTMLTableCellElement>;
  dndStyle?: JSX.CSSProperties;
}) {
  const grid = useDataGrid<TData>();

  const column = () => props.cell.column;
  const row = () => props.cell.row;
  const isPinned = () => column().getIsPinned();
  const isLastStartPinned = () => isPinned() === "start" && column().getIsLastColumn("start");
  const isFirstEndPinned = () => isPinned() === "end" && column().getIsFirstColumn("end");
  const bodyCellSpacing = () =>
    bodyCellSpacingVariants({
      size: grid.props.tableLayout?.dense ? "dense" : "default",
    });

  return (
    <td
      ref={(node) => assignRef(props.dndRef, node)}
      style={{
        ...(grid.props.tableLayout?.columnsPinnable && column().getCanPin()
          ? getPinningStyles(column())
          : undefined),
        ...(grid.props.tableLayout?.columnsResizable
          ? { width: `calc(var(--col-${props.cell.column.id}-size) * 1px)` }
          : undefined),
        ...props.dndStyle,
      }}
      data-pinned={isPinned() || undefined}
      data-last-col={isLastStartPinned() ? "start" : isFirstEndPinned() ? "end" : undefined}
      class={cn(
        "align-middle",
        bodyCellSpacing(),
        grid.props.tableLayout?.cellBorder && "border-e",
        grid.props.tableLayout?.columnsResizable && column().getCanResize() && "truncate",
        props.cell.column.columnDef.meta?.cellClassName,
        grid.props.tableLayout?.columnsPinnable &&
          column().getCanPin() &&
          cn(
            "data-pinned:bg-background data-pinned:isolate",
            "[&[data-pinned=start][data-last-col=start]]:shadow-[inset_-1px_0_0_0_var(--border)]",
            "[&[data-pinned=end][data-last-col=end]]:shadow-[inset_1px_0_0_0_var(--border)]",
          ),
        column().getIndex() === 0 || column().getIndex() === row().getVisibleCells().length - 1
          ? grid.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </td>
  );
}

function DataGridTableRenderedRow<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: DataGridRefCallback<HTMLTableRowElement>;
  /** Virtualized list index, rendered as data-index for measureElement. */
  rowIndex?: number;
}) {
  const grid = useDataGrid<TData>();
  const startVisibleCells = () => props.row.getStartVisibleCells();
  const centerVisibleCells = () => props.row.getCenterVisibleCells();
  const endVisibleCells = () => props.row.getEndVisibleCells();
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(grid.table);

  return (
    <>
      <DataGridTableBodyRow
        row={props.row}
        pinnedBoundary={props.pinnedBoundary}
        rowRef={props.rowRef}
        dataIndex={props.rowIndex}
      >
        <For each={[...startVisibleCells(), ...centerVisibleCells()]}>
          {(cell) => (
            <DataGridTableBodyRowCell cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          )}
        </For>
        <Show when={grid.props.tableLayout?.columnsResizable && hasRightPinnedColumns()}>
          <DataGridTableFillBodyCell />
        </Show>
        <For each={endVisibleCells()}>
          {(cell) => (
            <DataGridTableBodyRowCell cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          )}
        </For>
        <Show when={grid.props.tableLayout?.columnsResizable && !hasRightPinnedColumns()}>
          <DataGridTableFillBodyCell />
        </Show>
      </DataGridTableBodyRow>
      <Show when={props.row.getIsExpanded()}>
        <DataGridTableBodyRowExpandded row={props.row} />
      </Show>
    </>
  );
}

function DataGridTableEmpty() {
  const grid = useDataGrid();
  const visibleColumnCount = () =>
    getDataGridTableOrderedVisibleColumns(grid.table).length +
    (grid.props.tableLayout?.columnsResizable ? 1 : 0);

  return (
    <tr>
      <td
        colSpan={Math.max(visibleColumnCount(), 1)}
        class="text-muted-foreground py-6 text-center text-sm"
      >
        {grid.props.emptyMessage || "No data available"}
      </td>
    </tr>
  );
}

function DataGridTableLoader() {
  const grid = useDataGrid();

  return (
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div class="text-muted-foreground bg-card style-vega:rounded-lg style-nova:rounded-lg style-maia:rounded-2xl style-lyra:rounded-none style-mira:rounded-lg style-luma:rounded-3xl style-sera:rounded-none style-rhea:rounded-2xl flex items-center gap-2 border px-4 py-2 text-sm leading-none font-medium">
        <Spinner class="size-5 opacity-60" />
        {grid.props.loadingMessage || "Loading..."}
      </div>
    </div>
  );
}

function DataGridTableRowPin<TData extends object>(props: { row: Row<DataGridFeatures, TData> }) {
  const isPinned = () => props.row.getIsPinned();

  return (
    <button
      type="button"
      aria-label={isPinned() ? "Unpin row" : "Pin row"}
      onClick={(event) => {
        // Pinning must not bubble into the row's onRowClick handler.
        event.stopPropagation();

        if (isPinned()) {
          props.row.pin(false);
        } else {
          props.row.pin("top");
        }
      }}
      class={cn(
        "text-muted-foreground hover:text-foreground style-vega:rounded-md style-nova:rounded-lg style-maia:rounded-full style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-full style-sera:rounded-none style-rhea:rounded-full inline-flex size-7 items-center justify-center transition-colors",
        isPinned() && "text-primary hover:text-primary/80",
      )}
    >
      <Show
        when={isPinned()}
        fallback={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z" />
          </svg>
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
          aria-hidden="true"
        >
          <path d="M16 2l4.585 4.586-2.122 2.121L17.05 7.293l-3.535 3.536 1.413 5.658-2.12 2.121-4.244-4.243L4.322 18.6l-1.414-1.41 4.242-4.244-4.243-4.243 2.122-2.121 5.656 1.414 3.536-3.536-1.414-1.414z" />
        </svg>
      </Show>
    </button>
  );
}

/**
 * Selection cell.
 *
 * Upstream wraps the state reads below in TanStack's `Subscribe` because the
 * React Compiler cannot see the dependency behind `row.getIsSelected()`. In
 * Solid the read itself is the subscription - the adapter backs every state
 * slice with a signal - so the wrapper is dropped rather than translated.
 */
function DataGridTableRowSelect<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
}) {
  return (
    <>
      <div
        class={cn(
          "bg-primary absolute inset-s-0 top-0 bottom-0 hidden w-[2px]",
          props.row.getIsSelected() && "block",
        )}
      />
      <Checkbox
        checked={props.row.getIsSelected()}
        indeterminate={props.row.getIsSomeSelected() && !props.row.getIsSelected()}
        onChange={(value) => props.row.toggleSelected(!!value)}
        onClick={(event: MouseEvent) => {
          // Selection must not bubble into the row's onRowClick handler.
          event.stopPropagation();
        }}
        aria-label="Select row"
        class="align-[inherit]"
      />
    </>
  );
}

function DataGridTableRowSelectAll() {
  const grid = useDataGrid();

  // `getIsSomePageRowsSelected()` means "at least one" in v9, where v8 meant
  // "some but not all", so the all-selected case has to be excluded explicitly
  // or the header checkbox stays indeterminate once every row is checked.
  const isAllSelected = () => grid.table.getIsAllPageRowsSelected();
  const isSomeSelected = () => grid.table.getIsSomePageRowsSelected();

  return (
    <Checkbox
      checked={isAllSelected()}
      indeterminate={isSomeSelected() && !isAllSelected()}
      disabled={grid.isLoading || grid.recordCount === 0}
      onChange={(value) => grid.table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      class="align-[inherit]"
    />
  );
}

function DataGridTableRowExpand<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
  /** Horizontal offset in px applied per tree depth level. */
  indent?: number;
  class?: string;
  /** Custom toggle icon; replaces the default chevron. */
  children?: JSX.Element;
}) {
  const grid = useDataGrid<TData>();
  const isExpanded = () => props.row.getIsExpanded();
  const controlSize = () => (grid.props.tableLayout?.dense ? "size-6" : "size-7");

  return (
    <span
      data-slot="data-grid-table-row-expand"
      style={getDataGridTreeIndentStyle(props.row, props.indent ?? 20)}
      class={cn(
        "inline-flex shrink-0 items-center ps-(--data-grid-tree-padding) align-middle",
        props.class,
      )}
    >
      <Show
        when={props.row.getCanExpand()}
        fallback={
          // Leaf spacer: compact by design so leaf content sits near the
          // parent label instead of a full toggle width deeper.
          <span aria-hidden="true" class="w-2 shrink-0" />
        }
      >
        <button
          type="button"
          aria-expanded={isExpanded()}
          aria-label={isExpanded() ? "Collapse row" : "Expand row"}
          onClick={(event) => {
            // Expansion must not bubble into the row's onRowClick handler.
            event.stopPropagation();
            props.row.toggleExpanded();
          }}
          class={cn(
            "text-muted-foreground hover:text-foreground style-vega:rounded-md style-nova:rounded-lg style-maia:rounded-full style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-full style-sera:rounded-none style-rhea:rounded-full inline-flex items-center justify-center transition-colors",
            controlSize(),
          )}
        >
          {props.children ?? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="transition-transform duration-200 in-aria-[expanded=false]:-rotate-90 rtl:in-aria-[expanded=false]:rotate-90"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>
      </Show>
    </span>
  );
}

/**
 * Body rows.
 *
 * Upstream memoizes this component to skip React re-renders during an active
 * column resize; Solid updates only the attributes that changed, so the memo
 * has no counterpart here. Rows are keyed on the TanStack `Row` instances, not
 * on the per-render wrapper objects, so a state change reuses the existing row
 * elements instead of rebuilding the body.
 */
function DataGridTableBodyRows<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
}) {
  const grid = useDataGrid<TData>();
  const pagination = () => props.table.store.state.pagination;

  const showSkeleton = () =>
    grid.isLoading && grid.props.loadingMode === "skeleton" && !!pagination()?.pageSize;
  const showSpinner = () => grid.isLoading && grid.props.loadingMode === "spinner";

  const skeletonRowIndexes = () =>
    Array.from({ length: pagination()?.pageSize ?? 0 }, (_, index) => index);
  const leftVisibleColumns = () => props.table.getStartVisibleLeafColumns();
  const centerVisibleColumns = () => props.table.getCenterVisibleLeafColumns();
  const rightVisibleColumns = () => props.table.getEndVisibleLeafColumns();
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(props.table);

  const resolvedRows = createMemo(() =>
    getDataGridTableResolvedRows(props.table, grid.props.tableLayout?.rowsPinnable),
  );
  const rows = createMemo(() => resolvedRows().map((entry) => entry.row));
  const pinnedBoundaries = createMemo(() => {
    const boundaries = new Map<string, DataGridTablePinnedBoundary>();
    for (const entry of resolvedRows()) {
      if (entry.pinnedBoundary) boundaries.set(entry.row.id, entry.pinnedBoundary);
    }
    return boundaries;
  });

  return (
    <Switch
      fallback={
        <For each={rows()}>
          {(row) => (
            <DataGridTableRenderedRow row={row} pinnedBoundary={pinnedBoundaries().get(row.id)} />
          )}
        </For>
      }
    >
      <Match when={showSkeleton()}>
        <For each={skeletonRowIndexes()}>
          {() => (
            <DataGridTableBodyRowSkeleton>
              <For each={[...leftVisibleColumns(), ...centerVisibleColumns()]}>
                {(column) => (
                  <DataGridTableBodyRowSkeletonCell column={column}>
                    {column.columnDef.meta?.skeleton?.()}
                  </DataGridTableBodyRowSkeletonCell>
                )}
              </For>
              <Show when={grid.props.tableLayout?.columnsResizable && hasRightPinnedColumns()}>
                <DataGridTableFillBodyCell />
              </Show>
              <For each={rightVisibleColumns()}>
                {(column) => (
                  <DataGridTableBodyRowSkeletonCell column={column}>
                    {column.columnDef.meta?.skeleton?.()}
                  </DataGridTableBodyRowSkeletonCell>
                )}
              </For>
              <Show when={grid.props.tableLayout?.columnsResizable && !hasRightPinnedColumns()}>
                <DataGridTableFillBodyCell />
              </Show>
            </DataGridTableBodyRowSkeleton>
          )}
        </For>
      </Match>
      <Match when={showSpinner()}>
        <tr>
          <td
            colSpan={
              props.table.getVisibleFlatColumns().length +
              (grid.props.tableLayout?.columnsResizable ? 1 : 0)
            }
            class="p-8"
          >
            <div class="flex items-center justify-center">
              <svg
                class="text-muted-foreground mr-3 -ml-1 h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {grid.props.loadingMessage || "Loading..."}
            </div>
          </td>
        </tr>
      </Match>
      <Match when={rows().length === 0}>
        <DataGridTableEmpty />
      </Match>
    </Switch>
  );
}

/**
 * The merged start/center/end header rows. Shared by `DataGridTable` and the
 * header-only `DataGridTableHeader` so both stay byte-identical.
 */
function DataGridTableHeadGroups<TData extends object = object>() {
  const grid = useDataGrid<TData>();
  const mergedHeaderGroups = createMemo(() => getDataGridTableMergedHeaderGroups(grid.table));
  const hasRightPinnedColumns = () => hasDataGridTableRightPinnedColumns(grid.table);

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
    <For each={mergedHeaderGroups()}>
      {(headerGroup) => (
        <DataGridTableHeadRow rowId={headerGroup.id}>
          <For each={headerGroup.headers.filter((header) => header.column.getIsPinned() !== "end")}>
            {headerCell}
          </For>
          <Show when={grid.props.tableLayout?.columnsResizable && hasRightPinnedColumns()}>
            <DataGridTableFillHeadCell />
          </Show>
          <For each={headerGroup.headers.filter((header) => header.column.getIsPinned() === "end")}>
            {headerCell}
          </For>
          <Show when={grid.props.tableLayout?.columnsResizable && !hasRightPinnedColumns()}>
            <DataGridTableFillHeadCell />
          </Show>
        </DataGridTableHeadRow>
      )}
    </For>
  );
}

function DataGridTableHeader() {
  return (
    <DataGridTableViewport>
      <DataGridTableBase>
        <DataGridTableHead>
          <DataGridTableHeadGroups />
        </DataGridTableHead>
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

function DataGridTable<TData extends object>(props: {
  footerContent?: JSX.Element;
  renderHeader?: boolean;
}) {
  const grid = useDataGrid<TData>();
  const renderHeader = () => props.renderHeader ?? true;
  // Resolve once: the footer is JSX handed in as a prop, and testing it for
  // presence must not build it a second time.
  const footerContent = children(() => props.footerContent);

  return (
    <DataGridTableViewport>
      <DataGridTableBase>
        <Show when={renderHeader()}>
          <DataGridTableHead>
            <DataGridTableHeadGroups />
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
          <DataGridTableBodyRows table={grid.table} />
        </DataGridTableBody>

        <Show when={footerContent()}>
          <DataGridTableFoot>{footerContent()}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

export type { DataGridRefCallback, DataGridTablePinnedBoundary };
export {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
  DataGridTableHead,
  DataGridTableHeader,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRenderedRow,
  DataGridTableRowExpand,
  DataGridTableRowPin,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridScrollAreaViewport,
  getDataGridTableMergedHeaderGroups,
  getDataGridTableResolvedRows,
  getDataGridTableRowSections,
  getDataGridTreeIndentStyle,
  getPinningStyles,
  hasDataGridTableRightPinnedColumns,
};
