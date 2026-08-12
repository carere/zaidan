import type { Accessor, ComponentProps, JSX } from "solid-js";
import { createEffect, createSignal, onCleanup, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { useDataGrid } from "./data-grid";

const MIN_THUMB_SIZE = 24;
const FALLBACK_SCROLLBAR_SIZE = 12;

const INITIAL_METRICS = {
  hasVerticalOverflow: false,
  headerHeight: 0,
  horizontalScrollbarSize: 0,
  thumbHeight: 0,
  thumbTop: 0,
  trackHeight: 0,
} as const;

const SCROLLBAR_CLASS =
  "flex touch-none p-px transition-colors select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2 data-[orientation=vertical]:border-s data-[orientation=vertical]:border-s-transparent";

const SCROLLBAR_THUMB_CLASS = "bg-border rounded-full relative flex-1";

/**
 * Positioning and overflow behavior Base UI's `ScrollArea` supplies from its
 * own stylesheet. The block owns the scroll surface here (see the note on
 * `DataGridScrollArea`), so the equivalents are declared explicitly.
 */
const VIEWPORT_SCROLL_CLASS =
  "overflow-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const SCROLLBAR_POSITION_CLASS = {
  horizontal: "absolute bottom-0 inset-x-0",
  vertical: "absolute top-0 end-0",
} as const;

type DataGridScrollAreaOrientation = "horizontal" | "vertical" | "both";

type ScrollbarMetrics = {
  hasVerticalOverflow: boolean;
  headerHeight: number;
  horizontalScrollbarSize: number;
  thumbHeight: number;
  thumbTop: number;
  trackHeight: number;
};

type ObservedElements = {
  header: HTMLElement | null;
  horizontalScrollbar: HTMLElement | null;
  table: HTMLElement | null;
  tableViewport: HTMLElement | null;
};

