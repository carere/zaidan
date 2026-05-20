// Description: Data grid with CRUD features
// GridSize: 1
// Order: 22

import {
  type ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type SortingState,
} from "@tanstack/solid-table";
import { FunnelIcon, MoreHorizontalIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { toast } from "solid-sonner";
import { DataGrid } from "@/registry/kobalte/blocks/reui-data-grid/data-grid";
import { DataGridColumnHeader } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-column-header";
import { DataGridPagination } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/registry/kobalte/blocks/reui-data-grid/data-grid-scroll-area";
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/registry/kobalte/blocks/reui-data-grid/data-grid-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";
import { Label } from "@/registry/kobalte/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

interface IData {
  id: string;
  name: string;
  availability: "online" | "away" | "busy" | "offline";
  avatar: string;
  status: "Active" | "Inactive" | "Pending" | "Blocked";
  flag: string; // Emoji flags
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
    status: "Active",
    flag: "us",
    email: "alex@apple.com",
    company: "Apple",
    role: "CEO",
    joined: "Jan, 2024",
    location: "United States",
    balance: 5143.03,
  },
  {
    id: "2",
    name: "Sarah Chen",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    flag: "gb",
    email: "sarah@openai.com",
    company: "OpenAI",
    role: "CTO",
    joined: "Mar, 2023",
    location: "United Kingdom",
    balance: 4321.87,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
    status: "Blocked",
    flag: "ca",
    email: "michael@meta.com",
    company: "Meta",
    role: "Designer",
    joined: "Jun, 2022",
    location: "Canada",
    balance: 7654.98,
  },
  {
    id: "4",
    name: "Emma Wilson",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    flag: "au",
    email: "emma@tesla.com",
    company: "Tesla",
    role: "Developer",
    joined: "Sep, 2024",
    location: "Australia",
    balance: 3456.45,
  },
  {
    id: "5",
    name: "David Kim",
    availability: "online",
    avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=96&h=96&dpr=2&q=80",
    status: "Active",
    flag: "de",
    email: "david@sap.com",
    company: "SAP",
    role: "Lawyer",
    joined: "Nov, 2023",
    location: "Germany",
    balance: 9876.54,
  },
  {
    id: "6",
    name: "Aron Thompson",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=96&h=96&dpr=2&q=80",
    status: "Pending",
    flag: "my",
    email: "aron@keenthemes.com",
    company: "Keenthemes",
    role: "Director",
    joined: "Feb, 2022",
    location: "Malaysia",
    balance: 6214.22,
  },
  {
    id: "7",
    name: "James Brown",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    flag: "es",
    email: "james@bbva.es",
    company: "BBVA",
    role: "Product Manager",
    joined: "Aug, 2024",
    location: "Spain",
    balance: 5321.77,
  },
  {
    id: "8",
    name: "Maria Garcia",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80",
    status: "Blocked",
    flag: "jp",
    email: "maria@sony.jp",
    company: "Sony",
    role: "Marketing Lead",
    joined: "Dec, 2023",
    location: "Japan",
    balance: 8452.39,
  },
  {
    id: "9",
    name: "Nick Johnson",
    availability: "online",
    avatar: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
    status: "Pending",
    flag: "fr",
    email: "nick@lvmh.fr",
    company: "LVMH",
    role: "Data Scientist",
    joined: "Apr, 2022",
    location: "France",
    balance: 7345.1,
  },
  {
    id: "10",
    name: "Liam Thompson",
    availability: "away",
    avatar: "https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80",
    status: "Inactive",
    flag: "it",
    email: "liam@eni.it",
    company: "ENI",
    role: "Engineer",
    joined: "Jul, 2024",
    location: "Italy",
    balance: 5214.88,
  },
  {
    id: "11",
    name: "Alex Johnson",
    availability: "busy",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    status: "Blocked",
    flag: "br",
    email: "alex@vale.br",
    company: "Vale",
    role: "Software Engineer",
    joined: "May, 2023",
    location: "Brazil",
    balance: 9421.5,
  },
  {
    id: "12",
    name: "Sarah Chen",
    availability: "offline",
    avatar: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
    status: "Active",
    flag: "in",
    email: "sarah@tata.in",
    company: "Tata",
    role: "Sales Manager",
    joined: "Oct, 2024",
    location: "India",
    balance: 4521.67,
  },
];

