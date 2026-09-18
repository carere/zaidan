import { useSortable } from "@dnd-kit/solid/sortable";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import { COLUMN_COLLISION_PRIORITY, COLUMN_TYPE, ITEM_TYPE } from "./constants";
import { IsOverlayContext, KanbanColumnContext, KanbanContext } from "./context";

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

/**
 * Polymorphic: `as` also widens the accepted props, so
 * `<KanbanColumnHandle as={Button} variant="ghost" size="icon-xs" />` type-checks.
 * This replaces upstream's Base UI `render={(props) => <Button {...props} />}`.
 */
export type KanbanColumnHandleProps<T extends ValidComponent = "div"> = ComponentProps<T> & {
  cursor?: boolean;
  as?: T;
};

/**
 * Drag handle for a `KanbanColumn`. When present, only the handle starts a
 * column drag instead of the whole column.
 */
function KanbanColumnHandle<T extends ValidComponent = "div">(props: KanbanColumnHandleProps<T>) {
  const merged = mergeProps({ cursor: true }, props as KanbanColumnHandleProps);
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

export { KanbanBoard, KanbanColumn, KanbanColumnContent, KanbanColumnHandle };
