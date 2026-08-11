import type { DragDropProviderProps } from "@dnd-kit/solid";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import type { UseSortableInput } from "@dnd-kit/solid/sortable";
import { isSortable, useSortable } from "@dnd-kit/solid/sortable";
import type { Cell, Header, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import { GripHorizontal } from "lucide-solid";
import type { JSX } from "solid-js";
import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import type { DataGridFeatures, DataGridTableInstance } from "./data-grid";
import { useDataGrid } from "./data-grid";
import {
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
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
  DataGridTableViewport,
} from "./data-grid-table";

type DataGridTableDndRowId = string | number;

/** Collision strategy accepted per sortable row. Derived so the block never imports `@dnd-kit/collision` directly. */
type DataGridTableDndRowsCollisionDetection = NonNullable<UseSortableInput["collisionDetector"]>;

/** Modifier list accepted by the provider. Derived for the same reason. */
type DataGridTableDndRowsModifiers = NonNullable<DragDropProviderProps["modifiers"]>;

type DataGridTableDndRowsDragStartHandler = NonNullable<DragDropProviderProps["onDragStart"]>;
type DataGridTableDndRowsDragEndHandler = NonNullable<DragDropProviderProps["onDragEnd"]>;

/**
 * What a completed reorder reports.
 *
 * `@dnd-kit/solid@0.5` is the next-generation dnd-kit and has no
 * `DragEndEvent` (`{ active, over }`) to hand back. The grid reports the two
 * row ids plus their positions in `dataIds`, which is exactly what upstream's
 * handlers derived by hand with `dataIds.indexOf(active.id)`.
 */
type DataGridTableDndRowsDragEndEvent = {
  /** Row id that was picked up. */
  activeId: DataGridTableDndRowId;
  /** Row id it was dropped on, or null when the drop had no target. */
  overId: DataGridTableDndRowId | null;
  /** Position of `activeId` in `dataIds`, or -1. */
  activeIndex: number;
  /** Position `activeId` should move to, or -1. */
  overIndex: number;
  /** True when the gesture was aborted (Escape, pointer cancel). */
  canceled: boolean;
};

/**
 * Tree metadata attached to every sortable row, readable from the drag
 * operation's source/target `data` in any drag event. Cross-parent drops can
 * be resolved from it without re-deriving the shape of the table.
 */
type DataGridTableDndRowData = {
  type: "data-grid-row";
  /** Tree depth, 0 for root rows. */
  depth: number;
  /** Index within the parent's children, or within the root rows. */
  index: number;
  /** Parent row id, or null for root rows. */
  parentId: string | null;
};

/**
 * Per-row render slot for drop indicators and depth guides. The returned node
 * is positioned over the row, so it never adds a column, shifts striping, or
 * gets clipped by a truncating resizable cell.
 */
type DataGridTableDndRowDecoration<TData extends object> = (context: {
  row: Row<DataGridFeatures, TData>;
  isDragging: boolean;
  isOver: boolean;
}) => JSX.Element;

// Shares the sortable handle from row to grip. React threads `attributes` and
// `listeners` through; the next-generation dnd-kit exposes a single
// `handleRef` setter instead.
type SortableRowContextValue = {
  setHandleRef: (element: Element | undefined) => void;
};

const SortableRowContext = createContext<SortableRowContextValue | null>(null);

type DataGridTableDndRowsContextValue = {
  /** Index in `dataIds` of the row currently being carried, or -1. */
  activeIndex: () => number;
  live: () => boolean;
};

const DataGridTableDndRowsContext = createContext<DataGridTableDndRowsContextValue>({
  activeIndex: () => -1,
  live: () => false,
});

function DataGridTableDndRowHandle(props: {
  class?: string;
  /**
   * Renders the grip inert instead of withdrawing it. A grid that reorders on
   * one truth (manual order) and sorts on another cannot honour both at once,
   * but dropping the handle entirely collapses the gutter and reads as broken
   * rather than as unavailable. Keep the column's shape, mute the control.
   */
  disabled?: boolean;
  /** Announced and shown on hover in place of the drag affordance. */
  disabledLabel?: string;
}) {
  const context = useContext(SortableRowContext);
  const disabledLabel = () => props.disabledLabel ?? "Reordering unavailable";
  const isInert = () => !context || props.disabled;

  return (
    <Button
      ref={(element: HTMLButtonElement) => {
        if (isInert()) return;
        context?.setHandleRef(element);
      }}
      variant="ghost"
      size="icon-sm"
      class={cn(
        "size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing",
        // The Button's own disabled treatment supplies the muting; only the
        // cursor needs saying, so the grip reads as unavailable rather than
        // merely unresponsive.
        props.disabled && "cursor-not-allowed",
        props.class,
      )}
      aria-label={isInert() && props.disabled ? disabledLabel() : "Drag to reorder row"}
      title={isInert() && props.disabled ? disabledLabel() : undefined}
      disabled={isInert()}
    >
      <GripHorizontal aria-hidden="true" />
    </Button>
  );
}

function DataGridTableDndRowCells<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
  decoration: JSX.Element;
  dropEdge: "top" | "bottom" | null;
}) {
  const cells = () => props.row.getVisibleCells() as Cell<DataGridFeatures, TData, unknown>[];
  const isLastCell = (index: number) => index === cells().length - 1;

  return (
    <For each={cells()}>
      {(cell, index) => (
        <DataGridTableBodyRowCell cell={cell}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
          <Show when={props.decoration && isLastCell(index())}>
            {/*
              Rides inside the last cell rather than in a `td` of its own. An
              absolutely positioned `td` is still a cell as far as table layout
              is concerned, so it added a further column with no width of its
              own, and under `table-layout: fixed` that new column swallowed
              the surplus the real columns had been sharing - every column
              snapped back to its declared size and the row's content visibly
              narrowed the moment a drag began. A plain element adds no column.
              It still anchors to the ROW, because the row is the nearest
              positioned ancestor, so the decoration spans the full width and
              is not clipped by the cell.
            */}
            <div
              aria-hidden="true"
              data-slot="data-grid-table-row-decoration"
              class="pointer-events-none absolute inset-0"
            >
              {props.decoration}
            </div>
          </Show>
          <Show when={props.dropEdge && isLastCell(index())}>
            {/* Same anchoring trick as the decoration above. */}
            <div
              aria-hidden="true"
              data-slot="data-grid-table-row-drop-indicator"
              data-edge={props.dropEdge ?? undefined}
              class="pointer-events-none absolute inset-0 z-20"
            >
              {/* Two solid pixels down the leading edge, the same marker the
                  tree drag uses for its drop target. A wash across the row has
                  to stay faint enough not to read as a selected row, and in the
                  achromatic styles primary carries no chroma at all, so faint
                  plus colourless is just grey. The bar reads at any weight and
                  leaves the row's own background to hover and selection.
                  `data-edge` carries the direction for anyone styling their
                  own. */}
              <span class="bg-primary absolute inset-y-0 start-0 w-0.5" />
            </div>
          </Show>
        </DataGridTableBodyRowCell>
      )}
    </For>
  );
}

