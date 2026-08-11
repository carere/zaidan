import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import type { JSX, ValidComponent } from "solid-js";
import { createSignal, onMount, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import type { SortableInternalContextValue } from "./context";
import { SortableInternalContext } from "./context";

/**
 * Sortable root props. Wraps a list of `<SortableItem />` children inside a
 * `DragDropProvider`. Reordering is performed by mutating the `value` array
 * via `onValueChange` (or by handling `onMove` yourself for custom reorder
 * logic).
 *
 * Notes on porting from React `@dnd-kit/core` + `@dnd-kit/sortable`:
 * - `strategy` is preserved for forward-compat but is a no-op:
 *   `@dnd-kit/solid` (v7) auto-detects layout direction.
 * - `modifiers` is forwarded to `DragDropProvider` (and `DragOverlay` via the
 *   internal context). `unknown[]` is used because `@dnd-kit/solid` does not
 *   re-export the modifier type publicly.
 * - Sensors use `PointerSensor` (covers mouse + touch) and `KeyboardSensor`
 *   from `@dnd-kit/solid`.
 */
export type SortableRootProps<T> = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "onDragStart" | "onDragEnd" | "children"
> & {
  value: T[];
  onValueChange: (value: T[]) => void;
  getItemValue: (item: T) => string;
  children?: JSX.Element;
  /**
   * Fired once per completed drop, after `onValueChange`, with the reordered
   * array and a `previousValue` snapshot. Use it for backend persistence with
   * rollback: mutate the server, and restore `previousValue` on failure. Not
   * called when `onMove` handles the reorder.
   */
  onValueCommit?: (value: T[], meta: { previousValue: T[] }) => void;
  onMove?: (event: {
    activeIndex: number;
    overIndex: number;
    activeId: string;
    overId: string;
  }) => void;
  /**
   * @deprecated `@dnd-kit/solid` v7 auto-detects layout. Kept for forward
   * compatibility; this prop is currently a no-op.
   */
  strategy?: "horizontal" | "vertical" | "grid";
  onDragStart?: (event: { activeId: string }) => void;
  onDragEnd?: (event: { activeId: string; overId: string | null; canceled: boolean }) => void;
  modifiers?: unknown[];
  as?: ValidComponent;
};

/**
 * Sortable root. Provides the `DragDropProvider` and an internal context that
 * descendant items use to look up their reactive index in the current array,
 * and that the overlay reads to know which item is active.
 */
function Sortable<T>(props: SortableRootProps<T>) {
  const [local, others] = splitProps(props, [
    "value",
    "onValueChange",
    "onValueCommit",
    "getItemValue",
    "class",
    "onMove",
    "strategy",
    "onDragStart",
    "onDragEnd",
    "modifiers",
    "children",
    "as",
  ]);

  const [activeId, setActiveId] = createSignal<string | null>(null);
  // `@dnd-kit/solid` cannot run during SSR: the server renders the same
  // markup without the drag-and-drop context, and the interactive provider
  // mounts client-side only.
  const [live, setLive] = createSignal(false);
  onMount(() => setLive(true));

  const handleDragStart = (event: { operation: { source: { id: unknown } } }) => {
    const id = String(event.operation.source.id);
    setActiveId(id);
    local.onDragStart?.({ activeId: id });
  };

  const handleDragEnd = (event: {
    canceled: boolean;
    operation: {
      source: { id: unknown } | null;
      target: { id: unknown } | null;
    };
  }) => {
    const source = event.operation.source;
    const target = event.operation.target;
    const sourceId = source && source.id !== undefined ? String(source.id) : null;
    const targetId = target && target.id !== undefined ? String(target.id) : null;

    setActiveId(null);

    local.onDragEnd?.({
      activeId: sourceId ?? "",
      overId: targetId,
      canceled: event.canceled,
    });

    if (event.canceled || !source || !isSortable(source as never)) {
      return;
    }

    const sortableSource = source as unknown as { initialIndex: number; index: number };
    const activeIndex = sortableSource.initialIndex;
    const overIndex = sortableSource.index;

    if (activeIndex === overIndex) {
      return;
    }

    if (local.onMove) {
      local.onMove({
        activeIndex,
        overIndex,
        activeId: sourceId ?? "",
        overId: targetId ?? sourceId ?? "",
      });
      return;
    }

    const items = local.value;
    if (
      activeIndex < 0 ||
      activeIndex >= items.length ||
      overIndex < 0 ||
      overIndex >= items.length
    ) {
      return;
    }

    const next = items.slice();
    const [moved] = next.splice(activeIndex, 1);
    next.splice(overIndex, 0, moved);
    local.onValueChange(next);
    local.onValueCommit?.(next, { previousValue: items });
  };

  const internalContextValue: SortableInternalContextValue = {
    activeId,
    indexOf: (id) => local.value.findIndex((item) => local.getItemValue(item) === id),
    live,
  };

  const container = () => (
    <Dynamic
      component={local.as ?? "div"}
      data-slot="sortable"
      data-dragging={activeId() !== null ? "" : undefined}
      class={cn(activeId() !== null && "cursor-grabbing!", local.class)}
      {...others}
    >
      {local.children}
    </Dynamic>
  );

  return (
    <SortableInternalContext.Provider value={internalContextValue}>
      <Show when={live()} fallback={container()}>
        <DragDropProvider
          sensors={[PointerSensor, KeyboardSensor]}
          modifiers={local.modifiers as never}
          onDragStart={handleDragStart as never}
          onDragEnd={handleDragEnd as never}
        >
          {container()}
        </DragDropProvider>
      </Show>
    </SortableInternalContext.Provider>
  );
}

export { Sortable };
