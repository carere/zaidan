import { createVirtualizer, defaultRangeExtractor, type Range } from "@tanstack/solid-virtual";
import { Package } from "lucide-solid";
import { createEffect, createSignal, For } from "solid-js";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  type FilterOption,
  type FilterOptionListRenderProps,
  Filters,
} from "@/registry/kobalte/blocks/filters";

const ROW_HEIGHT = 32;

// Consumer-owned virtualization wired through the field's `renderOptionList`
// slot. The block ships no windowing dependency — you bring your own (here
// @tanstack/solid-virtual) and stay bound to its selection and keyboard logic
// through `renderOption` and `highlightedIndex`.
function VirtualizedOptions(props: FilterOptionListRenderProps) {
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement>();

  const virtualizer = createVirtualizer({
    get count() {
      return props.options.length;
    },
    getScrollElement: () => scrollElement() ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    getItemKey: (index) => String(props.options[index]?.value ?? index),
    // Keep the highlighted row mounted even when scrolled away, so the
    // combobox's aria-activedescendant never points at an unmounted node.
    rangeExtractor: (range: Range) => {
      const indices = new Set(defaultRangeExtractor(range));
      if (props.highlightedIndex >= 0 && props.highlightedIndex < props.options.length) {
        indices.add(props.highlightedIndex);
      }
      return Array.from(indices).sort((a, b) => a - b);
    },
  });

  createEffect(() => {
    const index = props.highlightedIndex;
    if (index >= 0 && index < props.options.length) {
      virtualizer.scrollToIndex(index, { align: "auto" });
    }
  });

  return (
    <div ref={setScrollElement} class="max-h-[300px] overflow-y-auto overscroll-contain px-1">
      <div class="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <For each={virtualizer.getVirtualItems()}>
          {(row) => (
            <div
              data-index={row.index}
              class="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {props.renderOption(props.options[row.index], row.index)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

const products: FilterOption[] = Array.from({ length: 5000 }, (_, index) => ({
  value: `sku-${index + 1}`,
  label: `Product ${String(index + 1).padStart(4, "0")}`,
}));

export default function FiltersVirtualized() {
  const fields: FilterFieldConfig[] = [
    {
      key: "product",
      label: "Product",
      type: "multiselect",
      icon: () => <Package class="size-3.5" />,
      options: products,
      // Bring your own windowing for large lists.
      renderOptionList: (renderProps) => <VirtualizedOptions {...renderProps} />,
    },
  ];

  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("product", "is_any_of", ["sku-42", "sku-1024"]),
  ]);

  return (
    <div class="flex grow content-start items-start self-start">
      <Filters filters={filters()} fields={fields} onChange={setFilters} />
    </div>
  );
}
