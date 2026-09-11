import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { type Filter, Filters } from "@/registry/kobalte/blocks/filters";
import FiltersDemo from "@/registry/kobalte/examples/docs/filters-demo";
import "./styles.css";

function MinimalFilters() {
  const [filters, setFilters] = createSignal<Filter[]>([]);
  return (
    <Filters
      filters={filters()}
      onChange={setFilters}
      fields={[
        {
          key: "status",
          label: "Status",
          type: "select",
          searchable: false,
          options: [{ value: "todo", label: "To Do" }],
        },
      ]}
    />
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Filters fixture root is missing");

render(
  () => (
    <main style={{ padding: "80px" }}>
      {new URLSearchParams(location.search).has("demo") ? <FiltersDemo /> : <MinimalFilters />}
    </main>
  ),
  root,
);
