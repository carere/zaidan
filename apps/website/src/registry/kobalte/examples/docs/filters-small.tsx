import {
  Ban,
  CircleAlert,
  CircleCheck,
  Clock,
  Globe,
  ListFilter,
  Mail,
  Star,
  Tag,
} from "lucide-solid";
import { type ComponentProps, createSignal } from "solid-js";
import { cn } from "@/lib/utils";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
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

function SmallIconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon-sm" {...props}>
      <ListFilter />
    </Button>
  );
}

export default function FiltersSmall() {
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
      class: "w-48",
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
      key: "status",
      label: "Status",
      type: "select",
      icon: () => <Clock class="size-3.5" />,
      searchable: false,
      class: "w-[200px]",
      options: [
        { value: "todo", label: "To Do", icon: () => <Clock class="size-4 text-primary" /> },
        {
          value: "in-progress",
          label: "In Progress",
          icon: () => <CircleAlert class="size-4 text-yellow-500" />,
        },
        { value: "done", label: "Done", icon: () => <CircleCheck class="size-4 text-green-500" /> },
        {
          value: "cancelled",
          label: "Cancelled",
          icon: () => <Ban class="size-4 text-destructive" />,
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
    createFilter("priority", "is_any_of", ["high", "urgent"]),
  ]);

  return (
    <div class="flex grow flex-col content-start items-start gap-2.5 self-start">
      <Filters
        size="sm"
        filters={filters()}
        fields={fields}
        onChange={setFilters}
        trigger={SmallIconTrigger}
      />
    </div>
  );
}
