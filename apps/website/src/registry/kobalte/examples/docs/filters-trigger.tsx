import { CircleAlert, FunnelX, Globe, ListFilter, Mail, Star, Tag, User } from "lucide-solid";
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
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

function PriorityStar(props: { priority: string }) {
  return <Star class={cn("size-4", priorityColors[props.priority])} />;
}

function Portrait(props: { src: string; alt: string; fallback: string }) {
  return (
    <Avatar class="size-5 border">
      <AvatarImage src={props.src} alt={props.alt} />
      <AvatarFallback>{props.fallback}</AvatarFallback>
    </Avatar>
  );
}

// `trigger` takes a component, not an element: Solid has no `cloneElement`, so
// Kobalte renders this through its polymorphic `as` and hands it the trigger
// props (ref, aria state, handlers) to spread.
function IconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon" {...props}>
      <ListFilter />
    </Button>
  );
}

export default function FiltersTrigger() {
  const fields: FilterFieldConfig[] = [
    {
      key: "text",
      label: "Text",
      type: "text",
      icon: () => <Tag class="size-3.5" />,
      class: "w-36",
      placeholder: "Search text...",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
      icon: () => <Mail class="size-3.5" />,
      class: "w-40",
      placeholder: "user@example.com",
    },
    {
      key: "website",
      label: "Website",
      type: "text",
      icon: () => <Globe class="size-3.5" />,
      class: "w-40",
      placeholder: "https://example.com",
    },
    {
      key: "assignee",
      label: "Assignee",
      type: "multiselect",
      icon: () => <User class="size-3.5" />,
      class: "w-[200px]",
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
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "multiselect",
      icon: () => <CircleAlert class="size-3.5" />,
      class: "w-[180px]",
      options: [
        { value: "low", label: "Low", icon: () => <PriorityStar priority="low" /> },
        { value: "medium", label: "Medium", icon: () => <PriorityStar priority="medium" /> },
        { value: "high", label: "High", icon: () => <PriorityStar priority="high" /> },
        { value: "urgent", label: "Urgent", icon: () => <PriorityStar priority="urgent" /> },
      ],
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("assignee", "is_any_of", ["john", "nick", "alice"]),
  ]);

  return (
    <div class="flex grow content-start items-start gap-2.5 self-start">
      <div class="flex-1">
        <Filters filters={filters()} fields={fields} onChange={setFilters} trigger={IconTrigger} />
      </div>

      <Show when={filters().length > 0}>
        <Button variant="outline" onClick={() => setFilters([])}>
          <FunnelX />
          Clear
        </Button>
      </Show>
    </div>
  );
}
