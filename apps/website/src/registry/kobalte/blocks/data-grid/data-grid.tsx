import type {
  Column,
  ColumnFiltersState,
  RowData,
  SolidTable,
  SortingState,
  Table,
  TableFeatures,
} from "@tanstack/solid-table";
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  metaHelper,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import { createContext, createEffect, createMemo, mergeProps, useContext } from "solid-js";

import { cn } from "@/lib/utils";

/**
 * Per-column extras the grid reads off `columnDef.meta`.
 *
 * TanStack v9 resolves this through the `columnMeta` slot on the feature
 * bundle below instead of a global `declare module` augmentation, so
 * installing the data grid no longer widens `ColumnMeta` for every other
 * table in the consuming app.
 */
export interface DataGridColumnMeta<TData> {
  headerTitle?: string;
  headerClassName?: string;
  cellClassName?: string;
  /**
   * Placeholder cell content while `isLoading` with `loadingMode="skeleton"`.
   *
   * A function, not a node: the grid renders one skeleton row per page size,
   * and a Solid `JSX.Element` is a live DOM node that would be *moved* into
   * each row rather than duplicated, leaving every row but the last empty.
   */
  skeleton?: () => JSX.Element;
  expandedContent?: (row: TData) => JSX.Element;
  autoSize?: boolean;
}

/**
 * The batteries-included feature bundle every data-grid example builds on. v9
 * requires each table to declare its features up front, and the grid's render
 * path needs the ones registered here: `columnVisibilityFeature` alone gates
 * `row.getVisibleCells()`, so even a grid that never hides a column needs it to
 * render at all.
 *
 * Pass it straight through for the full grid:
 *
 * ```tsx
 * const table = createTable({ features: dataGridFeatures, columns, get data() { return data() } });
 * ```
 *
 * Extend it when a grid needs more, keeping each prerequisite feature ahead of
 * the slot that depends on it:
 *
 * ```tsx
 * const features = tableFeatures({
 *   ...dataGridFeatures,
 *   columnGroupingFeature,
 *   groupedRowModel: createGroupedRowModel(),
 * });
 * ```
 *
 * Or drop it entirely and hand `<DataGrid>` a leaner table - the components
 * accept any bundle, so you keep full ownership of the TanStack core.
 */
export const dataGridFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  // columnResizingFeature requires columnSizingFeature, declared above.
  columnResizingFeature,
  columnFilteringFeature,
  // Powers DataGridColumnFilter's column.getFacetedUniqueValues(). On v8 an
  // unregistered facet silently returned an empty map; on v9 the method would
  // not exist at all, so the faceted row models below are required, not
  // optional.
  columnFacetingFeature,
  // globalFilteringFeature requires columnFilteringFeature, declared above.
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  rowPinningFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  // Only the built-ins the registry names by string. v9 resolves string
  // sortFn names against this map alone, and registering them one by one
  // keeps every other built-in out of the bundle.
  sortFns: { basic: sortFn_basic, text: sortFn_text },
  // biome-ignore lint/suspicious/noExplicitAny: type-only slot, shared by every row shape.
  columnMeta: metaHelper<DataGridColumnMeta<any>>(),
});

/** The feature set `dataGridFeatures` registers. */
export type DataGridFeatures = typeof dataGridFeatures;

/**
 * The grid's internal view of the table.
 *
 * `TFeatures` is invariant in v9 and an unresolved generic one collapses to a
 * union that includes the bare core arm, so no generic signature can call
 * `getVisibleCells()`, `getStartVisibleLeafColumns()` and friends. The public
 * components stay generic so consumers can pass any bundle they like; the
 * table is widened to this concrete type exactly once, on the way into
 * context, and every internal component reads it from there.
 */
export type DataGridTableInstance<TData extends object> = SolidTable<DataGridFeatures, TData>;

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export function getColumnHeaderLabel<TData extends RowData, TValue>(
  column: Column<DataGridFeatures, TData, TValue>,
): string {
  const meta = column.columnDef.meta as { headerTitle?: string } | undefined;
  if (typeof meta?.headerTitle === "string") return meta.headerTitle;
  const defHeader = column.columnDef.header;
  if (typeof defHeader === "string") return defHeader;
  return String(column.id);
}

export type DataGridApiFetchParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  filters?: ColumnFiltersState;
  searchQuery?: string;
};

export type DataGridApiResponse<T> = {
  data: T[];
  empty: boolean;
  pagination: {
    total: number;
    page: number;
  };
};

/**
 * Everything `<DataGrid>` accepts except the two props the provider consumes
 * itself. Kept feature-agnostic: layout and messaging never depend on which
 * TanStack features the consumer registered.
 */
export type DataGridLayoutProps<TData extends object> = Omit<
  DataGridProps<TableFeatures, TData>,
  "table" | "children"
>;

