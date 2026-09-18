import type {
  ColumnDef,
  ExpandedState,
  PaginationState,
  SortingState,
} from "@tanstack/solid-table";
import { createTable } from "@tanstack/solid-table";
import { createSignal, onMount, Show } from "solid-js";
import {
  DataGrid,
  DataGridColumnHeader,
  DataGridContainer,
  type DataGridFeatures,
  DataGridPagination,
  DataGridScrollArea,
  DataGridTable,
  DataGridTableRowExpand,
  dataGridFeatures,
} from "@/registry/kobalte/blocks/data-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Card } from "@/registry/kobalte/ui/card";

interface Node {
  id: string;
  name: string;
  type: "department" | "team" | "member";
  status: "active" | "inactive";
  role?: string;
  avatar?: string;
  flag?: string;
  location?: string;
  children?: Node[];
}

const demoData: Node[] = [
  {
    id: "eng",
    name: "Engineering",
    type: "department",
    status: "active",
    children: [
      {
        id: "eng-platform",
        name: "Platform",
        type: "team",
        status: "active",
        children: [
          {
            id: "eng-platform-1",
            name: "Alex Johnson",
            type: "member",
            status: "active",
            role: "Staff Engineer",
            avatar: "https://github.com/shadcn.png",
            flag: "us",
            location: "United States",
          },
          {
            id: "eng-platform-2",
            name: "Sarah Chen",
            type: "member",
            status: "active",
            role: "Senior Engineer",
            avatar: "https://github.com/evilrabbit.png",
            flag: "gb",
            location: "United Kingdom",
          },
          {
            id: "eng-platform-3",
            name: "Michael Rodriguez",
            type: "member",
            status: "inactive",
            role: "Frontend Engineer",
            avatar: "https://github.com/maxleiter.png",
            flag: "ca",
            location: "Canada",
          },
        ],
      },
      {
        id: "eng-mobile",
        name: "Mobile",
        type: "team",
        status: "active",
        children: [
          {
            id: "eng-mobile-1",
            name: "Emma Wilson",
            type: "member",
            status: "active",
            role: "iOS Engineer",
            avatar: "https://github.com/pranathip.png",
            flag: "au",
            location: "Australia",
          },
          {
            id: "eng-mobile-2",
            name: "David Kim",
            type: "member",
            status: "active",
            role: "Android Engineer",
            avatar: "https://github.com/shadcn.png",
            flag: "de",
            location: "Germany",
          },
        ],
      },
    ],
  },
  {
    id: "design",
    name: "Design",
    type: "department",
    status: "active",
    children: [
      {
        id: "design-product",
        name: "Product Design",
        type: "team",
        status: "active",
        children: [
          {
            id: "design-product-1",
            name: "Aron Thompson",
            type: "member",
            status: "active",
            role: "Design Lead",
            avatar: "https://github.com/evilrabbit.png",
            flag: "my",
            location: "Malaysia",
          },
          {
            id: "design-product-2",
            name: "Maria Garcia",
            type: "member",
            status: "active",
            role: "Product Designer",
            avatar: "https://github.com/maxleiter.png",
            flag: "jp",
            location: "Japan",
          },
        ],
      },
      {
        id: "design-brand",
        name: "Brand",
        type: "team",
        status: "active",
        children: [
          {
            id: "design-brand-1",
            name: "Nick Johnson",
            type: "member",
            status: "active",
            role: "Brand Designer",
            avatar: "https://github.com/pranathip.png",
            flag: "fr",
            location: "France",
          },
          {
            id: "design-brand-2",
            name: "Liam Thompson",
            type: "member",
            status: "inactive",
            role: "Motion Designer",
            avatar: "https://github.com/shadcn.png",
            flag: "it",
            location: "Italy",
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    type: "department",
    status: "active",
    children: [
      {
        id: "marketing-growth",
        name: "Growth",
        type: "team",
        status: "active",
        children: [
          {
            id: "marketing-growth-1",
            name: "Olivia Martin",
            type: "member",
            status: "active",
            role: "Growth Lead",
            avatar: "https://github.com/evilrabbit.png",
            flag: "us",
            location: "United States",
          },
          {
            id: "marketing-growth-2",
            name: "Ethan Clark",
            type: "member",
            status: "active",
            role: "Performance Marketer",
            avatar: "https://github.com/maxleiter.png",
            flag: "ca",
            location: "Canada",
          },
        ],
      },
      {
        id: "marketing-content",
        name: "Content",
        type: "team",
        status: "active",
        children: [
          {
            id: "marketing-content-1",
            name: "Sofia Rossi",
            type: "member",
            status: "active",
            role: "Content Lead",
            avatar: "https://github.com/pranathip.png",
            flag: "it",
            location: "Italy",
          },
          {
            id: "marketing-content-2",
            name: "Lucas Meyer",
            type: "member",
            status: "inactive",
            role: "Copywriter",
            avatar: "https://github.com/shadcn.png",
            flag: "de",
            location: "Germany",
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    type: "department",
    status: "active",
    children: [
      {
        id: "operations-finance",
        name: "Finance",
        type: "team",
        status: "active",
        children: [
          {
            id: "operations-finance-1",
            name: "Grace Lee",
            type: "member",
            status: "active",
            role: "Finance Lead",
            avatar: "https://github.com/evilrabbit.png",
            flag: "kr",
            location: "South Korea",
          },
          {
            id: "operations-finance-2",
            name: "Daniel Novak",
            type: "member",
            status: "active",
            role: "Accountant",
            avatar: "https://github.com/maxleiter.png",
            flag: "cz",
            location: "Czechia",
          },
        ],
      },
      {
        id: "operations-people",
        name: "People",
        type: "team",
        status: "active",
        children: [
          {
            id: "operations-people-1",
            name: "Chloe Dubois",
            type: "member",
            status: "active",
            role: "People Lead",
            avatar: "https://github.com/pranathip.png",
            flag: "fr",
            location: "France",
          },
          {
            id: "operations-people-2",
            name: "Ryan Walsh",
            type: "member",
            status: "active",
            role: "Recruiter",
            avatar: "https://github.com/shadcn.png",
            flag: "ie",
            location: "Ireland",
          },
        ],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    type: "department",
    status: "active",
    children: [
      {
        id: "sales-accounts",
        name: "Accounts",
        type: "team",
        status: "active",
        children: [
          {
            id: "sales-accounts-1",
            name: "Mia Park",
            type: "member",
            status: "active",
            role: "Account Executive",
            avatar: "https://github.com/evilrabbit.png",
            flag: "kr",
            location: "South Korea",
          },
          {
            id: "sales-accounts-2",
            name: "Noah Fischer",
            type: "member",
            status: "inactive",
            role: "Account Manager",
            avatar: "https://github.com/maxleiter.png",
            flag: "at",
            location: "Austria",
          },
        ],
      },
    ],
  },
];

// Collapsed rows are unmounted, so their images would load only when a branch
// is first expanded and pop in after the fallback renders. Warming them once
// at mount keeps expansion flicker-free.
function collectImageUrls(nodes: Node[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.avatar ? [node.avatar] : []),
    ...(node.flag ? [`https://flagcdn.com/${node.flag.toLowerCase()}.svg`] : []),
    ...(node.children ? collectImageUrls(node.children) : []),
  ]);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

const columns: ColumnDef<DataGridFeatures, Node>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => <DataGridColumnHeader title="Name" column={column} />,
    cell: ({ row }) => (
      <div class="flex items-center gap-1">
        <DataGridTableRowExpand row={row} class="-ms-1.5 -me-1" />
        <Show
          when={row.original.type === "member"}
          fallback={<span class="font-medium text-foreground">{row.original.name}</span>}
        >
          <Avatar class="size-6 shrink-0">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <a href="#name" class="font-medium text-foreground hover:text-primary">
            {row.original.name}
          </a>
        </Show>
      </div>
    ),
    minSize: 260,
    enableSorting: true,
    enableHiding: false,
    meta: { autoSize: true },
  },
  {
    accessorKey: "role",
    id: "role",
    header: ({ column }) => <DataGridColumnHeader title="Role" column={column} />,
    cell: ({ row }) => (
      <div class="text-muted-foreground">
        {row.original.role ?? (row.original.type === "department" ? "Department" : "Team")}
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "location",
    id: "location",
    header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
    cell: ({ row }) => (
      <Show
        when={row.original.location && row.original.flag}
        fallback={<span class="text-muted-foreground">-</span>}
      >
        <div class="flex items-center gap-1.5">
          <img
            src={`https://flagcdn.com/${row.original.flag?.toLowerCase()}.svg`}
            alt={row.original.flag}
            class="size-4 rounded-full object-cover"
          />
          <div class="font-medium text-foreground">{row.original.location}</div>
        </div>
      </Show>
    ),
    size: 180,
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
    cell: ({ row }) =>
      row.original.status === "active" ? (
        <Badge variant="outline" class="text-green-700 dark:text-green-300">
          Active
        </Badge>
      ) : (
        <Badge variant="outline" class="text-amber-700 dark:text-amber-300">
          Inactive
        </Badge>
      ),
    size: 130,
  },
];

export default function DataGridTreeRows() {
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  });
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [expanded, setExpanded] = createSignal<ExpandedState>({
    eng: true,
    "eng-platform": true,
  });

  onMount(() => {
    for (const src of collectImageUrls(demoData)) {
      const image = new Image();
      image.src = src;
    }
  });

  const table = createTable({
    features: dataGridFeatures,
    columns,
    data: demoData,
    get pageCount() {
      return Math.ceil(demoData.length / pagination().pageSize);
    },
    getRowId: (row: Node) => row.id,
    getSubRows: (row: Node) => row.children,
    state: {
      get pagination() {
        return pagination();
      },
      get sorting() {
        return sorting();
      },
      get expanded() {
        return expanded();
      },
    },
    // Keep expanded children on the same page as their parent.
    paginateExpandedRows: false,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
  });

  return (
    <DataGrid
      table={table}
      recordCount={demoData.length}
      tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
    >
      <div class="w-full space-y-2.5">
        <Card class="overflow-hidden p-0">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
        </Card>
        <DataGridPagination sizes={[4, 8, 16]} />
      </div>
    </DataGrid>
  );
}
