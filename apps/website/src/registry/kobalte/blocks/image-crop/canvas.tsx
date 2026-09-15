import type { ComponentProps, JSX } from "solid-js";
import { mergeProps, onCleanup, onMount, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

import { useImageCropContext } from "./context";
import { resizeCrop } from "./geometry";
import type { ImageCropCanvasProps, ResizeHandleDirection } from "./types";

function ImageCropCanvas(props: ImageCropCanvasProps) {
  const mergedProps = mergeProps({ showResizeHandles: true }, props);
  const [local, others] = splitProps(mergedProps, ["class", "showResizeHandles"]);
  const crop = useImageCropContext();
  let viewportRef: HTMLDivElement | undefined;

  const startDrag = (event: PointerEvent) => {
    event.preventDefault();

    const start = {
      crop: crop.options(),
      pointerX: event.clientX,
      pointerY: event.clientY,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - start.pointerX;
      const deltaY = moveEvent.clientY - start.pointerY;

      crop.setOptions({
        ...start.crop,
        x: start.crop.x + deltaX,
        y: start.crop.y + deltaY,
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const startResize = (handle: ResizeHandleDirection, event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const start = {
      crop: crop.options(),
      pointerX: event.clientX,
      pointerY: event.clientY,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - start.pointerX;
      const deltaY = moveEvent.clientY - start.pointerY;
      const next = resizeCrop(handle, start.crop, deltaX, deltaY, crop.aspectRatio());

      crop.setOptions(next);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    const keyOffsets: Record<string, { x: number; y: number }> = {
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();

    const step = event.shiftKey ? 10 : 1;
    crop.setOptions((previous) => ({
      ...previous,
      x: previous.x + offset.x * step,
      y: previous.y + offset.y * step,
    }));
  };

  const handleSelectionPointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    const handle = (event.target as HTMLElement).dataset.resizeHandle as
      | ResizeHandleDirection
      | undefined;

    if (handle) {
      startResize(handle, event);
      return;
    }

    startDrag(event);
  };

  onMount(() => {
    const updateViewportSize = () => {
      if (!viewportRef) {
        return;
      }

      const rect = viewportRef.getBoundingClientRect();
      crop.setViewportSize({ height: rect.height, width: rect.width });
    };

    updateViewportSize();

    const observer = new ResizeObserver(updateViewportSize);

    if (viewportRef) {
      observer.observe(viewportRef);
    }

    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={viewportRef}
      data-slot="image-crop-canvas"
      class={cn(
        "flex min-h-105 flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4",
        local.class,
      )}
      {...others}
    >
      <Show when={crop.image()}>
        {(image) => (
          <div
            class="relative overflow-hidden shadow-sm ring-1 ring-border"
            data-slot="image-crop-stage"
            style={{
              height: `${crop.displaySize().height}px`,
              width: `${crop.displaySize().width}px`,
            }}
          >
            <img
              alt={image().name}
              class="absolute inset-0 size-full select-none object-fill"
              draggable={false}
              src={image().src}
            />
            <button
              aria-label="Crop area"
              class="absolute touch-none appearance-none p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-slot="image-crop-selection"
              onKeyDown={handleKeyDown}
              onPointerDown={handleSelectionPointerDown}
              style={{
                height: `${crop.options().height}px`,
                left: `${crop.options().x}px`,
                top: `${crop.options().y}px`,
                width: `${crop.options().width}px`,
              }}
              type="button"
            >
              <span class="absolute inset-0 cursor-move border-2 border-white border-dashed shadow-[0_0_0_9999px_rgb(0_0_0/0.45)] ring-1 ring-black/30" />
              <ResizeEdgeControl class="-top-2 right-2 left-2 h-4 cursor-ns-resize" handle="n" />
              <ResizeEdgeControl class="top-2 -right-2 bottom-2 w-4 cursor-ew-resize" handle="e" />
              <ResizeEdgeControl class="right-2 -bottom-2 left-2 h-4 cursor-ns-resize" handle="s" />
              <ResizeEdgeControl class="top-2 bottom-2 -left-2 w-4 cursor-ew-resize" handle="w" />
              <ResizeHandleControl
                class="-top-2 -left-2 cursor-nwse-resize"
                handle="nw"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize"
                handle="n"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="-top-2 -right-2 cursor-nesw-resize"
                handle="ne"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="top-1/2 -right-2 -translate-y-1/2 cursor-ew-resize"
                handle="e"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="-right-2 -bottom-2 cursor-nwse-resize"
                handle="se"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize"
                handle="s"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="-bottom-2 -left-2 cursor-nesw-resize"
                handle="sw"
                visible={local.showResizeHandles}
              />
              <ResizeHandleControl
                class="top-1/2 -left-2 -translate-y-1/2 cursor-ew-resize"
                handle="w"
                visible={local.showResizeHandles}
              />
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}

function ResizeEdgeControl(
  props: ComponentProps<"span"> & {
    handle: ResizeHandleDirection;
  },
) {
  const [local, others] = splitProps(props, ["class", "handle"]);

  return (
    <span
      aria-hidden="true"
      class={cn("absolute z-10", local.class)}
      data-resize-handle={local.handle}
      {...others}
    />
  );
}

function ResizeHandleControl(
  props: ComponentProps<"span"> & {
    handle: ResizeHandleDirection;
    visible: boolean;
  },
) {
  const [local, others] = splitProps(props, ["class", "handle", "visible"]);

  return (
    <span
      aria-hidden="true"
      class={cn("absolute z-20 flex size-4 items-center justify-center", local.class)}
      data-resize-handle={local.handle}
      {...others}
    >
      <Show when={local.visible}>
        <span
          class="pointer-events-none size-2.5 rounded-full border border-background bg-primary shadow-sm ring-1 ring-black/20"
          data-resize-handle-indicator=""
        />
      </Show>
    </span>
  );
}

export { ImageCropCanvas };