function ActionsCell({ row }: { row: Row<IData> }) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(row.original.id);

    toast.success("Employee ID successfully copied", {
      description: row.original.id,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger as={Button} class="size-7" size="icon" variant="ghost">
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyId}>Copy ID</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => {}}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Pattern() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "name", desc: true }]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedStatuses, setSelectedStatuses] = createSignal<string[]>([]);

  const filteredData = createMemo(() => {
    return demoData.filter((item) => {
      // Filter by status
      const matchesStatus = !selectedStatuses?.length || selectedStatuses().includes(item.status);

      // Filter by search query (case-insensitive)
      const searchLower = searchQuery().toLowerCase();
      const matchesSearch =
        !searchQuery ||
        Object.values(item)
          .join(" ") // Combine all fields into a single string
          .toLowerCase()
          .includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  });

  const statusCounts = demoData.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleStatusChange = (checked: boolean, value: string) => {
    setSelectedStatuses(
      (
        prev = [], // Default to an empty array
      ) => (checked ? [...prev, value] : prev.filter((v) => v !== value)),
    );
  };

  const columns: ColumnDef<IData>[] = [
    {
      accessorKey: "id",
      id: "id",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }) => <DataGridTableRowSelect row={row} />,
      enableSorting: false,
      size: 35,
      meta: {
        headerClassName: "",
        cellClassName: "",
      },
      enableResizing: false,
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader title="User" visibility={true} column={column} />
      ),
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
      size: 200,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
    },
    {
      accessorKey: "location",
      id: "location",
      header: ({ column }) => (
        <DataGridColumnHeader title="Location" visibility={true} column={column} />
      ),
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
      size: 150,
      meta: {
        headerClassName: "",
        cellClassName: "text-start",
      },
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      accessorKey: "role",
      id: "role",
      header: ({ column }) => (
        <DataGridColumnHeader title="Role" visibility={true} column={column} />
      ),
      cell: ({ row }) => {
        return <div class="font-medium text-foreground">{row.original.role}</div>;
      },
      size: 150,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      accessorKey: "joined",
      id: "joined",
      header: ({ column }) => (
        <DataGridColumnHeader title="Joined" visibility={true} column={column} />
      ),
      cell: ({ row }) => {
        return <div class="font-medium text-foreground">{row.original.joined}</div>;
      },
      size: 150,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" visibility={true} column={column} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;

        if (status === "Active") {
          return <Badge variant="outline">Approved</Badge>;
        } else if (status === "Blocked") {
          return <Badge variant="destructive">Blocked</Badge>;
        } else if (status === "Inactive") {
          return <Badge variant="outline">Inactive</Badge>;
        } else {
          return <Badge variant="outline">Pending</Badge>;
        }
      },
      size: 100,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionsCell row={row} />,
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
    },
  ];

  const [columnOrder, setColumnOrder] = createSignal<string[]>(
    columns.map((column) => column.id as string),
  );

  const table = createSolidTable({
    columns,
    get data() {
      return filteredData();
    },
    get pageCount() {
      return Math.ceil((filteredData()?.length || 0) / pagination().pageSize);
    },
    getRowId: (row: IData) => row.id,
    get state() {
      return {
        pagination: pagination(),
        sorting: sorting(),
        columnOrder: columnOrder(),
      };
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

  return (
    <DataGrid
      table={table}
      recordCount={filteredData()?.length || 0}
      tableLayout={{
        columnsPinnable: true,
        columnsResizable: true,
        columnsMovable: true,
        columnsVisibility: true,
      }}
    >
      <Card class="w-full gap-3 py-0">
        <CardHeader class="flex items-center justify-between px-3.5 py-2">
          <div class="flex items-center gap-2.5">
            <InputGroup class="w-48">
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>

              <InputGroupInput
                placeholder="Search..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
              />

              <Show when={searchQuery().length > 0}>
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Copy"
                    title="Copy"
                    size="icon-xs"
                    onClick={() => setSearchQuery("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </Show>
            </InputGroup>
            <Popover>
              <PopoverTrigger as={Button} variant="outline">
                <FunnelIcon />
                Status
                <Show when={selectedStatuses().length > 0}>
                  <Badge variant="outline">{selectedStatuses().length}</Badge>
                </Show>
              </PopoverTrigger>
              <PopoverContent class="w-40">
                <div class="space-y-3">
                  <div class="font-medium text-muted-foreground text-xs">Filters</div>
                  <div class="space-y-3">
                    <For each={Object.keys(statusCounts)}>
                      {(status) => (
                        <div class="flex items-center gap-2.5">
                          <Checkbox
                            id={status}
                            checked={selectedStatuses().includes(status)}
                            onChange={(checked) => handleStatusChange(checked === true, status)}
                          />
                          <Label
                            for={status}
                            class="flex grow items-center justify-between gap-1.5 font-normal"
                          >
                            {status}
                            <span class="text-muted-foreground">{statusCounts[status]}</span>
                          </Label>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <CardAction>
            <Button>
              <UserPlusIcon />
              Add new
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter class="border-none bg-transparent! px-3.5 py-2">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
