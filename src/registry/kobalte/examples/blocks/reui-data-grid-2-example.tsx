// Description: Data grid with cell border
// GridSize: 1
// Order: 2

import {
  type ColumnDef,
  type ColumnOrderState,
  createSolidTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
} from "@tanstack/solid-table";
import { createSignal } from "solid-js";
import { DataGrid, DataGridContainer } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridPagination } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

interface IData {
  id: string;
  name: string;
  availability: "online" | "away" | "busy" | "offline";
  avatar: string;
  status: "active" | "inactive";
  flag: string; // Emoji flags
  email: string;
  company: string;
  role: string;
  joined: string;
  location: string;
  balance: number;
}

const users = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    initials: "AJ",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@example.com",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    initials: "SC",
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    email: "michael@example.com",
    avatar: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
    initials: "MR",
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@example.com",
    avatar: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
    initials: "EW",
  },
  {
    id: "5",
    name: "David Kim",
    email: "david@example.com",
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
    initials: "DK",
  },
  {
    id: "6",
    name: "Aron Thompson",
    email: "lisa@example.com",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
    initials: "LT",
  },
  {
    id: "7",
    name: "James Brown",
    email: "james@example.com",
    avatar: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
    initials: "JB",
  },
  {
    id: "8",
    name: "Maria Garcia",
    email: "maria@example.com",
    avatar: "https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80",
    initials: "MG",
  },
  {
    id: "9",
    name: "Nick Johnson",
    email: "nick@example.com",
    avatar: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
    initials: "NJ",
  },
  {
    id: "10",
    name: "Liam Thompson",
    email: "liam@example.com",
    avatar: "https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80",
    initials: "LT",
  },
];

const demoData: IData[] = users.map((user, index) => ({
  ...user,
  availability: (["online", "away", "busy", "offline"] as const)[index % 4],
  status: (index % 2 === 0 ? "active" : "inactive") as "active" | "inactive",
  flag: (["us", "gb", "ca", "au", "de", "my", "es", "jp", "fr", "it"] as const)[index % 10],
  company: (
    [
      "Apple",
      "OpenAI",
      "Meta",
      "Tesla",
      "SAP",
      "Keenthemes",
      "BBVA",
      "Sony",
      "LVMH",
      "ENI",
    ] as const
  )[index % 10],
  role: (
    [
      "CEO",
      "CTO",
      "Designer",
      "Developer",
      "Lawyer",
      "Director",
      "Product Manager",
      "Marketing Lead",
      "Data Scientist",
      "Engineer",
    ] as const
  )[index % 10],
  joined: "Jan, 2024",
  location: (
    [
      "United States",
      "United Kingdom",
      "Canada",
      "Australia",
      "Germany",
      "Malaysia",
      "Spain",
      "Japan",
      "France",
      "Italy",
    ] as const
  )[index % 10],
  balance: 5143.03 + index * 100,
}));

export default function Pattern() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: true }]);
  const [columnOrder, setColumnOrder] = createSignal<ColumnOrderState>([]);

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "name",
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        return (
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
            <div class="space-y-px">
              <div class="font-medium text-foreground">{row.original.name}</div>
              <div class="text-muted-foreground">{row.original.email}</div>
            </div>
          </div>
        );
      },
      size: 250,
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: (info) => <span>{info.getValue() as string}</span>,
      size: 100,
      meta: {
        headerClassName: "",
      },
    },
    {
      accessorKey: "role",
      header: "Occupation",
      cell: (info) => <span>{info.getValue() as string}</span>,
      size: 100,
      meta: {
        headerClassName: "",
      },
    },
    {
      accessorKey: "balance",
      header: "Salary",
      cell: (info) => <span class="font-semibold">${(info.getValue() as number).toFixed(2)}</span>,
      size: 100,
    },
  ];

  const table = createSolidTable({
    columns,
    data: demoData,
    pageCount: Math.ceil((demoData?.length || 0) / pagination().pageSize),
    getRowId: (row: IData) => row.id,
    state: {
      get pagination() {
        return pagination();
      },
      get sorting() {
        return sorting();
      },
      get columnOrder() {
        return columnOrder();
      },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={demoData?.length || 0}
      tableLayout={{
        cellBorder: true,
      }}
    >
      <div class="w-full space-y-2.5">
        <DataGridContainer>
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}
