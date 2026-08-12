import { Building, FunnelX, ListFilter, Mail, MapPin, User } from "lucide-solid";
import { type ComponentProps, createSignal, For, Index, Show } from "solid-js";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
import { Alert, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/kobalte/ui/table";

type Staff = {
  id: string;
  name: string;
  availability: "online" | "away" | "busy" | "offline";
  avatar: string;
  status: "active" | "inactive";
  flag: string;
  email: string;
  company: string;
  role: string;
  location: string;
  balance: number;
};

const staff: Staff[] = [
  {
    id: "1",
    name: "Alex Johnson",
    availability: "online",
    avatar: "https://randomuser.me/api/portraits/men/11.jpg",
    status: "active",
    flag: "us",
    email: "alex@apple.com",
    company: "Apple",
    role: "CEO",
    location: "San Francisco, USA",
    balance: 5143.03,
  },
  {
    id: "2",
    name: "Sarah Chen",
    availability: "away",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    status: "inactive",
    flag: "gb",
    email: "sarah@openai.com",
    company: "OpenAI",
    role: "CTO",
    location: "London, UK",
    balance: 4321.87,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    availability: "busy",
    avatar: "https://randomuser.me/api/portraits/men/13.jpg",
    status: "active",
    flag: "ca",
    email: "michael@meta.com",
    company: "Meta",
    role: "Designer",
    location: "Toronto, Canada",
    balance: 7654.98,
  },
  {
    id: "4",
    name: "Emma Wilson",
    availability: "offline",
    avatar: "https://randomuser.me/api/portraits/women/14.jpg",
    status: "inactive",
    flag: "au",
    email: "emma@tesla.com",
    company: "Tesla",
    role: "Developer",
    location: "Sydney, Australia",
    balance: 3456.45,
  },
  {
    id: "5",
    name: "David Kim",
    availability: "online",
    avatar: "https://randomuser.me/api/portraits/men/15.jpg",
    status: "active",
    flag: "kr",
    email: "david@sap.com",
    company: "SAP",
    role: "Product Manager",
    location: "Seoul, South Korea",
    balance: 2890.12,
  },
  {
    id: "6",
    name: "Laura Mensah",
    availability: "away",
    avatar: "https://randomuser.me/api/portraits/women/16.jpg",
    status: "active",
    flag: "de",
    email: "laura@bbva.com",
    company: "BBVA",
    role: "Data Scientist",
    location: "Berlin, Germany",
    balance: 6120.4,
  },
];

const availabilityColors: Record<Staff["availability"], string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-400",
};

// A filter whose values are still empty should not narrow anything down yet.
const activeFilters = (filters: Filter[]) =>
  filters.filter(
    (filter) =>
      filter.values.length > 0 &&
      !filter.values.every(
        (value) =>
          value === null || value === undefined || (typeof value === "string" && !value.trim()),
      ),
  );

const applyFilters = (filters: Filter[]) =>
  activeFilters(filters).reduce((rows, filter) => {
    return rows.filter((row) => {
      const value = row[filter.field as keyof Staff];
      const contains = (needle: unknown) =>
        String(value).toLowerCase().includes(String(needle).toLowerCase());

      switch (filter.operator) {
        case "is":
          return filter.values.includes(value);
        case "is_not":
          return !filter.values.includes(value);
        case "is_any_of":
          return filter.values.includes(value);
        case "is_not_any_of":
          return !filter.values.includes(value);
        case "contains":
          return filter.values.some(contains);
        case "not_contains":
          return !filter.values.some(contains);
        case "starts_with":
          return filter.values.some((needle) =>
            String(value).toLowerCase().startsWith(String(needle).toLowerCase()),
          );
        case "ends_with":
          return filter.values.some((needle) =>
            String(value).toLowerCase().endsWith(String(needle).toLowerCase()),
          );
        case "empty":
          return !value;
        case "not_empty":
          return Boolean(value);
        default:
          return true;
      }
    });
  }, staff);

function SmallIconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon-sm" {...props}>
      <ListFilter />
    </Button>
  );
}