export interface DataGridContextProps<TData extends object> {
  props: DataGridLayoutProps<TData>;
  table: DataGridTableInstance<TData>;
  recordCount: number;
  isLoading: boolean;
  /**
   * Internal coordinator for `meta.autoSize` columns. Lives at the core level
   * so every table variant and viewport instance shares one application state.
   */
  autoSize?: DataGridAutoSizeController;
}

export type DataGridAutoSizeController = {
  /**
   * Grows the first visible `meta.autoSize` column by the given free space.
   * Applies at most once per column id; safe to call from every viewport
   * measurement. Returns true when a sizing update was dispatched.
   */
  apply: (fillWidth: number) => boolean;
};

function createDataGridAutoSizeController<TData extends object>(
  /**
   * A getter, not the table itself, so a table swapped in later is still the
   * one this coordinator writes to. v9 reads state off `table.store.state`,
   * which the Solid adapter backs with signals - the instance is stable, but
   * the state it reports is not, and the applied-once bookkeeping below has to
   * observe the live values.
   */
  getTable: () => DataGridTableInstance<TData>,
): DataGridAutoSizeController {
  let applied: { columnId: string; base: number; grown: number } | null = null;

  return {
    apply(fillWidth: number) {
      const table = getTable();
      const columnSizing = table.store.state.columnSizing;

      // Re-arm after reset flows (double-click resetSize, resetColumnSizing,
      // controlled state replacement) so the column re-fills instead of
      // leaving a dead blank strip.
      if (applied && columnSizing[applied.columnId] === undefined) {
        applied = null;
      }

      if (fillWidth <= 0) return false;

      const autoSizeColumn = table
        .getVisibleLeafColumns()
        .find((column) => column.columnDef.meta?.autoSize && column.getCanResize());

      if (!autoSizeColumn || applied?.columnId === autoSizeColumn.id) {
        return false;
      }

      // A width this coordinator did not write belongs to someone else -
      // almost always the user, who just dragged the column's resize handle.
      // Filling over it is what made a `meta.autoSize` column look
      // un-resizable: the drag committed, the next viewport measurement
      // stamped the fill back on top, and the column snapped to its old width.
      //
      // Deliberately keyed on observed state rather than on `applied`, which
      // is per-coordinator memory: anything that rebuilds the coordinator
      // (a remount, a new table store) forgets what it did, and the guard has
      // to survive that. An explicit reset clears the entry and re-arms the
      // fill, which is what makes double-click-to-reset still work.
      const currentSize = columnSizing[autoSizeColumn.id];
      if (currentSize !== undefined && currentSize !== applied?.grown) {
        return false;
      }

      // Candidate switched (e.g. the grown column was hidden and another
      // meta.autoSize column took over): revert the previous growth if the
      // user hasn't manually resized that column since, so visibility
      // toggles cannot ratchet the table wider than its container forever.
      const revert = applied && columnSizing[applied.columnId] === applied.grown ? applied : null;
      const base = columnSizing[autoSizeColumn.id] ?? autoSizeColumn.getSize();
      const grown = base + fillWidth;

      applied = { columnId: autoSizeColumn.id, base, grown };
      table.setColumnSizing((old) => {
        const next = { ...old, [autoSizeColumn.id]: grown };
        if (revert && next[revert.columnId] === revert.grown) {
          next[revert.columnId] = revert.base;
        }
        return next;
      });

      return true;
    },
  };
}

export type DataGridRequestParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
};

export interface DataGridProps<TFeatures extends TableFeatures, TData extends object> {
  class?: string;
  table?: Table<TFeatures, TData>;
  recordCount: number;
  children?: JSX.Element;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingMode?: "skeleton" | "spinner";
  loadingMessage?: JSX.Element;
  fetchingMoreMessage?: JSX.Element;
  allRowsLoadedMessage?: JSX.Element;
  emptyMessage?: JSX.Element;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
    footerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    width?: "auto" | "fixed";
    columnsVisibility?: boolean;
    columnsResizable?: boolean;
    columnsResizeMode?: "onChange" | "onEnd";
    columnsPinnable?: boolean;
    columnsMovable?: boolean;
    columnsDraggable?: boolean;
    rowsDraggable?: boolean;
    rowsPinnable?: boolean;
  };
  tableClassNames?: {
    base?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
    body?: string;
    bodyRow?: string;
    footer?: string;
    edgeCell?: string;
  };
}

const dataGridDefaultTableLayout = {
  dense: false,
  cellBorder: false,
  rowBorder: true,
  rowRounded: false,
  stripped: false,
  headerSticky: false,
  headerBackground: false,
  footerBackground: false,
  headerBorder: true,
  width: "fixed",
  columnsVisibility: false,
  columnsResizable: false,
  // columnsResizeMode has no default on purpose: when unset, the consumer's
  // tanstack columnResizeMode (default "onEnd") is honored.
  columnsPinnable: false,
  columnsMovable: false,
  columnsDraggable: false,
  rowsDraggable: false,
  rowsPinnable: false,
} satisfies DataGridProps<TableFeatures, object>["tableLayout"];

