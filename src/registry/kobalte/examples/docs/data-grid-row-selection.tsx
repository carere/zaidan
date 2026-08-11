import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/solid-table";
import { createTable } from "@tanstack/solid-table";
import { createSignal } from "solid-js";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  DataGridContainer,
  type DataGridFeatures,
  DataGridPagination,
  DataGridScrollArea,
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  dataGridFeatures,
} from "@/registry/kobalte/blocks/data-grid";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

type Availability = "online" | "away" | "busy" | "offline";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  availability: Availability;
  flag: string;
  location: string;
  joined: string;
}

const avatars = [
  "https://github.com/shadcn.png",
  "https://github.com/evilrabbit.png",
  "https://github.com/maxleiter.png",
  "https://github.com/pranathip.png",
];

const availabilities: Availability[] = ["online", "away", "busy", "offline"];

const availabilityColors: Record<Availability, string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-orange-500",
  offline: "bg-gray-400",
};

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
  availability: availabilities[index % availabilities.length],
  joined: "Jan, 2024",
}));

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

const columns: ColumnDef<DataGridFeatures, User>[] = [
  {
    accessorKey: "id",
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    size: 20,
  },
  {
    accessorKey: "name",
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div class="flex items-center gap-3">
        <Avatar class="size-8">
          <AvatarImage src={row.original.avatar} alt={row.original.name} />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          <AvatarBadge
            class={cn(
              "size-1.5! p-0",
              availabilityColors[row.original.availability] ?? availabilityColors.offline,
            )}
          />
        </Avatar>
        <div class="space-y-px">
          <div class="font-medium text-foreground">{row.original.name}</div>
          <div class="text-muted-foreground">{row.original.email}</div>
        </div>
      </div>
    ),
    size: 200,
    enableSorting: true,
    enableHiding: false,
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
    size: 180,
    meta: { cellClassName: "text-start" },
  },
  {
    accessorKey: "joined",
    id: "joined",
    header: "Joined",
    cell: (info) => info.getValue<string>(),
    size: 120,
    meta: { cellClassName: "font-medium" },
  },
];

export default function DataGridRowSelection() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: true }]);
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({});

  const selectedCount = () => Object.keys(rowSelection()).length;

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
      get rowSelection() {
        return rowSelection();
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <DataGrid table={table} recordCount={demoData.length}>
      <div class="w-full space-y-2.5">
        <div class="text-muted-foreground text-sm" aria-live="polite">
          {selectedCount()} of {demoData.length} row(s) selected
        </div>
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
