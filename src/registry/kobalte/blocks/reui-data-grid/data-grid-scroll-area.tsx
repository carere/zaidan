import {
  type ComponentProps,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";

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

type DataGridScrollAreaProps = Omit<ComponentProps<"div">, "children" | "style"> & {
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

function DataGridScrollArea(rawProps: DataGridScrollAreaProps) {
  const [local, others] = splitProps(rawProps, ["children", "class", "orientation"]);
  const ctx = useDataGrid();

  let containerRef: HTMLDivElement | undefined;
  let viewportRef: HTMLDivElement | undefined;
  let dragRef: {
    pointerId: number;
    startScrollTop: number;
    startY: number;
  } | null = null;
  let metricsRef: ScrollbarMetrics = { ...INITIAL_METRICS };
  let observedElementsRef: ObservedElements = {
    header: null,
    horizontalScrollbar: null,
    table: null,
    tableViewport: null,
  };

  const orientation = () => local.orientation ?? "both";
  const showHorizontal = () => orientation() !== "vertical";
  const showVertical = () => orientation() !== "horizontal";
  const usesCustomVerticalScrollbar = () => showVertical() && !!ctx.props.tableLayout?.headerSticky;

  const [hasCustomVerticalOverflow, setHasCustomVerticalOverflow] = createSignal(false);

  const clearDragState = () => {
    dragRef = null;
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
  };

  const resetMetrics = () => {
    if (containerRef && !areMetricsEqual(INITIAL_METRICS, metricsRef)) {
      applyMetrics(containerRef, INITIAL_METRICS);
      metricsRef = { ...INITIAL_METRICS };
    }
    setHasCustomVerticalOverflow(false);
  };

  const syncCustomVerticalScrollbar = () => {
    if (!containerRef || !viewportRef || !usesCustomVerticalScrollbar()) {
      resetMetrics();
      return;
    }

    const { header, horizontalScrollbar } = observedElementsRef;
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const viewportHeight = viewportRef.clientHeight;
    const viewportWidth = viewportRef.clientWidth;
    const scrollHeight = viewportRef.scrollHeight;
    const scrollWidth = viewportRef.scrollWidth;
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
      const thumbTop = maxThumbTop > 0 ? (viewportRef.scrollTop / maxScroll) * maxThumbTop : 0;

      nextMetrics = {
        hasVerticalOverflow: true,
        headerHeight,
        horizontalScrollbarSize,
        thumbHeight,
        thumbTop,
        trackHeight,
      };
    }

    if (!areMetricsEqual(nextMetrics, metricsRef)) {
      applyMetrics(containerRef, nextMetrics);
      metricsRef = nextMetrics;
    }

    setHasCustomVerticalOverflow(nextMetrics.hasVerticalOverflow);
  };

  createEffect(() => {
    if (!containerRef || !viewportRef) return;

    if (!usesCustomVerticalScrollbar()) {
      resetMetrics();
      return;
    }

    observedElementsRef = {
      header: containerRef.querySelector(
        '[data-slot="data-grid-table"] thead',
      ) as HTMLElement | null,
      horizontalScrollbar: containerRef.querySelector(
        '[data-slot="data-grid-scrollbar"][data-orientation="horizontal"]',
      ) as HTMLElement | null,
      table: containerRef.querySelector('[data-slot="data-grid-table"]') as HTMLElement | null,
      tableViewport: containerRef.querySelector(
        '[data-slot="data-grid-table-viewport"]',
      ) as HTMLElement | null,
    };

    let frame = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncCustomVerticalScrollbar);
    };

    scheduleSync();
    viewportRef.addEventListener("scroll", scheduleSync, { passive: true });

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleSync);

    observer?.observe(viewportRef);
    if (observedElementsRef.header) observer?.observe(observedElementsRef.header);
    if (observedElementsRef.table) observer?.observe(observedElementsRef.table);
    if (observedElementsRef.tableViewport) observer?.observe(observedElementsRef.tableViewport);

    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      viewportRef?.removeEventListener("scroll", scheduleSync);
      clearDragState();
    });
  });

  const scrollToThumbOffset = (nextThumbTop: number) => {
    if (!viewportRef) return;

    const { thumbHeight, trackHeight } = metricsRef;
    const maxScroll = Math.max(0, viewportRef.scrollHeight - viewportRef.clientHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

    if (maxScroll === 0 || maxThumbTop === 0) {
      viewportRef.scrollTop = 0;
      return;
    }

    const ratio = clamp(nextThumbTop, 0, maxThumbTop) / maxThumbTop;
    viewportRef.scrollTop = ratio * maxScroll;
  };

  const handleThumbPointerDown = (event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    if (!viewportRef) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef = {
      pointerId: event.pointerId,
      startScrollTop: viewportRef.scrollTop,
      startY: event.clientY,
    };

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  };

  const handleThumbPointerMove = (event: PointerEvent) => {
    if (!viewportRef || !dragRef || dragRef.pointerId !== event.pointerId) return;

    const { thumbHeight, trackHeight } = metricsRef;
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, viewportRef.scrollHeight - viewportRef.clientHeight);

    if (maxThumbTop === 0 || maxScroll === 0) return;

    const deltaY = event.clientY - dragRef.startY;
    const nextScrollTop = dragRef.startScrollTop + (deltaY / maxThumbTop) * maxScroll;

    viewportRef.scrollTop = clamp(nextScrollTop, 0, maxScroll);
  };

  const handleThumbPointerUp = (event: PointerEvent) => {
    if (dragRef?.pointerId !== event.pointerId) return;
    clearDragState();
  };

  const handleTrackPointerDown = (event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    const { thumbHeight } = metricsRef;
    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top - thumbHeight / 2;

    scrollToThumbOffset(offsetY);
  };

  return (
    <div ref={containerRef} class="relative">
      <div data-slot="data-grid-scroll-area" class={cn("relative", local.class)} {...others}>
        <div ref={viewportRef} data-slot="scroll-area-viewport" class="size-full overflow-auto">
          <div data-slot="scroll-area-content">{local.children}</div>
        </div>
      </div>

      <Show when={usesCustomVerticalScrollbar() && hasCustomVerticalOverflow()}>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-e-0 top-(--data-grid-scrollbar-header-height) z-20 h-(--data-grid-scrollbar-track-height)"
        >
          <div
            class="pointer-events-auto relative h-full w-2 touch-none p-px"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              class={cn(
                "absolute end-px w-2 bg-border",
                "top-(--data-grid-scrollbar-thumb-top) h-(--data-grid-scrollbar-thumb-height)",
                "style-lyra:rounded-none style-maia:rounded-full style-mira:rounded-full style-nova:rounded-full style-vega:rounded-full",
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
