import type { Table } from "@tanstack/solid-table";
import type { Component, ComponentProps } from "solid-js";
import { For } from "solid-js";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import type { DataGridFeatures } from "./data-grid";
import { getColumnHeaderLabel } from "./data-grid";

/**
 * Props Kobalte hands to whatever component renders the menu trigger.
 *
 * Upstream takes a React element and clones the trigger's props onto it.
 * Solid has no `cloneElement`, so the trigger is a component instead: it
 * receives these props and must spread them onto its root element.
 */
type DataGridColumnVisibilityTriggerProps = ComponentProps<"button">;

interface DataGridColumnVisibilityProps<TData extends object> {
  table: Table<DataGridFeatures, TData>;
  /**
   * Rendered as the menu trigger.
   *
   * ```tsx
   * <DataGridColumnVisibility
   *   table={table}
   *   trigger={(triggerProps) => (
   *     <Button {...triggerProps} variant="outline" size="sm">
   *       <Settings2 />
   *       Columns
   *     </Button>
   *   )}
   * />
   * ```
   */
  trigger: Component<DataGridColumnVisibilityTriggerProps>;
}

function DataGridColumnVisibility<TData extends object>(
  props: DataGridColumnVisibilityProps<TData>,
) {
  // Hideable columns are re-read on every open so a visibility toggle, a
  // column-order change or a swapped column set is reflected without any
  // subscription bookkeeping.
  const hideableColumns = () => props.table.getAllColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger as={props.trigger} />
      <DropdownMenuContent class="min-w-[150px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel class="font-medium">Toggle Columns</DropdownMenuLabel>
          <For each={hideableColumns()}>
            {(column) => (
              <DropdownMenuCheckboxItem
                class="capitalize"
                checked={column.getIsVisible()}
                // Upstream keeps the menu open with
                // `onSelect={(event) => event.preventDefault()}`; Kobalte
                // exposes the same behavior declaratively.
                closeOnSelect={false}
                onChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnHeaderLabel(column)}
              </DropdownMenuCheckboxItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { DataGridColumnVisibilityProps, DataGridColumnVisibilityTriggerProps };
export { DataGridColumnVisibility };
