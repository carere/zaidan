import type { Column } from "@tanstack/solid-table";
import { CheckIcon, CirclePlusIcon } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Input } from "@/registry/kobalte/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { Separator } from "@/registry/kobalte/ui/separator";

interface DataGridColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: Component<{ class?: string }>;
  }[];
}

function DataGridColumnFilter<TData, TValue>(props: DataGridColumnFilterProps<TData, TValue>) {
  const facets = () => props.column?.getFacetedUniqueValues();
  const selectedValues = () => new Set(props.column?.getFilterValue() as string[] | undefined);
  const [searchQuery, setSearchQuery] = createSignal("");

  const filteredOptions = createMemo(() => {
    const q = searchQuery();
    if (!q) return props.options;
    return props.options.filter((option) => option.label.toLowerCase().includes(q.toLowerCase()));
  });

  return (
    <Popover>
      <PopoverTrigger as={Button} variant="outline" size="sm">
        <CirclePlusIcon class="size-4" />
        {props.title}
        <Show when={selectedValues().size > 0}>
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {selectedValues().size}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            <Show
              when={selectedValues().size > 2}
              fallback={
                <For each={props.options.filter((option) => selectedValues().has(option.value))}>
                  {(option) => (
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {option.label}
                    </Badge>
                  )}
                </For>
              }
            >
              <Badge variant="secondary" class="rounded-sm px-1 font-normal">
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
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="h-8"
          />
        </div>
        <div class="max-h-[300px] overflow-y-auto">
          <Show
            when={filteredOptions().length}
            fallback={
              <div class="py-6 text-center text-muted-foreground text-sm">No results found.</div>
            }
          >
            <div class="p-1">
              <For each={filteredOptions()}>
                {(option) => {
                  const isSelected = () => selectedValues().has(option.value);
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: filter row matches the source design
                    // biome-ignore lint/a11y/useKeyWithClickEvents: filter row matches the source design
                    <div
                      onClick={() => {
                        const current = selectedValues();
                        if (isSelected()) {
                          current.delete(option.value);
                        } else {
                          current.add(option.value);
                        }
                        const filterValues = Array.from(current);
                        props.column?.setFilterValue(
                          filterValues.length ? filterValues : undefined,
                        );
                      }}
                      class={cn(
                        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden",
                        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      )}
                    >
                      <div
                        class={cn(
                          "me-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected()
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <CheckIcon class="h-4 w-4" />
                      </div>
                      <Show when={option.icon}>
                        {(IconCmp) => {
                          const Icon = IconCmp();
                          return <Icon class="mr-2 h-4 w-4 text-muted-foreground" />;
                        }}
                      </Show>
                      <span>{option.label}</span>
                      <Show when={facets()?.get(option.value)}>
                        <span class="ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                          {facets()?.get(option.value)}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
          <Show when={selectedValues().size > 0}>
            <div class="-mx-1 my-1 h-px bg-border" />
            <div class="p-1">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: clear-filters row matches the source design */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: clear-filters row matches the source design */}
              <div
                onClick={() => props.column?.setFilterValue(undefined)}
                class="relative flex cursor-default select-none items-center justify-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
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

export { DataGridColumnFilter, type DataGridColumnFilterProps };