/**
 * The rows do not move while one is being carried.
 *
 * Sliding the siblings apart opens a gap the carried row could go into, which
 * reads well in a list of identical rows and badly in a table: the gap is the
 * height of the row you are holding, so with rows of unequal height it never
 * matches the slot it claims to be, and the row you picked up slides away from
 * where it started - which is exactly the position you need to remember if you
 * decide not to drop it.
 *
 * Holding everything still keeps the origin legible, and nothing is lost: the
 * `DragOverlay` clone follows the pointer and the drop indicator names the
 * seam. Upstream expresses this with a `SortingStrategy` that returns null;
 * the next-generation dnd-kit has no strategies, so it falls out of the render
 * instead - the body is driven by the table's own row model, which does not
 * change until the drop, and `transition: null` keeps the sortable from
 * animating an index change nothing acted on.
 */
function DataGridTableDndRow<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
  index: number;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  dropIndicator?: boolean;
  collisionDetection?: DataGridTableDndRowsCollisionDetection;
}) {
  const context = useContext(DataGridTableDndRowsContext);

  const rowData = (): DataGridTableDndRowData => ({
    type: "data-grid-row",
    depth: props.row.depth,
    index: props.row.index,
    parentId: props.row.getParentRow()?.id ?? null,
  });

  const sortable = useSortable({
    get id() {
      return props.row.id;
    },
    get index() {
      return props.index;
    },
    get data() {
      return rowData();
    },
    get collisionDetector() {
      return props.collisionDetection;
    },
    transition: null,
  });

  const isDragging = () => sortable.isDragging();
  const isOver = () => sortable.isDropTarget();

  // Which edge of THIS row the carried row would land on, or null when it is
  // not the drop target. Nothing slides apart, so the bar is the only thing
  // that says where the drop goes: it marks the row at the destination index,
  // on the side the carried row comes to rest. Dragging down it lands after
  // the target, dragging up before it, so the edge follows the direction of
  // travel.
  const dropEdge = () => {
    if (props.dropIndicator === false || !isOver() || isDragging()) return null;

    const activeIndex = context.activeIndex();
    if (activeIndex === -1) return null;

    return activeIndex < props.index ? "bottom" : "top";
  };

  const style = (): JSX.CSSProperties => ({
    "z-index": isDragging() ? 1 : 0,
    position: "relative",
    cursor: isDragging() ? "grabbing" : undefined,
    // The row you are holding is drawn by the DragOverlay, so the one left
    // behind is not a second copy of it - it is the slot you came from, and it
    // stays exactly where it was. Fading alone read as "this row is busy"; the
    // outline says "this is the space you are moving out of", which is the
    // thing you need if you change your mind mid-drag.
    ...(isDragging()
      ? {
          opacity: 0.4,
          // Inset so the dashes sit inside the row box and cannot be clipped
          // by the neighbouring row's border.
          outline: "1px dashed var(--border)",
          "outline-offset": "-1px",
        }
      : undefined),
  });

  const decoration = () =>
    props.renderRowDecoration?.({ row: props.row, isDragging: isDragging(), isOver: isOver() });

  return (
    <SortableRowContext.Provider value={{ setHandleRef: (element) => sortable.handleRef(element) }}>
      <DataGridTableBodyRow
        row={props.row}
        dndRef={(element) => sortable.ref(element)}
        dndStyle={style()}
      >
        <DataGridTableDndRowCells row={props.row} decoration={decoration()} dropEdge={dropEdge()} />
        <DataGridTableFillBodyCell />
      </DataGridTableBodyRow>
      <Show when={props.row.getIsExpanded()}>
        <DataGridTableBodyRowExpandded row={props.row} />
      </Show>
    </SortableRowContext.Provider>
  );
}

