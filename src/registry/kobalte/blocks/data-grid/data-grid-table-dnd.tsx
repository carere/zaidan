import type { DragDropProviderProps } from "@dnd-kit/solid";
import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { isSortable, useSortable } from "@dnd-kit/solid/sortable";
import type { Cell, Header, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import { GripVertical } from "lucide-solid";
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

/**
 * What a completed reorder reports.
 *
 * `@dnd-kit/solid@0.5` is the next-generation dnd-kit architecture and does
 * not ship React v6's `DragEndEvent` (`{ active, over }`); its own event
 * carries a drag *operation* rather than two entities. Rather than leaking a
 * library shape that has no stable public type, the grid reports the two
 * things a reorder needs, resolved against the table's current
 * `columnOrder` - which is exactly what the upstream handlers computed by hand
 * with `columnOrder.indexOf(active.id)`.
 */
type DataGridTableDndDragEndEvent = {
  /** Column id that was picked up. */
  activeId: string;
  /** Column id it was dropped on, or null when the drop had no target. */
  overId: string | null;
  /** Position of `activeId` in the current column order, or -1. */
  activeIndex: number;
  /** Position `activeId` should move to, or -1. */
  overIndex: number;
  /** True when the gesture was aborted (Escape, pointer cancel). */
  canceled: boolean;
};

type DataGridTableDndDragStartHandler = NonNullable<DragDropProviderProps["onDragStart"]>;
type DataGridTableDndDragEndHandler = NonNullable<DragDropProviderProps["onDragEnd"]>;

type DataGridTableDndContextValue = {
  draggingColumnId: () => string | null;
  live: () => boolean;
};

const DataGridTableDndContext = createContext<DataGridTableDndContextValue>({
  draggingColumnId: () => null,
  live: () => false,
});

/**
 * Style applied to the header cell and to every body cell of the column being
 * carried.
 *
 * Upstream reaches this by registering *every cell* as its own `useSortable`
 * under the dragged column's id, so dnd-kit stamps the same
 * `CSS.Translate` transform on the whole column. The next-generation manager
 * keys its registry on unique ids, so thousands of duplicate registrations are
 * not available here; the header cell alone is the sortable, and the body
 * cells mirror its dragging *state* rather than its transform.
 */
function getDataGridTableDndCellStyle(isDragging: boolean, width: string): JSX.CSSProperties {
  return {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    cursor: isDragging ? "grabbing" : undefined,
    "white-space": "nowrap",
    width,
    "z-index": isDragging ? 1 : 0,
  };
}

function DataGridTableDndHeaderContent<TData extends object>(props: {
  header: Header<DataGridFeatures, TData, unknown>;
  handleRef?: (element: Element | undefined) => void;
  isDragging: boolean;
}) {
  const grid = useDataGrid<TData>();
  const column = () => props.header.column;

  // Check if column ordering is enabled for this column
  const canOrder = () =>
    (column().columnDef as { enableColumnOrdering?: boolean }).enableColumnOrdering !== false;

  return (
    <div class="flex items-center justify-start gap-0.5">
      <Show when={canOrder()}>
        <Button
          ref={(element: HTMLButtonElement) => props.handleRef?.(element)}
          size="icon-sm"
          variant="ghost"
          class={`-ms-2 size-6 ${
            props.isDragging ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
          }`}
          aria-label="Drag to reorder"
        >
          <GripVertical class="opacity-60 hover:opacity-100" aria-hidden="true" />
        </Button>
      </Show>
      <div class="grow">
        {props.header.isPlaceholder
          ? null
          : flexRender(props.header.column.columnDef.header, props.header.getContext())}
      </div>
      <Show when={grid.props.tableLayout?.columnsResizable && column().getCanResize()}>
        <DataGridTableHeadRowCellResize header={props.header} />
      </Show>
    </div>
  );
}

function DataGridTableDndHeaderSortable<TData extends object>(props: {
  header: Header<DataGridFeatures, TData, unknown>;
  index: number;
}) {
  const grid = useDataGrid<TData>();

  const sortable = useSortable({
    get id() {
      return props.header.column.id;
    },
    get index() {
      return props.index;
    },
  });

  const width = () =>
    grid.props.tableLayout?.columnsResizable
      ? `calc(var(--header-${props.header.id}-size) * 1px)`
      : `${props.header.column.getSize()}px`;

  return (
    <DataGridTableHeadRowCell
      header={props.header}
      dndStyle={getDataGridTableDndCellStyle(sortable.isDragging(), width())}
      dndRef={(element) => sortable.ref(element)}
    >
      <DataGridTableDndHeaderContent
        header={props.header}
        handleRef={(element) => sortable.handleRef(element)}
        isDragging={sortable.isDragging()}
      />
    </DataGridTableHeadRowCell>
  );
}

function DataGridTableDndHeader<TData extends object>(props: {
  header: Header<DataGridFeatures, TData, unknown>;
  index: number;
}) {
  const dnd = useContext(DataGridTableDndContext);
  const grid = useDataGrid<TData>();

  const width = () =>
    grid.props.tableLayout?.columnsResizable
      ? `calc(var(--header-${props.header.id}-size) * 1px)`
      : `${props.header.column.getSize()}px`;

  return (
    <Show
      when={dnd.live()}
      fallback={
        <DataGridTableHeadRowCell
          header={props.header}
          dndStyle={getDataGridTableDndCellStyle(false, width())}
        >
          <DataGridTableDndHeaderContent header={props.header} isDragging={false} />
        </DataGridTableHeadRowCell>
      }
    >
      <DataGridTableDndHeaderSortable header={props.header} index={props.index} />
    </Show>
  );
}

function DataGridTableDndCell<TData extends object>(props: {
  cell: Cell<DataGridFeatures, TData, unknown>;
}) {
  const grid = useDataGrid<TData>();
  const dnd = useContext(DataGridTableDndContext);
  const isDragging = () => dnd.draggingColumnId() === props.cell.column.id;

  const width = () =>
    grid.props.tableLayout?.columnsResizable
      ? `calc(var(--col-${props.cell.column.id}-size) * 1px)`
      : `${props.cell.column.getSize()}px`;

  return (
    <DataGridTableBodyRowCell
      cell={props.cell}
      dndStyle={getDataGridTableDndCellStyle(isDragging(), width())}
    >
      {flexRender(props.cell.column.columnDef.cell, props.cell.getContext())}
    </DataGridTableBodyRowCell>
  );
}

/**
 * Body rows.
 *
 * Upstream memoizes this to skip React re-renders during an active column
 * resize; column widths already travel through CSS variables on the `<table>`,
 * and Solid updates only what changed, so the memo has no counterpart here.
 */
function DataGridTableDndBodyRows<TData extends object>(props: {
  table: DataGridTableInstance<TData>;
}) {
  const grid = useDataGrid<TData>();
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
            <>
              <DataGridTableBodyRow row={row}>
                <For each={row.getVisibleCells()}>
                  {(cell) => <DataGridTableDndCell cell={cell} />}
                </For>
                <DataGridTableFillBodyCell />
              </DataGridTableBodyRow>
              <Show when={row.getIsExpanded()}>
                <DataGridTableBodyRowExpandded row={row} />
              </Show>
            </>
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

function DataGridTableDnd<TData extends object>(props: {
  handleDragEnd: (event: DataGridTableDndDragEndEvent) => void;
  footerContent?: JSX.Element;
}) {
  const grid = useDataGrid<TData>();
  const [draggingColumnId, setDraggingColumnId] = createSignal<string | null>(null);
  // `@dnd-kit/solid` is browser-only: the server renders the same markup
  // without the drag-and-drop manager, and the provider mounts client-side.
  const [live, setLive] = createSignal(false);
  onMount(() => setLive(true));

  // Resolve once: the footer is JSX handed in as a prop, and testing it for
  // presence must not build it a second time.
  const footerContent = children(() => props.footerContent);

  // TanStack's columnOrder defaults to [] until a consumer seeds it; fall back
  // to the definition order so the reported indices are still usable.
  const columnOrder = () => {
    const state = grid.table.store.state.columnOrder;
    return state.length > 0 ? state : grid.table.getAllLeafColumns().map((column) => column.id);
  };
  // dnd-kit needs the index a header occupies in the rendered row, which is
  // the visible leaf order - `columnOrder` may still list hidden columns.
  const visibleColumnIds = () => grid.table.getVisibleLeafColumns().map((column) => column.id);

  const mergedHeaderGroups = createMemo(() => grid.table.getHeaderGroups());

  createEffect(() => {
    if (!draggingColumnId()) return;

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

  const handleDragStart: DataGridTableDndDragStartHandler = (event) => {
    const source = event.operation.source;
    setDraggingColumnId(source && source.id !== undefined ? String(source.id) : null);
  };

  const handleDragEnd: DataGridTableDndDragEndHandler = (event) => {
    const source = event.operation.source;
    const target = event.operation.target;
    const activeId = source && source.id !== undefined ? String(source.id) : null;
    const overId = target && target.id !== undefined ? String(target.id) : null;

    setDraggingColumnId(null);

    if (!activeId) return;

    const order = columnOrder();

    props.handleDragEnd({
      activeId,
      overId,
      activeIndex: order.indexOf(activeId),
      overIndex: overId !== null ? order.indexOf(overId) : -1,
      canceled: event.canceled || !isSortable(source as never),
    });
  };

  // A function, not a stored element: flipping `live` re-creates this subtree
  // so the headers' `useSortable` calls resolve the manager from an owner that
  // actually has the provider above it. Same trade-off the `sortable` block
  // makes, and the reason the flip happens once, in `onMount`.
  const gridBody = () => (
    <DataGridTableViewport
      class={draggingColumnId() ? "relative cursor-grabbing [&_*]:cursor-grabbing!" : "relative"}
    >
      <DataGridTableBase>
        <DataGridTableHead>
          <For each={mergedHeaderGroups()}>
            {(headerGroup) => (
              <DataGridTableHeadRow rowId={headerGroup.id}>
                <For each={headerGroup.headers}>
                  {(header) => (
                    <DataGridTableDndHeader
                      header={header as Header<DataGridFeatures, TData, unknown>}
                      index={visibleColumnIds().indexOf(header.column.id)}
                    />
                  )}
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
          <DataGridTableDndBodyRows table={grid.table} />
        </DataGridTableBody>

        <Show when={footerContent()}>
          <DataGridTableFoot>{footerContent()}</DataGridTableFoot>
        </Show>
      </DataGridTableBase>
    </DataGridTableViewport>
  );

  return (
    <DataGridTableDndContext.Provider value={{ draggingColumnId, live }}>
      <Show when={live()} fallback={gridBody()}>
        <DragDropProvider
          sensors={[PointerSensor, KeyboardSensor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {gridBody()}
        </DragDropProvider>
      </Show>
    </DataGridTableDndContext.Provider>
  );
}

export type { DataGridTableDndDragEndEvent };
export { DataGridTableDnd };
