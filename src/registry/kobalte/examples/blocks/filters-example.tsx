import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import {
  AtSign,
  Bug,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Eye,
  FunnelX,
  Globe,
  Link2,
  ListFilter,
  MapPin,
  Signal,
  Tag,
  Type,
  Users,
  Wallet,
} from "lucide-solid";
import { type ComponentProps, createSignal, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar, type CalendarRangeValue } from "@/registry/kobalte/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function FiltersExample() {
  return (
    <ExampleWrapper class="md:grid-cols-1 lg:grid-cols-1 2xl:grid-cols-1">
      <IssueInbox />
      <AudienceSegment />
      <ContactValidation />
    </ExampleWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared matching                                                            */
/* -------------------------------------------------------------------------- */

// Every row value is read as a list of strings, so a scalar column (status) and
// a repeated one (labels) go through the same operator table.
type FieldReader<T> = (row: T) => string[];

const lower = (value: string) => value.toLowerCase();

function matchesFilter<T>(row: T, filter: Filter, readers: Record<string, FieldReader<T>>) {
  const read = readers[filter.field];
  if (!read) return true;

  const actual = read(row);
  const wanted = filter.values.filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );

  if (filter.operator === "empty") return actual.length === 0;
  if (filter.operator === "not_empty") return actual.length > 0;
  // A chip that has been added but not filled in yet must not narrow anything.
  if (wanted.length === 0) return true;

  const overlaps = wanted.some((value) => actual.includes(value));
  const contains = wanted.some((needle) =>
    actual.some((value) => lower(value).includes(lower(needle))),
  );

  switch (filter.operator) {
    case "is":
    case "is_any_of":
      return overlaps;
    case "is_not":
    case "is_not_any_of":
      return !overlaps;
    case "includes_all":
      return wanted.every((value) => actual.includes(value));
    case "excludes_all":
      return wanted.every((value) => !actual.includes(value));
    case "contains":
      return contains;
    case "not_contains":
      return !contains;
    case "starts_with":
      return wanted.some((needle) =>
        actual.some((value) => lower(value).startsWith(lower(needle))),
      );
    case "ends_with":
      return wanted.some((needle) => actual.some((value) => lower(value).endsWith(lower(needle))));
    // ISO day strings sort lexicographically, so a plain string compare is a
    // correct date comparison here — no parsing needed on the hot path.
    case "between":
      return actual.some((value) => value >= wanted[0] && value <= (wanted[1] ?? wanted[0]));
    case "not_between":
      return !actual.some((value) => value >= wanted[0] && value <= (wanted[1] ?? wanted[0]));
    default:
      return true;
  }
}

function applyFilters<T>(rows: T[], filters: Filter[], readers: Record<string, FieldReader<T>>) {
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter, readers)));
}

/* -------------------------------------------------------------------------- */
/*  Issue inbox                                                                */
/* -------------------------------------------------------------------------- */

type Issue = {
  id: string;
  title: string;
  status: "triage" | "in-progress" | "in-review" | "shipped";
  priority: "low" | "medium" | "high" | "urgent";
  labels: string[];
  assignee: string;
  updated: string;
};

const isoDay = (date: Date) => format(date, "yyyy-MM-dd");
const daysAgo = (days: number) => isoDay(subDays(new Date(), days));

const issues: Issue[] = [
  {
    id: "ZDN-412",
    title: "Popover flips to the wrong side in RTL layouts",
    status: "in-review",
    priority: "high",
    labels: ["bug", "a11y"],
    assignee: "shadcn",
    updated: daysAgo(1),
  },
  {
    id: "ZDN-408",
    title: "Command menu drops focus after the list re-renders",
    status: "in-progress",
    priority: "urgent",
    labels: ["bug", "regression"],
    assignee: "evilrabbit",
    updated: daysAgo(3),
  },
  {
    id: "ZDN-397",
    title: "Document the theming tokens for the sidebar",
    status: "triage",
    priority: "low",
    labels: ["docs"],
    assignee: "pranathip",
    updated: daysAgo(9),
  },
  {
    id: "ZDN-388",
    title: "Virtualized table drops rows on fast scroll",
    status: "in-progress",
    priority: "urgent",
    labels: ["bug", "performance"],
    assignee: "maxleiter",
    updated: daysAgo(12),
  },
  {
    id: "ZDN-361",
    title: "Date picker announces the wrong month to screen readers",
    status: "in-review",
    priority: "medium",
    labels: ["a11y"],
    assignee: "jorgezreik",
    updated: daysAgo(21),
  },
  {
    id: "ZDN-344",
    title: "Ship the new toast stacking animation",
    status: "shipped",
    priority: "medium",
    labels: ["design"],
    assignee: "pranathip",
    updated: daysAgo(34),
  },
];

