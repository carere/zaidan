import {
  type ColumnDef,
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/solid-table";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  CircleDotIcon,
  CircleIcon,
  ClockIcon,
  Heading1Icon,
  TagsIcon,
  UserCheckIcon,
} from "lucide-solid";
import type { Component } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { cn } from "@/lib/utils";
import { DataTableFilter, useDataTableFilters } from "@/registry/kobalte/blocks/data-table-filter";
import { createColumnConfigHelper } from "@/registry/kobalte/blocks/data-table-filter/core/filters";
import type { FiltersState } from "@/registry/kobalte/blocks/data-table-filter/core/types";
import {
  createTSTColumns,
  createTSTFilters,
} from "@/registry/kobalte/blocks/data-table-filter/integrations/tanstack-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/kobalte/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

// --- Types ---

type User = {
  id: string;
  name: string;
  picture: string;
};

type IssueLabel = {
  id: string;
  name: string;
  color: string;
};

type IssueStatus = {
  id: "backlog" | "todo" | "in-progress" | "done";
  name: string;
  order: number;
  icon: Component<{ class?: string }>;
};

type Issue = {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  labels?: IssueLabel[];
  assignee?: User;
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  isUrgent: boolean;
};

// --- Static Data ---

const USERS: User[] = [
  { id: "u1", name: "John Smith", picture: "/avatars/john-smith.png" },
  { id: "u2", name: "Rose Eve", picture: "/avatars/rose-eve.png" },
  { id: "u3", name: "Adam Young", picture: "/avatars/adam-young.png" },
  { id: "u4", name: "Michael Scott", picture: "/avatars/michael-scott.png" },
];

const ISSUE_STATUSES: IssueStatus[] = [
  { id: "backlog", name: "Backlog", icon: CircleDashedIcon, order: 1 },
  { id: "todo", name: "Todo", icon: CircleIcon, order: 2 },
  { id: "in-progress", name: "In Progress", icon: CircleDotIcon, order: 3 },
  { id: "done", name: "Done", icon: CircleCheckIcon, order: 4 },
];

const ISSUE_LABELS: IssueLabel[] = [
  { id: "l1", name: "Bug", color: "red" },
  { id: "l2", name: "Enhancement", color: "green" },
  { id: "l3", name: "Task", color: "blue" },
  { id: "l4", name: "Urgent", color: "pink" },
  { id: "l5", name: "Frontend", color: "orange" },
  { id: "l6", name: "Backend", color: "teal" },
];

const LABEL_STYLES_MAP = {
  red: "bg-red-100 border-red-200 text-red-800 dark:bg-red-800 dark:border-red-700 dark:text-red-100",
  orange:
    "bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-800 dark:border-orange-700 dark:text-orange-100",
  green:
    "bg-green-100 border-green-200 text-green-800 dark:bg-green-800 dark:border-green-700 dark:text-green-100",
  blue: "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-800 dark:border-blue-700 dark:text-blue-100",
  pink: "bg-pink-100 border-pink-200 text-pink-800 dark:bg-pink-800 dark:border-pink-700 dark:text-pink-100",
  teal: "bg-teal-100 border-teal-200 text-teal-800 dark:bg-teal-800 dark:border-teal-700 dark:text-teal-100",
} as const;

const LABEL_STYLES_BG = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
} as const;

type TW_COLOR = keyof typeof LABEL_STYLES_MAP;

