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
import { Card } from "@/registry/kobalte/ui/card";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  company: string;
  role: string;
  balance: number;
}

const avatars = [
  "https://github.com/carere.png",
  "https://github.com/shadcn.png",
  "https://github.com/evilrabbit.png",
  "https://github.com/maxleiter.png",
];

const demoData: User[] = [
  { name: "Alex Johnson", email: "alex@example.com", company: "Apple", role: "CEO" },
  { name: "Sarah Chen", email: "sarah@example.com", company: "OpenAI", role: "CTO" },
  { name: "Michael Rodriguez", email: "michael@example.com", company: "Meta", role: "Designer" },
  { name: "Emma Wilson", email: "emma@example.com", company: "Tesla", role: "Developer" },
  { name: "David Kim", email: "david@example.com", company: "SAP", role: "Lawyer" },
  { name: "Aron Thompson", email: "lisa@example.com", company: "Keenthemes", role: "Director" },
  { name: "James Brown", email: "james@example.com", company: "BBVA", role: "Product Manager" },
  { name: "Maria Garcia", email: "maria@example.com", company: "Sony", role: "Marketing Lead" },
  { name: "Nick Johnson", email: "nick@example.com", company: "LVMH", role: "Data Scientist" },
  { name: "Liam Thompson", email: "liam@example.com", company: "ENI", role: "Engineer" },
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
      <div class="flex items-center gap-3">
        <Avatar class="size-8">
          <AvatarImage src={row.original.avatar} alt={row.original.name} />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div class="space-y-px">
          <div class="font-medium text-foreground">{row.original.name}</div>
          <div class="text-muted-foreground">{row.original.email}</div>
        </div>
      </div>
    ),
    size: 250,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "company",
    id: "company",
    header: "Company",
    cell: (info) => <span>{info.getValue<string>()}</span>,
    size: 100,
  },
  {
    accessorKey: "role",
    id: "role",
    header: "Occupation",
    cell: (info) => <span>{info.getValue<string>()}</span>,
    size: 100,
  },
  {
    accessorKey: "balance",
    id: "balance",
    header: "Salary",
    cell: (info) => <span class="font-semibold">${info.getValue<number>().toFixed(2)}</span>,
    size: 100,
  },
];

export default function DataGridCellBorder() {
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
    <DataGrid table={table} recordCount={demoData.length} tableLayout={{ cellBorder: true }}>
      <div class="w-full space-y-2.5">
        <Card class="p-0">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
        </Card>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}
