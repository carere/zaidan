import type { Column } from "@tanstack/solid-table";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  Check,
  ChevronsUpDown,
  PinOff,
  Settings2,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { For, Match, Show, Switch, splitProps } from "solid-js";

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
import type { DataGridFeatures } from "./data-grid";
import { getColumnHeaderLabel, useDataGrid } from "./data-grid";

interface DataGridColumnHeaderProps<TData extends object, TValue>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  column: Column<DataGridFeatures, TData, TValue>;
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  icon?: JSX.Element;
  /** Reserved; pin controls are gated by tableLayout.columnsPinnable + column.getCanPin(). */
  pinnable?: boolean;
  filter?: JSX.Element;
  visibility?: boolean;
}

/**
 * Sort / pin / move / visibility controls for a column header.
 *
 * Upstream wraps this in TanStack's `Subscribe` and a React `memo`: sort and
 * pin state reach the header through builder calls on a stable `column`
 * reference, which the React Compiler is free to memoize away, so the arrows
 * and pin controls freeze without an explicit subscription. In Solid the read
 * itself is the subscription - `column.getIsSorted()` resolves through the
 * store's reactive state - so both wrappers are dropped rather than
 * translated, and the `subscribedState` escape hatch they needed disappears
 * with them.
 */
function DataGridColumnHeader<TData extends object, TValue>(
  props: DataGridColumnHeaderProps<TData, TValue>,
) {
  const [local] = splitProps(props, ["column", "title", "icon", "class", "filter", "visibility"]);
  const grid = useDataGrid();

  const column = () => local.column;
  const resolvedTitle = () => local.title ?? getColumnHeaderLabel(column());
  const visibility = () => local.visibility ?? false;

  // TanStack's columnOrder defaults to [] until a consumer seeds it; fall
  // back to the definition order so Move Left/Right work out of the box.
  const columnOrder = () => {
    const columnOrderState = grid.table.store.state.columnOrder;
    return columnOrderState.length > 0
      ? columnOrderState
      : grid.table.getAllLeafColumns().map((leafColumn) => leafColumn.id);
  };

  const isSorted = () => column().getIsSorted();
  const isPinned = () => column().getIsPinned();
  const canSort = () => column().getCanSort();
  const canPin = () => column().getCanPin();
  const canResize = () => column().getCanResize();

  const columnIndex = () => columnOrder().indexOf(column().id);
  const canMoveLeft = () => columnIndex() > 0;
  const canMoveRight = () => columnIndex() < columnOrder().length - 1;

  const handleSort = () => {
    if (isSorted() === "asc") {
      column().toggleSorting(true);
    } else if (isSorted() === "desc") {
      column().clearSorting();
    } else {
      column().toggleSorting(false);
    }
  };

  const headerLabelClass = () =>
    cn(
      "text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:opacity-60 text-[0.8125rem] leading-[calc(1.125/0.8125)] [&_svg]:size-3.5",
      local.class,
    );

  const headerButtonClass = () =>
    cn(
      "text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground px-2 font-normal h-6 style-vega:rounded-md style-nova:rounded-lg style-maia:rounded-full style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-full style-sera:rounded-none style-rhea:rounded-full",
      local.class,
    );

  const SortIcon = () => (
    <Show when={canSort()}>
      <Switch fallback={<ChevronsUpDown class="mt-px size-3.25" aria-hidden="true" />}>
        <Match when={isSorted() === "desc"}>
          <ArrowDown class="size-3.25" aria-hidden="true" />
        </Match>
        <Match when={isSorted() === "asc"}>
          <ArrowUp class="size-3.25" aria-hidden="true" />
        </Match>
      </Switch>
    </Show>
  );

  // Section flags. Upstream builds one `useMemo`d array of nodes and threads a
  // running `hasPreviousSection` boolean through it to decide where the
  // separators go; the same decision is expressed here as derived predicates,
  // so the menu is plain JSX and no dependency list has to be maintained.
  const hasFilterSection = () => !!local.filter;
  const hasSortSection = () => canSort();
  const hasPinSection = () => !!grid.props.tableLayout?.columnsPinnable && canPin();
  const hasMoveSection = () => !!grid.props.tableLayout?.columnsMovable;
  const hasVisibilitySection = () => !!grid.props.tableLayout?.columnsVisibility && visibility();

  const hideableColumns = () =>
    grid.table.getAllColumns().filter((candidate) => candidate.getCanHide());

  const hasControls = () =>
    hasMoveSection() || hasVisibilitySection() || hasPinSection() || hasFilterSection();

  const moveColumn = (offset: number) => {
    const order = columnOrder();
    const index = columnIndex();
    const nextIndex = index + offset;

    if (index < 0 || nextIndex < 0 || nextIndex > order.length - 1) return;

    const newOrder = [...order];
    const [movedColumn] = newOrder.splice(index, 1);
    newOrder.splice(nextIndex, 0, movedColumn);
    grid.table.setColumnOrder(newOrder);
  };

  return (
    <Switch
      fallback={
        <div class={headerLabelClass()}>
          {local.icon}
          {resolvedTitle()}
        </div>
      }
    >
      <Match when={hasControls()}>
        <div class="-ms-2 flex h-full items-center justify-between gap-1.5">
          <DropdownMenu placement="bottom-start">
            <DropdownMenuTrigger
              as={Button}
              variant="ghost"
              class={headerButtonClass()}
              disabled={grid.isLoading}
            >
              {local.icon}
              {resolvedTitle()}
              <SortIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-40">
              {/* Filter section */}
              <Show when={hasFilterSection()}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{local.filter}</DropdownMenuLabel>
                </DropdownMenuGroup>
              </Show>

              {/* Sort section */}
              <Show when={hasSortSection()}>
                <Show when={hasFilterSection()}>
                  <DropdownMenuSeparator />
                </Show>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isSorted() === "asc") {
                      column().clearSorting();
                    } else {
                      column().toggleSorting(false);
                    }
                  }}
                  disabled={!canSort()}
                >
                  <ArrowUp class="size-3.5!" />
                  <span class="grow">Asc</span>
                  <Show when={isSorted() === "asc"}>
                    <Check class="text-primary size-4 opacity-100!" />
                  </Show>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isSorted() === "desc") {
                      column().clearSorting();
                    } else {
                      column().toggleSorting(true);
                    }
                  }}
                  disabled={!canSort()}
                >
                  <ArrowDown class="size-3.5!" />
                  <span class="grow">Desc</span>
                  <Show when={isSorted() === "desc"}>
                    <Check class="text-primary size-4 opacity-100!" />
                  </Show>
                </DropdownMenuItem>
              </Show>

              {/* Pin section */}
              <Show when={hasPinSection()}>
                <Show when={hasFilterSection() || hasSortSection()}>
                  <DropdownMenuSeparator />
                </Show>
                <DropdownMenuItem
                  onSelect={() => column().pin(isPinned() === "start" ? false : "start")}
                >
                  <ArrowLeftToLine class="size-3.5!" aria-hidden="true" />
                  <span class="grow">Pin to left</span>
                  <Show when={isPinned() === "start"}>
                    <Check class="text-primary size-4 opacity-100!" />
                  </Show>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => column().pin(isPinned() === "end" ? false : "end")}
                >
                  <ArrowRightToLine class="size-3.5!" aria-hidden="true" />
                  <span class="grow">Pin to right</span>
                  <Show when={isPinned() === "end"}>
                    <Check class="text-primary size-4 opacity-100!" />
                  </Show>
                </DropdownMenuItem>
              </Show>

              {/* Move section */}
              <Show when={hasMoveSection()}>
                <Show when={hasFilterSection() || hasSortSection() || hasPinSection()}>
                  <DropdownMenuSeparator />
                </Show>
                <DropdownMenuItem
                  onSelect={() => moveColumn(-1)}
                  disabled={!canMoveLeft() || isPinned() !== false}
                >
                  <ArrowLeft class="size-3.5!" aria-hidden="true" />
                  <span>Move to Left</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => moveColumn(1)}
                  disabled={!canMoveRight() || isPinned() !== false}
                >
                  <ArrowRight class="size-3.5!" aria-hidden="true" />
                  <span>Move to Right</span>
                </DropdownMenuItem>
              </Show>

              {/* Visibility section */}
              <Show when={hasVisibilitySection()}>
                <Show
                  when={
                    hasFilterSection() || hasSortSection() || hasPinSection() || hasMoveSection()
                  }
                >
                  <DropdownMenuSeparator />
                </Show>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Settings2 class="size-3.5!" />
                    <span>Columns</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <For each={hideableColumns()}>
                      {(candidate) => (
                        <DropdownMenuCheckboxItem
                          checked={candidate.getIsVisible()}
                          closeOnSelect={false}
                          onChange={(value) => candidate.toggleVisibility(!!value)}
                          class="capitalize"
                        >
                          {getColumnHeaderLabel(candidate)}
                        </DropdownMenuCheckboxItem>
                      )}
                    </For>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </Show>
            </DropdownMenuContent>
          </DropdownMenu>
          <Show when={grid.props.tableLayout?.columnsPinnable && canPin() && isPinned()}>
            <Button
              size="icon-sm"
              variant="ghost"
              class="style-vega:rounded-md style-nova:rounded-lg style-maia:rounded-full style-lyra:rounded-none style-mira:rounded-md style-luma:rounded-full style-sera:rounded-none style-rhea:rounded-full -me-1 size-7"
              onClick={() => column().pin(false)}
              aria-label={`Unpin ${resolvedTitle()} column`}
              title={`Unpin ${resolvedTitle()} column`}
            >
              <PinOff class="size-3.5! opacity-50!" aria-hidden="true" />
            </Button>
          </Show>
        </div>
      </Match>
      <Match when={canSort() || (grid.props.tableLayout?.columnsResizable && canResize())}>
        <div class="-ms-2 flex h-full items-center">
          <Button
            variant="ghost"
            class={headerButtonClass()}
            disabled={grid.isLoading}
            onClick={handleSort}
          >
            {local.icon}
            {resolvedTitle()}
            <SortIcon />
          </Button>
        </div>
      </Match>
    </Switch>
  );
}

export type { DataGridColumnHeaderProps };
export { DataGridColumnHeader };
