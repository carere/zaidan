import {
  Ban,
  Bell,
  CircleAlert,
  CircleCheck,
  Clock,
  FunnelX,
  Globe,
  ListFilter,
  Mail,
  Phone,
  Star,
  Type,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-solid";
import { type ComponentProps, createSignal, Show } from "solid-js";
import { cn } from "@/lib/utils";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";

const priorityColors: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-violet-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
};

function PriorityDot(props: { priority: string }) {
  return <div class={cn("size-2.5 shrink-0 rounded-full", priorityColors[props.priority])} />;
}

function Portrait(props: { src: string; alt: string; fallback: string }) {
  return (
    <Avatar class="size-5 border">
      <AvatarImage src={props.src} alt={props.alt} />
      <AvatarFallback>{props.fallback}</AvatarFallback>
    </Avatar>
  );
}

const countries = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TR", name: "Turkey" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

// Solid has no `cloneElement`, so a custom trigger is a component that Kobalte
// renders through the polymorphic `as` prop — spread the props it receives.
function AddFilterTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" {...props}>
      <ListFilter />
      Add Filter
    </Button>
  );
}

export default function FiltersDemo() {
  const fields: FilterFieldConfig[] = [
    {
      group: "Basic",
      fields: [
        {
          key: "text",
          label: "Text",
          type: "text",
          icon: () => <Mail class="size-3.5" />,
          placeholder: "Search text...",
        },
        {
          key: "email",
          label: "Email",
          type: "text",
          icon: () => <Type class="size-3.5" />,
          placeholder: "user@example.com",
        },
        {
          key: "website",
          label: "Website",
          type: "text",
          icon: () => <Globe class="size-3.5" />,
          placeholder: "https://example.com",
        },
        {
          key: "phone",
          label: "Phone",
          type: "text",
          icon: () => <Phone class="size-3.5" />,
          placeholder: "+1 (123) 456-7890",
        },
      ],
    },
    {
      group: "Select",
      fields: [
        {
          key: "status",
          label: "Status",
          type: "select",
          icon: () => <Bell class="size-3.5" />,
          searchable: false,
          class: "w-[200px]",
          options: [
            {
              value: "todo",
              label: "To Do",
              icon: () => <Clock class="size-4 stroke-violet-500" />,
            },
            {
              value: "in-progress",
              label: "In Progress",
              icon: () => <CircleAlert class="size-4 stroke-yellow-500" />,
            },
            {
              value: "done",
              label: "Done",
              icon: () => <CircleCheck class="size-4 stroke-green-500" />,
            },
            {
              value: "cancelled",
              label: "Cancelled",
              icon: () => <Ban class="size-4 stroke-destructive" />,
            },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          type: "multiselect",
          icon: () => <Ban class="size-3.5" />,
          class: "w-[180px]",
          options: [
            { value: "low", label: "Low", icon: () => <PriorityDot priority="low" /> },
            { value: "medium", label: "Medium", icon: () => <PriorityDot priority="medium" /> },
            { value: "high", label: "High", icon: () => <PriorityDot priority="high" /> },
            { value: "urgent", label: "Urgent", icon: () => <PriorityDot priority="urgent" /> },
            {
              value: "critical",
              label: "Critical",
              icon: () => <PriorityDot priority="critical" />,
            },
          ],
        },
        {
          key: "assignee",
          label: "Assignee",
          type: "multiselect",
          icon: () => <UserRoundCheck class="size-3.5" />,
          maxSelections: 5,
          options: [
            {
              value: "john",
              label: "John Doe",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/men/1.jpg"
                  alt="John Doe"
                  fallback="JD"
                />
              ),
            },
            {
              value: "jane",
              label: "Jane Smith",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/women/2.jpg"
                  alt="Jane Smith"
                  fallback="JS"
                />
              ),
            },
            {
              value: "bob",
              label: "Bob Johnson",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/men/3.jpg"
                  alt="Bob Johnson"
                  fallback="BJ"
                />
              ),
            },
            {
              value: "alice",
              label: "Alice Brown",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/women/4.jpg"
                  alt="Alice Brown"
                  fallback="AB"
                />
              ),
            },
            {
              value: "nick",
              label: "Nick Bold",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/men/4.jpg"
                  alt="Nick Bold"
                  fallback="NB"
                />
              ),
            },
            {
              value: "sarah",
              label: "Sarah Wilson",
              icon: () => (
                <Portrait
                  src="https://randomuser.me/api/portraits/women/5.jpg"
                  alt="Sarah Wilson"
                  fallback="SW"
                />
              ),
            },
            {
              value: "unassigned",
              label: "Unassigned",
              icon: () => (
                <Avatar class="size-5 border">
                  <AvatarFallback>
                    <UserRoundX class="size-3" />
                  </AvatarFallback>
                </Avatar>
              ),
            },
          ],
        },
        {
          key: "userType",
          label: "User Type",
          type: "select",
          icon: () => <Users class="size-3.5" />,
          searchable: false,
          class: "w-[200px]",
          options: [
            {
              value: "premium",
              label: "Premium",
              icon: () => <Star class="size-3 text-yellow-500" />,
            },
            {
              value: "standard",
              label: "Standard",
              icon: () => <Users class="size-3 text-blue-500" />,
            },
            { value: "trial", label: "Trial", icon: () => <Clock class="size-3 text-gray-500" /> },
          ],
        },
        {
          key: "country",
          label: "Country",
          type: "select",
          icon: () => <Globe class="size-3.5" />,
          searchable: true,
          class: "w-[220px]",
          options: countries.map((country) => ({
            value: country.code,
            label: country.name,
            icon: () => (
              <img
                src={`https://flagcdn.com/${country.code.toLowerCase()}.svg`}
                alt={country.code}
                class="size-4 rounded-full object-cover"
              />
            ),
          })),
        },
      ],
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("priority", "is_any_of", ["low", "medium", "critical"]),
  ]);

  return (
    <div class="flex grow content-start items-start gap-2.5 self-start">
      <div class="grow space-y-5">
        <div class="flex items-start gap-2.5">
          <div class="flex-1">
            <Filters
              filters={filters()}
              fields={fields}
              onChange={setFilters}
              enableShortcut
              shortcutKey="f"
              shortcutLabel="F"
              trigger={AddFilterTrigger}
            />
          </div>

          <Show when={filters().length > 0}>
            <Button variant="outline" onClick={() => setFilters([])}>
              <FunnelX />
              Clear
            </Button>
          </Show>
        </div>

        <pre class="mt-2 max-h-[400px] w-full max-w-[500px] overflow-auto rounded-md border bg-muted p-3 text-xs dark:bg-muted/60">
          {JSON.stringify(filters(), null, 2)}
        </pre>
      </div>
    </div>
  );
}
