import type {
  Column,
  ColumnFiltersState,
  RowData,
  SortingState,
  Table,
} from "@tanstack/solid-table";
import {
  type Accessor,
  createContext,
  type JSX,
  mergeProps,
  type ParentProps,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";

declare module "@tanstack/solid-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerTitle?: string;
    headerClassName?: string;
    cellClassName?: string;
    skeleton?: JSX.Element;
    expandedContent?: (row: TData) => JSX.Element;
    // Reference TValue so biome considers it used (the module augmentation requires it for type compatibility)
    __reuiDataGridValueMarker?: TValue;
  }
}

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export function getColumnHeaderLabel<TData, TValue>(column: Column<TData, TValue>): string {
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

export interface DataGridContextProps<TData extends object> {
  props: DataGridProps<TData>;
  table: Table<TData>;
  recordCount: number;
  isLoading: boolean;
}

export type DataGridRequestParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
};

export interface DataGridProps<TData extends object> {
  class?: string;
  table?: Table<TData>;
  recordCount: number;
  children?: JSX.Element;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingMode?: "skeleton" | "spinner";
  loadingMessage?: JSX.Element | string;
  fetchingMoreMessage?: JSX.Element | string;
  allRowsLoadedMessage?: JSX.Element | string;
  emptyMessage?: JSX.Element | string;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
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

const DataGridContext = createContext<
  // biome-ignore lint/suspicious/noExplicitAny: context value is generic across all TData
  Accessor<DataGridContextProps<any> | undefined>
>(() => undefined);

function useDataGrid<TData extends object = object>(): DataGridContextProps<TData> {
  const context = useContext(DataGridContext)();
  if (!context) {
    throw new Error("useDataGrid must be used within a DataGridProvider");
  }
  return context as DataGridContextProps<TData>;
}

function DataGridProvider<TData extends object>(
  props: DataGridProps<TData> & { table: Table<TData>; children?: JSX.Element },
) {
  // Keep resize mode aligned with the DataGrid contract reactively so
  // consumer-level table options cannot flip it back between drags.
  const value: Accessor<DataGridContextProps<TData>> = () => {
    const resolvedColumnsResizeMode = props.tableLayout?.columnsResizeMode ?? "onEnd";
    if (props.tableLayout?.columnsResizable) {
      props.table.options.columnResizeMode = resolvedColumnsResizeMode;
    }
    return {
      props,
      table: props.table,
      recordCount: props.recordCount,
      isLoading: props.isLoading || false,
    };
  };

  return <DataGridContext.Provider value={value}>{props.children}</DataGridContext.Provider>;
}

function DataGrid<TData extends object>(props: DataGridProps<TData>) {
  const defaultProps: Partial<DataGridProps<TData>> = {
    loadingMode: "skeleton",
    tableLayout: {
      dense: false,
      cellBorder: false,
      rowBorder: true,
      rowRounded: false,
      stripped: false,
      headerSticky: false,
      headerBackground: true,
      headerBorder: true,
      width: "fixed",
      columnsVisibility: false,
      columnsResizable: false,
      columnsResizeMode: "onEnd",
      columnsPinnable: false,
      columnsMovable: false,
      columnsDraggable: false,
      rowsDraggable: false,
      rowsPinnable: false,
    },
    tableClassNames: {
      base: "",
      header: "",
      headerRow: "",
      headerSticky: "sticky top-0 z-15 bg-background/90 backdrop-blur-xs",
      body: "",
      bodyRow: "",
      footer: "",
      edgeCell: "",
    },
  };

  const merged = mergeProps(
    {
      get loadingMode() {
        return defaultProps.loadingMode;
      },
      get tableLayout() {
        return { ...defaultProps.tableLayout, ...(props.tableLayout ?? {}) };
      },
      get tableClassNames() {
        return { ...defaultProps.tableClassNames, ...(props.tableClassNames ?? {}) };
      },
    },
    props,
    {
      get tableLayout() {
        return { ...defaultProps.tableLayout, ...(props.tableLayout ?? {}) };
      },
      get tableClassNames() {
        return { ...defaultProps.tableClassNames, ...(props.tableClassNames ?? {}) };
      },
    },
  );

  // Ensure table is provided
  if (!merged.table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  return (
    <DataGridProvider {...(merged as DataGridProps<TData> & { table: Table<TData> })}>
      {merged.children}
    </DataGridProvider>
  );
}

type DataGridContainerProps = ParentProps<{
  class?: string;
  border?: boolean;
}>;

function DataGridContainer(props: DataGridContainerProps) {
  const merged = mergeProps({ border: true }, props);
  const [local, others] = splitProps(merged, ["class", "border", "children"]);
  return (
    <div
      data-slot="data-grid"
      class={cn(
        "w-full overflow-hidden",
        local.border &&
          "style-lyra:rounded-none style-maia:rounded-2xl style-mira:rounded-lg style-nova:rounded-lg style-vega:rounded-lg border border-border",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
}

export { DataGrid, DataGridContainer, DataGridProvider, useDataGrid };
