// Description: Data grid with summary stats footer
// GridSize: 1
// Order: 25

import {
  type ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
} from "@tanstack/solid-table";
import { BarChartIcon, RefreshCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { DataGrid } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridColumnHeader } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-column-header";
import { DataGridPagination } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import {
  DataGridTable,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";

interface IData {
  id: string;
  name: string;
  avatar: string;
  location: string;
  flag: string;
  status: "Active" | "Inactive" | "Pending" | "Blocked";
  balance: number;
}

const demoData: IData[] = [
  {
    id: "1",
    name: "Alex Johnson",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    location: "United States",
    flag: "us",
    status: "Active",
    balance: 5143.03,
  },
  {
    id: "2",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    location: "United Kingdom",
    flag: "gb",
    status: "Inactive",
    balance: 4321.87,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    avatar: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
    location: "Canada",
    flag: "ca",
    status: "Blocked",
    balance: 7654.98,
  },
  {
    id: "4",
    name: "Emma Wilson",
    avatar: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
    location: "Australia",
    flag: "au",
    status: "Inactive",
    balance: 3456.45,
  },
  {
    id: "5",
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
    location: "Germany",
    flag: "de",
    status: "Active",
    balance: 9876.54,
  },
  {
    id: "6",
    name: "Aron Thompson",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
    location: "Malaysia",
    flag: "my",
    status: "Pending",
    balance: 6214.22,
  },
  {
    id: "7",
    name: "James Brown",
    avatar: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
    location: "Spain",
    flag: "es",
    status: "Inactive",
    balance: 5321.77,
  },
  {
    id: "8",
    name: "Maria Garcia",
    avatar: "https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80",
    location: "Japan",
    flag: "jp",
    status: "Blocked",
    balance: 8452.39,
  },
  {
    id: "9",
    name: "Nick Johnson",
    avatar: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
    location: "France",
    flag: "fr",
    status: "Pending",
    balance: 7345.1,
  },
  {
    id: "10",
    name: "Liam Thompson",
    avatar: "https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80",
    location: "Italy",
    flag: "it",
    status: "Inactive",
    balance: 5214.88,
  },
];

export default function Pattern() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: false }]);

  const stats = (() => {
    const count = demoData.length;
    const activeCount = demoData.filter((r) => r.status === "Active").length;
    const balances = demoData.map((r) => r.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const avgBalance = balances.reduce((a, b) => a + b, 0) / count;
    return { count, activeCount, minBalance, maxBalance, avgBalance };
  })();

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => <DataGridColumnHeader title="User" visibility column={column} />,
      cell: ({ row }) => (
        <div class="flex items-center gap-3">
          <Avatar class="size-8">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback>
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div class="font-medium text-foreground">{row.original.name}</div>
        </div>
      ),
      size: 150,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
    },
    {
      accessorKey: "location",
      id: "location",
      header: ({ column }) => <DataGridColumnHeader title="Location" visibility column={column} />,
      cell: ({ row }) => (
        <div class="flex items-center gap-1.5">
          <img
            src={`https://flagcdn.com/${row.original.flag}.svg`}
            alt={row.original.flag}
            class="size-4 rounded-full object-cover"
          />
          <div class="font-medium text-foreground">{row.original.location}</div>
        </div>
      ),
      size: 150,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => <DataGridColumnHeader title="Status" visibility column={column} />,
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "Active") return <Badge variant="outline">Active</Badge>;
        if (s === "Blocked") return <Badge variant="destructive">Blocked</Badge>;
        if (s === "Inactive") return <Badge variant="outline">Inactive</Badge>;
        return <Badge variant="outline">Pending</Badge>;
      },
      size: 110,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      accessorKey: "balance",
      id: "balance",
      header: ({ column }) => <DataGridColumnHeader title="Balance" visibility column={column} />,
      cell: ({ row }) => (
        <div class="font-medium text-foreground tabular-nums">{fmt(row.original.balance)}</div>
      ),
      size: 130,
      enableSorting: true,
      enableHiding: true,
      enableResizing: false,
    },
  ];

  const [columnOrder, setColumnOrder] = createSignal<string[]>(columns.map((c) => c.id as string));

  const table = createSolidTable({
    columns,
    data: demoData,
    pageCount: Math.ceil(demoData.length / pagination().pageSize),
    getRowId: (row: IData) => row.id,
    get state() {
      return { pagination: pagination(), sorting: sorting(), columnOrder: columnOrder() };
    },
    columnResizeMode: "onChange",
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleCount = table.getVisibleLeafColumns().length;

  const footer = (
    <>
      {/* Row 1: record count, min balance, max balance */}
      <DataGridTableFootRow>
        <DataGridTableFootRowCell colSpan={visibleCount - 2}></DataGridTableFootRowCell>
        <DataGridTableFootRowCell>
          <div class="flex flex-col gap-0.5">
            <span class="text-muted-foreground text-xs">Min</span>
            <span class="tabular-nums">{fmt(stats.minBalance)}</span>
          </div>
        </DataGridTableFootRowCell>
        <DataGridTableFootRowCell>
          <div class="flex flex-col gap-0.5">
            <span class="text-muted-foreground text-xs">Max</span>
            <span class="tabular-nums">{fmt(stats.maxBalance)}</span>
          </div>
        </DataGridTableFootRowCell>
      </DataGridTableFootRow>
      {/* Row 2: avg balance, active count */}
      <DataGridTableFootRow>
        <DataGridTableFootRowCell colSpan={visibleCount - 2}>
          <div class="flex items-center gap-1.5">
            <span class="text-muted-foreground text-xs">Avg balance</span>
            <span class="tabular-nums">{fmt(stats.avgBalance)}</span>
          </div>
        </DataGridTableFootRowCell>
        <DataGridTableFootRowCell colSpan={2}>
          <div class="flex items-center gap-1.5">
            <span class="text-muted-foreground text-xs">Active</span>
            <Badge variant="outline">{stats.activeCount}</Badge>
          </div>
        </DataGridTableFootRowCell>
      </DataGridTableFootRow>
    </>
  );

  return (
    <DataGrid
      table={table}
      recordCount={demoData.length}
      tableLayout={{
        columnsPinnable: true,
        columnsResizable: true,
        columnsVisibility: true,
      }}
    >
      <Card class="w-full gap-0 p-0">
        <CardHeader class="flex items-center justify-between px-3.5 py-2">
          <div class="flex items-center gap-2">
            <BarChartIcon class="size-4 text-muted-foreground" />
            <span class="font-medium text-foreground text-sm">Team Summary</span>
          </div>
          <CardAction>
            <Button variant="outline" size="sm">
              <RefreshCwIcon />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable footerContent={footer} />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter class="border-none bg-transparent! px-2.5 py-2">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
