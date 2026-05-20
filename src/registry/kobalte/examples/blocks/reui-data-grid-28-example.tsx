// Description: Data grid with remote infinite scroll
// GridSize: 1
// Order: 28

import {
  type ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/solid-table";
import { CloudDownloadIcon, DownloadIcon, RefreshCwIcon } from "lucide-solid";
import { createSignal, onCleanup } from "solid-js";
import { DataGrid } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridColumnHeader } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-column-header";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import { DataGridTableVirtual } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table-virtual";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardAction, CardContent, CardHeader } from "@/registry/kobalte/ui/card";

interface IData {
  id: string;
  name: string;
  avatar: string;
  email: string;
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

const statuses: IData["status"][] = ["Active", "Inactive", "Pending"];

const TOTAL_SERVER_RECORDS = 200;
const PAGE_SIZE = 20;

function simulateRow(index: number): IData {
  const name = names[index % names.length];
  return {
    id: String(index + 1),
    name,
    avatar: avatars[index % avatars.length],
    email: `${name.toLowerCase().replace(" ", ".")}${index}@company.com`,
    status: statuses[index % statuses.length],
    balance: Math.round((Math.random() * 9000 + 1000) * 100) / 100,
  };
}

function createInitialData() {
  return Array.from({ length: PAGE_SIZE }, (_, index) => simulateRow(index));
}

export default function Pattern() {
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const initialData = createInitialData();
  const [data, setData] = createSignal<IData[]>(initialData);
  const [isFetching, setIsFetching] = createSignal(false);
  const [, setResetVersion] = createSignal(0);
  let fetchTimeoutRef: number | null = null;
  const hasMore = () => data().length < TOTAL_SERVER_RECORDS;

  const clearPendingFetch = () => {
    if (fetchTimeoutRef !== null) {
      window.clearTimeout(fetchTimeoutRef);
      fetchTimeoutRef = null;
    }
  };

  onCleanup(clearPendingFetch);

  const handleReset = () => {
    clearPendingFetch();
    setSorting([]);
    setData(initialData);
    setIsFetching(false);
    setResetVersion((version) => version + 1);
  };

  const fetchMore = () => {
    if (isFetching() || !hasMore()) return;

    clearPendingFetch();
    setIsFetching(true);

    const timeoutId = window.setTimeout(() => {
      setData((prev) => {
        const next = Array.from({ length: PAGE_SIZE }, (_, index) =>
          simulateRow(prev.length + index),
        );
        return [...prev, ...next];
      });
      setIsFetching(false);
      fetchTimeoutRef = null;
    }, 800);

    fetchTimeoutRef = timeoutId;
  };

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "id",
      id: "id",
      header: ({ column }) => <DataGridColumnHeader title="#" column={column} />,
      cell: ({ row }) => <span class="text-muted-foreground tabular-nums">{row.original.id}</span>,
      size: 40,
      enableSorting: false,
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
                .map((namePart) => namePart[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div class="font-medium text-foreground">{row.original.name}</div>
            <div class="text-muted-foreground text-xs">{row.original.email}</div>
          </div>
        </div>
      ),
      size: 280,
      enableSorting: true,
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      cell: ({ row }) => {
        const status = row.original.status;

        if (status === "Active") {
          return <Badge variant="outline">Active</Badge>;
        }

        if (status === "Inactive") {
          return <Badge variant="outline">Inactive</Badge>;
        }

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
    },
  ];

  const table = createSolidTable({
    columns,
    get data() {
      return data();
    },
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
      recordCount={data().length}
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
          <div class="flex items-center gap-2">
            <CloudDownloadIcon class="size-4 text-muted-foreground" />
            <span class="font-medium text-foreground text-sm">Remote Data</span>
            <Badge variant="secondary">
              {data().length} / {TOTAL_SERVER_RECORDS}
            </Badge>
          </div>
          <CardAction class="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCwIcon class="size-4" />
              Start over
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-8"
              aria-label="Download snapshot"
              title="Download snapshot"
            >
              <DownloadIcon class="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="border-t p-0">
          {/* key prop removed: SolidJS does not require keys; resetVersion: {resetVersion()} */}
          <DataGridScrollArea class="h-[480px]">
            <DataGridTableVirtual
              estimateSize={57}
              onFetchMore={fetchMore}
              isFetchingMore={isFetching()}
              hasMore={hasMore()}
            />
          </DataGridScrollArea>
        </CardContent>
      </Card>
    </DataGrid>
  );
}
