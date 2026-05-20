import type { Cell, Column, Header, HeaderGroup, Row, Table } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import { cva } from "class-variance-authority";
import {
  type Accessor,
  createEffect,
  createSignal,
  For,
  type JSX,
  onCleanup,
  type Ref,
  Show,
} from "solid-js";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Spinner } from "@/registry/kobalte/ui/spinner";

import { useDataGrid } from "./data-grid";

const headerCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense:
        "style-lyra:h-8 style-maia:h-9 style-mira:h-7 style-nova:h-8 style-vega:h-9 style-lyra:px-2 style-maia:px-2.5 style-mira:px-2 style-nova:px-2 style-vega:px-2.5",
      default: "style-lyra:px-3 style-maia:px-4 style-mira:px-2.5 style-nova:px-3 style-vega:px-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const bodyCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense:
        "style-lyra:px-2 style-maia:px-2.5 style-mira:px-2 style-nova:px-2 style-vega:px-2.5 style-lyra:py-1.5 style-maia:py-2 style-mira:py-1 style-nova:py-1.5 style-vega:py-2",
      default:
        "style-lyra:px-3 style-maia:px-4 style-mira:px-2.5 style-nova:px-3 style-vega:px-4 style-lyra:py-2 style-maia:py-2.5 style-mira:py-1.5 style-nova:py-2 style-vega:py-2.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const footerCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense:
        "style-lyra:px-2 style-maia:px-2.5 style-mira:px-2 style-nova:px-2 style-vega:px-2.5 style-lyra:py-1.5 style-maia:py-2 style-mira:py-1 style-nova:py-1.5 style-vega:py-2",
      default:
        "style-lyra:px-3 style-maia:px-4 style-mira:px-2.5 style-nova:px-3 style-vega:px-4 style-lyra:py-2 style-maia:py-2.5 style-mira:py-1.5 style-nova:py-2 style-vega:py-2.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

function getPinningStyles<TData>(column: Column<TData>): JSX.CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: `${column.getSize()}px`,
    "z-index": isPinned ? 1 : 0,
  };
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    (ref as (val: T | null) => void)(value);
    return;
  }
  (ref as unknown as { current: T | null }).current = value;
}

type DataGridResizeStartEvent =
  | (MouseEvent & { currentTarget: HTMLDivElement; target: Element })
  | (TouchEvent & { currentTarget: HTMLDivElement; target: Element });

type DataGridResizeDocumentEvent = MouseEvent | TouchEvent;

function isDataGridTouchEvent(
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent,
): event is TouchEvent & { currentTarget: HTMLDivElement; target: Element } {
  return "touches" in event;
}

function getDataGridResizeEventClientX(
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent,
) {
  if (isDataGridTouchEvent(event)) {
    return event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX;
  }
  return (event as MouseEvent).clientX;
}