type DataGridScrollAreaProps = Omit<ComponentProps<"div">, "children" | "orientation"> & {
  children: JSX.Element;
  orientation?: DataGridScrollAreaOrientation;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function areMetricsEqual(next: ScrollbarMetrics, prev: ScrollbarMetrics) {
  return (
    next.hasVerticalOverflow === prev.hasVerticalOverflow &&
    next.headerHeight === prev.headerHeight &&
    next.horizontalScrollbarSize === prev.horizontalScrollbarSize &&
    next.thumbHeight === prev.thumbHeight &&
    next.thumbTop === prev.thumbTop &&
    next.trackHeight === prev.trackHeight
  );
}

function applyMetrics(element: HTMLElement, metrics: ScrollbarMetrics) {
  element.style.setProperty("--data-grid-scrollbar-header-height", `${metrics.headerHeight}px`);
  element.style.setProperty("--data-grid-scrollbar-thumb-height", `${metrics.thumbHeight}px`);
  element.style.setProperty("--data-grid-scrollbar-thumb-top", `${metrics.thumbTop}px`);
  element.style.setProperty("--data-grid-scrollbar-track-height", `${metrics.trackHeight}px`);
}

/**
 * Native-overflow scrollbar for one axis.
 *
 * Base UI's `ScrollArea.Scrollbar` / `ScrollArea.Thumb` pair is reimplemented
 * here rather than mapped onto `@/registry/kobalte/ui/scroll-area`: that
 * wrapper renders its own fixed `<ScrollBar />`, exposes no viewport ref, and
 * offers no way to attach the `data-slot` / `data-orientation` hooks or the
 * pinned-column inset this grid measures against. The public class names,
 * data attributes and geometry are the upstream ones.
 */
function DataGridScrollAreaScrollbar(props: {
  orientation: "horizontal" | "vertical";
  viewport: Accessor<HTMLDivElement | undefined>;
  style?: JSX.CSSProperties;
}) {
  const [track, setTrack] = createSignal<HTMLDivElement>();
  const [thumbSize, setThumbSize] = createSignal(0);
  const [thumbOffset, setThumbOffset] = createSignal(0);
  const [visible, setVisible] = createSignal(false);
  const isVertical = () => props.orientation === "vertical";

  let drag: { pointerId: number; start: number; startScroll: number } | null = null;

  const measure = () => {
    const viewport = props.viewport();
    const trackElement = track();

    if (!viewport || !trackElement) return;

    const trackSize = isVertical() ? trackElement.clientHeight : trackElement.clientWidth;
    const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
    const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
    const maxScroll = Math.max(0, scrollSize - clientSize);

    if (trackSize <= 0 || maxScroll <= 0.5) {
      setVisible(false);
      return;
    }

    const size = clamp((clientSize / scrollSize) * trackSize, MIN_THUMB_SIZE, trackSize);
    const scrollOffset = isVertical() ? viewport.scrollTop : viewport.scrollLeft;

    setVisible(true);
    setThumbSize(size);
    setThumbOffset((scrollOffset / maxScroll) * Math.max(0, trackSize - size));
  };

  createEffect(() => {
    const viewport = props.viewport();
    const trackElement = track();

    if (!viewport || !trackElement) return;

    measure();
    viewport.addEventListener("scroll", measure, { passive: true });
    onCleanup(() => viewport.removeEventListener("scroll", measure));

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      observer.observe(trackElement);
      onCleanup(() => observer.disconnect());
    }
  });

  const scrollToThumbOffset = (nextOffset: number) => {
    const viewport = props.viewport();
    const trackElement = track();

    if (!viewport || !trackElement) return;

    const trackSize = isVertical() ? trackElement.clientHeight : trackElement.clientWidth;
    const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
    const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
    const maxScroll = Math.max(0, scrollSize - clientSize);
    const maxOffset = Math.max(0, trackSize - thumbSize());

    if (maxScroll === 0 || maxOffset === 0) return;

    const ratio = clamp(nextOffset, 0, maxOffset) / maxOffset;

    if (isVertical()) {
      viewport.scrollTop = ratio * maxScroll;
    } else {
      viewport.scrollLeft = ratio * maxScroll;
    }
  };

  return (
    <div
      ref={setTrack}
      data-slot="data-grid-scrollbar"
      data-orientation={props.orientation}
      class={cn(
        SCROLLBAR_CLASS,
        SCROLLBAR_POSITION_CLASS[props.orientation],
        !visible() && "pointer-events-none opacity-0",
      )}
      style={props.style}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;

        event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const pointerOffset = isVertical() ? event.clientY - rect.top : event.clientX - rect.left;

        scrollToThumbOffset(pointerOffset - thumbSize() / 2);
      }}
    >
      <div
        data-slot="data-grid-thumb"
        class={SCROLLBAR_THUMB_CLASS}
        style={
          isVertical()
            ? { height: `${thumbSize()}px`, transform: `translateY(${thumbOffset()}px)` }
            : { width: `${thumbSize()}px`, transform: `translateX(${thumbOffset()}px)` }
        }
        onPointerDown={(event) => {
          const viewport = props.viewport();
          if (!viewport) return;

          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);

          drag = {
            pointerId: event.pointerId,
            start: isVertical() ? event.clientY : event.clientX,
            startScroll: isVertical() ? viewport.scrollTop : viewport.scrollLeft,
          };
        }}
        onPointerMove={(event) => {
          const viewport = props.viewport();
          const trackElement = track();

          if (!viewport || !trackElement || !drag || drag.pointerId !== event.pointerId) return;

          const trackSize = isVertical() ? trackElement.clientHeight : trackElement.clientWidth;
          const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
          const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
          const maxScroll = Math.max(0, scrollSize - clientSize);
          const maxOffset = Math.max(0, trackSize - thumbSize());

          if (maxScroll === 0 || maxOffset === 0) return;

          const delta = (isVertical() ? event.clientY : event.clientX) - drag.start;
          const next = clamp(drag.startScroll + (delta / maxOffset) * maxScroll, 0, maxScroll);

          if (isVertical()) {
            viewport.scrollTop = next;
          } else {
            viewport.scrollLeft = next;
          }
        }}
        onPointerUp={(event) => {
          if (drag?.pointerId === event.pointerId) drag = null;
        }}
        onPointerCancel={(event) => {
          if (drag?.pointerId === event.pointerId) drag = null;
        }}
        onLostPointerCapture={() => {
          drag = null;
        }}
      />
    </div>
  );
}

