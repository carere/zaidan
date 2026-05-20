// Description: Data grid with row selection
// GridSize: 1
// Order: 7

import {
  type ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/solid-table";
import { createEffect, createSignal } from "solid-js";
import { cn } from "@/lib/utils";
import { DataGrid, DataGridContainer } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridPagination } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

interface IData {
  id: string;
  name: string;
  availability: "online" | "away" | "busy" | "offline";
  avatar: string;
  status: "active" | "inactive";
  flag: string;
  email: string;
  company: string;
  role: string;
  joined: string;
  location: string;
  balance: number;
}

const demoData: IData[] = [
  {
    id: "1",
    name: "Alex Johnson",
    availability: "online",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "us",
    email: "alex@apple.com",
    company: "Apple",
    role: "CEO",
    joined: "Apr, 2021",
    location: "United States",
    balance: 5143.03,
  },
  {
    id: "2",
    name: "Sarah Chen",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    status: "inactive",
    flag: "gb",
    email: "sarah@openai.com",
    company: "OpenAI",
    role: "CTO",
    joined: "Jul, 2020",
    location: "United Kingdom",
    balance: 4321.87,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "ca",
    email: "michael@meta.com",
    company: "Meta",
    role: "Designer",
    joined: "Mar, 2019",
    location: "Canada",
    balance: 7654.98,
  },
  {
    id: "4",
    name: "Emma Wilson",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
    status: "inactive",
    flag: "au",
    email: "emma@tesla.com",
    company: "Tesla",
    role: "Developer",
    joined: "Jan, 2022",
    location: "Australia",
    balance: 3456.45,
  },
  {
    id: "5",
    name: "David Kim",
    availability: "online",
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "de",
    email: "david@sap.com",
    company: "SAP",
    role: "Lawyer",
    joined: "May, 2023",
    location: "Germany",
    balance: 9876.54,
  },
  {
    id: "6",
    name: "Aron Thompson",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "my",
    email: "aron@keenthemes.com",
    company: "Keenthemes",
    role: "Director",
    joined: "Nov, 2018",
    location: "Malaysia",
    balance: 6214.22,
  },
  {
    id: "7",
    name: "James Brown",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
    status: "inactive",
    flag: "es",
    email: "james@bbva.es",
    company: "BBVA",
    role: "Product Manager",
    joined: "Jun, 2021",
    location: "Spain",
    balance: 5321.77,
  },
  {
    id: "8",
    name: "Maria Garcia",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "jp",
    email: "maria@sony.jp",
    company: "Sony",
    role: "Marketing Lead",
    joined: "Oct, 2020",
    location: "Japan",
    balance: 8452.39,
  },
  {
    id: "9",
    name: "Nick Johnson",
    availability: "online",
    avatar: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "fr",
    email: "nick@lvmh.fr",
    company: "LVMH",
    role: "Data Scientist",
    joined: "Sep, 2019",
    location: "France",
    balance: 7345.1,
  },
  {
    id: "10",
    name: "Liam Thompson",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80",
    status: "inactive",
    flag: "it",
    email: "liam@eni.it",
    company: "ENI",
    role: "Engineer",
    joined: "Feb, 2023",
    location: "Italy",
    balance: 5214.88,
  },
  {
    id: "11",
    name: "Alex Johnson",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "br",
    email: "alex@vale.br",
    company: "Vale",
    role: "Software Engineer",
    joined: "Dec, 2022",
    location: "Brazil",
    balance: 9421.5,
  },
  {
    id: "12",
    name: "Sarah Chen",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    status: "active",
    flag: "in",
    email: "sarah@tata.in",
    company: "Tata",
    role: "Sales Manager",
    joined: "Mar, 2020",
    location: "India",
    balance: 4521.67,
  },
];

export default function Pattern() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: true }]);
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({});
  const [, setSelectedIds] = createSignal<string[]>([]);

  createEffect(() => {
    const selectedRowIds = Object.keys(rowSelection());
    if (selectedRowIds.length > 0) {
      setSelectedIds(selectedRowIds);
    } else {
      setSelectedIds([]);
    }
  });

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "id",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }) => <DataGridTableRowSelect row={row} />,
      enableSorting: false,
      size: 20,
      meta: {
        headerClassName: "",
        cellClassName: "",
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const availability = row.original.availability;
        const statusColors = {
          online: "bg-green-500",
          away: "bg-yellow-500",
          busy: "bg-orange-500",
          offline: "bg-gray-400",
        };

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
              <AvatarBadge
                class={cn("size-1.5! p-0", statusColors[availability] || statusColors.offline)}
              />
            </Avatar>
            <div class="space-y-px">
              <div class="font-medium text-foreground">{row.original.name}</div>
              <div class="text-muted-foreground">{row.original.email}</div>
            </div>
          </div>
        );
      },
      size: 200,
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        return (
          <div class="flex items-center gap-1.5">
            <img
              src={`https://flagcdn.com/${row.original.flag.toLowerCase()}.svg`}
              alt={row.original.flag}
              class="size-4 rounded-full object-cover"
            />
            <div class="font-medium text-foreground">{row.original.location}</div>
          </div>
        );
      },
      size: 180,
      meta: {
        headerClassName: "",
        cellClassName: "text-start",
      },
    },
    {
      accessorKey: "joined",
      header: "Joined",
      cell: (info) => info.getValue() as string,
      size: 120,
      meta: {
        headerClassName: "",
        cellClassName: "font-medium",
      },
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
      get rowSelection() {
        return rowSelection();
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid table={table} recordCount={demoData?.length || 0}>
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
