// Description: Data grid with local infinite scroll
// GridSize: 1
// Order: 27

import {
  type ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/solid-table";
import { RefreshCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { DataGrid } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridColumnHeader } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-column-header";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import { DataGridTableVirtual } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table-virtual";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/registry/kobalte/ui/card";

interface IData {
  id: string;
  name: string;
  avatar: string;
  department: string;
  status: "Active" | "Inactive" | "Pending";
  balance: number;
}

const avatars = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
  "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
  "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
  "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
  "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
];

const names = [
  "Alex Johnson",
  "Sarah Chen",
  "Michael Rodriguez",
  "Emma Wilson",
  "David Kim",
  "Aron Thompson",
  "James Brown",
  "Maria Garcia",
  "Nick Johnson",
  "Liam Thompson",
];

const departments = [
  "Engineering",
  "Marketing",
  "Design",
  "Sales",
  "Finance",
  "Operations",
  "Legal",
  "Support",
];

const statuses: IData["status"][] = ["Active", "Inactive", "Pending"];

function generateData(count: number): IData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: names[i % names.length],
    avatar: avatars[i % avatars.length],
    department: departments[i % departments.length],
    status: statuses[i % statuses.length],
    balance: Math.round((Math.random() * 9000 + 1000) * 100) / 100,
  }));
}

const allData = generateData(200);

export default function Pattern() {
  const [sorting, setSorting] = createSignal<SortingState>([]);

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "id",
      id: "id",
      header: ({ column }) => <DataGridColumnHeader title="#" column={column} />,
      cell: ({ row }) => <span class="text-muted-foreground tabular-nums">{row.original.id}</span>,
      size: 40,
      enableSorting: true,
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => <DataGridColumnHeader title="User" column={column} />,
      cell: ({ row }) => (
        <div class="flex items-center gap-3">
          <Avatar class="size-7">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback>
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span class="font-medium text-foreground">{row.original.name}</span>
        </div>
      ),
      size: 240,
      enableSorting: true,
    },
    {
      accessorKey: "department",
      id: "department",
      header: ({ column }) => <DataGridColumnHeader title="Department" column={column} />,
      cell: ({ row }) => row.original.department,
      size: 150,
      enableSorting: true,
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "Active") return <Badge variant="outline">Active</Badge>;
        if (s === "Inactive") return <Badge variant="outline">Inactive</Badge>;
        return <Badge variant="outline">Pending</Badge>;
      },
      size: 120,
      enableSorting: true,
    },
    {
      accessorKey: "balance",
      id: "balance",
      header: ({ column }) => <DataGridColumnHeader title="Balance" column={column} />,
      cell: ({ row }) => (
        <span class="tabular-nums">
          $
          {row.original.balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
      size: 140,
      enableSorting: true,
      enableResizing: true,
    },
  ];

  const table = createSolidTable({
    columns,
    data: allData,
    getRowId: (row: IData) => row.id,
    state: {
      get sorting() {
        return sorting();
      },
    },
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={allData.length}
      tableLayout={{
        columnsResizable: true,
        headerSticky: true,
      }}
      tableClassNames={{
        headerSticky: "sticky top-0 z-10 bg-muted/90 backdrop-blur-xs",
      }}
    >
      <Card class="w-full gap-0 p-0">
        <CardHeader class="flex items-center justify-between gap-3 px-4 py-2">
          <CardTitle class="font-medium text-sm">Virtualized Directory</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm">
              <RefreshCwIcon />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="border-t p-0">
          <DataGridScrollArea class="h-[480px]">
            <DataGridTableVirtual estimateSize={49} />
          </DataGridScrollArea>
        </CardContent>
      </Card>
    </DataGrid>
  );
}
