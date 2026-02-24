import {
  CalendarIcon,
  CircleDotDashedIcon,
  HashIcon,
  Heading1Icon,
  TagIcon,
  UserIcon,
} from "lucide-solid";
import { createMemo, createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { DataTableFilter } from "@/registry/kobalte/blocks/data-table-filter";
import { createColumnConfigHelper } from "@/registry/kobalte/blocks/data-table-filter/core/filters";
import type { FiltersState } from "@/registry/kobalte/blocks/data-table-filter/core/types";
import { useDataTableFilters } from "@/registry/kobalte/blocks/data-table-filter/hooks/use-data-table-filters";

// -- Shared types and data --

interface Issue {
  id: string;
  title: string;
  status: { id: string; label: string };
  assignee: string;
  labels: string[];
  estimatedHours: number;
  createdAt: Date;
}

const issues: Issue[] = [
  {
    id: "1",
    title: "Fix login page layout",
    status: { id: "in_progress", label: "In Progress" },
    assignee: "alice",
    labels: ["bug", "frontend"],
    estimatedHours: 3,
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    title: "Add dark mode support",
    status: { id: "backlog", label: "Backlog" },
    assignee: "bob",
    labels: ["feature", "frontend"],
    estimatedHours: 8,
    createdAt: new Date("2025-01-20"),
  },
  {
    id: "3",
    title: "Optimize database queries",
    status: { id: "done", label: "Done" },
    assignee: "charlie",
    labels: ["performance", "backend"],
    estimatedHours: 5,
    createdAt: new Date("2025-02-01"),
  },
  {
    id: "4",
    title: "Write API documentation",
    status: { id: "in_progress", label: "In Progress" },
    assignee: "alice",
    labels: ["docs"],
    estimatedHours: 4,
    createdAt: new Date("2025-02-05"),
  },
  {
    id: "5",
    title: "Set up CI/CD pipeline",
    status: { id: "backlog", label: "Backlog" },
    assignee: "bob",
    labels: ["infra"],
    estimatedHours: 6,
    createdAt: new Date("2025-02-10"),
  },
];

const statusOptions = [
  { label: "Backlog", value: "backlog" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const assigneeOptions = [
  { label: "Alice", value: "alice" },
  { label: "Bob", value: "bob" },
  { label: "Charlie", value: "charlie" },
];

const labelOptions = [
  { label: "Bug", value: "bug" },
  { label: "Feature", value: "feature" },
  { label: "Frontend", value: "frontend" },
  { label: "Backend", value: "backend" },
  { label: "Performance", value: "performance" },
  { label: "Docs", value: "docs" },
  { label: "Infra", value: "infra" },
];

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
    .id("status")
    .accessor((row) => row.status.id)
    .displayName("Status")
    .icon(CircleDotDashedIcon)
    .options(statusOptions)
    .build(),
  dtf
    .option()
    .id("assignee")
    .accessor((row) => row.assignee)
    .displayName("Assignee")
    .icon(UserIcon)
    .options(assigneeOptions)
    .build(),
  dtf
    .multiOption()
    .id("labels")
    .accessor((row) => row.labels)
    .displayName("Labels")
    .icon(TagIcon)
    .options(labelOptions)
    .build(),
  dtf
    .number()
    .id("estimatedHours")
    .accessor((row) => row.estimatedHours)
    .displayName("Est. Hours")
    .icon(HashIcon)
    .build(),
  dtf
    .date()
    .id("createdAt")
    .accessor((row) => row.createdAt)
    .displayName("Created At")
    .icon(CalendarIcon)
    .build(),
] as const;

export default function DataTableFilterExample() {
  return (
    <ExampleWrapper class="md:grid-cols-1">
      <DataTableFilterBasic />
      <DataTableFilterWithDefaults />
      <DataTableFilterControlled />
      <DataTableFilterLocale />
    </ExampleWrapper>
  );
}

function DataTableFilterBasic() {
  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "client",
    data: issues,
    columnsConfig,
  });

  return (
    <Example title="Basic" class="items-stretch">
      <DataTableFilter
        filters={filters()}
        columns={columns()}
        actions={actions}
        strategy={strategy}
      />
      <p class="text-muted-foreground text-sm">Active filters: {filters().length}</p>
    </Example>
  );
}

function DataTableFilterWithDefaults() {
  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "client",
    data: issues,
    columnsConfig,
    defaultFilters: [
      {
        columnId: "status",
        type: "option",
        operator: "is",
        values: ["backlog"],
      },
    ],
  });

  return (
    <Example title="With Default Filters" class="items-stretch">
      <DataTableFilter
        filters={filters()}
        columns={columns()}
        actions={actions}
        strategy={strategy}
      />
      <p class="text-muted-foreground text-sm">Active filters: {filters().length}</p>
    </Example>
  );
}

function DataTableFilterControlled() {
  const [controlledFilters, setControlledFilters] = createSignal<FiltersState>([
    {
      columnId: "assignee",
      type: "option",
      operator: "is any of",
      values: ["alice", "bob"],
    },
  ]);

  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "client",
    data: issues,
    columnsConfig,
    filters: controlledFilters,
    onFiltersChange: setControlledFilters,
  });

  const filteredCount = createMemo(() => {
    return issues.filter((issue) => {
      return filters().every((filter) => {
        if (filter.columnId === "assignee" && filter.type === "option") {
          if (filter.operator === "is" || filter.operator === "is any of") {
            return filter.values.includes(issue.assignee);
          }
          if (filter.operator === "is not" || filter.operator === "is none of") {
            return !filter.values.includes(issue.assignee);
          }
        }
        return true;
      });
    }).length;
  });

  return (
    <Example title="Controlled State" class="items-stretch">
      <DataTableFilter
        filters={filters()}
        columns={columns()}
        actions={actions}
        strategy={strategy}
      />
      <p class="text-muted-foreground text-sm">
        Matching issues: {filteredCount()} / {issues.length}
      </p>
    </Example>
  );
}

function DataTableFilterLocale() {
  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "client",
    data: issues,
    columnsConfig,
    defaultFilters: [
      {
        columnId: "status",
        type: "option",
        operator: "is",
        values: ["in_progress"],
      },
    ],
  });

  return (
    <Example title="Internationalization (French)" class="items-stretch">
      <DataTableFilter
        filters={filters()}
        columns={columns()}
        actions={actions}
        strategy={strategy}
        locale="fr"
      />
      <p class="text-muted-foreground text-sm">Filtres actifs: {filters().length}</p>
    </Example>
  );
}