/** Presentational row used before the browser-only drag manager is live. */
function DataGridTableDndStaticRow<TData extends object>(props: {
  row: Row<DataGridFeatures, TData>;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
}) {
  const decoration = () =>
    props.renderRowDecoration?.({ row: props.row, isDragging: false, isOver: false });

  return (
    <>
      <DataGridTableBodyRow row={props.row} dndStyle={{ position: "relative", "z-index": 0 }}>
        <DataGridTableDndRowCells row={props.row} decoration={decoration()} dropEdge={null} />
        <DataGridTableFillBodyCell />
      </DataGridTableBodyRow>
      <Show when={props.row.getIsExpanded()}>
        <DataGridTableBodyRowExpandded row={props.row} />
      </Show>
    </>
  );
}

/**
 * Body rows.
 *
 * Upstream memoizes this to skip React re-renders during an active column
 * resize; column widths already travel through CSS variables on the `<table>`,
 * and Solid updates only what changed, so the memo has no counterpart here.
 */
function DataGridTableDndRowsBody<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
  dataIds: DataGridTableDndRowId[];
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  dropIndicator?: boolean;
  collisionDetection?: DataGridTableDndRowsCollisionDetection;
}) {
  const grid = useDataGrid<TData>();
  const context = useContext(DataGridTableDndRowsContext);
  const pagination = () => props.table.store.state.pagination;
  const rows = createMemo(() => props.table.getRowModel().rows as Row<DataGridFeatures, TData>[]);

  const showSkeleton = () =>
    grid.props.loadingMode === "skeleton" && grid.isLoading && !!pagination()?.pageSize;
  const skeletonRowIndexes = () =>
    Array.from({ length: pagination()?.pageSize ?? 0 }, (_, index) => index);

  return (
    <Switch
      fallback={
        <For each={rows()}>
          {(row) => (
            <Show
              when={context.live()}
              fallback={
                <DataGridTableDndStaticRow
                  row={row}
                  renderRowDecoration={props.renderRowDecoration}
                />
              }
            >
              <DataGridTableDndRow
                row={row}
                index={props.dataIds.indexOf(row.id)}
                renderRowDecoration={props.renderRowDecoration}
                dropIndicator={props.dropIndicator}
                collisionDetection={props.collisionDetection}
              />
            </Show>
          )}
        </For>
      }
    >
      <Match when={showSkeleton()}>
        <For each={skeletonRowIndexes()}>
          {() => (
            <DataGridTableBodyRowSkeleton>
              <For each={props.table.getVisibleFlatColumns()}>
                {(column) => (
                  <DataGridTableBodyRowSkeletonCell column={column}>
                    {column.columnDef.meta?.skeleton?.()}
                  </DataGridTableBodyRowSkeletonCell>
                )}
              </For>
              <DataGridTableFillBodyCell />
            </DataGridTableBodyRowSkeleton>
          )}
        </For>
      </Match>
      <Match when={rows().length === 0}>
        <DataGridTableEmpty />
      </Match>
    </Switch>
  );
}

