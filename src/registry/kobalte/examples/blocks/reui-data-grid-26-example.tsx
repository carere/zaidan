// Description: Data grid with per-column aggregate footer
// GridSize: 1
// Order: 26

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
import { DownloadIcon } from "lucide-solid";
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
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";

interface IData {
  id: string;
  name: string;
  avatar: string;
  status: "Active" | "Inactive" | "Pending" | "Blocked";
  balance: number;
  transactions: number;
}

const demoData: IData[] = [
  {
    id: "1",
    name: "Alex Johnson",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    status: "Active",
    balance: 5143.03,
    transactions: 48,
  },
  {
    id: "2",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    balance: 4321.87,
    transactions: 31,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    avatar: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
    status: "Blocked",
    balance: 7654.98,
    transactions: 67,
  },
  {
    id: "4",
    name: "Emma Wilson",
    avatar: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    balance: 3456.45,
    transactions: 22,
  },
  {
    id: "5",
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
    status: "Active",
    balance: 9876.54,
    transactions: 93,
  },
  {
    id: "6",
    name: "Aron Thompson",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
    status: "Pending",
    balance: 6214.22,
    transactions: 55,
  },
  {
    id: "7",
    name: "James Brown",
    avatar: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    balance: 5321.77,
    transactions: 40,
  },
  {
    id: "8",
    name: "Maria Garcia",
    avatar: "https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80",
    status: "Blocked",
    balance: 8452.39,
    transactions: 74,
  },
  {
    id: "9",
    name: "Nick Johnson",
    avatar: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
    status: "Pending",
    balance: 7345.1,
    transactions: 61,
  },
  {
    id: "10",
    name: "Liam Thompson",
    avatar: "https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    balance: 5214.88,
    transactions: 37,
  },
];

export default function Pattern() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: false }]);

  const aggregates = (() => {
    const n = demoData.length;
    const balances = demoData.map((r) => r.balance);
    const txns = demoData.map((r) => r.transactions);
    return {
      avgBalance: balances.reduce((a, b) => a + b, 0) / n,
      minBalance: Math.min(...balances),
      maxBalance: Math.max(...balances),
      avgTxns: Math.round(txns.reduce((a, b) => a + b, 0) / n),
      minTxns: Math.min(...txns),
      maxTxns: Math.max(...txns),
    };
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
      size: 200,
      enableSorting: true,
      enableHiding: false,
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
      enableResizing: true,
    },
    {
      accessorKey: "transactions",
      id: "transactions",
      header: ({ column }) => (
        <DataGridColumnHeader title="Transactions" visibility column={column} />
      ),
      cell: ({ row }) => (
        <div class="font-medium text-foreground tabular-nums">{row.original.transactions}</div>
      ),
      size: 120,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
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

  const footer = (
    <DataGridTableFootRow>
      <DataGridTableFootRowCell colSpan={2}>
        <div class="flex flex-col gap-0.5">
          <span class="text-muted-foreground text-xs">Summary</span>
          <span class="font-medium text-foreground">Across all members</span>
          <span class="text-muted-foreground text-xs tabular-nums">{demoData.length} members</span>
        </div>
      </DataGridTableFootRowCell>
      <DataGridTableFootRowCell>
        <div class="flex flex-col gap-0.5">
          <span class="text-muted-foreground text-xs">Avg</span>
          <span class="tabular-nums">{fmt(aggregates.avgBalance)}</span>
          <span class="text-muted-foreground text-xs tabular-nums">
            {fmt(aggregates.minBalance)} – {fmt(aggregates.maxBalance)}
          </span>
        </div>
      </DataGridTableFootRowCell>
      {/* Transactions aggregate */}
      <DataGridTableFootRowCell>
        <div class="flex flex-col gap-0.5">
          <span class="text-muted-foreground text-xs">Avg</span>
          <span class="tabular-nums">{aggregates.avgTxns}</span>
          <span class="text-muted-foreground text-xs tabular-nums">
            {aggregates.minTxns} – {aggregates.maxTxns}
          </span>
        </div>
      </DataGridTableFootRowCell>
    </DataGridTableFootRow>
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
        <CardHeader class="flex items-center justify-between gap-3 px-4 py-2">
          <CardTitle class="font-medium text-sm">Column Aggregates</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm">
              <DownloadIcon />
              Export
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable footerContent={footer} />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter class="border-none bg-transparent! px-3.5 py-2">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
