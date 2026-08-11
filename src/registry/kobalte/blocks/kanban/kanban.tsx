import type { DragDropProviderProps } from "@dnd-kit/solid";
import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import type { JSX, ValidComponent } from "solid-js";
import { createMemo, createSignal, onMount, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import type { KanbanItemLocation, KanbanRootContextValue } from "./context";
import { KanbanContext } from "./context";
import { moveColumn, moveItem, resolveSortableDrop } from "./sorting";
import type {
  KanbanCommitMeta,
  KanbanDragEndEvent,
  KanbanDragStartEvent,
  KanbanMoveEvent,
} from "./types";

/**
 * Kanban root. Owns the `DragDropProvider` and the board state, and publishes a
 * context that columns and items read to resolve their reactive sortable index
 * and group.
 *
 * Notes on porting from React `@dnd-kit/core` + `@dnd-kit/sortable`:
 * - There is no `SortableContext`; `@dnd-kit/solid` derives ordering from the
 *   `index` / `group` passed to each `useSortable`, so `KanbanBoard` and
 *   `KanbanColumnContent` are plain layout elements.
 * - `modifiers` is forwarded to `DragDropProvider`. `unknown[]` is used because
 *   `@dnd-kit/solid` does not re-export the modifier type publicly.
 * - Sensors use `PointerSensor` (covers mouse + touch) and `KeyboardSensor`.
 * - There is no separate cancel event: `onDragCancel` is dispatched from
 *   `dragend` when `event.canceled` is true.
 */
export type KanbanRootProps<T> = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "onDragStart" | "onDragEnd" | "children"
> & {
  value: Record<string, T[]>;
  onValueChange: (value: Record<string, T[]>) => void;
  getItemValue: (item: T) => string;
  children?: JSX.Element;
  /**
   * Opt-in single commit point for item moves. When set, the live cross-column
   * preview is disabled and you apply the move yourself. Column reorders still
   * arrive through `onValueChange`.
   */
  onMove?: (event: KanbanMoveEvent) => void;
  /**
   * Fired once per completed drag with the final board and a `previousValue`
   * snapshot. Use it to persist moves to a backend.
   */
  onValueCommit?: (value: Record<string, T[]>, meta: KanbanCommitMeta<T>) => void;
  /** When `true`, cancelling a drag restores the board to its pre-drag arrangement. */
  restoreOnCancel?: boolean;
  onDragStart?: (event: KanbanDragStartEvent) => void;
  onDragEnd?: (event: KanbanDragEndEvent) => void;
  onDragCancel?: (event: KanbanDragEndEvent) => void;
  modifiers?: unknown[];
  as?: ValidComponent;
};

type DragOrigin<T> = {
  value: Record<string, T[]>;
  container: string | undefined;
  index: number;
};

function Kanban<T>(props: KanbanRootProps<T>) {
  const [local, others] = splitProps(props, [
    "value",
    "onValueChange",
    "getItemValue",
    "children",
    "class",
    "onMove",
    "onValueCommit",
    "restoreOnCancel",
    "onDragStart",
    "onDragEnd",
    "onDragCancel",
    "modifiers",
    "as",
  ]);

  const [activeId, setActiveId] = createSignal<string | null>(null);
  const [live, setLive] = createSignal(false);
  onMount(() => setLive(true));

  // Snapshot of the board taken at drag start, used by `restoreOnCancel` and by
  // `onValueCommit` to report where the drag came from.
  let dragOrigin: DragOrigin<T> | null = null;

  const columnIds = createMemo(() => Object.keys(local.value));

  const locations = createMemo(() => {
    const map = new Map<string, KanbanItemLocation>();
    for (const group of Object.keys(local.value)) {
      const items = local.value[group];
      for (let index = 0; index < items.length; index++) {
        const id = local.getItemValue(items[index]);
        if (import.meta.env.DEV && map.has(id)) {
          console.warn(
            `[Kanban] Duplicate item id "${id}". Item ids must be unique across all columns, or drag and drop will misbehave.`,
          );
        }
        map.set(id, { group, index });
      }
    }
    return map;
  });

  const isColumn = (id: string) => columnIds().includes(id);

  const commitChange = (
    finalValue: Record<string, T[]>,
    event: KanbanDragEndEvent,
    kind: "item" | "column",
    activeValue: string,
    overValue: string | null,
    origin: DragOrigin<T> | null,
  ) => {
    if (!local.onValueCommit || !origin) return;

    if (kind === "column") {
      const keys = Object.keys(finalValue);
      const overIndex = keys.indexOf(activeValue);
      if (overIndex === -1 || overIndex === origin.index) return;
      local.onValueCommit(finalValue, {
        kind: "column",
        event,
        activeValue,
        activeContainer: activeValue,
        activeIndex: origin.index,
        overContainer: overValue ?? activeValue,
        overIndex,
        previousValue: origin.value,
      });
      return;
    }

    let overContainer: string | undefined;
    let overIndex = -1;
    for (const key of Object.keys(finalValue)) {
      const found = finalValue[key].findIndex((item) => local.getItemValue(item) === activeValue);
      if (found !== -1) {
        overContainer = key;
        overIndex = found;
        break;
      }
    }
    if (overContainer === undefined) return;
    if (overContainer === origin.container && overIndex === origin.index) return;

    local.onValueCommit(finalValue, {
      kind: "item",
      event,
      activeValue,
      activeContainer: origin.container ?? overContainer,
      activeIndex: origin.index,
      overContainer,
      overIndex,
      previousValue: origin.value,
    });
  };

  const handleDragStart: NonNullable<DragDropProviderProps["onDragStart"]> = (event) => {
    const source = event.operation.source;
    const activeValue = source ? String(source.id) : null;
    setActiveId(activeValue);
    local.onDragStart?.(event);

    if (!activeValue || !(local.onValueCommit || local.restoreOnCancel)) {
      dragOrigin = null;
      return;
    }

    const snapshot = local.value;
    if (isColumn(activeValue)) {
      dragOrigin = {
        value: snapshot,
        container: activeValue,
        index: columnIds().indexOf(activeValue),
      };
      return;
    }

    const location = locations().get(activeValue);
    dragOrigin = {
      value: snapshot,
      container: location?.group,
      index: location?.index ?? -1,
    };
  };

  const handleDragOver: NonNullable<DragDropProviderProps["onDragOver"]> = (event) => {
    // In `onMove` mode the consumer owns applying item moves, so no live preview.
    if (local.onMove) return;

    const source = event.operation.source;
    const target = event.operation.target;
    if (!source || !target) return;

    const activeValue = String(source.id);
    const overValue = String(target.id);
    // Column reordering is applied on drop, not during the hover preview.
    if (isColumn(activeValue)) return;

    const next = moveItem(local.value, local.getItemValue, columnIds(), activeValue, overValue);
    if (next) local.onValueChange(next);
  };

  const handleDragEnd: NonNullable<DragDropProviderProps["onDragEnd"]> = (event) => {
    const source = event.operation.source;
    const target = event.operation.target;
    const activeValue = source ? String(source.id) : null;
    const overValue = target ? String(target.id) : null;
    const origin = dragOrigin;
    dragOrigin = null;
    setActiveId(null);

    if (event.canceled) {
      if (local.restoreOnCancel && origin && !local.onMove) {
        // Escape/cancel: undo the live-preview reshuffle applied during dragOver.
        local.onValueChange(origin.value);
      } else if (local.onValueCommit && origin && !local.onMove && activeValue) {
        // No restore requested: the live preview stays visible, so commit it.
        commitChange(local.value, event, "item", activeValue, overValue, origin);
      }
      local.onDragCancel?.(event);
      return;
    }

    local.onDragEnd?.(event);

    if (!activeValue) return;

    const activeIsColumn = isColumn(activeValue);

    if (!overValue && !activeIsColumn) {
      // Released over nothing. The live preview during dragOver may already have
      // moved the item, so commit the current value.
      commitChange(local.value, event, "item", activeValue, null, origin);
      return;
    }

    if (local.onMove && !activeIsColumn) {
      const location = locations().get(activeValue);
      if (!location) return;

      // Preferred: ask the sortable source where it landed. In `onMove` mode the
      // board is never reshuffled during the drag, so `local.value` still holds
      // the pre-drag layout and target ids resolve back to the drag source.
      const drop = resolveSortableDrop(source);
      if (drop?.toGroup !== undefined) {
        const overContainer = drop.toGroup;
        if (!(overContainer in local.value)) return;
        const overIndex = Math.min(drop.toIndex, local.value[overContainer].length);
        if (overContainer === location.group && overIndex === location.index) return;
        local.onMove({
          event,
          activeValue,
          activeContainer: location.group,
          activeIndex: location.index,
          overContainer,
          overIndex,
        });
        return;
      }

      // Fallback for a non-sortable source (custom draggable, no optimistic
      // sorting): infer from the drop target instead.
      if (!overValue) return;
      const overIsColumn = isColumn(overValue);
      const overContainer = overIsColumn ? overValue : locations().get(overValue)?.group;
      if (!overContainer) return;
      const overIndex = overIsColumn
        ? local.value[overContainer].length
        : (locations().get(overValue)?.index ?? -1);
      if (overIndex === -1) return;
      if (overContainer === location.group && overIndex === location.index) return;
      local.onMove({
        event,
        activeValue,
        activeContainer: location.group,
        activeIndex: location.index,
        overContainer,
        overIndex,
      });
      return;
    }

    if (activeIsColumn) {
      const activeIndex = columnIds().indexOf(activeValue);
      if (activeIndex === -1) return;

      // Column drags are never previewed during `dragOver`, so the reorder is
      // applied here. The destination comes from the sortable source: on drop
      // the target under the pointer is the dragged column itself, which would
      // otherwise read as "no movement".
      const drop = resolveSortableDrop(source);
      const overIndex = drop
        ? Math.min(Math.max(drop.toIndex, 0), columnIds().length - 1)
        : overValue
          ? columnIds().indexOf(overValue)
          : -1;
      if (overIndex === -1 || activeIndex === overIndex) return;

      const next = moveColumn(local.value, activeIndex, overIndex);
      local.onValueChange(next);
      commitChange(next, event, "column", activeValue, overValue, origin);
      return;
    }

    if (!overValue) return;

    const next = moveItem(local.value, local.getItemValue, columnIds(), activeValue, overValue);
    if (next) {
      local.onValueChange(next);
      commitChange(next, event, "item", activeValue, overValue, origin);
      return;
    }
    // Cross-column moves were applied during dragOver, so the current value is
    // already final.
    commitChange(local.value, event, "item", activeValue, overValue, origin);
  };

  const contextValue: KanbanRootContextValue = {
    columns: () => local.value as Record<string, unknown[]>,
    columnIds,
    activeId,
    isColumn,
    indexOfColumn: (id) => columnIds().indexOf(id),
    locate: (id) => locations().get(id),
    live,
  };

  const container = () => (
    <Dynamic
      component={local.as ?? "div"}
      data-slot="kanban"
      data-dragging={activeId() !== null ? "" : undefined}
      class={cn(activeId() !== null && "cursor-grabbing!", local.class)}
      {...others}
    >
      {local.children}
    </Dynamic>
  );

  return (
    <KanbanContext.Provider value={contextValue}>
      <Show when={live()} fallback={container()}>
        <DragDropProvider
          sensors={[PointerSensor, KeyboardSensor]}
          modifiers={local.modifiers as never}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {container()}
        </DragDropProvider>
      </Show>
    </KanbanContext.Provider>
  );
}

export { Kanban };
