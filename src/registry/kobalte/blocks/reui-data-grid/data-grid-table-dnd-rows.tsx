import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { useSortable } from "@dnd-kit/solid/sortable";
import type { Cell, Row } from "@tanstack/solid-table";
import { flexRender } from "@tanstack/solid-table";
import { GripHorizontalIcon } from "lucide-solid";
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

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";

import { useDataGrid } from "./data-grid";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
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

// Context to share sortable handle ref from row to handle
type SortableRowContextValue = {
  setHandleRef: (el: Element | undefined) => void;
  isDragging: () => boolean;
};

const SortableRowContext = createContext<SortableRowContextValue | null>(null);

function DataGridTableDndRowHandle(props: { class?: string }) {
  const context = useContext(SortableRowContext);

  return (
    <Show
      when={context}
      fallback={
        <Button
          variant="ghost"
          size="icon-sm"
          class={cn(
            "size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing",
            props.class,
          )}
          disabled
        >
          <GripHorizontalIcon />
        </Button>
      }
    >
      <Button
        variant="ghost"
        size="icon-sm"
        ref={(el: HTMLButtonElement | undefined) => context?.setHandleRef(el)}
        class={cn(
          "size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing",
          props.class,
        )}
      >
        <GripHorizontalIcon />
      </Button>
    </Show>
  );
}

type DragEndPayload = { activeId: string; overId: string | null; canceled: boolean };

// Reactive sortable internal context: gives each row its index in the current list.
type SortableInternalContextValue = {
  indexOf: (id: string) => number;
};

const SortableInternalContext = createContext<SortableInternalContextValue>({
  indexOf: () => -1,
});

function DataGridTableDndRow<TData>(props: { row: Row<TData> }) {
  const internal = useContext(SortableInternalContext);
  const sortable = useSortable({
    get id() {
      return props.row.id;
    },
    get index() {
      const idx = internal.indexOf(props.row.id);
      return idx === -1 ? 0 : idx;
    },
  });

  const style = (): JSX.CSSProperties => ({
    opacity: sortable.isDragging() ? 0.8 : 1,
    "z-index": sortable.isDragging() ? 1 : 0,
    position: "relative",
    cursor: sortable.isDragging() ? "grabbing" : undefined,
  });

  const itemContextValue: SortableRowContextValue = {
    setHandleRef: (el) => sortable.handleRef(el),
    isDragging: () => sortable.isDragging(),
  };

  return (
    <SortableRowContext.Provider value={itemContextValue}>
      <DataGridTableBodyRow
        row={props.row}
        dndRef={sortable.ref as unknown as (el: HTMLTableRowElement | null) => void}
        dndStyle={style()}
      >
        <For each={props.row.getVisibleCells()}>
          {(cell: Cell<TData, unknown>) => (
            <DataGridTableBodyRowCell cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          )}
        </For>
      </DataGridTableBodyRow>
    </SortableRowContext.Provider>
  );
}

function DataGridTableDndRows<TData>(props: {
  handleDragEnd: (event: DragEndPayload) => void;
  dataIds: (string | number)[];
  footerContent?: JSX.Element;
}) {
  const ctx = useDataGrid();
  const pagination = () => ctx.table.getState().pagination;

  // Ref captured for potential future use (e.g. drag bounds), kept for parity with source.
  const setTableContainerRef = (_el: HTMLDivElement | null) => {
    // intentionally unused — bounds restriction is handled by @dnd-kit/solid auto-detection
  };
  const [isDraggingRow, setIsDraggingRow] = createSignal(false);

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

  const internalCtx: SortableInternalContextValue = {
    indexOf: (id) => {
      const ids = props.dataIds.map((v) => String(v));
      return ids.indexOf(id);
    },
  };

  const handleDragStart = () => setIsDraggingRow(true);
  const handleDragEnd = (event: {
    canceled: boolean;
    operation: {
      source: { id: unknown } | null;
      target: { id: unknown } | null;
    };
  }) => {
    setIsDraggingRow(false);
    const sourceId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    props.handleDragEnd({
      activeId: sourceId !== undefined ? String(sourceId) : "",
      overId: targetId !== undefined ? String(targetId) : null,
      canceled: event.canceled,
    });
  };

  return (
    <SortableInternalContext.Provider value={internalCtx}>
      <DragDropProvider
        sensors={[PointerSensor, KeyboardSensor]}
        onDragStart={handleDragStart as never}
        onDragEnd={handleDragEnd as never}
      >
        <DataGridTableViewport
          viewportRef={setTableContainerRef}
          class={isDraggingRow() ? "relative cursor-grabbing [&_*]:cursor-grabbing!" : "relative"}
        >
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
                              ctx.props.tableLayout?.columnsResizable &&
                              header.column.getCanResize()
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
                    {(row) => <DataGridTableDndRow row={row as unknown as Row<TData>} />}
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
    </SortableInternalContext.Provider>
  );
}

export { DataGridTableDndRowHandle, DataGridTableDndRows };
