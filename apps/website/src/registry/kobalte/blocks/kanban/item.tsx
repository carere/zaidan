import { useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import { ITEM_TYPE } from "./constants";
import { IsOverlayContext, KanbanContext, KanbanItemContext } from "./context";

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

/** Polymorphic in the same way as {@link KanbanColumnHandleProps}. */
export type KanbanItemHandleProps<T extends ValidComponent = "div"> = ComponentProps<T> & {
  cursor?: boolean;
  as?: T;
};

/**
 * Drag handle for a `KanbanItem`. When present, only the handle starts a card
 * drag instead of the whole card.
 */
function KanbanItemHandle<T extends ValidComponent = "div">(props: KanbanItemHandleProps<T>) {
  const merged = mergeProps({ cursor: true }, props as KanbanItemHandleProps);
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

export { KanbanItem, KanbanItemHandle };
