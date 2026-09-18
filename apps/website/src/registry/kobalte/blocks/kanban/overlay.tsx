import { DragOverlay } from "@dnd-kit/solid";
import type { ComponentProps, JSX } from "solid-js";
import { Show, splitProps, useContext } from "solid-js";

import { cn } from "@/lib/utils";
import type { DropAnimationConfig } from "./constants";
import { defaultDropAnimation } from "./constants";
import { IsOverlayContext, KanbanContext } from "./context";

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

export { KanbanOverlay };
