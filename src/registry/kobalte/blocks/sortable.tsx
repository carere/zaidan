import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/solid";
import { isSortable, useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createSignal,
  mergeProps,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
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
  // `@dnd-kit/solid` is browser-only. The root renders presentational markup
  // during SSR/hydration and flips `live` after mount to engage drag and drop.
  live: () => boolean;
};

const SortableInternalContext = createContext<SortableInternalContextValue>({
  activeId: () => null,
  indexOf: () => -1,
  live: () => true,
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

export type SortableItemProps = ComponentProps<"div"> & {
  value: string;
  disabled?: boolean;
  as?: ValidComponent;
};

export type SortableItemHandleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  cursor?: boolean;
  as?: ValidComponent;
};

export type SortableOverlayProps = Omit<ComponentProps<"div">, "style" | "children"> & {
  children?: JSX.Element | ((params: { value: string }) => JSX.Element);
  dropAnimation?: DropAnimationConfig | null;
  style?: JSX.CSSProperties;
};

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

  if (isOverlay) {
    return <StaticSortableItem {...props} dragging />;
  }

  return (
    <Show when={internal.live()} fallback={<StaticSortableItem {...props} />}>
      <RegisteredSortableItem {...props} />
    </Show>
  );
}

/**
 * Presentational item markup, used inside `<SortableOverlay />` and during
 * SSR/hydration before the drag-and-drop manager is live.
 */
function StaticSortableItem(props: SortableItemProps & { dragging?: boolean }) {
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
    <SortableItemContext.Provider
      value={{
        setHandleRef: () => undefined,
        isDragging: () => Boolean(local.dragging),
        disabled: () => local.disabled,
      }}
    >
      <Dynamic
        component={local.as ?? "div"}
        data-slot="sortable-item"
        data-value={local.value}
        data-dragging={local.dragging ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        class={cn(local.class, { "opacity-50": local.disabled && !local.dragging })}
        {...others}
      >
        {local.children}
      </Dynamic>
    </SortableItemContext.Provider>
  );
}

function RegisteredSortableItem(props: SortableItemProps) {
  const internal = useContext(SortableInternalContext);

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
    <Show when={internal.live()}>
      <DragOverlay
        dropAnimation={
          local.dropAnimation === undefined ? defaultDropAnimation : local.dropAnimation
        }
        class={cn("z-50", internal.activeId() && "cursor-grabbing", local.class)}
        style={local.style}
      >
        {() => (
          <IsOverlayContext.Provider value={true}>
            <Show when={internal.activeId()}>
              {(value) => {
                const children = local.children;
                return typeof children === "function" ? children({ value: value() }) : children;
              }}
            </Show>
          </IsOverlayContext.Provider>
        )}
      </DragOverlay>
    </Show>
  );
}

export { Sortable, SortableItem, SortableItemHandle, SortableOverlay };
