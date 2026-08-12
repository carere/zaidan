import type { ColumnDef, PaginationState, SortingState } from "@tanstack/solid-table";
import { createTable } from "@tanstack/solid-table";
import { createSignal } from "solid-js";
import {
  DataGrid,
  DataGridContainer,
  type DataGridFeatures,
  DataGridPagination,
  DataGridScrollArea,
  DataGridTable,
  dataGridFeatures,
} from "@/registry/kobalte/blocks/data-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  flag: string;
  location: string;
  balance: number;
}

const avatars = [
  "https://github.com/carere.png",
  "https://github.com/shadcn.png",
  "https://github.com/evilrabbit.png",
  "https://github.com/maxleiter.png",
];

const demoData: User[] = [
  { name: "Alex Johnson", email: "alex@example.com", flag: "us", location: "United States" },
  { name: "Sarah Chen", email: "sarah@example.com", flag: "gb", location: "United Kingdom" },
  { name: "Michael Rodriguez", email: "michael@example.com", flag: "ca", location: "Canada" },
  { name: "Emma Wilson", email: "emma@example.com", flag: "au", location: "Australia" },
  { name: "David Kim", email: "david@example.com", flag: "de", location: "Germany" },
  { name: "Aron Thompson", email: "lisa@example.com", flag: "my", location: "Malaysia" },
  { name: "James Brown", email: "james@example.com", flag: "es", location: "Spain" },
  { name: "Maria Garcia", email: "maria@example.com", flag: "jp", location: "Japan" },
  { name: "Nick Johnson", email: "nick@example.com", flag: "fr", location: "France" },
  { name: "Liam Thompson", email: "liam@example.com", flag: "it", location: "Italy" },
].map((user, index) => ({
  ...user,
  id: String(index + 1),
  avatar: avatars[index % avatars.length],
  balance: 5143.03 + index * 100,
}));

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

const columns: ColumnDef<DataGridFeatures, User>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div class="flex items-center gap-2">
        <Avatar class="size-6">
          <AvatarImage src={row.original.avatar} alt={row.original.name} />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
        <a href="#name" class="font-medium text-foreground hover:text-primary">
          {row.original.name}
        </a>
      </div>
    ),
    size: 160,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    id: "email",
    header: "Email",
    cell: (info) => (
      <a href={`mailto:${info.getValue<string>()}`} class="hover:text-primary hover:underline">
        {info.getValue<string>()}
      </a>
    ),
    size: 150,
  },
  {
    accessorKey: "location",
    id: "location",
    header: "Location",
    cell: ({ row }) => (
      <div class="flex items-center gap-1.5">
        <img
          src={`https://flagcdn.com/${row.original.flag.toLowerCase()}.svg`}
          alt={row.original.flag}
          class="size-4 rounded-full object-cover"
        />
        <div class="font-medium text-foreground">{row.original.location}</div>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "balance",
    id: "balance",
    header: "Balance ($)",
    cell: (info) => <span class="font-semibold">${info.getValue<number>().toFixed(2)}</span>,
    size: 110,
    meta: {
      headerClassName: "text-right rtl:text-left",
      cellClassName: "text-right rtl:text-left",
    },
  },
];

export default function DataGridStriped() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: true }]);

  const table = createTable({
    features: dataGridFeatures,
    columns,
    data: demoData,
    get pageCount() {
      return Math.ceil(demoData.length / pagination().pageSize);
    },
    getRowId: (row: User) => row.id,
    state: {
      get pagination() {
        return pagination();
      },
      get sorting() {
        return sorting();
      },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <DataGrid
      table={table}
      recordCount={demoData.length}
      tableLayout={{ stripped: true, rowRounded: true }}
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