interface DataGridTableDndRowsProps<TData extends object> {
  handleDragEnd: (event: DataGridTableDndRowsDragEndEvent) => void;
  dataIds: DataGridTableDndRowId[];
  footerContent?: JSX.Element;
  /** Overrides the sortable rows' default collision strategy. */
  collisionDetection?: DataGridTableDndRowsCollisionDetection;
  /**
   * Modifiers applied to the drag operation, e.g. an axis restriction or an
   * element clamp. Forwarded to the provider untouched.
   */
  modifiers?: DataGridTableDndRowsModifiers;
  /** Per-row slot for drop indicators and depth guides. */
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  /**
   * Draws a line on the seam the carried row would land on. On by default;
   * pass `false` when `renderRowDecoration` paints its own insertion
   * affordance and the two would compete.
   */
  dropIndicator?: boolean;
  onDragStart?: DragDropProviderProps["onDragStart"];
  onDragMove?: DragDropProviderProps["onDragMove"];
  onDragOver?: DragDropProviderProps["onDragOver"];
  onDragCancel?: (event: DataGridTableDndRowsDragEndEvent) => void;
}

function DataGridTableDndRows<TData extends object>(props: DataGridTableDndRowsProps<TData>) {
  const grid = useDataGrid<TData>();
  const [isDraggingRow, setIsDraggingRow] = createSignal(false);
  const [activeId, setActiveId] = createSignal<DataGridTableDndRowId | null>(null);
  // `@dnd-kit/solid` is browser-only: the server renders the same markup
  // without the drag-and-drop manager, and the provider mounts client-side.
  const [live, setLive] = createSignal(false);
  onMount(() => setLive(true));

  let tableContainer: HTMLDivElement | undefined;

  // The row being carried, plus the column widths measured off the header the
  // moment the drag starts. The clone lives outside the table, so it has no
  // columns of its own and has to be told what they are.
  const [carried, setCarried] = createSignal<{
    id: DataGridTableDndRowId;
    width: number;
    height: number;
    columns: number[];
  } | null>(null);

  // Resolve once: the footer is JSX handed in as a prop, and testing it for
  // presence must not build it a second time.
  const footerContent = children(() => props.footerContent);

  const activeIndex = () => {
    const id = activeId();
    return id === null ? -1 : props.dataIds.indexOf(id);
  };

  const pickUpRow = (id: DataGridTableDndRowId) => {
    const container = tableContainer;
    const head = container?.querySelector("thead tr");

    if (!container || !head) {
      setCarried(null);
      return;
    }

    // The clone has to be exactly as tall as the row it was lifted from. A
    // fixed height reads as the grid growing under the pointer the moment you
    // pick a row up, and it is wrong in both directions: rows whose content
    // wraps are taller than any constant, and dense rows are shorter.
    const source = Array.from(
      container.querySelectorAll<HTMLElement>("tbody tr[data-row-id]"),
    ).find((candidate) => candidate.dataset.rowId === String(id));
    const height = source?.getBoundingClientRect().height ?? 0;

    // The fill cell is a header-only spacer that soaks up the surplus a column
    // resize leaves behind, and the clone renders data cells only. Measuring it
    // in would make the clone's table wider than the cells it actually holds,
    // and `table-fixed` hands that orphaned width back out across every column
    // - the carried row comes out visibly wider than the row it was lifted
    // from. So the width is the sum of what we render, never the header's own.
    const columns = Array.from(head.children)
      .filter((cell) => cell.getAttribute("data-slot") !== "data-grid-table-fill-head-cell")
      .map((cell) => cell.getBoundingClientRect().width);

    setCarried({
      id,
      width: columns.reduce((total, width) => total + width, 0),
      height,
      columns,
    });
  };

  const carriedRow = () => {
    const current = carried();
    if (!current) return undefined;
    return (grid.table.getRowModel().rows as Row<DataGridFeatures, TData>[]).find(
      (row) => row.id === String(current.id),
    );
  };

  createEffect(() => {
    if (!isDraggingRow()) return;

    const { body, documentElement } = document;
    const previousBodyCursor = body.style.cursor;
    const previousDocumentCursor = documentElement.style.cursor;

    body.style.cursor = "grabbing";
    documentElement.style.cursor = "grabbing";

    onCleanup(() => {
      body.style.cursor = previousBodyCursor;
      documentElement.style.cursor = previousDocumentCursor;
    });
  });

  const handleDragStart: DataGridTableDndRowsDragStartHandler = (event, manager) => {
    const source = event.operation.source;

    setIsDraggingRow(true);

    if (source && source.id !== undefined) {
      const id = source.id as DataGridTableDndRowId;
      setActiveId(() => id);
      pickUpRow(id);
    }

    props.onDragStart?.(event, manager);
  };

  const handleDragEnd: DataGridTableDndRowsDragEndHandler = (event) => {
    const source = event.operation.source;
    const target = event.operation.target;

    setIsDraggingRow(false);
    setActiveId(null);
    setCarried(null);

    if (!source || source.id === undefined) return;

    const resolvedActiveId = source.id as DataGridTableDndRowId;
    const resolvedOverId =
      target && target.id !== undefined ? (target.id as DataGridTableDndRowId) : null;
    const resolved: DataGridTableDndRowsDragEndEvent = {
      activeId: resolvedActiveId,
      overId: resolvedOverId,
      activeIndex: props.dataIds.indexOf(resolvedActiveId),
      overIndex: resolvedOverId !== null ? props.dataIds.indexOf(resolvedOverId) : -1,
      canceled: event.canceled || !isSortable(source as never),
    };

    if (resolved.canceled) {
      props.onDragCancel?.(resolved);
      return;
    }

    props.handleDragEnd(resolved);
  };

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

  // A function, not a stored element: flipping `live` re-creates this subtree
  // so each row's `useSortable` resolves the manager from an owner that
  // actually has the provider above it. Same trade-off the `sortable` block
  // makes, and the reason the flip happens once, in `onMount`.
  const gridBody = () => (
    <DataGridTableViewport
      viewportRef={(node) => {
        tableContainer = node;
      }}
      class={isDraggingRow() ? "relative cursor-grabbing [&_*]:cursor-grabbing!" : "relative"}
    >
      <DataGridTableBase>
        <DataGridTableHead>
          <For each={grid.table.getHeaderGroups()}>
            {(headerGroup) => (
              <DataGridTableHeadRow rowId={headerGroup.id}>
                <For each={headerGroup.headers}>
                  {(header) => headerCell(header as Header<DataGridFeatures, TData, unknown>)}
                </For>
                <DataGridTableFillHeadCell />
              </DataGridTableHeadRow>
            )}
          </For>
        </DataGridTableHead>

        <Show when={grid.props.tableLayout?.stripped || !grid.props.tableLayout?.rowBorder}>
          <DataGridTableRowSpacer />
        </Show>

        <DataGridTableBody>
          <DataGridTableDndRowsBody
            table={grid.table}
            dataIds={props.dataIds}
            renderRowDecoration={props.renderRowDecoration}
            dropIndicator={props.dropIndicator}
            collisionDetection={props.collisionDetection}
          />
        </DataGridTableBody>

        <Show when={footerContent()}>
          <DataGridTableFoot>{footerContent()}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );

  return (
    <DataGridTableDndRowsContext.Provider value={{ activeIndex, live }}>
      <Show when={live()} fallback={gridBody()}>
        <DragDropProvider
          sensors={[PointerSensor, KeyboardSensor]}
          modifiers={props.modifiers}
          onDragStart={handleDragStart}
          onDragMove={props.onDragMove}
          onDragOver={props.onDragOver}
          onDragEnd={handleDragEnd}
        >
          {gridBody()}

          {/*
            The row you are actually holding. It is a real clone rendered
            outside the table, which is the only way a dragged row can follow
            the pointer without disturbing the grid: it adds no cell, so it
            cannot alter the column widths, and it floats above the rows rather
            than through them.

            `DragOverlay` self-portals, so unlike React's `createPortal` dance
            there is no portal target to resolve after mount.
          */}
          <DragOverlay dropAnimation={null}>
            {() => (
              <Show when={carried()}>
                {(current) => (
                  <Show when={carriedRow()}>
                    {(row) => (
                      <table
                        aria-hidden="true"
                        style={{ width: `${current().width}px`, "table-layout": "fixed" }}
                        class="bg-background border-border pointer-events-none cursor-grabbing rounded-md border shadow-lg"
                      >
                        <tbody>
                          {/*
                            Padding rides on the inner element, not the cell. A
                            `td` can never render narrower than its own
                            horizontal padding, so a column resized below that
                            would silently widen here and the clone would stop
                            matching the row it came from. Height comes from the
                            measured source row for the same reason the widths
                            do: the clone has no row of its own to inherit it
                            from.
                          */}
                          <tr
                            style={{
                              height: current().height ? `${current().height}px` : undefined,
                            }}
                            class="[&>td]:p-0 [&>td]:align-middle"
                          >
                            <For each={row().getVisibleCells()}>
                              {(cell, index) => (
                                <td
                                  // Falls back to the column's own size so an
                                  // unforeseen header/cell count mismatch
                                  // degrades to a real width rather than to
                                  // `auto`.
                                  style={{
                                    width: `${
                                      current().columns[index()] ?? cell.column.getSize()
                                    }px`,
                                  }}
                                >
                                  <div class="truncate px-3">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                </td>
                              )}
                            </For>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </Show>
                )}
              </Show>
            )}
          </DragOverlay>
        </DragDropProvider>
      </Show>
    </DataGridTableDndRowsContext.Provider>
  );
}

export type {
  DataGridTableDndRowData,
  DataGridTableDndRowDecoration,
  DataGridTableDndRowId,
  DataGridTableDndRowsCollisionDetection,
  DataGridTableDndRowsDragEndEvent,
  DataGridTableDndRowsModifiers,
  DataGridTableDndRowsProps,
};
export { DataGridTableDndRowHandle, DataGridTableDndRows };
