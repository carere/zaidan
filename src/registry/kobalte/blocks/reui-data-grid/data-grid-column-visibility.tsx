import type { Table } from "@tanstack/solid-table";
import { For, type JSX } from "solid-js";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

import { getColumnHeaderLabel } from "./data-grid";

function DataGridColumnVisibility<TData>(props: { table: Table<TData>; trigger: JSX.Element }) {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger as="div">{props.trigger}</DropdownMenuTrigger>
      <DropdownMenuContent class="min-w-[150px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel class="font-medium">Toggle Columns</DropdownMenuLabel>
          <For each={props.table.getAllColumns().filter((column) => column.getCanHide())}>
            {(column) => (
              <DropdownMenuCheckboxItem
                class="capitalize"
                checked={column.getIsVisible()}
                closeOnSelect={false}
                onChange={(value: boolean) => column.toggleVisibility(!!value)}
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

export { DataGridColumnVisibility };