const issueReaders: Record<string, FieldReader<Issue>> = {
  title: (issue) => [issue.title],
  status: (issue) => [issue.status],
  priority: (issue) => [issue.priority],
  label: (issue) => issue.labels,
  assignee: (issue) => [issue.assignee],
  updated: (issue) => [issue.updated],
};

const statusMeta = {
  triage: { label: "Triage", variant: "warning-light" },
  "in-progress": { label: "In progress", variant: "info-light" },
  "in-review": { label: "In review", variant: "primary-light" },
  shipped: { label: "Shipped", variant: "success-light" },
} as const;

const priorityMeta = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "info-outline" },
  high: { label: "High", variant: "warning-outline" },
  urgent: { label: "Urgent", variant: "destructive-outline" },
} as const;

const handles = ["shadcn", "evilrabbit", "maxleiter", "pranathip", "jorgezreik"];

function Handle(props: { handle: string; class?: string }) {
  return (
    <Avatar class={props.class ?? "size-5 border"}>
      <AvatarImage src={`https://github.com/${props.handle}.png`} alt={props.handle} />
      <AvatarFallback>{props.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

const toDay = (value: unknown) => (typeof value === "string" ? parseISO(value) : undefined);

// A `custom` field owns its whole editor: the chip renders this trigger, and the
// popover commits an ISO day pair back through `onChange`.
function DateWindowControl(props: { values: unknown[]; onChange: (values: unknown[]) => void }) {
  const today = new Date();
  const presets = [
    { label: "Last 7 days", from: subDays(today, 6), to: today },
    { label: "Last 30 days", from: subDays(today, 29), to: today },
    { label: "This month", from: startOfMonth(today), to: today },
    {
      label: "Last month",
      from: startOfMonth(subMonths(today, 1)),
      to: endOfMonth(subMonths(today, 1)),
    },
  ];

  const [open, setOpen] = createSignal(false);
  const [range, setRange] = createSignal<CalendarRangeValue | undefined>({
    from: toDay(props.values[0]),
    to: toDay(props.values[1]),
  });

  const commit = (next: CalendarRangeValue | undefined) => {
    setRange(next);
    if (!next?.from) return;
    props.onChange([isoDay(next.from), isoDay(next.to ?? next.from)]);
    setOpen(false);
  };

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-start" gutter={8}>
      <PopoverTrigger class="cursor-default text-start outline-hidden">
        <Show when={range()?.from} fallback={<span>any time</span>}>
          {(from) => (
            <>
              {format(from(), "LLL d")}
              <Show when={range()?.to}>{(to) => ` – ${format(to(), "LLL d")}`}</Show>
            </>
          )}
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0">
        <div class="flex max-sm:flex-col">
          <div class="flex flex-col gap-0.5 border-border p-2 max-sm:order-1 max-sm:border-t sm:w-36 sm:border-e">
            <For each={presets}>
              {(preset) => (
                <Button
                  variant="ghost"
                  size="sm"
                  class="justify-start"
                  onClick={() => commit({ from: preset.from, to: preset.to })}
                >
                  {preset.label}
                </Button>
              )}
            </For>
          </div>
          <Calendar mode="range" selected={range()} onSelect={setRange} showOutsideDays={false} />
        </div>
        <div class="flex items-center justify-end gap-1.5 border-border border-t p-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => commit(range())}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddFilterTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" {...props}>
      <ListFilter />
      Add filter
    </Button>
  );
}

function IssueInbox() {
  const fields: FilterFieldConfig[] = [
    {
      group: "Issue",
      fields: [
        {
          key: "title",
          label: "Title",
          type: "text",
          icon: () => <Type class="size-3.5" />,
          class: "w-56",
          placeholder: "Search titles...",
        },
        {
          key: "label",
          label: "Label",
          type: "multiselect",
          icon: () => <Tag class="size-3.5" />,
          class: "w-[200px]",
          options: [
            { value: "bug", label: "bug", icon: () => <Bug class="size-3.5 text-destructive" /> },
            { value: "regression", label: "regression" },
            { value: "performance", label: "performance" },
            { value: "a11y", label: "a11y" },
            { value: "design", label: "design" },
            { value: "docs", label: "docs" },
          ],
        },
      ],
    },
    {
      group: "Triage",
      fields: [
        {
          key: "status",
          label: "Status",
          type: "select",
          icon: () => <CircleDot class="size-3.5" />,
          searchable: false,
          class: "w-[190px]",
          options: [
            {
              value: "triage",
              label: "Triage",
              icon: () => <CircleDashed class="size-4 text-muted-foreground" />,
            },
            {
              value: "in-progress",
              label: "In progress",
              icon: () => <CircleDot class="size-4 text-primary" />,
            },
            {
              value: "in-review",
              label: "In review",
              icon: () => <Eye class="size-4 text-primary" />,
            },
            {
              value: "shipped",
              label: "Shipped",
              icon: () => <CircleCheck class="size-4 text-primary" />,
            },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          type: "multiselect",
          icon: () => <Signal class="size-3.5" />,
          class: "w-[190px]",
          options: [
            { value: "urgent", label: "Urgent" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ],
        },
        {
          key: "updated",
          label: "Updated",
          type: "custom",
          icon: () => <CalendarRange class="size-3.5" />,
          // Without this the block would open a new chip on "is", which no
          // custom operator here understands.
          defaultOperator: "between",
          operators: [
            { value: "between", label: "within" },
            { value: "not_between", label: "not within" },
          ],
          customRenderer: (renderer) => (
            <DateWindowControl values={renderer.values} onChange={renderer.onChange} />
          ),
        },
      ],
    },
    {
      group: "People",
      fields: [
        {
          key: "assignee",
          label: "Assignee",
          type: "multiselect",
          icon: () => <Users class="size-3.5" />,
          class: "w-[200px]",
          options: handles.map((handle) => ({
            value: handle,
            label: `@${handle}`,
            icon: () => <Handle handle={handle} />,
          })),
        },
      ],
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("status", "is_not_any_of", ["shipped"]),
    createFilter("priority", "is_any_of", ["urgent", "high"]),
  ]);

  const rows = () => applyFilters(issues, filters(), issueReaders);

  return (
    <Example title="Issue inbox">
      <div class="w-full space-y-4">
        <div class="flex items-start gap-2.5">
          <div class="flex-1">
            <Filters
              filters={filters()}
              fields={fields}
              onChange={setFilters}
              trigger={AddFilterTrigger}
              enableShortcut
              shortcutKey="f"
              shortcutLabel="F"
            />
          </div>
          <Show when={filters().length > 0}>
            <Button variant="outline" onClick={() => setFilters([])}>
              <FunnelX />
              Clear
            </Button>
          </Show>
        </div>

        <div class="divide-y divide-border overflow-hidden rounded-lg border">
          <Show
            when={rows().length > 0}
            fallback={
              <p class="p-8 text-center text-muted-foreground text-sm">
                No issues match these filters.
              </p>
            }
          >
            <For each={rows()}>
              {(issue) => (
                <div class="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <Handle handle={issue.assignee} class="size-7 border" />
                  <div class="min-w-50 flex-1">
                    <p class="truncate font-medium text-sm">{issue.title}</p>
                    <p class="text-muted-foreground text-xs">
                      {issue.id} · updated {format(parseISO(issue.updated), "LLL d")}
                    </p>
                  </div>
                  <For each={issue.labels}>
                    {(label) => <Badge variant="outline">{label}</Badge>}
                  </For>
                  <Badge variant={priorityMeta[issue.priority].variant}>
                    {priorityMeta[issue.priority].label}
                  </Badge>
                  <Badge variant={statusMeta[issue.status].variant}>
                    {statusMeta[issue.status].label}
                  </Badge>
                </div>
              )}
            </For>
          </Show>
        </div>

        <p class="text-muted-foreground text-xs">
          {rows().length} of {issues.length} issues · press F to open the filter menu
        </p>
      </div>
    </Example>
  );
}

/* -------------------------------------------------------------------------- */
/*  Audience segment                                                           */
/* -------------------------------------------------------------------------- */

type Customer = {
  handle: string;
  company: string;
  plan: "free" | "pro" | "scale" | "enterprise";
  region: "amer" | "emea" | "apac";
  source: string;
  mrr: number;
};

const customers: Customer[] = [
  {
    handle: "shadcn",
    company: "Northwind Labs",
    plan: "enterprise",
    region: "amer",
    source: "outbound",
    mrr: 4800,
  },
  {
    handle: "evilrabbit",
    company: "Bluewave Studio",
    plan: "scale",
    region: "emea",
    source: "referral",
    mrr: 1450,
  },
  {
    handle: "maxleiter",
    company: "Cobalt Freight",
    plan: "pro",
    region: "amer",
    source: "search",
    mrr: 320,
  },
  {
    handle: "pranathip",
    company: "Kite & Co",
    plan: "pro",
    region: "apac",
    source: "referral",
    mrr: 290,
  },
  {
    handle: "jorgezreik",
    company: "Terrace Health",
    plan: "scale",
    region: "amer",
    source: "outbound",
    mrr: 2100,
  },
];

const customerReaders: Record<string, FieldReader<Customer>> = {
  plan: (customer) => [customer.plan],
  region: (customer) => [customer.region],
  source: (customer) => [customer.source],
  company: (customer) => [customer.company],
};

const planMeta = {
  free: { label: "Free", variant: "secondary" },
  pro: { label: "Pro", variant: "info-light" },
  scale: { label: "Scale", variant: "primary-light" },
  enterprise: { label: "Enterprise", variant: "success-light" },
} as const;

function SmallIconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon-sm" {...props}>
      <ListFilter />
    </Button>
  );
}

function AudienceSegment() {
  const fields: FilterFieldConfig[] = [
    {
      key: "plan",
      label: "Plan",
      type: "multiselect",
      icon: () => <Wallet class="size-3.5" />,
      class: "w-[190px]",
      options: [
        { value: "free", label: "Free" },
        { value: "pro", label: "Pro" },
        { value: "scale", label: "Scale" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      icon: () => <MapPin class="size-3.5" />,
      searchable: false,
      class: "w-[170px]",
      options: [
        { value: "amer", label: "Americas" },
        { value: "emea", label: "EMEA" },
        { value: "apac", label: "APAC" },
      ],
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      icon: () => <Globe class="size-3.5" />,
      searchable: true,
      class: "w-[170px]",
      options: [
        { value: "referral", label: "Referral" },
        { value: "outbound", label: "Outbound" },
        { value: "search", label: "Search" },
      ],
    },
    {
      key: "company",
      label: "Company",
      type: "text",
      icon: () => <Type class="size-3.5" />,
      class: "w-48",
      placeholder: "Search companies...",
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("plan", "is_any_of", ["scale", "enterprise"]),
  ]);

  const rows = () => applyFilters(customers, filters(), customerReaders);
  const mrr = () => rows().reduce((total, customer) => total + customer.mrr, 0);

  return (
    <Example title="Audience segment">
      <div class="w-full space-y-4 rounded-lg border p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium text-sm">Expansion candidates</p>
            <p class="text-muted-foreground text-xs">
              {rows().length} accounts · ${mrr().toLocaleString("en-US")} MRR
            </p>
          </div>
          <Badge variant="success-outline">Live segment</Badge>
        </div>

        <Filters
          filters={filters()}
          fields={fields}
          onChange={setFilters}
          size="sm"
          radius="full"
          trigger={SmallIconTrigger}
        />

        <div class="space-y-2">
          <Show
            when={rows().length > 0}
            fallback={<p class="text-muted-foreground text-sm">No accounts in this segment.</p>}
          >
            <For each={rows()}>
              {(customer) => (
                <div class="flex items-center gap-3 text-sm">
                  <Handle handle={customer.handle} class="size-6 border" />
                  <span class="flex-1 truncate">{customer.company}</span>
                  <Badge variant={planMeta[customer.plan].variant}>
                    {planMeta[customer.plan].label}
                  </Badge>
                  <span class="w-20 text-end text-muted-foreground tabular-nums">
                    ${customer.mrr.toLocaleString("en-US")}
                  </span>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </Example>
  );
}

/* -------------------------------------------------------------------------- */
/*  Validated values                                                           */
/* -------------------------------------------------------------------------- */

const invalid = (message: string) => ({ valid: false, message });

function ContactValidation() {
  const fields: FilterFieldConfig[] = [
    {
      key: "email",
      label: "Email",
      type: "text",
      icon: () => <AtSign class="size-3.5" />,
      class: "w-56",
      placeholder: "billing@acme.com",
      validation: (value) =>
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))
          ? { valid: true }
          : invalid("Enter a valid email address"),
    },
    {
      key: "website",
      label: "Website",
      type: "text",
      icon: () => <Link2 class="size-3.5" />,
      class: "w-56",
      placeholder: "https://acme.com",
      validation: (value) =>
        /^https?:\/\/[^\s.]+\.[^\s]+$/.test(String(value))
          ? { valid: true }
          : invalid("URL must start with http:// or https://"),
    },
    {
      key: "seats",
      label: "Seats",
      type: "text",
      icon: () => <Users class="size-3.5" />,
      class: "w-32",
      placeholder: "25",
      validation: (value) =>
        /^\d+$/.test(String(value)) ? { valid: true } : invalid("Seats must be a whole number"),
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("email", "contains", ["billing@acme.com"]),
    createFilter("website", "is", ["acme.com"]),
    createFilter("seats", "is", ["25"]),
  ]);

  return (
    <Example title="Validated values">
      <div class="w-full space-y-3">
        <Filters filters={filters()} fields={fields} onChange={setFilters} />
        <p class="text-muted-foreground text-xs">
          Values are checked when a field loses focus. Tab out of the website chip — it is missing
          its scheme, so it gets flagged with the reason.
        </p>
      </div>
    </Example>
  );
}
