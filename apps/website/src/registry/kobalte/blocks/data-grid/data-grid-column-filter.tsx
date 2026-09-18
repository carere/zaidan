import type { Column } from "@tanstack/solid-table";
import { Check, CirclePlus } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Input } from "@/registry/kobalte/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { Separator } from "@/registry/kobalte/ui/separator";
import type { DataGridFeatures } from "./data-grid";

interface DataGridColumnFilterOption {
  label: string;
  value: string;
  icon?: Component<{ class?: string }>;
}

interface DataGridColumnFilterProps<TData extends object, TValue> {
  column?: Column<DataGridFeatures, TData, TValue>;
  title?: string;
  options: DataGridColumnFilterOption[];
}

function DataGridColumnFilter<TData extends object, TValue>(
  props: DataGridColumnFilterProps<TData, TValue>,
) {
  const [searchQuery, setSearchQuery] = createSignal("");

  const facets = () => props.column?.getFacetedUniqueValues();
  // Derived on every read rather than kept in a signal: the filter value lives
  // in the table store, which is the single source of truth, and reading it is
  // the subscription.
  const selectedValues = () => {
    const filterValue = props.column?.getFilterValue();
    return new Set(Array.isArray(filterValue) ? (filterValue as string[]) : []);
  };

  const filteredOptions = () => {
    const query = searchQuery();
    if (!query) return props.options;
    return props.options.filter((option) =>
      option.label.toLowerCase().includes(query.toLowerCase()),
    );
  };

  const selectedOptions = () =>
    props.options.filter((option) => selectedValues().has(option.value));

  const toggleOption = (value: string) => {
    const next = selectedValues();

    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    const filterValues = Array.from(next);
    props.column?.setFilterValue(filterValues.length ? filterValues : undefined);
  };

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger as={Button} variant="outline" size="sm">
        <CirclePlus class="size-4" />
        {props.title}
        <Show when={selectedValues().size > 0}>
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="px-1 font-normal lg:hidden">
            {selectedValues().size}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            <Show
              when={selectedValues().size > 2}
              fallback={
                <For each={selectedOptions()}>
                  {(option) => (
                    <Badge variant="secondary" class="px-1 font-normal">
                      {option.label}
                    </Badge>
                  )}
                </For>
              }
            >
              <Badge variant="secondary" class="px-1 font-normal">
                {selectedValues().size} selected
              </Badge>
            </Show>
          </div>
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-[200px] p-0">
        <div class="p-2">
          <Input
            placeholder={props.title}
            value={searchQuery()}
            onInput={(event) => setSearchQuery(event.currentTarget.value)}
            class="h-8"
          />
        </div>
        <div class="max-h-[300px] overflow-y-auto">
          <Show
            when={filteredOptions().length > 0}
            fallback={
              <div class="text-muted-foreground py-6 text-center text-sm">No results found.</div>
            }
          >
            <div class="p-1">
              <For each={filteredOptions()}>
                {(option) => {
                  const isSelected = () => selectedValues().has(option.value);
                  const facetCount = () => facets()?.get(option.value);

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: the row nests block-level children (the check box, the icon, the facet count), which a <button> may not contain; role + tabIndex + Enter/Space keep the upstream accessibility tree without emitting invalid HTML.
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected()}
                      onClick={() => toggleOption(option.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleOption(option.value);
                        }
                      }}
                      class={cn(
                        "style-vega:rounded-sm style-nova:rounded-md style-maia:rounded-xl style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-2xl style-sera:rounded-none style-rhea:rounded-2xl relative flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none",
                        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      )}
                    >
                      <div
                        class={cn(
                          "border-primary style-vega:rounded-sm style-nova:rounded-sm style-maia:rounded-md style-lyra:rounded-none style-mira:rounded-sm style-luma:rounded-md style-sera:rounded-none style-rhea:rounded-md flex h-4 w-4 items-center justify-center border",
                          isSelected()
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <Check class="h-4 w-4" />
                      </div>
                      <Show when={option.icon}>
                        {(icon) => (
                          <Dynamic component={icon()} class="text-muted-foreground h-4 w-4" />
                        )}
                      </Show>
                      <span>{option.label}</span>
                      <Show when={facetCount() !== undefined}>
                        <span class="ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                          {facetCount()}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
          <Show when={selectedValues().size > 0}>
            <div class="bg-border -mx-1 my-1 h-px" />
            <div class="p-1">
              {/* biome-ignore lint/a11y/useSemanticElements: kept as a div for parity with the option rows above, so both share one hover/focus treatment inside the popover. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => props.column?.setFilterValue(undefined)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    props.column?.setFilterValue(undefined);
                  }
                }}
                class="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground style-vega:rounded-sm style-nova:rounded-md style-maia:rounded-xl style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-2xl style-sera:rounded-none style-rhea:rounded-2xl relative flex cursor-pointer items-center justify-center px-2 py-1.5 text-sm outline-hidden select-none"
              >
                Clear filters
              </div>
            </div>
          </Show>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DataGridColumnFilterOption, DataGridColumnFilterProps };
export { DataGridColumnFilter };
