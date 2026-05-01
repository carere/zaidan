import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { isSortable, useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, JSX, ParentProps, ValidComponent } from "solid-js";
import { createContext, createSignal, mergeProps, Show, splitProps, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

// ---------- Contexts ----------

type SortableItemContextValue = {
  setHandleRef: (el: Element | undefined) => void;
  isDragging: () => boolean;
  disabled: () => boolean | undefined;
};

const SortableItemContext = createContext<SortableItemContextValue>({
  setHandleRef: () => undefined,
  isDragging: () => false,
  disabled: () => false,
});

const IsOverlayContext = createContext(false);

type SortableInternalContextValue = {
  activeId: () => string | null;
  // Returns the index of `id` in the current sortable list, or -1 if missing.
  indexOf: (id: string) => number;
};

const SortableInternalContext = createContext<SortableInternalContextValue>({
  activeId: () => null,
  indexOf: () => -1,
});

// ---------- Drop animation defaults ----------

type DropAnimationConfig = {
  duration: number;
  easing: string;
};

const defaultDropAnimation: DropAnimationConfig = {
  duration: 250,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

// ---------- Types ----------

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

export type SortableItemProps = ComponentProps<"div"> & {
  value: string;
  disabled?: boolean;
  as?: ValidComponent;
};

export type SortableItemHandleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  cursor?: boolean;
  as?: ValidComponent;
};

export type SortableOverlayProps = ParentProps<
  {
    dropAnimation?: DropAnimationConfig | null;
    style?: JSX.CSSProperties;
  } & Omit<ComponentProps<"div">, "style">
>;

// ---------- Sortable root ----------

/**
 * Sortable root. Provides the `DragDropProvider` and an internal context that
 * descendant items use to look up their reactive index in the current array,
 * and that the overlay reads to know which item is active.
 */
function Sortable<T>(props: SortableRootProps<T>) {
  const [local, others] = splitProps(props, [
    "value",
    "onValueChange",
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
  };

  const internalContextValue: SortableInternalContextValue = {
    activeId,
    indexOf: (id) => local.value.findIndex((item) => local.getItemValue(item) === id),
  };

  return (
    <SortableInternalContext.Provider value={internalContextValue}>
      <DragDropProvider
        sensors={[PointerSensor, KeyboardSensor]}
        modifiers={local.modifiers as never}
        onDragStart={handleDragStart as never}
        onDragEnd={handleDragEnd as never}
      >
        <Dynamic
          component={local.as ?? "div"}
          data-slot="sortable"
          data-dragging={activeId() !== null ? "" : undefined}
          class={cn(activeId() !== null && "cursor-grabbing!", local.class)}
          {...others}
        >
          {local.children}
        </Dynamic>
      </DragDropProvider>
    </SortableInternalContext.Provider>
  );
}

// ---------- Sortable item ----------

/**
 * Sortable item. Registers itself with the sortable manager via `useSortable`,
 * passing a reactive `index` getter that reads the current position in the
 * parent `Sortable`'s `value` array.
 *
 * When rendered inside a `<SortableOverlay />` (via `IsOverlayContext`) it
 * skips registration and only renders presentational markup.
 */
function SortableItem(props: SortableItemProps) {
  const isOverlay = useContext(IsOverlayContext);
  const internal = useContext(SortableInternalContext);

  const [local, others] = splitProps(props, [
    "value",
    "class",
    "disabled",
    "as",
    "children",
    "ref",
  ]);

  if (isOverlay) {
    return (
      <SortableItemContext.Provider
        value={{
          setHandleRef: () => undefined,
          isDragging: () => true,
          disabled: () => false,
        }}
      >
        <Dynamic
          component={local.as ?? "div"}
          data-slot="sortable-item"
          data-value={local.value}
          data-dragging=""
          class={local.class}
          {...others}
        >
          {local.children}
        </Dynamic>
      </SortableItemContext.Provider>
    );
  }

  const sortable = useSortable({
    get id() {
      return local.value;
    },
    get index() {
      const idx = internal.indexOf(local.value);
      return idx === -1 ? 0 : idx;
    },
    get disabled() {
      return Boolean(local.disabled);
    },
  });

  const itemContextValue: SortableItemContextValue = {
    setHandleRef: (el) => sortable.handleRef(el),
    isDragging: () => sortable.isDragging(),
    disabled: () => local.disabled,
  };

  return (
    <SortableItemContext.Provider value={itemContextValue}>
      <Dynamic
        component={local.as ?? "div"}
        ref={sortable.ref}
        data-slot="sortable-item"
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
    </SortableItemContext.Provider>
  );
}

// ---------- Sortable item handle ----------

/**
 * Optional drag handle for a `SortableItem`. When present, only the handle
 * triggers a drag (instead of the whole item). Wires `handleRef` through the
 * `SortableItemContext`.
 */
function SortableItemHandle(props: SortableItemHandleProps) {
  const merged = mergeProps({ cursor: true }, props);
  const [local, others] = splitProps(merged, ["class", "cursor", "as", "children"]);
  const ctx = useContext(SortableItemContext);

  return (
    <Dynamic
      component={local.as ?? "div"}
      ref={(el: Element | undefined) => ctx.setHandleRef(el)}
      data-slot="sortable-item-handle"
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

// ---------- Sortable overlay ----------

/**
 * Renders the floating preview that follows the cursor while dragging. Pass
 * either static JSX (rendered whenever a drag is active) or a render function
 * `({ value }) => JSX` to render content based on the active item id.
 *
 * `DragOverlay` self-portals — no `<Portal>` wrapper is needed.
 */
function SortableOverlay(props: SortableOverlayProps) {
  const internal = useContext(SortableInternalContext);
  const [local] = splitProps(props, ["children", "class", "dropAnimation", "style"]);

  return (
    <DragOverlay
      dropAnimation={local.dropAnimation === undefined ? defaultDropAnimation : local.dropAnimation}
      class={cn("z-50", internal.activeId() && "cursor-grabbing", local.class)}
      style={local.style}
    >
      {() => (
        <IsOverlayContext.Provider value={true}>
          <Show when={internal.activeId() && local.children}>{local.children}</Show>
        </IsOverlayContext.Provider>
      )}
    </DragOverlay>
  );
}

export { Sortable, SortableItem, SortableItemHandle, SortableOverlay };
