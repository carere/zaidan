import { DragOverlay } from "@dnd-kit/solid";
import type { ComponentProps, JSX } from "solid-js";
import { Show, splitProps, useContext } from "solid-js";

import { cn } from "@/lib/utils";
import { IsOverlayContext, SortableInternalContext } from "./context";

type DropAnimationConfig = {
  duration: number;
  easing: string;
};

const defaultDropAnimation: DropAnimationConfig = {
  duration: 250,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

export type SortableOverlayProps = Omit<ComponentProps<"div">, "style" | "children"> & {
  children?: JSX.Element | ((params: { value: string }) => JSX.Element);
  dropAnimation?: DropAnimationConfig | null;
  style?: JSX.CSSProperties;
};

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

export { SortableOverlay };
