import { UserSearch } from "lucide-solid";
import { createSignal } from "solid-js";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  type FilterOption,
  Filters,
} from "@/registry/kobalte/blocks/filters";

const firstNames = [
  "Alex",
  "Bailey",
  "Casey",
  "Dana",
  "Emerson",
  "Finley",
  "Gray",
  "Harper",
  "Indira",
  "Jordan",
  "Kai",
  "Logan",
  "Morgan",
  "Noor",
  "Parker",
  "Quinn",
  "Riley",
  "Sasha",
  "Taylor",
  "Umi",
  "Val",
  "Wren",
  "Xan",
  "Yuki",
  "Zephyr",
];

const lastNames = [
  "Ahmed",
  "Brooks",
  "Chen",
  "Diaz",
  "Evans",
  "Ferreira",
  "Gupta",
  "Hansen",
  "Ito",
  "Johnson",
  "Kowalski",
  "Lopez",
  "Mensah",
  "Novak",
  "Okafor",
  "Park",
];

// Stands in for a directory too large to prefetch.
const directory: FilterOption[] = Array.from({ length: 10000 }, (_, index) => {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  return { value: `user-${index + 1}`, label: `${first} ${last} #${index + 1}` };
});

export default function FiltersAsyncSearch() {
  const fields: FilterFieldConfig[] = [
    {
      key: "assignee",
      label: "Assignee",
      type: "multiselect",
      icon: () => <UserSearch class="size-3.5" />,
      // Seed only the initially selected value so its chip stays labelled.
      options: [directory[0]],
      // Server-side search: debounced by the block, guarded against out-of-order
      // responses, and cached value -> label so selected chips keep their label.
      loadOptions: async (query: string) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const needle = query.trim().toLowerCase();
        const matches = needle
          ? directory.filter((option) => option.label.toLowerCase().includes(needle))
          : directory;
        return matches.slice(0, 50);
      },
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("assignee", "is_any_of", ["user-1"]),
  ]);

  return (
    <div class="flex grow content-start items-start self-start">
      <Filters filters={filters()} fields={fields} onChange={setFilters} />
    </div>
  );
}