const dataGridDefaultTableClassNames = {
  base: "",
  header: "",
  headerRow: "",
  // z-40 keeps the sticky header above pinned body cells (zIndex 30 in
  // getPinningStyles), which would otherwise paint over it while scrolling
  // vertically with columnsPinnable enabled.
  headerSticky: "sticky top-0 z-40 bg-background/90 backdrop-blur-xs",
  body: "",
  bodyRow: "",
  footer: "",
  edgeCell: "",
} satisfies DataGridProps<TableFeatures, object>["tableClassNames"];

const DataGridContext = createContext<
  // biome-ignore lint/suspicious/noExplicitAny: one context serves every row shape; TData is restored per consumer.
  DataGridContextProps<any> | undefined
>(undefined);

/**
 * Reads the grid context. Pass `TData` from the calling component when the
 * table, a row or a cell is handed on to something typed against that row
 * shape: v9 declares `TData` invariant, so the default `any` no longer
 * unifies with a concrete row type the way it did on v8.
 *
 * Every member is a live getter, so never destructure the result - read
 * `grid.props`, `grid.table`, `grid.isLoading` at the point of use and Solid's
 * fine-grained tracking does the rest. That is what replaces the upstream
 * React selector/memo bookkeeping wholesale.
 */
function useDataGrid<
  // biome-ignore lint/suspicious/noExplicitAny: mirrors the context's erased row shape.
  TData extends object = any,
>(): DataGridContextProps<TData> {
  const context = useContext(DataGridContext) as DataGridContextProps<TData> | undefined;
  if (!context) {
    throw new Error("useDataGrid must be used within a DataGridProvider");
  }
  return context;
}

function DataGridProvider<TData extends object>(
  props: DataGridLayoutProps<TData> & {
    table: DataGridTableInstance<TData>;
    children?: JSX.Element;
  },
) {
  // Re-assert an explicit tableLayout resize mode so consumer-level table
  // options cannot flip it back between drags. v9 makes `table.options`
  // readonly, so this goes through setOptions in an effect. Without an
  // explicit mode, the consumer's own tanstack columnResizeMode (default
  // "onEnd") is honored.
  const resizeMode = () =>
    props.tableLayout?.columnsResizable && props.tableLayout.columnsResizeMode
      ? props.tableLayout.columnsResizeMode
      : undefined;

  createEffect(() => {
    const mode = resizeMode();
    if (!mode) return;
    const table = props.table;
    if (table.options.columnResizeMode === mode) return;
    table.setOptions((old) => ({ ...old, columnResizeMode: mode }));
  });

  // One autoSize coordinator per table instance so split header/body viewports
  // cannot apply the growth twice, and so a table swapped in later starts with
  // fresh applied-once bookkeeping.
  const autoSize = createMemo(() => {
    const table = props.table;
    return createDataGridAutoSizeController<TData>(() => table);
  });

  const value: DataGridContextProps<TData> = {
    get props() {
      return props;
    },
    get table() {
      return props.table;
    },
    get recordCount() {
      return props.recordCount;
    },
    get isLoading() {
      return props.isLoading || false;
    },
    get autoSize() {
      return autoSize();
    },
  };

  return <DataGridContext.Provider value={value}>{props.children}</DataGridContext.Provider>;
}

function DataGrid<TFeatures extends TableFeatures, TData extends object>(
  props: DataGridProps<TFeatures, TData>,
) {
  const tableLayout = createMemo(() => ({
    ...dataGridDefaultTableLayout,
    ...props.tableLayout,
  }));
  const tableClassNames = createMemo(() => ({
    ...dataGridDefaultTableClassNames,
    ...props.tableClassNames,
  }));

  const mergedProps = mergeProps({ loadingMode: "skeleton" as const }, props, {
    get tableLayout() {
      return tableLayout();
    },
    get tableClassNames() {
      return tableClassNames();
    },
  });

  // Ensure table is provided
  if (!props.table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  // The single widening point. Consumers own the TanStack core and may hand
  // over any feature bundle; internals need a concrete one to resolve the
  // feature-gated APIs they call, and v9's invariant TFeatures rules out
  // expressing that with a generic constraint.
  const internalProps = mergedProps as unknown as DataGridLayoutProps<TData>;

  return (
    <DataGridProvider
      {...internalProps}
      table={props.table as unknown as DataGridTableInstance<TData>}
    >
      {props.children}
    </DataGridProvider>
  );
}

function DataGridContainer(props: {
  children: JSX.Element;
  class?: string;
  /** Accepted for backwards compatibility; currently has no effect. */
  border?: boolean;
}) {
  return (
    <div data-slot="data-grid" class={cn("w-full overflow-hidden", props.class)}>
      {props.children}
    </div>
  );
}

export { DataGrid, DataGridContainer, DataGridProvider, useDataGrid };
