import { useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import type { SortableItemContextValue } from "./context";
import { IsOverlayContext, SortableInternalContext, SortableItemContext } from "./context";

export type SortableItemProps = ComponentProps<"div"> & {
  value: string;
  disabled?: boolean;
  as?: ValidComponent;
};

export type SortableItemHandleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  cursor?: boolean;
  as?: ValidComponent;
};

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

export { SortableItem, SortableItemHandle };