export default function FiltersTable() {
  const fields: FilterFieldConfig[] = [
    {
      key: "name",
      label: "Name",
      type: "text",
      icon: () => <User class="size-3.5" />,
      class: "w-40",
      placeholder: "Search names...",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
      icon: () => <Mail class="size-3.5" />,
      class: "w-48",
      placeholder: "user@example.com",
    },
    {
      key: "company",
      label: "Company",
      type: "select",
      icon: () => <Building class="size-3.5" />,
      searchable: true,
      class: "w-[180px]",
      options: [
        { value: "Apple", label: "Apple" },
        { value: "OpenAI", label: "OpenAI" },
        { value: "Meta", label: "Meta" },
        { value: "Tesla", label: "Tesla" },
        { value: "SAP", label: "SAP" },
        { value: "BBVA", label: "BBVA" },
      ],
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      icon: () => <User class="size-3.5" />,
      searchable: true,
      class: "w-[160px]",
      options: [
        { value: "CEO", label: "CEO" },
        { value: "CTO", label: "CTO" },
        { value: "Designer", label: "Designer" },
        { value: "Developer", label: "Developer" },
        { value: "Product Manager", label: "Product Manager" },
        { value: "Data Scientist", label: "Data Scientist" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      icon: () => <User class="size-3.5" />,
      searchable: false,
      class: "w-[140px]",
      options: [
        {
          value: "active",
          label: "Active",
          icon: () => <div class="size-2 rounded-full bg-green-500" />,
        },
        {
          value: "inactive",
          label: "Inactive",
          icon: () => <div class="size-2 rounded-full bg-destructive" />,
        },
      ],
    },
    {
      key: "availability",
      label: "Availability",
      type: "select",
      icon: () => <User class="size-3.5" />,
      searchable: false,
      class: "w-[160px]",
      options: [
        {
          value: "online",
          label: "Online",
          icon: () => <div class="size-2 rounded-full bg-green-500" />,
        },
        {
          value: "away",
          label: "Away",
          icon: () => <div class="size-2 rounded-full bg-yellow-500" />,
        },
        {
          value: "busy",
          label: "Busy",
          icon: () => <div class="size-2 rounded-full bg-red-500" />,
        },
        {
          value: "offline",
          label: "Offline",
          icon: () => <div class="size-2 rounded-full bg-gray-400" />,
        },
      ],
    },
    {
      key: "location",
      label: "Location",
      type: "text",
      icon: () => <MapPin class="size-3.5" />,
      class: "w-40",
      placeholder: "Search locations...",
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([createFilter("status", "is", ["active"])]);
  const [rows, setRows] = createSignal<Staff[]>(applyFilters(filters()));
  const [loading, setLoading] = createSignal(false);

  // Stand-in for a server round trip: the filter bar stays interactive while
  // the table shows skeleton rows.
  let requestId = 0;
  const runQuery = async (next: Filter[]) => {
    const current = ++requestId;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
    if (current !== requestId) return;
    setRows(applyFilters(next));
    setLoading(false);
  };

  const handleChange = (next: Filter[]) => {
    const before = JSON.stringify(activeFilters(filters()));
    setFilters(next);
    if (before === JSON.stringify(activeFilters(next))) return;
    void runQuery(next);
  };

  return (
    <div class="w-full self-start">
      <div class="mb-3.5 flex items-start gap-2.5">
        <div class="flex-1">
          <Filters
            filters={filters()}
            fields={fields}
            onChange={handleChange}
            size="sm"
            trigger={SmallIconTrigger}
          />
        </div>
        <Show when={filters().length > 0}>
          <Button
            variant="outline"
            size="sm"
            disabled={loading()}
            onClick={() => {
              setFilters([]);
              void runQuery([]);
            }}
          >
            <FunnelX />
            Clear
          </Button>
        </Show>
      </div>

      <div class="rounded-lg border">
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Location</TableHead>
                <TableHead class="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <Show
                when={!loading()}
                fallback={
                  <Index each={Array.from({ length: 4 })}>
                    {() => (
                      <TableRow>
                        <TableCell>
                          <div class="flex items-center gap-3">
                            <Skeleton class="size-8 rounded-full" />
                            <div class="space-y-1">
                              <Skeleton class="h-4 w-24" />
                              <Skeleton class="h-3 w-16" />
                            </div>
                          </div>
                        </TableCell>
                        <Index each={Array.from({ length: 6 })}>
                          {() => (
                            <TableCell>
                              <Skeleton class="h-4 w-16" />
                            </TableCell>
                          )}
                        </Index>
                      </TableRow>
                    )}
                  </Index>
                }
              >
                <Show
                  when={rows().length > 0}
                  fallback={
                    <TableRow>
                      <TableCell colSpan={7} class="h-24 text-center text-muted-foreground">
                        No results.
                      </TableCell>
                    </TableRow>
                  }
                >
                  <For each={rows()}>
                    {(row) => (
                      <TableRow>
                        <TableCell>
                          <div class="flex items-center gap-3">
                            <Avatar class="size-8">
                              <AvatarImage src={row.avatar} alt={row.name} />
                              <AvatarFallback>
                                {row.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div class="space-y-px">
                              <div class="font-medium text-foreground">{row.name}</div>
                              <div class="truncate text-muted-foreground text-xs">{row.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{row.company}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === "active" ? "secondary" : "outline"}>
                            {row.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div class="flex items-center gap-1.5">
                            <div
                              class={`size-2 rounded-full ${availabilityColors[row.availability]}`}
                            />
                            <span class="capitalize">{row.availability}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div class="flex items-center gap-2">
                            <img
                              src={`https://flagcdn.com/${row.flag}.svg`}
                              alt={row.flag}
                              class="size-4 rounded-full object-cover"
                            />
                            <span>{row.location}</span>
                          </div>
                        </TableCell>
                        <TableCell class="text-right font-medium">
                          ${row.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </Show>
              </Show>
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Alert class="mt-5">
        <AlertTitle>Async mode: simulated API delay of 800-1500ms</AlertTitle>
      </Alert>
    </div>
  );
}
