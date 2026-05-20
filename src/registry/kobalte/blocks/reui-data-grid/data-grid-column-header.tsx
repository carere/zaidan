import type { Column } from "@tanstack/solid-table";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  PinOffIcon,
  Settings2Icon,
} from "lucide-solid";
import { type ComponentProps, For, type JSX, Show } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

import { getColumnHeaderLabel, useDataGrid } from "./data-grid";

interface DataGridColumnHeaderProps<TData, TValue> extends ComponentProps<"div"> {
  column: Column<TData, TValue>;
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  icon?: JSX.Element;
  pinnable?: boolean;
  filter?: JSX.Element;
  visibility?: boolean;
}

function DataGridColumnHeader<TData, TValue>(props: DataGridColumnHeaderProps<TData, TValue>) {
  const ctx = useDataGrid();
  const visibility = () => props.visibility ?? false;
  const resolvedTitle = () => props.title ?? getColumnHeaderLabel(props.column);

  const columnOrder = () => ctx.table.getState().columnOrder;
  const isSorted = () => props.column.getIsSorted();
  const isPinned = () => props.column.getIsPinned();
  const canSort = () => props.column.getCanSort();
  const canPin = () => props.column.getCanPin();
  const canResize = () => props.column.getCanResize();

  const columnIndex = () => columnOrder().indexOf(props.column.id);
  const canMoveLeft = () => columnIndex() > 0;
  const canMoveRight = () => columnIndex() < columnOrder().length - 1;

  const handleSort = () => {
    const sorted = isSorted();
    if (sorted === "asc") {
      props.column.toggleSorting(true);
    } else if (sorted === "desc") {
      props.column.clearSorting();
    } else {
      props.column.toggleSorting(false);
    }
  };

  const headerLabelClassName = () =>
    cn(
      "inline-flex h-full items-center gap-1.5 font-normal style-lyra:text-xs style-maia:text-[0.8125rem] style-mira:text-xs/relaxed style-nova:text-[0.8125rem] style-vega:text-[0.8125rem] text-secondary-foreground/80 style-maia:leading-[calc(1.125/0.8125)] style-nova:leading-[calc(1.125/0.8125)] style-vega:leading-[calc(1.125/0.8125)] style-lyra:[&_svg]:size-3 style-maia:[&_svg]:size-3.5 style-mira:[&_svg]:size-3 style-nova:[&_svg]:size-3.5 style-vega:[&_svg]:size-3.5 [&_svg]:opacity-60",
      props.class,
    );

  const headerButtonClassName = () =>
    cn(
      "-ms-2 style-lyra:h-6 style-maia:h-7 style-mira:h-6 style-nova:h-6 style-vega:h-7 style-lyra:rounded-none style-maia:rounded-4xl style-mira:rounded-md style-nova:rounded-lg style-vega:rounded-md px-2 font-normal text-secondary-foreground/80 hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground",
      props.class,
    );

  const SortIcon = () => (
    <Show when={canSort()}>
      <Show
        when={isSorted() === "desc"}
        fallback={
          <Show
            when={isSorted() === "asc"}
            fallback={<ChevronsUpDownIcon class="mt-px size-3.25" />}
          >
            <ArrowUpIcon class="size-3.25" />
          </Show>
        }
      >
        <ArrowDownIcon class="size-3.25" />
      </Show>
    </Show>
  );

  const hasControls = () =>
    ctx.props.tableLayout?.columnsMovable ||
    (ctx.props.tableLayout?.columnsVisibility && visibility()) ||
    (ctx.props.tableLayout?.columnsPinnable && canPin()) ||
    !!props.filter;

  return (
    <Show
      when={hasControls()}
      fallback={
        <Show
          when={canSort() || (ctx.props.tableLayout?.columnsResizable && canResize())}
          fallback={
            <div class={headerLabelClassName()}>
              <Show when={props.icon}>{props.icon}</Show>
              {resolvedTitle()}
            </div>
          }
        >
          <div class="flex h-full items-center">
            <Button
              variant="ghost"
              class={headerButtonClassName()}
              disabled={ctx.isLoading || ctx.recordCount === 0}
              onClick={handleSort}
            >
              <Show when={props.icon}>{props.icon}</Show>
              {resolvedTitle()}
              <SortIcon />
            </Button>
          </div>
        </Show>
      }
    >
      <div class="flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            as={Button}
            variant="ghost"
            class={headerButtonClassName()}
            disabled={ctx.isLoading || ctx.recordCount === 0}
          >
            <Show when={props.icon}>{props.icon}</Show>
            {resolvedTitle()}
            <SortIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-40">
            <Show when={props.filter}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{props.filter}</DropdownMenuLabel>
              </DropdownMenuGroup>
            </Show>

            <Show when={canSort()}>
              <Show when={props.filter}>
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuItem
                onSelect={() => {
                  if (isSorted() === "asc") {
                    props.column.clearSorting();
                  } else {
                    props.column.toggleSorting(false);
                  }
                }}
                disabled={!canSort()}
              >
                <ArrowUpIcon class="size-3.5!" />
                <span class="grow">Asc</span>
                <Show when={isSorted() === "asc"}>
                  <CheckIcon class="size-4 text-primary opacity-100!" />
                </Show>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (isSorted() === "desc") {
                    props.column.clearSorting();
                  } else {
                    props.column.toggleSorting(true);
                  }
                }}
                disabled={!canSort()}
              >
                <ArrowDownIcon class="size-3.5!" />
                <span class="grow">Desc</span>
                <Show when={isSorted() === "desc"}>
                  <CheckIcon class="size-4 text-primary opacity-100!" />
                </Show>
              </DropdownMenuItem>
            </Show>

            <Show when={ctx.props.tableLayout?.columnsPinnable && canPin()}>
              <Show when={canSort() || props.filter}>
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuItem
                onSelect={() => props.column.pin(isPinned() === "left" ? false : "left")}
              >
                <ArrowLeftToLineIcon class="size-3.5!" aria-hidden="true" />
                <span class="grow">Pin to left</span>
                <Show when={isPinned() === "left"}>
                  <CheckIcon class="size-4 text-primary opacity-100!" />
                </Show>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => props.column.pin(isPinned() === "right" ? false : "right")}
              >
                <ArrowRightToLineIcon class="size-3.5!" aria-hidden="true" />
                <span class="grow">Pin to right</span>
                <Show when={isPinned() === "right"}>
                  <CheckIcon class="size-4 text-primary opacity-100!" />
                </Show>
              </DropdownMenuItem>
            </Show>

            <Show when={ctx.props.tableLayout?.columnsMovable}>
              <Show
                when={
                  canSort() || props.filter || (ctx.props.tableLayout?.columnsPinnable && canPin())
                }
              >
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuItem
                onSelect={() => {
                  if (columnIndex() > 0) {
                    const newOrder = [...columnOrder()];
                    const [moved] = newOrder.splice(columnIndex(), 1);
                    newOrder.splice(columnIndex() - 1, 0, moved);
                    ctx.table.setColumnOrder(newOrder);
                  }
                }}
                disabled={!canMoveLeft() || isPinned() !== false}
              >
                <ArrowLeftIcon class="size-3.5!" aria-hidden="true" />
                <span>Move to Left</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (columnIndex() < columnOrder().length - 1) {
                    const newOrder = [...columnOrder()];
                    const [moved] = newOrder.splice(columnIndex(), 1);
                    newOrder.splice(columnIndex() + 1, 0, moved);
                    ctx.table.setColumnOrder(newOrder);
                  }
                }}
                disabled={!canMoveRight() || isPinned() !== false}
              >
                <ArrowRightIcon class="size-3.5!" aria-hidden="true" />
                <span>Move to Right</span>
              </DropdownMenuItem>
            </Show>

            <Show when={ctx.props.tableLayout?.columnsVisibility && visibility()}>
              <Show
                when={
                  canSort() ||
                  props.filter ||
                  (ctx.props.tableLayout?.columnsPinnable && canPin()) ||
                  ctx.props.tableLayout?.columnsMovable
                }
              >
                <DropdownMenuSeparator />
              </Show>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Settings2Icon class="size-3.5!" />
                  <span>Columns</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <For each={ctx.table.getAllColumns().filter((col) => col.getCanHide())}>
                    {(col) => (
                      <DropdownMenuCheckboxItem
                        checked={col.getIsVisible()}
                        closeOnSelect={false}
                        onChange={(value: boolean) => col.toggleVisibility(!!value)}
                        class="capitalize"
                      >
                        {getColumnHeaderLabel(col)}
                      </DropdownMenuCheckboxItem>
                    )}
                  </For>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </Show>
          </DropdownMenuContent>
        </DropdownMenu>

        <Show when={ctx.props.tableLayout?.columnsPinnable && canPin() && isPinned()}>
          <Button
            size="icon-sm"
            variant="ghost"
            class="-me-1 size-7 rounded-md"
            onClick={() => props.column.pin(false)}
            aria-label={`Unpin ${resolvedTitle()} column`}
            title={`Unpin ${resolvedTitle()} column`}
          >
            <PinOffIcon class="size-3.5! opacity-50!" aria-hidden="true" />
          </Button>
        </Show>
      </div>
    </Show>
  );
}

export { DataGridColumnHeader, type DataGridColumnHeaderProps };