function startDataGridColumnResizeOnEnd<TData>(
  event: DataGridResizeStartEvent,
  header: Header<TData, unknown>,
  table: Table<TData>,
) {
  const column = table.getColumn(header.column.id);
  if (!column?.getCanResize()) return;
  if (isDataGridTouchEvent(event) && event.touches.length > 1) return;

  const ownerDocument = (event.currentTarget as HTMLDivElement).ownerDocument;
  const previousBodyCursor = ownerDocument.body.style.cursor;
  const previousDocumentCursor = ownerDocument.documentElement.style.cursor;
  const startSize = header.getSize();
  const dragStartClientX = getDataGridResizeEventClientX(event);
  const headerCell = (event.currentTarget as HTMLDivElement).closest("th");
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

  const updateOffset = (clientXPos?: number, commit = false) => {
    if (typeof clientXPos !== "number") return;

    const nextColumnSizing: Record<string, number> = {};
    const deltaOffset = (clientXPos - dragStartClientX) * directionMultiplier;
    const deltaPercentage = Math.max(deltaOffset / startSize, -0.999999);

    columnSizingStart.forEach(([columnId, headerSize]) => {
      nextColumnSizing[columnId] =
        Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
    });

    table.setColumnSizingInfo((old) => ({
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

  const endResize = (clientXPos?: number) => {
    updateOffset(clientXPos, true);
    table.setColumnSizingInfo((old) => ({
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

  const mouseMoveHandler = (moveEvent: MouseEvent) => {
    updateOffset(moveEvent.clientX);
  };
  const mouseUpHandler = (upEvent: MouseEvent) => {
    ownerDocument.removeEventListener("mousemove", mouseMoveHandler);
    ownerDocument.removeEventListener("mouseup", mouseUpHandler);
    endResize(upEvent.clientX);
  };
  const touchMoveHandler = (moveEvent: TouchEvent) => {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
    }
    updateOffset(getDataGridResizeEventClientX(moveEvent));
  };
  const touchEndHandler = (endEvent: TouchEvent) => {
    ownerDocument.removeEventListener("touchmove", touchMoveHandler);
    ownerDocument.removeEventListener("touchend", touchEndHandler);
    if (endEvent.cancelable) {
      endEvent.preventDefault();
      endEvent.stopPropagation();
    }
    endResize(getDataGridResizeEventClientX(endEvent));
  };

  const passiveIfSupported = { passive: false } as const;

  if (isDataGridTouchEvent(event)) {
    ownerDocument.addEventListener("touchmove", touchMoveHandler, passiveIfSupported);
    ownerDocument.addEventListener("touchend", touchEndHandler, passiveIfSupported);
  } else {
    ownerDocument.addEventListener("mousemove", mouseMoveHandler, passiveIfSupported);
    ownerDocument.addEventListener("mouseup", mouseUpHandler, passiveIfSupported);
  }

  table.setColumnSizingInfo((old) => ({
    ...old,
    startOffset,
    startSize,
    deltaOffset: 0,
    deltaPercentage: 0,
    columnSizingStart,
    isResizingColumn: column.id,
  }));
}

type DataGridTablePinnedBoundary = "top" | "bottom";

function getDataGridTableRowSections<TData>(table: Table<TData>, rowsPinnable?: boolean) {
  if (!rowsPinnable) {
    return {
      topRows: [] as Row<TData>[],
      centerRows: table.getRowModel().rows as Row<TData>[],
      bottomRows: [] as Row<TData>[],
    };
  }

  return {
    topRows: table.getTopRows() as Row<TData>[],
    centerRows: table.getCenterRows() as Row<TData>[],
    bottomRows: table.getBottomRows() as Row<TData>[],
  };
}

function getDataGridTableResolvedRows<TData>(table: Table<TData>, rowsPinnable?: boolean) {
  const { topRows, centerRows, bottomRows } = getDataGridTableRowSections(table, rowsPinnable);
  const resolvedRows: Array<{
    row: Row<TData>;
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

  centerRows.forEach((row) => {
    resolvedRows.push({ row });
  });

  bottomRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === 0 && (centerRows.length > 0 || topRows.length > 0) ? "bottom" : undefined,
    });
  });

  return resolvedRows;
}

function DataGridTableFillCol() {
  const ctx = useDataGrid();
  return (
    <Show when={ctx.props.tableLayout?.columnsResizable}>
      <col
        data-slot="data-grid-table-fill-col"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
      />
    </Show>
  );
}

function DataGridTableFillHeadCell() {
  const ctx = useDataGrid();
  return (
    <Show when={ctx.props.tableLayout?.columnsResizable}>
      <th
        aria-hidden="true"
        data-slot="data-grid-table-fill-head-cell"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
        class="p-0"
        tabIndex={-1}
      />
    </Show>
  );
}

function DataGridTableFillBodyCell() {
  const ctx = useDataGrid();
  return (
    <Show when={ctx.props.tableLayout?.columnsResizable}>
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
  const ctx = useDataGrid();
  return (
    <Show when={ctx.props.tableLayout?.columnsResizable}>
      <td
        aria-hidden="true"
        data-slot="data-grid-table-fill-foot-cell"
        style={{ width: "var(--data-grid-fill-size, 0px)" }}
        class="border-t p-0"
      />
    </Show>
  );
}

function DataGridTableBase(props: { children: JSX.Element }) {
  const ctx = useDataGrid();
  const visibleColumns = () => ctx.table.getVisibleLeafColumns();

  // Compute column widths as CSS custom properties (reactive in SolidJS).
  const columnSizeVars = () => {
    if (!ctx.props.tableLayout?.columnsResizable) return undefined;
    // touch state to reactively re-read sizes
    void ctx.table.getState().columnSizing;
    const headers = ctx.table.getFlatHeaders();
    const colSizes: Record<string, number | string> = {};
    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  };

  const tableStyle = () => {
    if (!ctx.props.tableLayout?.columnsResizable) return undefined;
    return {
      ...columnSizeVars(),
      width: `calc(${ctx.table.getTotalSize()}px + var(--data-grid-fill-size, 0px))`,
    } as JSX.CSSProperties;
  };

  return (
    <table
      data-slot="data-grid-table"
      class={cn(
        "caption-bottom text-left align-middle font-normal style-lyra:text-xs style-maia:text-sm style-mira:text-xs/relaxed style-nova:text-sm style-vega:text-sm text-foreground rtl:text-right",
        ctx.props.tableLayout?.columnsResizable ? "min-w-0" : "w-full min-w-full",
        ctx.props.tableLayout?.width === "auto" ? "table-auto" : "table-fixed",
        !ctx.props.tableLayout?.columnsDraggable && "border-separate border-spacing-0",
        ctx.props.tableClassNames?.base,
      )}
      style={tableStyle()}
    >
      <colgroup>
        <For each={visibleColumns()}>
          {(column) => (
            <col
              style={
                ctx.props.tableLayout?.columnsResizable
                  ? { width: `calc(var(--col-${column.id}-size) * 1px)` }
                  : ctx.props.tableLayout?.width === "fixed"
                    ? { width: `${column.getSize()}px` }
                    : undefined
              }
            />
          )}
        </For>
        <DataGridTableFillCol />
      </colgroup>
      {props.children}
    </table>
  );
}

function DataGridTableViewport(props: {
  children: JSX.Element;
  class?: string;
  viewportRef?: Ref<HTMLDivElement>;
  style?: JSX.CSSProperties;
}) {
  const ctx = useDataGrid();
  const [viewportElement, setViewportElement] = createSignal<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = createSignal(0);

  const handleViewportRef = (node: HTMLDivElement | null) => {
    setViewportElement(node);
    assignRef(props.viewportRef, node);
  };

  const fillWidth = () =>
    ctx.props.tableLayout?.columnsResizable && containerWidth() > 0
      ? Math.max(0, containerWidth() - ctx.table.getTotalSize())
      : 0;

  createEffect(() => {
    const el = viewportElement();
    if (!el || !ctx.props.tableLayout?.columnsResizable) {
      setContainerWidth(0);
      return;
    }

    const scrollViewport =
      (el.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ?? el.parentElement;
    const measurementTarget = scrollViewport ?? el;

    const syncContainerWidth = () => {
      setContainerWidth(measurementTarget.clientWidth);
    };

    syncContainerWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(syncContainerWidth);
    observer.observe(measurementTarget);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  const containerStyle = (): JSX.CSSProperties => ({
    ...(ctx.props.tableLayout?.columnsResizable
      ? {
          width: `calc(${ctx.table.getTotalSize()}px + var(--data-grid-fill-size, 0px))`,
          "--data-grid-fill-size": `${fillWidth()}px`,
        }
      : undefined),
    ...(props.style ?? {}),
  });

  return (
    <div
      data-slot="data-grid-table-viewport"
      ref={handleViewportRef}
      class={cn("relative min-w-full align-top", props.class)}
      style={containerStyle()}
    >
      {props.children}
      <DataGridTableResizeIndicator viewportElement={viewportElement} />
    </div>
  );
}

function DataGridTableHead(props: { children: JSX.Element }) {
  const ctx = useDataGrid();
  return (
    <thead
      class={cn(
        ctx.props.tableClassNames?.header,
        ctx.props.tableLayout?.headerSticky && ctx.props.tableClassNames?.headerSticky,
      )}
    >
      {props.children}
    </thead>
  );
}

function DataGridTableHeadRow<TData>(props: {
  children: JSX.Element;
  headerGroup: HeaderGroup<TData>;
}) {
  const ctx = useDataGrid();

  return (
    <tr
      class={cn(
        "bg-muted/40",
        ctx.props.tableLayout?.headerBorder && "[&>th]:border-b",
        ctx.props.tableLayout?.cellBorder && "*:last:border-e-0",
        ctx.props.tableLayout?.stripped && "bg-transparent",
        ctx.props.tableLayout?.headerBackground === false && "bg-transparent",
        ctx.props.tableClassNames?.headerRow,
      )}
    >
      {props.children}
      <DataGridTableFillHeadCell />
    </tr>
  );
}

function DataGridTableHeadRowCell<TData>(props: {
  children: JSX.Element;
  header: Header<TData, unknown>;
  dndRef?: Ref<HTMLTableCellElement>;
  dndStyle?: JSX.CSSProperties;
}) {
  const ctx = useDataGrid();

  const column = () => props.header.column;
  const isPinned = () => column().getIsPinned();
  const isLastLeftPinned = () => isPinned() === "left" && column().getIsLastColumn("left");
  const isFirstRightPinned = () => isPinned() === "right" && column().getIsFirstColumn("right");
  const isLastVisibleColumn = () =>
    column().getIndex() === props.header.getContext().table.getVisibleLeafColumns().length - 1;
  const headerCellSpacing = () =>
    headerCellSpacingVariants({
      size: ctx.props.tableLayout?.dense ? "dense" : "default",
    });

  const cellStyle = (): JSX.CSSProperties => ({
    ...(ctx.props.tableLayout?.width === "fixed" && !ctx.props.tableLayout?.columnsResizable
      ? { width: `${props.header.getSize()}px` }
      : {}),
    ...(ctx.props.tableLayout?.columnsPinnable && column().getCanPin()
      ? getPinningStyles(column())
      : {}),
    ...(ctx.props.tableLayout?.columnsResizable
      ? { width: `calc(var(--header-${props.header.id}-size) * 1px)` }
      : {}),
    ...(props.dndStyle ?? {}),
  });

  return (
    <th
      ref={props.dndRef as Ref<HTMLTableCellElement>}
      style={cellStyle()}
      data-pinned={isPinned() || undefined}
      data-last-col={isLastLeftPinned() ? "left" : isFirstRightPinned() ? "right" : undefined}
      class={cn(
        "relative style-lyra:h-9 style-maia:h-10 style-mira:h-8 style-nova:h-9 style-vega:h-10 text-left align-middle font-normal text-secondary-foreground/80 rtl:text-right [&:has([role=checkbox])]:pe-0",
        headerCellSpacing(),
        ctx.props.tableLayout?.cellBorder && "border-e",
        ctx.props.tableLayout?.columnsResizable && column().getCanResize() && "overflow-visible",
        ctx.props.tableLayout?.columnsResizable &&
          column().getCanResize() &&
          isLastVisibleColumn() &&
          "pe-8",
        ctx.props.tableLayout?.columnsPinnable &&
          column().getCanPin() &&
          "data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border",
        props.header.column.columnDef.meta?.headerClassName,
        column().getIndex() === 0 ||
          column().getIndex() === props.header.headerGroup.headers.length - 1
          ? ctx.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </th>
  );
}

function DataGridTableHeadRowCellResize<TData>(props: { header: Header<TData, unknown> }) {
  const ctx = useDataGrid();
  const column = () => props.header.column;
  const isLastVisibleColumn = () =>
    column().getIndex() === props.header.getContext().table.getVisibleLeafColumns().length - 1;
  const isResizeModeOnEnd = () =>
    (ctx.props.tableLayout?.columnsResizeMode ?? ctx.table.options.columnResizeMode) === "onEnd";

  const handleMouseDown = (event: MouseEvent & { currentTarget: HTMLDivElement }) => {
    event.preventDefault();
    event.stopPropagation();
    if (isResizeModeOnEnd()) {
      startDataGridColumnResizeOnEnd(
        event as DataGridResizeStartEvent,
        props.header,
        ctx.table as unknown as Table<TData>,
      );
      return;
    }
    // Solid table exposes getResizeHandler returning a function
    (props.header.getResizeHandler() as (e: MouseEvent | TouchEvent) => void)(event);
  };

  const handleTouchStart = (event: TouchEvent & { currentTarget: HTMLDivElement }) => {
    event.preventDefault();
    event.stopPropagation();
    if (isResizeModeOnEnd()) {
      startDataGridColumnResizeOnEnd(
        event as DataGridResizeStartEvent,
        props.header,
        ctx.table as unknown as Table<TData>,
      );
      return;
    }
    (props.header.getResizeHandler() as (e: MouseEvent | TouchEvent) => void)(event);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only resize affordance, keyboard users resize via column controls in the header dropdown
    <div
      role="presentation"
      onDblClick={() => column().resetSize()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      class={cn(
        "user-select-none absolute top-0 z-10 flex h-full cursor-col-resize touch-none",
        isLastVisibleColumn()
          ? "end-0 w-5 justify-end before:hidden"
          : "-end-2 w-5 justify-center before:absolute before:inset-y-0 before:w-px before:-translate-x-px before:bg-border",
        column().getIsResizing() &&
          (isResizeModeOnEnd()
            ? "opacity-100"
            : isLastVisibleColumn()
              ? "opacity-100 before:absolute before:inset-y-0 before:end-0 before:block before:w-0.5 before:bg-primary"
              : "opacity-100 before:block before:w-0.5 before:bg-primary"),
      )}
    />
  );
}

function DataGridTableResizeIndicator(props: { viewportElement: Accessor<HTMLDivElement | null> }) {
  const ctx = useDataGrid();

  const columnSizingInfo = () => ctx.table.getState().columnSizingInfo;
  const resizingColumnId = () => columnSizingInfo().isResizingColumn;
  const resizeMode = () =>
    ctx.props.tableLayout?.columnsResizeMode ?? ctx.table.options.columnResizeMode;

  const shouldRender = () =>
    !!ctx.props.tableLayout?.columnsResizable && resizeMode() === "onEnd" && !!resizingColumnId();

  const resizingHeader = () => {
    const id = resizingColumnId();
    if (!id) return undefined;
    return ctx.table.getFlatHeaders().find((header) => header.column.id === id || header.id === id);
  };

  const deltaOffset = () => columnSizingInfo().deltaOffset ?? 0;
  const headerHeight = () =>
    props
      .viewportElement()
      ?.querySelector('[data-slot="data-grid-table"] thead')
      ?.getBoundingClientRect().height ?? 0;

  const indicatorLeft = () => {
    const info = columnSizingInfo();
    const vp = props.viewportElement();
    const rh = resizingHeader();
    if (!rh) return 0;
    if (typeof info.startOffset === "number" && vp) {
      return info.startOffset - vp.getBoundingClientRect().left;
    }
    return rh.getStart() + rh.getSize();
  };

  return (
    <Show when={shouldRender() && resizingHeader()}>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 z-20"
        style={{
          left: `${indicatorLeft()}px`,
          transform: `translateX(${deltaOffset()}px)`,
        }}
      >
        <div class="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-primary/85" />
        <div
          class="absolute top-0 left-0 -translate-x-1/2 rounded-b-sm bg-primary shadow-xs"
          style={{
            width: "5px",
            height: `${Math.max(headerHeight(), 6)}px`,
          }}
        />
      </div>
    </Show>
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" class="h-2" />;
}

function DataGridTableBody(props: { children: JSX.Element }) {
  const ctx = useDataGrid();
  return (
    <tbody
      class={cn(
        "[&_tr:last-child]:border-0",
        ctx.props.tableLayout?.rowRounded &&
          "style-lyra:[&_td:first-child]:rounded-e-none style-maia:[&_td:first-child]:rounded-l-none style-mira:[&_td:first-child]:rounded-l-4xl style-nova:[&_td:first-child]:rounded-l-lg style-vega:[&_td:first-child]:rounded-l-lg",
        ctx.props.tableLayout?.rowRounded &&
          "style-lyra:[&_td:last-child]:rounded-e-none style-maia:[&_td:last-child]:rounded-r-none style-mira:[&_td:last-child]:rounded-r-4xl style-nova:[&_td:last-child]:rounded-r-lg style-vega:[&_td:last-child]:rounded-r-lg",
        ctx.props.tableClassNames?.body,
      )}
    >
      {props.children}
    </tbody>
  );
}

function DataGridTableFoot(props: { children: JSX.Element }) {
  const ctx = useDataGrid();
  return <tfoot class={cn("border-t", ctx.props.tableClassNames?.footer)}>{props.children}</tfoot>;
}

function DataGridTableFootRow(props: { children: JSX.Element }) {
  const ctx = useDataGrid();
  return (
    <tr
      class={cn(
        "bg-muted/40 dark:bg-background",
        ctx.props.tableLayout?.cellBorder && "*:last:border-e-0",
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
  const ctx = useDataGrid();
  const spacing = () =>
    footerCellSpacingVariants({
      size: ctx.props.tableLayout?.dense ? "dense" : "default",
    });

  return (
    <td
      colSpan={props.colSpan}
      class={cn(
        "border-t align-middle font-medium text-secondary-foreground/80",
        spacing(),
        ctx.props.tableLayout?.cellBorder && "border-e",
        props.class,
      )}
    >
      {props.children}
    </td>
  );
}

function DataGridTableBodyRowSkeleton(props: { children: JSX.Element }) {
  const ctx = useDataGrid();

  return (
    <tr
      class={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        ctx.props.onRowClick && "cursor-pointer",
        !ctx.props.tableLayout?.stripped &&
          ctx.props.tableLayout?.rowBorder &&
          "border-border border-b [&:not(:last-child)>td]:border-b",
        ctx.props.tableLayout?.cellBorder && "*:last:border-e-0",
        ctx.props.tableLayout?.stripped &&
          "odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted",
        ctx.table.options.enableRowSelection && "*:first:relative",
        ctx.props.tableClassNames?.bodyRow,
      )}
    >
      {props.children}
      <DataGridTableFillBodyCell />
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData>(props: {
  children: JSX.Element;
  column: Column<TData>;
}) {
  const ctx = useDataGrid();
  const bodyCellSpacing = () =>
    bodyCellSpacingVariants({
      size: ctx.props.tableLayout?.dense ? "dense" : "default",
    });

  const cellStyle = () =>
    ctx.props.tableLayout?.columnsResizable
      ? { width: `calc(var(--col-${props.column.id}-size) * 1px)` }
      : undefined;

  return (
    <td
      style={cellStyle()}
      class={cn(
        "align-middle",
        bodyCellSpacing(),
        ctx.props.tableLayout?.cellBorder && "border-e",
        ctx.props.tableLayout?.columnsResizable && props.column.getCanResize() && "truncate",
        props.column.columnDef.meta?.cellClassName,
        ctx.props.tableLayout?.columnsPinnable &&
          props.column.getCanPin() &&
          "data-pinned:bg-background/90 data-pinned:backdrop-blur-xs [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border",
        props.column.getIndex() === 0 ||
          props.column.getIndex() === ctx.table.getVisibleFlatColumns().length - 1
          ? ctx.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </td>
  );
}

function DataGridTableBodyRow<TData>(props: {
  children: JSX.Element;
  row: Row<TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: Ref<HTMLTableRowElement>;
  dndRef?: Ref<HTMLTableRowElement>;
  dndStyle?: JSX.CSSProperties;
}) {
  const ctx = useDataGrid();
  const isRowPinned = () => props.row.getIsPinned();

  return (
    <tr
      ref={(node: HTMLTableRowElement | null) => {
        assignRef(props.rowRef, node);
        assignRef(props.dndRef, node);
      }}
      style={props.dndStyle ?? {}}
      data-state={
        ctx.table.options.enableRowSelection && props.row.getIsSelected() ? "selected" : undefined
      }
      data-row-pinned={isRowPinned() || undefined}
      data-row-pinned-boundary={props.pinnedBoundary}
      onClick={() =>
        (ctx.props.onRowClick as ((row: TData) => void) | undefined)?.(props.row.original)
      }
      class={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        ctx.props.onRowClick && "cursor-pointer",
        !ctx.props.tableLayout?.stripped &&
          ctx.props.tableLayout?.rowBorder &&
          "border-border border-b [&:not(:last-child)>td]:border-b",
        ctx.props.tableLayout?.cellBorder && "*:last:border-e-0",
        ctx.props.tableLayout?.stripped &&
          "odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted",
        ctx.table.options.enableRowSelection && "*:first:relative",
        ctx.props.tableLayout?.rowsPinnable && isRowPinned() && "bg-muted/30 hover:bg-muted/50",
        props.pinnedBoundary === "top" && "[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]",
        props.pinnedBoundary === "bottom" && "[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]",
        ctx.props.tableClassNames?.bodyRow,
      )}
    >
      {props.children}
      <DataGridTableFillBodyCell />
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData>(props: { row: Row<TData> }) {
  const ctx = useDataGrid();

  return (
    <tr class={cn(ctx.props.tableLayout?.rowBorder && "[&:not(:last-child)>td]:border-b")}>
      <td
        colSpan={
          props.row.getVisibleCells().length + (ctx.props.tableLayout?.columnsResizable ? 1 : 0)
        }
      >
        {ctx.table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(props.row.original as object)}
      </td>
    </tr>
  );
}

function DataGridTableBodyRowCell<TData>(props: {
  children: JSX.Element;
  cell: Cell<TData, unknown>;
  dndRef?: Ref<HTMLTableCellElement>;
  dndStyle?: JSX.CSSProperties;
}) {
  const ctx = useDataGrid();
  const column = () => props.cell.column;
  const row = () => props.cell.row;
  const isPinned = () => column().getIsPinned();
  const isLastLeftPinned = () => isPinned() === "left" && column().getIsLastColumn("left");
  const isFirstRightPinned = () => isPinned() === "right" && column().getIsFirstColumn("right");
  const bodyCellSpacing = () =>
    bodyCellSpacingVariants({
      size: ctx.props.tableLayout?.dense ? "dense" : "default",
    });

  const cellStyle = (): JSX.CSSProperties => ({
    ...(ctx.props.tableLayout?.columnsPinnable && column().getCanPin()
      ? getPinningStyles(column())
      : {}),
    ...(ctx.props.tableLayout?.columnsResizable
      ? { width: `calc(var(--col-${column().id}-size) * 1px)` }
      : {}),
    ...(props.dndStyle ?? {}),
  });

  return (
    <td
      ref={props.dndRef as Ref<HTMLTableCellElement>}
      style={cellStyle()}
      data-pinned={isPinned() || undefined}
      data-last-col={isLastLeftPinned() ? "left" : isFirstRightPinned() ? "right" : undefined}
      class={cn(
        "align-middle",
        bodyCellSpacing(),
        ctx.props.tableLayout?.cellBorder && "border-e",
        ctx.props.tableLayout?.columnsResizable && column().getCanResize() && "truncate",
        props.cell.column.columnDef.meta?.cellClassName,
        ctx.props.tableLayout?.columnsPinnable &&
          column().getCanPin() &&
          "data-pinned:bg-background/90 data-pinned:backdrop-blur-xs [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border",
        column().getIndex() === 0 || column().getIndex() === row().getVisibleCells().length - 1
          ? ctx.props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {props.children}
    </td>
  );
}

function DataGridTableRenderedRow<TData>(props: {
  row: Row<TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: Ref<HTMLTableRowElement>;
}) {
  return (
    <>
      <DataGridTableBodyRow
        row={props.row}
        pinnedBoundary={props.pinnedBoundary}
        rowRef={props.rowRef}
      >
        <For each={props.row.getVisibleCells()}>
          {(cell) => (
            <DataGridTableBodyRowCell cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          )}
        </For>
      </DataGridTableBodyRow>
      <Show when={props.row.getIsExpanded()}>
        <DataGridTableBodyRowExpandded row={props.row} />
      </Show>
    </>
  );
}

function DataGridTableEmpty() {
  const ctx = useDataGrid();
  const visibleColumnCount = () =>
    ctx.table.getVisibleLeafColumns().length + (ctx.props.tableLayout?.columnsResizable ? 1 : 0);

  return (
    <tr>
      <td
        colSpan={Math.max(visibleColumnCount(), 1)}
        class="py-6 text-center style-lyra:text-xs style-maia:text-sm style-mira:text-xs/relaxed style-nova:text-sm style-vega:text-sm text-muted-foreground"
      >
        {ctx.props.emptyMessage || "No data available"}
      </td>
    </tr>
  );
}

function DataGridTableLoader() {
  const ctx = useDataGrid();

  return (
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div class="flex items-center gap-2 style-lyra:rounded-none style-maia:rounded-2xl style-mira:rounded-md style-nova:rounded-lg style-vega:rounded-md border bg-card px-4 py-2 font-medium style-lyra:text-xs style-maia:text-sm style-mira:text-xs/relaxed style-nova:text-sm style-vega:text-sm text-muted-foreground leading-none style-vega:shadow-xs">
        <Spinner class="size-5 opacity-60" />
        {ctx.props.loadingMessage || "Loading..."}
      </div>
    </div>
  );
}

function DataGridTableRowPin<TData>(props: { row: Row<TData> }) {
  const isPinned = () => props.row.getIsPinned();

  return (
    <button
      type="button"
      data-slot="data-grid-row-pin"
      aria-label={isPinned() ? "Unpin row" : "Pin row"}
      onClick={() => {
        if (isPinned()) {
          props.row.pin(false);
        } else {
          props.row.pin("top");
        }
      }}
      class={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
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
            <title>Pin</title>
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
          <title>Unpin</title>
          <path d="M16 2l4.585 4.586-2.122 2.121L17.05 7.293l-3.535 3.536 1.413 5.658-2.12 2.121-4.244-4.243L4.322 18.6l-1.414-1.41 4.242-4.244-4.243-4.243 2.122-2.121 5.656 1.414 3.536-3.536-1.414-1.414z" />
        </svg>
      </Show>
    </button>
  );
}

function DataGridTableRowSelect<TData>(props: { row: Row<TData> }) {
  return (
    <>
      <div
        class={cn(
          "absolute inset-s-0 top-0 bottom-0 hidden w-[2px] bg-primary",
          props.row.getIsSelected() && "block",
        )}
      />
      <Checkbox
        checked={props.row.getIsSelected()}
        onChange={(value: boolean) => props.row.toggleSelected(!!value)}
        aria-label="Select row"
        class="align-[inherit]"
      />
    </>
  );
}

function DataGridTableRowSelectAll() {
  const ctx = useDataGrid();

  const isAllSelected = () => ctx.table.getIsAllPageRowsSelected();
  const isSomeSelected = () => ctx.table.getIsSomePageRowsSelected();

  return (
    <Checkbox
      checked={isAllSelected()}
      indeterminate={isSomeSelected() && !isAllSelected()}
      disabled={ctx.isLoading || ctx.recordCount === 0}
      onChange={(value: boolean) => ctx.table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      class="align-[inherit]"
    />
  );
}

function DataGridTableBodyRows<TData>(props: { table: Table<TData> }) {
  const ctx = useDataGrid();
  const pagination = () => props.table.getState().pagination;

  const resolvedRows = () =>
    getDataGridTableResolvedRows(props.table, ctx.props.tableLayout?.rowsPinnable);

  return (
    <Show
      when={!(ctx.isLoading && ctx.props.loadingMode === "skeleton" && pagination()?.pageSize)}
      fallback={
        <For each={Array.from({ length: pagination().pageSize })}>
          {() => (
            <DataGridTableBodyRowSkeleton>
              <For each={props.table.getVisibleFlatColumns()}>
                {(column) => (
                  <DataGridTableBodyRowSkeletonCell column={column}>
                    {column.columnDef.meta?.skeleton}
                  </DataGridTableBodyRowSkeletonCell>
                )}
              </For>
            </DataGridTableBodyRowSkeleton>
          )}
        </For>
      }
    >
      <Show
        when={!(ctx.isLoading && ctx.props.loadingMode === "spinner")}
        fallback={
          <tr>
            <td colSpan={props.table.getVisibleFlatColumns().length} class="p-8">
              <div class="flex items-center justify-center">
                <Spinner class="mr-3 -ml-1 h-5 w-5 text-muted-foreground" />
                {ctx.props.loadingMessage || "Loading..."}
              </div>
            </td>
          </tr>
        }
      >
        <Show when={resolvedRows().length} fallback={<DataGridTableEmpty />}>
          <For each={resolvedRows()}>
            {({ row, pinnedBoundary }) => (
              <DataGridTableRenderedRow row={row} pinnedBoundary={pinnedBoundary} />
            )}
          </For>
        </Show>
      </Show>
    </Show>
  );
}

function DataGridTableHeader() {
  const ctx = useDataGrid();

  return (
    <DataGridTableViewport>
      <DataGridTableBase>
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
                            ctx.props.tableLayout?.columnsResizable && header.column.getCanResize()
                          }
                          fallback={flexRender(header.column.columnDef.header, header.getContext())}
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
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

function DataGridTable(props: { footerContent?: JSX.Element; renderHeader?: boolean }) {
  const ctx = useDataGrid();
  const renderHeader = () => props.renderHeader !== false;

  return (
    <DataGridTableViewport>
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
          <DataGridTableBodyRows table={ctx.table} />
        </DataGridTableBody>

        <Show when={props.footerContent}>
          <DataGridTableFoot>{props.footerContent}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );
}

export type { DataGridTablePinnedBoundary };
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
  DataGridTableRowPin,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridTableResolvedRows,
  getDataGridTableRowSections,
};