/**
 * Scroll wrapper for wide or sticky-header grids.
 *
 * Upstream reaches past the shadcn wrapper straight into
 * `@base-ui/react/scroll-area` because it needs the viewport ref, per-axis
 * scrollbars, `data-slot` hooks and a pinned-column inset. Zaidan's
 * `@/registry/kobalte/ui/scroll-area` exposes none of those - its viewport ref
 * is private and it hard-codes a single vertical `<ScrollBar />` - so the
 * scroll surface is implemented with vanilla Solid inside the block rather
 * than by widening the shared primitive. The rendered contract (slots, class
 * names, CSS variables, the custom sticky-header overlay) is upstream's.
 */
function DataGridScrollArea(props: DataGridScrollAreaProps) {
  const [local, others] = splitProps(props, ["children", "class", "orientation"]);
  const grid = useDataGrid();

  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [viewport, setViewport] = createSignal<HTMLDivElement>();
  const [hasCustomVerticalOverflow, setHasCustomVerticalOverflow] = createSignal(false);

  let overlay: HTMLDivElement | undefined;
  let drag: { pointerId: number; startScrollTop: number; startY: number } | null = null;
  let metrics: ScrollbarMetrics = INITIAL_METRICS;
  let observedElements: ObservedElements = {
    header: null,
    horizontalScrollbar: null,
    table: null,
    tableViewport: null,
  };

  const orientation = () => local.orientation ?? "both";
  const showHorizontal = () => orientation() !== "vertical";
  const showVertical = () => orientation() !== "horizontal";
  const usesCustomVerticalScrollbar = () =>
    showVertical() && !!grid.props.tableLayout?.headerSticky;
  // Pinned columns are sticky and never scroll, so the horizontal scrollbar
  // track is inset to span only the scrollable center region between them.
  const isColumnsPinnable = () => !!grid.props.tableLayout?.columnsPinnable;
  const scrollbarInsetStart = () => (isColumnsPinnable() ? grid.table.getStartTotalSize() : 0);
  const scrollbarInsetEnd = () => (isColumnsPinnable() ? grid.table.getEndTotalSize() : 0);

  const clearDragState = () => {
    drag = null;
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
  };

  // The overlay mounts one update after the sync that detected overflow, so it
  // misses that sync's write. Seeding it from the ref callback lands the
  // geometry before the browser paints the track.
  const setOverlayRef = (node: HTMLDivElement) => {
    overlay = node;
    applyMetrics(node, metrics);
    onCleanup(() => {
      if (overlay === node) overlay = undefined;
    });
  };

  const resetMetrics = () => {
    if (!areMetricsEqual(INITIAL_METRICS, metrics)) {
      metrics = INITIAL_METRICS;
      if (overlay) applyMetrics(overlay, INITIAL_METRICS);
    }

    setHasCustomVerticalOverflow(false);
  };

  const syncCustomVerticalScrollbar = () => {
    const containerElement = container();
    const viewportElement = viewport();

    if (!containerElement || !viewportElement || !usesCustomVerticalScrollbar()) {
      resetMetrics();
      return;
    }

    const { header, horizontalScrollbar } = observedElements;
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const viewportHeight = viewportElement.clientHeight;
    const viewportWidth = viewportElement.clientWidth;
    const scrollHeight = viewportElement.scrollHeight;
    const scrollWidth = viewportElement.scrollWidth;
    const hasHorizontalOverflow = showHorizontal() && scrollWidth > viewportWidth + 0.5;
    const horizontalScrollbarSize = hasHorizontalOverflow
      ? horizontalScrollbar?.offsetHeight || FALLBACK_SCROLLBAR_SIZE
      : 0;
    const trackHeight = Math.max(0, viewportHeight - headerHeight - horizontalScrollbarSize);
    const maxScroll = Math.max(0, scrollHeight - viewportHeight);

    let nextMetrics: ScrollbarMetrics;

    if (trackHeight === 0 || maxScroll === 0) {
      nextMetrics = {
        hasVerticalOverflow: false,
        headerHeight,
        horizontalScrollbarSize,
        thumbHeight: trackHeight,
        thumbTop: 0,
        trackHeight,
      };
    } else {
      const bodyContentHeight = Math.max(trackHeight, scrollHeight - headerHeight);
      const thumbHeight = clamp(
        trackHeight * (trackHeight / bodyContentHeight),
        MIN_THUMB_SIZE,
        trackHeight,
      );
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const thumbTop = maxThumbTop > 0 ? (viewportElement.scrollTop / maxScroll) * maxThumbTop : 0;

      nextMetrics = {
        hasVerticalOverflow: true,
        headerHeight,
        horizontalScrollbarSize,
        thumbHeight,
        thumbTop,
        trackHeight,
      };
    }

    if (!areMetricsEqual(nextMetrics, metrics)) {
      metrics = nextMetrics;
      // Scoped to the overlay, never to the container. These four properties
      // inherit, and thumbTop changes on essentially every scroll frame, so
      // writing them on the element that wraps the whole grid invalidates
      // computed style for every row and cell each frame. The overlay subtree
      // is their only reader.
      if (overlay) applyMetrics(overlay, nextMetrics);
    }

    setHasCustomVerticalOverflow(nextMetrics.hasVerticalOverflow);
  };

  createEffect(() => {
    const containerElement = container();
    const viewportElement = viewport();

    if (!containerElement || !viewportElement) return;

    if (!usesCustomVerticalScrollbar()) {
      resetMetrics();
      return;
    }

    let frame = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncCustomVerticalScrollbar);
    };

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleSync);
    const observed = new Set<HTMLElement>();

    const observeElement = (element: HTMLElement | null) => {
      if (element && observer && !observed.has(element)) {
        observer.observe(element);
        observed.add(element);
      }
    };

    const resolveObservedElements = () => {
      observedElements = {
        header: containerElement.querySelector(
          '[data-slot="data-grid-table"] thead',
        ) as HTMLElement | null,
        horizontalScrollbar: containerElement.querySelector(
          '[data-slot="data-grid-scrollbar"][data-orientation="horizontal"]',
        ) as HTMLElement | null,
        table: containerElement.querySelector(
          '[data-slot="data-grid-table"]',
        ) as HTMLElement | null,
        tableViewport: containerElement.querySelector(
          '[data-slot="data-grid-table-viewport"]',
        ) as HTMLElement | null,
      };

      observeElement(observedElements.header);
      observeElement(observedElements.table);
      observeElement(observedElements.tableViewport);

      return !!(observedElements.header && observedElements.table);
    };

    observeElement(viewportElement);
    const resolvedOnMount = resolveObservedElements();

    scheduleSync();
    viewportElement.addEventListener("scroll", scheduleSync, { passive: true });

    // A table that mounts after this effect (empty state swapped for data)
    // would otherwise never be observed and the custom scrollbar would
    // overlap the sticky header. One-shot: disconnects once resolved.
    let mutationObserver: MutationObserver | null = null;
    if (!resolvedOnMount && typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        if (resolveObservedElements()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
          scheduleSync();
        }
      });
      mutationObserver.observe(containerElement, { childList: true, subtree: true });
    }

    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mutationObserver?.disconnect();
      viewportElement.removeEventListener("scroll", scheduleSync);
      clearDragState();
    });
  });

  const scrollToThumbOffset = (nextThumbTop: number) => {
    const viewportElement = viewport();
    const { thumbHeight, trackHeight } = metrics;

    if (!viewportElement) return;

    const maxScroll = Math.max(0, viewportElement.scrollHeight - viewportElement.clientHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

    if (maxScroll === 0 || maxThumbTop === 0) {
      viewportElement.scrollTop = 0;
      return;
    }

    const ratio = clamp(nextThumbTop, 0, maxThumbTop) / maxThumbTop;
    viewportElement.scrollTop = ratio * maxScroll;
  };

  const handleThumbPointerDown = (event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    const viewportElement = viewport();

    if (!viewportElement) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    drag = {
      pointerId: event.pointerId,
      startScrollTop: viewportElement.scrollTop,
      startY: event.clientY,
    };

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  };

  const handleThumbPointerMove = (event: PointerEvent) => {
    const viewportElement = viewport();
    const dragState = drag;
    const { thumbHeight, trackHeight } = metrics;

    if (!viewportElement || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, viewportElement.scrollHeight - viewportElement.clientHeight);

    if (maxThumbTop === 0 || maxScroll === 0) return;

    const deltaY = event.clientY - dragState.startY;
    const nextScrollTop = dragState.startScrollTop + (deltaY / maxThumbTop) * maxScroll;

    viewportElement.scrollTop = clamp(nextScrollTop, 0, maxScroll);
  };

  const handleThumbPointerUp = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) return;
    clearDragState();
  };

  const handleTrackPointerDown = (event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    const { thumbHeight } = metrics;

    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top - thumbHeight / 2;

    scrollToThumbOffset(offsetY);
  };

  return (
    <div ref={setContainer} class="relative">
      <div
        data-slot="data-grid-scroll-area"
        // Styling hook: present while the sticky-header scroll mode detects
        // vertical overflow, so consumers can style scrollable vs short
        // grids with a plain ancestor attribute selector.
        data-overflow-vertical={hasCustomVerticalOverflow() ? "true" : undefined}
        class={cn("relative", local.class)}
        {...others}
      >
        <div
          ref={setViewport}
          data-slot="scroll-area-viewport"
          class={cn("size-full", VIEWPORT_SCROLL_CLASS)}
        >
          <div data-slot="scroll-area-content">{local.children}</div>
        </div>

        <Show when={showHorizontal()}>
          <DataGridScrollAreaScrollbar
            orientation="horizontal"
            viewport={viewport}
            style={
              scrollbarInsetStart() > 0 || scrollbarInsetEnd() > 0
                ? {
                    "margin-inline-start": scrollbarInsetStart()
                      ? `${scrollbarInsetStart()}px`
                      : undefined,
                    "margin-inline-end": scrollbarInsetEnd()
                      ? `${scrollbarInsetEnd()}px`
                      : undefined,
                  }
                : undefined
            }
          />
        </Show>

        <Show when={showVertical() && !usesCustomVerticalScrollbar()}>
          <DataGridScrollAreaScrollbar orientation="vertical" viewport={viewport} />
        </Show>
      </div>

      <Show when={usesCustomVerticalScrollbar() && hasCustomVerticalOverflow()}>
        <div
          ref={setOverlayRef}
          aria-hidden="true"
          class="pointer-events-none absolute inset-e-0 top-(--data-grid-scrollbar-header-height) z-20 h-(--data-grid-scrollbar-track-height)"
        >
          <div
            class="pointer-events-auto relative h-full w-2 touch-none p-px"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              class={cn(
                "bg-border absolute end-px w-2",
                "top-(--data-grid-scrollbar-thumb-top) h-(--data-grid-scrollbar-thumb-height)",
                "rounded-full",
              )}
              onLostPointerCapture={clearDragState}
              onPointerCancel={handleThumbPointerUp}
              onPointerDown={handleThumbPointerDown}
              onPointerMove={handleThumbPointerMove}
              onPointerUp={handleThumbPointerUp}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}

export type { DataGridScrollAreaOrientation, DataGridScrollAreaProps };
export { DataGridScrollArea };
