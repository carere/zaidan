import { Users } from "lucide-solid";
import { createSignal } from "solid-js";
import {
  type Filter,
  type FilterFieldConfig,
  type FilterOption,
  Filters,
} from "@/registry/kobalte/blocks/filters";

const teams: FilterOption[] = [
  { value: "eng", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Customer Support" },
  { value: "finance", label: "Finance" },
  { value: "people", label: "People Ops" },
  { value: "legal", label: "Legal" },
  { value: "it", label: "IT" },
  { value: "data", label: "Data & Analytics" },
  { value: "security", label: "Security" },
];

export default function FiltersAsyncPrefetch() {
  // A field can take `loadOptions` instead of a static `options` list. Here it
  // prefetches the whole remote list once (the query is ignored on the first
  // call) and caches it, so opening the filter shows a loading state only once.
  let cache: FilterOption[] | null = null;

  const fields: FilterFieldConfig[] = [
    {
      key: "team",
      label: "Team",
      type: "multiselect",
      icon: () => <Users class="size-3.5" />,
      loadOptions: async (query: string) => {
        if (!cache) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          cache = teams;
        }
        const needle = query.trim().toLowerCase();
        return needle ? cache.filter((team) => team.label.toLowerCase().includes(needle)) : cache;
      },
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([]);

  return (
    <div class="flex grow content-start items-start self-start">
      <Filters filters={filters()} fields={fields} onChange={setFilters} />
    </div>
  );
}