function randomItem<T>(arr: readonly T[]): T {
  // biome-ignore lint/style/noNonNullAssertion: guaranteed non-empty array
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateIssues(count: number): Issue[] {
  const titles = [
    "Fix task sidebar",
    "Add keyboard shortcuts",
    "Improve search performance",
    "Refactor auth flow",
    "Update API integration",
    "Remove legacy code",
    "Implement dark mode",
    "Optimize mobile view",
    "Redesign notifications",
    "Revert board drag & drop",
  ];

  const issues: Issue[] = [];
  for (let i = 0; i < count; i++) {
    const status = randomItem(ISSUE_STATUSES);
    const hasLabels = Math.random() > 0.5;
    const hasAssignee = Math.random() > 0.3;
    issues.push({
      id: `issue-${i}`,
      title: randomItem(titles),
      status,
      labels: hasLabels ? [randomItem(ISSUE_LABELS)] : undefined,
      assignee: hasAssignee ? randomItem(USERS) : undefined,
      estimatedHours: Math.floor(Math.random() * 16) + 1,
      isUrgent: Math.random() > 0.9,
    });
  }
  return issues;
}

const ISSUES = generateIssues(50);

// --- Table Column Definitions ---

const columnHelper = createColumnHelper<Issue>();

const tstColumnDefs = [
  columnHelper.display({
    id: "select",
    header: (ctx) => (
      <Checkbox
        checked={ctx.table.getIsAllPageRowsSelected()}
        indeterminate={ctx.table.getIsSomePageRowsSelected()}
        onChange={(value) => ctx.table.toggleAllRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: (ctx) => (
      <Checkbox
        checked={ctx.row.getIsSelected()}
        onChange={(value) => ctx.row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
  }),
  columnHelper.accessor((row) => row.status.id, {
    id: "status",
    header: "Status",
    enableColumnFilter: true,
    cell: (ctx) => {
      const StatusIcon = ctx.row.original.status.icon;
      return (
        <div class="flex items-center gap-2">
          <StatusIcon class="size-4" />
          <span>{ctx.row.original.status.name}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.title, {
    id: "title",
    header: "Title",
    enableColumnFilter: true,
    cell: (ctx) => (
      <div class="flex items-center gap-2">
        <span>{ctx.row.getValue("title")}</span>
        <Show when={ctx.row.original.isUrgent}>
          <Tooltip>
            <TooltipTrigger>
              <CircleAlertIcon class="size-5 fill-red-600 stroke-[2.5px] stroke-white dark:stroke-black" />
            </TooltipTrigger>
            <TooltipContent>Urgent issue</TooltipContent>
          </Tooltip>
        </Show>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.assignee?.id, {
    id: "assignee",
    header: "Assignee",
    enableColumnFilter: true,
    cell: (ctx) => {
      const user = ctx.row.original.assignee;
      return (
        <Show when={user} fallback={<CircleDashedIcon class="size-5 text-border" />}>
          {(u) => {
            const initials = u()
              .name.split(" ")
              .map((x) => x[0])
              .join("")
              .toUpperCase();
            return (
              <Avatar class="size-5">
                <AvatarImage src={u().picture} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            );
          }}
        </Show>
      );
    },
  }),
  columnHelper.accessor((row) => row.estimatedHours, {
    id: "estimatedHours",
    header: "Estimated Hours",
    enableColumnFilter: true,
    cell: (ctx) => {
      const hours = ctx.row.getValue<number>("estimatedHours");
      return (
        <Show when={hours}>
          <span>
            <span class="tabular-nums tracking-tighter">{hours}</span>
            <span class="ml-0.5 text-muted-foreground">h</span>
          </span>
        </Show>
      );
    },
  }),
  columnHelper.accessor((row) => row.labels, {
    id: "labels",
    header: "Labels",
    enableColumnFilter: true,
    cell: (ctx) => {
      const labels = ctx.row.original.labels;
      return (
        <Show when={labels}>
          {(ls) => (
            <div class="flex gap-1">
              <For each={ls()}>
                {(l) => (
                  <div
                    class={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 font-medium text-[12px] shadow-xs",
                      LABEL_STYLES_MAP[l.color as TW_COLOR],
                    )}
                  >
                    {l.name}
                  </div>
                )}
              </For>
            </div>
          )}
        </Show>
      );
    },
  }),
] as ColumnDef<Issue, any>[];

// --- Filter Column Configurations ---

const dtf = createColumnConfigHelper<Issue>();

const columnsConfig = [
  dtf
    .text()
    .id("title")
    .accessor((row) => row.title)
    .displayName("Title")
    .icon(Heading1Icon)
    .build(),
  dtf
    .option()
    .accessor((row) => row.status.id)
    .id("status")
    .displayName("Status")
    .icon(CircleDotDashedIcon)
    .options(ISSUE_STATUSES.map((s) => ({ value: s.id, label: s.name, icon: s.icon })))
    .build(),
  dtf
    .option()
    .accessor((row) => row.assignee)
    .id("assignee")
    .displayName("Assignee")
    .icon(UserCheckIcon)
    .transformOptionFn((u) => ({
      value: u.id,
      label: u.name,
      icon: (
        <Avatar class="size-4">
          <AvatarImage src={u.picture} />
          <AvatarFallback>
            {u.name
              .split("")
              .map((x) => x[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ),
    }))
    .build(),
  dtf
    .multiOption()
    .accessor((row) => row.labels)
    .id("labels")
    .displayName("Labels")
    .icon(TagsIcon)
    .transformOptionFn((l) => ({
      value: l.id,
      label: l.name,
      icon: () => <div class={cn("size-2.5 rounded-full", LABEL_STYLES_BG[l.color as TW_COLOR])} />,
    }))
    .build(),
  dtf
    .number()
    .accessor((row) => row.estimatedHours)
    .id("estimatedHours")
    .displayName("Estimated hours")
    .icon(ClockIcon)
    .min(0)
    .max(100)
    .build(),
] as const;

// --- Main Example ---

export default function DataTableFilterExample() {
  return (
    <ExampleWrapper>
      <IssuesTableDemo />
    </ExampleWrapper>
  );
}

function IssuesTableDemo() {
  return (
    <Example title="Issues Table with Filters" class="w-full">
      <IssuesTableWrapper />
    </Example>
  );
}

function IssuesTableWrapper() {
  const [filters, setFilters] = createSignal<FiltersState>([]);
  return <IssuesTable filters={filters()} onFiltersChange={setFilters} />;
}

function IssuesTable(props: {
  filters: FiltersState;
  onFiltersChange: (fn: FiltersState | ((prev: FiltersState) => FiltersState)) => void;
}) {
  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "client",
    data: ISSUES,
    columnsConfig,
    filters: () => props.filters,
    onFiltersChange: props.onFiltersChange as any,
  });

  const tstColumns = createMemo(() =>
    createTSTColumns({
      columns: tstColumnDefs,
      configs: columns(),
    }),
  );

  const tstFilters = createMemo(() => createTSTFilters(filters()));

  const [rowSelection, setRowSelection] = createSignal({});

  const table = createSolidTable({
    get data() {
      return ISSUES;
    },
    get columns() {
      return tstColumns();
    },
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      get rowSelection() {
        return rowSelection();
      },
      get columnFilters() {
        return tstFilters();
      },
      columnVisibility: {
        isUrgent: false,
      },
    },
  });

  const selectedRows = () =>
    new Intl.NumberFormat().format(table.getFilteredSelectedRowModel().rows.length);
  const totalAvailableRows = () =>
    new Intl.NumberFormat().format(table.getFilteredRowModel().rows.length);
  const totalRows = () => new Intl.NumberFormat().format(table.getCoreRowModel().rows.length);

  return (
    <div class="w-full">
      <div class="flex items-center gap-2 pb-4">
        <DataTableFilter
          filters={filters()}
          columns={columns()}
          actions={actions}
          strategy={strategy}
        />
      </div>
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow class="bg-popover">
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <TableHead>
                        <Show when={!header.isPlaceholder}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </Show>
                      </TableHead>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </TableHeader>
          <TableBody>
            <Show
              when={table.getRowModel().rows.length > 0}
              fallback={
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} class="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              }
            >
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <TableRow data-state={row.getIsSelected() && "selected"} class="h-12">
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <TableCell>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )}
                    </For>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
        </Table>
      </div>
      <div class="flex items-center justify-end space-x-2 py-4">
        <div class="flex-1 text-muted-foreground text-sm tabular-nums">
          {selectedRows()} of {totalAvailableRows()} row(s) selected.{" "}
          <span class="font-medium text-primary">Total row count: {totalRows()}</span>
        </div>
        <div class="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
