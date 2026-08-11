import type { DragDropProviderProps } from "@dnd-kit/solid";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

// ---------- dnd-kit constants ----------

/**
 * `type` / `accept` tags used to keep column drags and item drags from
 * targeting each other. Columns accept both so a card can be dropped on the
 * empty area of a column; items only accept items.
 */
const COLUMN_TYPE = "kanban-column";
const ITEM_TYPE = "kanban-item";

/**
 * `CollisionPriority.Low`, inlined as a literal so this block depends on
 * `@dnd-kit/solid` alone and never reaches into `@dnd-kit/abstract`. A column
 * must lose to any card inside it, so that hovering a card targets the card and
 * only the bare column area targets the column.
 */
const COLUMN_COLLISION_PRIORITY = 1;

type DropAnimationConfig = {
  duration: number;
  easing: string;
};

const defaultDropAnimation: DropAnimationConfig = {
  duration: 250,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

// ---------- dnd-kit event types ----------

/**
 * `@dnd-kit/solid` does not re-export the drag event object types, so they are
 * derived from the provider props. These are the raw next-generation dnd-kit
 * events; unlike React dnd-kit v6 they carry `event.operation.source` /
 * `event.operation.target` rather than `event.active` / `event.over`.
 */
export type KanbanDragStartEvent = Parameters<NonNullable<DragDropProviderProps["onDragStart"]>>[0];
export type KanbanDragOverEvent = Parameters<NonNullable<DragDropProviderProps["onDragOver"]>>[0];
export type KanbanDragEndEvent = Parameters<NonNullable<DragDropProviderProps["onDragEnd"]>>[0];

// ---------- Public event payloads ----------

export type KanbanMoveEvent = {
  event: KanbanDragEndEvent;
  /** Identifier of the dragged item, as returned by `getItemValue`. */
  activeValue: string;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
};

export type KanbanCommitMeta<T> = {
  kind: "item" | "column";
  event: KanbanDragEndEvent;
  /** Identifier of the dragged item, or of the dragged column when `kind` is `"column"`. */
  activeValue: string;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
  previousValue: Record<string, T[]>;
};

// ---------- Contexts ----------

type KanbanHandleContextValue = {
  setHandleRef: (el: Element | undefined) => void;
  isDragging: () => boolean;
  disabled: () => boolean | undefined;
};

const emptyHandleContext: KanbanHandleContextValue = {
  setHandleRef: () => undefined,
  isDragging: () => false,
  disabled: () => false,
};

const KanbanColumnContext = createContext<KanbanHandleContextValue>(emptyHandleContext);
const KanbanItemContext = createContext<KanbanHandleContextValue>(emptyHandleContext);

const IsOverlayContext = createContext(false);

type KanbanItemLocation = {
  group: string;
  index: number;
};

type KanbanRootContextValue = {
  columns: () => Record<string, unknown[]>;
  columnIds: () => string[];
  activeId: () => string | null;
  isColumn: (id: string) => boolean;
  indexOfColumn: (id: string) => number;
  /** Resolves the column and position an item id currently sits at. */
  locate: (itemId: string) => KanbanItemLocation | undefined;
  /**
   * `@dnd-kit/solid` is browser-only. The root renders presentational markup
   * during SSR/hydration and flips `live` after mount to engage drag and drop.
   */
  live: () => boolean;
};

const KanbanContext = createContext<KanbanRootContextValue>({
  columns: () => ({}),
  columnIds: () => [],
  activeId: () => null,
  isColumn: () => false,
  indexOfColumn: () => -1,
  locate: () => undefined,
  live: () => true,
});

// ---------- Reorder helpers ----------

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Reorders the board so that `activeValue` sits where `overValue` currently is.
 * `overValue` may be an item id or a column id; dropping on a column id appends
 * to that column (and, within the source column, moves the card to the end).
 *
 * Returns `null` when the drop is a no-op or either end cannot be resolved.
 */
function moveItem<T>(
  columns: Record<string, T[]>,
  getItemValue: (item: T) => string,
  columnIds: string[],
  activeValue: string,
  overValue: string,
): Record<string, T[]> | null {
  const activeContainer = columnIds.find((key) =>
    columns[key].some((item) => getItemValue(item) === activeValue),
  );
  if (!activeContainer) return null;

  const overIsColumn = columnIds.includes(overValue);
  const overContainer = overIsColumn
    ? overValue
    : columnIds.find((key) => columns[key].some((item) => getItemValue(item) === overValue));
  if (!overContainer) return null;

  const activeItems = columns[activeContainer];
  const activeIndex = activeItems.findIndex((item) => getItemValue(item) === activeValue);
  if (activeIndex === -1) return null;

  if (activeContainer === overContainer) {
    const overIndex = overIsColumn
      ? activeItems.length - 1
      : activeItems.findIndex((item) => getItemValue(item) === overValue);
    if (overIndex === -1 || overIndex === activeIndex) return null;
    return { ...columns, [activeContainer]: arrayMove(activeItems, activeIndex, overIndex) };
  }

  const overItems = columns[overContainer];
  const rawOverIndex = overIsColumn
    ? overItems.length
    : overItems.findIndex((item) => getItemValue(item) === overValue);
  const overIndex = rawOverIndex === -1 ? overItems.length : rawOverIndex;

  const nextActive = activeItems.slice();
  const [moved] = nextActive.splice(activeIndex, 1);
  const nextOver = overItems.slice();
  nextOver.splice(overIndex, 0, moved);

  return { ...columns, [activeContainer]: nextActive, [overContainer]: nextOver };
}

/** Reorders the column keys, preserving each column's items. */
function moveColumn<T>(
  columns: Record<string, T[]>,
  activeIndex: number,
  overIndex: number,
): Record<string, T[]> {
  const order = arrayMove(Object.keys(columns), activeIndex, overIndex);
  const next: Record<string, T[]> = {};
  for (const key of order) next[key] = columns[key];
  return next;
}

// ---------- Kanban root ----------

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

    if (!overValue) {
      // Released over nothing. The live preview during dragOver may already have
      // moved the item, so commit the current value.
      commitChange(local.value, event, "item", activeValue, null, origin);
      return;
    }

    const activeIsColumn = isColumn(activeValue);

    if (local.onMove && !activeIsColumn) {
      const location = locations().get(activeValue);
      const overIsColumn = isColumn(overValue);
      const overContainer = overIsColumn ? overValue : locations().get(overValue)?.group;
      if (location && overContainer) {
        const overIndex = overIsColumn
          ? local.value[overContainer].length
          : (locations().get(overValue)?.index ?? -1);
        local.onMove({
          event,
          activeValue,
          activeContainer: location.group,
          activeIndex: location.index,
          overContainer,
          overIndex,
        });
      }
      return;
    }

    if (activeIsColumn) {
      // A column drag that ends over a non-column droppable is not an item move.
      if (!isColumn(overValue)) return;
      const activeIndex = columnIds().indexOf(activeValue);
      const overIndex = columnIds().indexOf(overValue);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;
      const next = moveColumn(local.value, activeIndex, overIndex);
      local.onValueChange(next);
      commitChange(next, event, "column", activeValue, overValue, origin);
      return;
    }

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

// ---------- Kanban board ----------

export type KanbanBoardProps = ComponentProps<"div"> & {
  as?: ValidComponent;
};

/**
 * Horizontal container for the columns. Purely presentational: ordering comes
 * from the `index` each `KanbanColumn` passes to `useSortable`.
 */
function KanbanBoard(props: KanbanBoardProps) {
  const [local, others] = splitProps(props, ["class", "as", "children"]);

  return (
    <Dynamic
      component={local.as ?? "div"}
      data-slot="kanban-board"
      class={cn("grid auto-rows-fr gap-4 sm:grid-cols-3", local.class)}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

// ---------- Kanban column ----------

export type KanbanColumnProps = ComponentProps<"div"> & {
  value: string;
  disabled?: boolean;
  as?: ValidComponent;
};

/**
 * A single column. Registers itself as a sortable of type `kanban-column` that
 * accepts both columns (reordering) and items (dropping a card on empty space).
 */
function KanbanColumn(props: KanbanColumnProps) {
  const isOverlay = useContext(IsOverlayContext);
  const kanban = useContext(KanbanContext);

  if (isOverlay) {
    return <StaticKanbanColumn {...props} dragging />;
  }

  return (
    <Show when={kanban.live()} fallback={<StaticKanbanColumn {...props} />}>
      <RegisteredKanbanColumn {...props} />
    </Show>
  );
}

/**
 * Presentational column markup, used inside `<KanbanOverlay />` and during
 * SSR/hydration before the drag-and-drop manager is live.
 */
function StaticKanbanColumn(props: KanbanColumnProps & { dragging?: boolean }) {
  const [local, others] = splitProps(props, [
    "value",
    "class",
    "disabled",
    "dragging",
    "as",
    "children",
    "ref",
  ]);

  return (
    <KanbanColumnContext.Provider
      value={{
        setHandleRef: () => undefined,
        isDragging: () => Boolean(local.dragging),
        disabled: () => local.disabled,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        data-slot="kanban-column"
        data-value={local.value}
        data-dragging={local.dragging ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        class={cn(
          "group/kanban-column flex flex-col",
          local.disabled && !local.dragging && "opacity-50",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </Dynamic>
    </KanbanColumnContext.Provider>
  );
}

function RegisteredKanbanColumn(props: KanbanColumnProps) {
  const kanban = useContext(KanbanContext);
  const [local, others] = splitProps(props, [
    "value",
    "class",
    "disabled",
    "as",
    "children",
    "ref",
  ]);

  const sortable = useSortable({
    get id() {
      return local.value;
    },
    get index() {
      const index = kanban.indexOfColumn(local.value);
      return index === -1 ? 0 : index;
    },
    get disabled() {
      return Boolean(local.disabled);
    },
    type: COLUMN_TYPE,
    accept: [COLUMN_TYPE, ITEM_TYPE],
    collisionPriority: COLUMN_COLLISION_PRIORITY,
  });

  // The handle mirrors upstream: it reports whether *a* column drag is in
  // progress, not whether this particular column is the source.
  const isColumnDragging = () => {
    const id = kanban.activeId();
    return id !== null && kanban.isColumn(id);
  };

  return (
    <KanbanColumnContext.Provider
      value={{
        setHandleRef: (el) => sortable.handleRef(el),
        isDragging: isColumnDragging,
        disabled: () => local.disabled,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        ref={sortable.ref}
        data-slot="kanban-column"
        data-value={local.value}
        data-dragging={sortable.isDragging() ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        class={cn("group/kanban-column flex flex-col", local.class, {
          "z-50 opacity-50": sortable.isDragging(),
          "opacity-50": local.disabled,
        })}
        {...others}
      >
        {local.children}
      </Dynamic>
    </KanbanColumnContext.Provider>
  );
}

// ---------- Kanban column handle ----------

export type KanbanColumnHandleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  cursor?: boolean;
  as?: ValidComponent;
};

/**
 * Drag handle for a `KanbanColumn`. When present, only the handle starts a
 * column drag instead of the whole column.
 */
function KanbanColumnHandle(props: KanbanColumnHandleProps) {
  const merged = mergeProps({ cursor: true }, props);
  const [local, others] = splitProps(merged, ["class", "cursor", "as", "children"]);
  const ctx = useContext(KanbanColumnContext);

  return (
    <Dynamic
      component={local.as ?? "div"}
      ref={(el: Element | undefined) => ctx.setHandleRef(el)}
      data-slot="kanban-column-handle"
      data-dragging={ctx.isDragging() ? "" : undefined}
      data-disabled={ctx.disabled() ? "" : undefined}
      class={cn(
        "opacity-0 transition-opacity group-hover/kanban-column:opacity-100",
        local.cursor && (ctx.isDragging() ? "cursor-grabbing!" : "cursor-grab!"),
        local.class,
      )}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

// ---------- Kanban column content ----------

export type KanbanColumnContentProps = ComponentProps<"div"> & {
  value: string;
  as?: ValidComponent;
};

/**
 * The area of a column that holds its cards. Purely presentational: ordering
 * comes from the `index` / `group` each `KanbanItem` passes to `useSortable`.
 */
function KanbanColumnContent(props: KanbanColumnContentProps) {
  const kanban = useContext(KanbanContext);
  const [local, others] = splitProps(props, ["value", "class", "as", "children"]);

  if (!(local.value in kanban.columns())) {
    throw new Error(
      `KanbanColumnContent: column "${local.value}" was not found in the Kanban value. ` +
        `Available columns: ${kanban.columnIds().join(", ") || "(none)"}.`,
    );
  }

  return (
    <Dynamic
      component={local.as ?? "div"}
      data-slot="kanban-column-content"
      class={cn("flex flex-col gap-2", local.class)}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

// ---------- Kanban item ----------

export type KanbanItemProps = ComponentProps<"div"> & {
  value: string;
  disabled?: boolean;
  as?: ValidComponent;
};

/**
 * A draggable card. Registers itself as a sortable of type `kanban-item`,
 * reading its column (`group`) and position (`index`) from the root context so
 * both stay reactive as the board reshuffles.
 */
function KanbanItem(props: KanbanItemProps) {
  const isOverlay = useContext(IsOverlayContext);
  const kanban = useContext(KanbanContext);

  if (isOverlay) {
    return <StaticKanbanItem {...props} dragging />;
  }

  return (
    <Show when={kanban.live()} fallback={<StaticKanbanItem {...props} />}>
      <RegisteredKanbanItem {...props} />
    </Show>
  );
}

/**
 * Presentational card markup, used inside `<KanbanOverlay />` and during
 * SSR/hydration before the drag-and-drop manager is live.
 */
function StaticKanbanItem(props: KanbanItemProps & { dragging?: boolean }) {
  const [local, others] = splitProps(props, [
    "value",
    "class",
    "disabled",
    "dragging",
    "as",
    "children",
    "ref",
  ]);

  return (
    <KanbanItemContext.Provider
      value={{
        setHandleRef: () => undefined,
        isDragging: () => Boolean(local.dragging),
        disabled: () => local.disabled,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        data-slot="kanban-item"
        data-value={local.value}
        data-dragging={local.dragging ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        class={cn(local.class, { "opacity-50": local.disabled && !local.dragging })}
        {...others}
      >
        {local.children}
      </Dynamic>
    </KanbanItemContext.Provider>
  );
}

function RegisteredKanbanItem(props: KanbanItemProps) {
  const kanban = useContext(KanbanContext);
  const [local, others] = splitProps(props, [
    "value",
    "class",
    "disabled",
    "as",
    "children",
    "ref",
  ]);

  const location = () => kanban.locate(local.value);

  const sortable = useSortable({
    get id() {
      return local.value;
    },
    get group() {
      return location()?.group;
    },
    get index() {
      const index = location()?.index;
      return index === undefined || index === -1 ? 0 : index;
    },
    get disabled() {
      return Boolean(local.disabled);
    },
    type: ITEM_TYPE,
    accept: ITEM_TYPE,
  });

  // The handle mirrors upstream: it reports whether *an* item drag is in
  // progress, not whether this particular card is the source.
  const isItemDragging = () => {
    const id = kanban.activeId();
    return id !== null && !kanban.isColumn(id);
  };

  return (
    <KanbanItemContext.Provider
      value={{
        setHandleRef: (el) => sortable.handleRef(el),
        isDragging: isItemDragging,
        disabled: () => local.disabled,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        ref={sortable.ref}
        data-slot="kanban-item"
        data-value={local.value}
        data-dragging={sortable.isDragging() ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        class={cn(local.class, {
          "z-50 opacity-50": sortable.isDragging(),
          "opacity-50": local.disabled,
        })}
        {...others}
      >
        {local.children}
      </Dynamic>
    </KanbanItemContext.Provider>
  );
}

// ---------- Kanban item handle ----------

export type KanbanItemHandleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  cursor?: boolean;
  as?: ValidComponent;
};

/**
 * Drag handle for a `KanbanItem`. When present, only the handle starts a card
 * drag instead of the whole card.
 */
function KanbanItemHandle(props: KanbanItemHandleProps) {
  const merged = mergeProps({ cursor: true }, props);
  const [local, others] = splitProps(merged, ["class", "cursor", "as", "children"]);
  const ctx = useContext(KanbanItemContext);

  return (
    <Dynamic
      component={local.as ?? "div"}
      ref={(el: Element | undefined) => ctx.setHandleRef(el)}
      data-slot="kanban-item-handle"
      data-dragging={ctx.isDragging() ? "" : undefined}
      data-disabled={ctx.disabled() ? "" : undefined}
      class={cn(
        local.cursor && (ctx.isDragging() ? "cursor-grabbing!" : "cursor-grab!"),
        local.class,
      )}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

// ---------- Kanban overlay ----------

export type KanbanOverlayProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  children?: JSX.Element | ((params: { value: string; variant: "column" | "item" }) => JSX.Element);
  dropAnimation?: DropAnimationConfig | null;
  style?: JSX.CSSProperties;
};

/**
 * The ghost element that follows the cursor while dragging. Pass either static
 * JSX (rendered whenever a drag is active) or a render function
 * `({ value, variant }) => JSX` to render the active column or card.
 *
 * `DragOverlay` self-portals — no `<Portal>` wrapper is needed, which replaces
 * the upstream `createPortal(..., document.body)` and its mount gate.
 */
function KanbanOverlay(props: KanbanOverlayProps) {
  const kanban = useContext(KanbanContext);
  const [local] = splitProps(props, ["children", "class", "dropAnimation", "style"]);

  const variant = (): "column" | "item" => {
    const id = kanban.activeId();
    return id !== null && kanban.isColumn(id) ? "column" : "item";
  };

  return (
    <Show when={kanban.live()}>
      <DragOverlay
        dropAnimation={
          local.dropAnimation === undefined ? defaultDropAnimation : local.dropAnimation
        }
        class={cn("z-50", kanban.activeId() && "cursor-grabbing", local.class)}
        style={local.style}
      >
        {() => (
          <IsOverlayContext.Provider value={true}>
            <Show when={kanban.activeId()}>
              {(value) => {
                const children = local.children;
                return typeof children === "function"
                  ? children({ value: value(), variant: variant() })
                  : children;
              }}
            </Show>
          </IsOverlayContext.Provider>
        )}
      </DragOverlay>
    </Show>
  );
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
};
