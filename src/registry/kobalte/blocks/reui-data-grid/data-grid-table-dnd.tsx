import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { useSortable } from "@dnd-kit/solid/sortable";
import type { Cell, Header, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import { GripVerticalIcon } from "lucide-solid";
import {
  createContext,
  createEffect,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
  useContext,
} from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";

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
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
  DataGridTableViewport,
} from "./data-grid-table";

type DragEndPayload = { activeId: string; overId: string | null; canceled: boolean };

type ColumnSortableInternalContextValue = {
  indexOf: (id: string) => number;
};

const ColumnSortableInternalContext = createContext<ColumnSortableInternalContextValue>({
  indexOf: () => -1,
});

function DataGridTableDndHeader<TData>(props: { header: Header<TData, unknown> }) {
  const ctx = useDataGrid();
  const column = () => props.header.column;

  // Check if column ordering is enabled for this column
  const canOrder = () =>
    (column().columnDef as { enableColumnOrdering?: boolean }).enableColumnOrdering !== false;

  const internal = useContext(ColumnSortableInternalContext);
  const sortable = useSortable({
    get id() {
      return props.header.column.id;
    },
    get index() {
      const idx = internal.indexOf(props.header.column.id);
      return idx === -1 ? 0 : idx;
    },
  });

  const style = (): JSX.CSSProperties => ({
    opacity: sortable.isDragging() ? 0.8 : 1,
    position: "relative",
    cursor: sortable.isDragging() ? "grabbing" : undefined,
    "white-space": "nowrap",
    width: ctx.props.tableLayout?.columnsResizable
      ? `calc(var(--header-${props.header.id}-size) * 1px)`
      : `${props.header.column.getSize()}px`,
    "z-index": sortable.isDragging() ? 1 : 0,
  });

  return (
    <DataGridTableHeadRowCell
      header={props.header}
      dndStyle={style()}
      dndRef={sortable.ref as unknown as (el: HTMLTableCellElement | null) => void}
    >
      <div class="flex items-center justify-start gap-0.5">
        <Show when={canOrder()}>
          <Button
            size="icon-sm"
            variant="ghost"
            ref={(el: HTMLButtonElement | undefined) => sortable.handleRef(el)}
            class={`-ms-2 size-6 ${sortable.isDragging() ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon class="opacity-60 hover:opacity-100" aria-hidden="true" />
          </Button>
        </Show>
        <span class="grow truncate">
          <Show when={!props.header.isPlaceholder} fallback={null}>
            {flexRender(props.header.column.columnDef.header, props.header.getContext())}
          </Show>
        </span>
        <Show when={ctx.props.tableLayout?.columnsResizable && column().getCanResize()}>
          <DataGridTableHeadRowCellResize header={props.header} />
        </Show>
      </div>
    </DataGridTableHeadRowCell>
  );
}

function DataGridTableDndCell<TData>(props: { cell: Cell<TData, unknown> }) {
  const ctx = useDataGrid();
  const internal = useContext(ColumnSortableInternalContext);
  const sortable = useSortable({
    get id() {
      return props.cell.column.id;
    },
    get index() {
      const idx = internal.indexOf(props.cell.column.id);
      return idx === -1 ? 0 : idx;
    },
  });

  const style = (): JSX.CSSProperties => ({
    opacity: sortable.isDragging() ? 0.8 : 1,
    position: "relative",
    cursor: sortable.isDragging() ? "grabbing" : undefined,
    width: ctx.props.tableLayout?.columnsResizable
      ? `calc(var(--col-${props.cell.column.id}-size) * 1px)`
      : `${props.cell.column.getSize()}px`,
    "z-index": sortable.isDragging() ? 1 : 0,
  });

  return (
    <DataGridTableBodyRowCell
      cell={props.cell}
      dndStyle={style()}
      dndRef={sortable.ref as unknown as (el: HTMLTableCellElement | null) => void}
    >
      {flexRender(props.cell.column.columnDef.cell, props.cell.getContext())}
    </DataGridTableBodyRowCell>
  );
}

function DataGridTableDnd<TData>(props: {
  handleDragEnd: (event: DragEndPayload) => void;
  footerContent?: JSX.Element;
}) {
  const ctx = useDataGrid();
  const pagination = () => ctx.table.getState().pagination;

  // Ref captured for potential future use (e.g. drag bounds), kept for parity with source.
  const setContainerRef = (_el: HTMLDivElement | null) => {
    // intentionally unused — bounds restriction handled by @dnd-kit/solid auto-detection
  };
  const [isDraggingColumn, setIsDraggingColumn] = createSignal(false);

  createEffect(() => {
    if (!isDraggingColumn()) return;
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

  const internalCtx: ColumnSortableInternalContextValue = {
    indexOf: (id) => ctx.table.getState().columnOrder.indexOf(id),
  };

  const handleDragStart = () => setIsDraggingColumn(true);
  const handleDragEnd = (event: {
    canceled: boolean;
    operation: {
      source: { id: unknown } | null;
      target: { id: unknown } | null;
    };
  }) => {
    setIsDraggingColumn(false);
    const sourceId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    props.handleDragEnd({
      activeId: sourceId !== undefined ? String(sourceId) : "",
      overId: targetId !== undefined ? String(targetId) : null,
      canceled: event.canceled,
    });
  };

  return (
    <ColumnSortableInternalContext.Provider value={internalCtx}>
      <DragDropProvider
        sensors={[PointerSensor, KeyboardSensor]}
        onDragStart={handleDragStart as never}
        onDragEnd={handleDragEnd as never}
      >
        <DataGridTableViewport
          viewportRef={setContainerRef}
          class={
            isDraggingColumn() ? "relative cursor-grabbing [&_*]:cursor-grabbing!" : "relative"
          }
        >
          <DataGridTableBase>
            <DataGridTableHead>
              <For each={ctx.table.getHeaderGroups()}>
                {(headerGroup) => (
                  <DataGridTableHeadRow headerGroup={headerGroup}>
                    <For each={headerGroup.headers}>
                      {(header) => <DataGridTableDndHeader header={header} />}
                    </For>
                  </DataGridTableHeadRow>
                )}
              </For>
            </DataGridTableHead>

            <Show when={ctx.props.tableLayout?.stripped || !ctx.props.tableLayout?.rowBorder}>
              <DataGridTableRowSpacer />
            </Show>

            <DataGridTableBody>
              <Show
                when={
                  !(ctx.props.loadingMode === "skeleton" && ctx.isLoading && pagination()?.pageSize)
                }
                fallback={
                  <For each={Array.from({ length: pagination().pageSize })}>
                    {() => (
                      <DataGridTableBodyRowSkeleton>
                        <For each={ctx.table.getVisibleFlatColumns()}>
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
                <Show when={ctx.table.getRowModel().rows.length} fallback={<DataGridTableEmpty />}>
                  <For each={ctx.table.getRowModel().rows}>
                    {(rowRaw) => {
                      const row = rowRaw as unknown as Row<TData>;
                      return (
                        <>
                          <DataGridTableBodyRow row={row}>
                            <For each={row.getVisibleCells()}>
                              {(cell: Cell<TData, unknown>) => <DataGridTableDndCell cell={cell} />}
                            </For>
                          </DataGridTableBodyRow>
                          <Show when={row.getIsExpanded()}>
                            <DataGridTableBodyRowExpandded row={row} />
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </Show>
              </Show>
            </DataGridTableBody>

            <Show when={props.footerContent}>
              <DataGridTableFoot>{props.footerContent}</DataGridTableFoot>
            </Show>
          </DataGridTableBase>
        </DataGridTableViewport>
      </DragDropProvider>
    </ColumnSortableInternalContext.Provider>
  );
}

export { DataGridTableDnd };
