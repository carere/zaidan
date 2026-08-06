import {
  type Accessor,
  type ComponentProps,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";

type Orientation = "horizontal" | "vertical";
type OverflowEdge = "xEnd" | "xStart" | "yEnd" | "yStart";
type OverflowEdges = Record<OverflowEdge, boolean>;
type OverflowDistances = Record<OverflowEdge, number>;
type OverflowEdgeThreshold = number | Partial<Record<OverflowEdge, number>>;

const MIN_THUMB_SIZE = 16;
const SCROLL_TIMEOUT = 500;
const EMPTY_EDGES: OverflowEdges = {
  xEnd: false,
  xStart: false,
  yEnd: false,
  yStart: false,
};
const EMPTY_DISTANCES: OverflowDistances = {
  xEnd: 0,
  xStart: 0,
  yEnd: 0,
  yStart: 0,
};

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAxisOffset(
  element: HTMLElement | undefined,
  property: "margin" | "padding",
  axis: "x" | "y",
) {
  if (!element || typeof getComputedStyle === "undefined") return 0;

  const styles = getComputedStyle(element);
  const sides = axis === "x" ? (["Left", "Right"] as const) : (["Top", "Bottom"] as const);

  return sides.reduce(
    (total, side) => total + (Number.parseFloat(styles[`${property}${side}`]) || 0),
    0,
  );
}

function mergeStyles(
  internal: JSX.CSSProperties,
  external: JSX.CSSProperties | string | undefined,
) {
  if (typeof external !== "string") return { ...internal, ...external };

  const serialized = Object.entries(internal)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");

  return `${serialized};${external}`;
}

function normalizeThreshold(threshold: OverflowEdgeThreshold | undefined) {
  if (typeof threshold === "number") {
    const value = Math.max(0, threshold);
    return { xEnd: value, xStart: value, yEnd: value, yStart: value };
  }

  return {
    xEnd: Math.max(0, threshold?.xEnd ?? 0),
    xStart: Math.max(0, threshold?.xStart ?? 0),
    yEnd: Math.max(0, threshold?.yEnd ?? 0),
    yStart: Math.max(0, threshold?.yStart ?? 0),
  };
}

type ScrollAreaContextValue = {
  beginDrag: (orientation: Orientation, event: PointerEvent) => void;
  cornerHeight: Accessor<number>;
  cornerWidth: Accessor<number>;
  drag: (event: PointerEvent) => void;
  endDrag: (event: PointerEvent) => void;
  getThumb: (orientation: Orientation) => HTMLDivElement | undefined;
  hasOverflowX: Accessor<boolean>;
  hasOverflowY: Accessor<boolean>;
  hovering: Accessor<boolean>;
  markScrolling: (orientation: Orientation) => void;
  measure: () => void;
  overflowDistances: Accessor<OverflowDistances>;
  overflowEdges: Accessor<OverflowEdges>;
  rootId: string;
  scrollingX: Accessor<boolean>;
  scrollingY: Accessor<boolean>;
  setScrollbar: (orientation: Orientation, element: HTMLDivElement | undefined) => void;
  setThumb: (orientation: Orientation, element: HTMLDivElement | undefined) => void;
  thumbHeight: Accessor<number>;
  thumbOffsetX: Accessor<number>;
  thumbOffsetY: Accessor<number>;
  thumbWidth: Accessor<number>;
  viewport: Accessor<HTMLDivElement | undefined>;
};

const ScrollAreaContext = createContext<ScrollAreaContextValue>();

function useScrollArea() {
  const context = useContext(ScrollAreaContext);
  if (!context) throw new Error("ScrollArea parts must be used within ScrollArea");
  return context;
}

type ScrollAreaProps = ComponentProps<"div"> & {
  overflowEdgeThreshold?: OverflowEdgeThreshold;
};

const ScrollArea = (props: ScrollAreaProps) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "onPointerDown",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerMove",
    "overflowEdgeThreshold",
    "ref",
    "role",
    "style",
  ]);
  const rootId = `scroll-area-${createUniqueId()}`;
  const threshold = createMemo(() => normalizeThreshold(local.overflowEdgeThreshold));
  const [hasOverflowX, setHasOverflowX] = createSignal(false);
  const [hasOverflowY, setHasOverflowY] = createSignal(false);
  const [hovering, setHovering] = createSignal(false);
  const [scrollingX, setScrollingX] = createSignal(false);
  const [scrollingY, setScrollingY] = createSignal(false);
  const [cornerHeight, setCornerHeight] = createSignal(0);
  const [cornerWidth, setCornerWidth] = createSignal(0);
  const [thumbHeight, setThumbHeight] = createSignal(0);
  const [thumbWidth, setThumbWidth] = createSignal(0);
  const [thumbOffsetX, setThumbOffsetX] = createSignal(0);
  const [thumbOffsetY, setThumbOffsetY] = createSignal(0);
  const [overflowEdges, setOverflowEdges] = createSignal(EMPTY_EDGES);
  const [overflowDistances, setOverflowDistances] = createSignal(EMPTY_DISTANCES);
  const [registeredPartsRevision, setRegisteredPartsRevision] = createSignal(0);

  let viewportElement: HTMLDivElement | undefined;
  let verticalScrollbar: HTMLDivElement | undefined;
  let horizontalScrollbar: HTMLDivElement | undefined;
  let verticalThumb: HTMLDivElement | undefined;
  let horizontalThumb: HTMLDivElement | undefined;
  let dragOrientation: Orientation | undefined;
  let dragPointerId: number | undefined;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScrollLeft = 0;
  let dragStartScrollTop = 0;
  let previousScrollLeft = 0;
  let previousScrollTop = 0;
  let programmaticScroll = true;
  let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;
  let scrollingXTimer: ReturnType<typeof setTimeout> | undefined;
  let scrollingYTimer: ReturnType<typeof setTimeout> | undefined;

  const markScrolling = (orientation: Orientation) => {
    if (orientation === "horizontal") {
      setScrollingX(true);
      clearTimeout(scrollingXTimer);
      scrollingXTimer = setTimeout(() => setScrollingX(false), SCROLL_TIMEOUT);
    } else {
      setScrollingY(true);
      clearTimeout(scrollingYTimer);
      scrollingYTimer = setTimeout(() => setScrollingY(false), SCROLL_TIMEOUT);
    }
  };

  const setScrollbar = (orientation: Orientation, element: HTMLDivElement | undefined) => {
    if (orientation === "vertical") verticalScrollbar = element;
    else horizontalScrollbar = element;
    setRegisteredPartsRevision((revision) => revision + 1);
  };

  const setThumb = (orientation: Orientation, element: HTMLDivElement | undefined) => {
    if (orientation === "vertical") verticalThumb = element;
    else horizontalThumb = element;
    setRegisteredPartsRevision((revision) => revision + 1);
  };

  const measure = () => {
    const viewport = viewportElement;
    if (!viewport) return;

    const viewportHeight = viewport.clientHeight;
    const viewportWidth = viewport.clientWidth;
    const contentHeight = viewport.scrollHeight;
    const contentWidth = viewport.scrollWidth;
    const nextHasOverflowX = viewportWidth < contentWidth;
    const nextHasOverflowY = viewportHeight < contentHeight;
    const maxScrollLeft = Math.max(0, contentWidth - viewportWidth);
    const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
    const scrollLeft = nextHasOverflowX ? clamp(viewport.scrollLeft, 0, maxScrollLeft) : 0;
    const scrollTop = nextHasOverflowY ? clamp(viewport.scrollTop, 0, maxScrollTop) : 0;
    const distances = {
      xEnd: nextHasOverflowX ? maxScrollLeft - scrollLeft : 0,
      xStart: scrollLeft,
      yEnd: nextHasOverflowY ? maxScrollTop - scrollTop : 0,
      yStart: scrollTop,
    };
    const edgeThreshold = threshold();

    setHasOverflowX(nextHasOverflowX);
    setHasOverflowY(nextHasOverflowY);
    setOverflowDistances(distances);
    setOverflowEdges({
      xEnd: nextHasOverflowX && distances.xEnd > edgeThreshold.xEnd,
      xStart: nextHasOverflowX && distances.xStart > edgeThreshold.xStart,
      yEnd: nextHasOverflowY && distances.yEnd > edgeThreshold.yEnd,
      yStart: nextHasOverflowY && distances.yStart > edgeThreshold.yStart,
    });

    const nextCornerWidth =
      nextHasOverflowX && nextHasOverflowY ? (verticalScrollbar?.offsetWidth ?? 0) : 0;
    const nextCornerHeight =
      nextHasOverflowX && nextHasOverflowY ? (horizontalScrollbar?.offsetHeight ?? 0) : 0;
    const cornerChanged = nextCornerWidth !== cornerWidth() || nextCornerHeight !== cornerHeight();
    setCornerWidth(nextCornerWidth);
    setCornerHeight(nextCornerHeight);

    const verticalScrollbarOffset = getAxisOffset(verticalScrollbar, "padding", "y");
    const horizontalScrollbarOffset = getAxisOffset(horizontalScrollbar, "padding", "x");
    const verticalThumbOffset = getAxisOffset(verticalThumb, "margin", "y");
    const horizontalThumbOffset = getAxisOffset(horizontalThumb, "margin", "x");
    const idealThumbHeight =
      (nextHasOverflowY ? viewportHeight : 0) - verticalScrollbarOffset - verticalThumbOffset;
    const idealThumbWidth =
      (nextHasOverflowX ? viewportWidth : 0) - horizontalScrollbarOffset - horizontalThumbOffset;
    const availableThumbHeight = verticalScrollbar
      ? Math.min(verticalScrollbar.offsetHeight, idealThumbHeight)
      : idealThumbHeight;
    const availableThumbWidth = horizontalScrollbar
      ? Math.min(horizontalScrollbar.offsetWidth, idealThumbWidth)
      : idealThumbWidth;
    const nextThumbHeight = Math.max(
      MIN_THUMB_SIZE,
      availableThumbHeight * (contentHeight === 0 ? 1 : viewportHeight / contentHeight),
    );
    const nextThumbWidth = Math.max(
      MIN_THUMB_SIZE,
      availableThumbWidth * (contentWidth === 0 ? 1 : viewportWidth / contentWidth),
    );
    const maxThumbOffsetY = Math.max(
      0,
      (verticalScrollbar?.offsetHeight ?? viewportHeight) -
        nextThumbHeight -
        verticalScrollbarOffset -
        verticalThumbOffset,
    );
    const maxThumbOffsetX = Math.max(
      0,
      (horizontalScrollbar?.offsetWidth ?? viewportWidth) -
        nextThumbWidth -
        horizontalScrollbarOffset -
        horizontalThumbOffset,
    );

    setThumbHeight(nextThumbHeight);
    setThumbWidth(nextThumbWidth);
    setThumbOffsetY(maxScrollTop === 0 ? 0 : (scrollTop / maxScrollTop) * maxThumbOffsetY);
    setThumbOffsetX(maxScrollLeft === 0 ? 0 : (scrollLeft / maxScrollLeft) * maxThumbOffsetX);

    if (cornerChanged) queueMicrotask(measure);
  };

  const beginDrag = (orientation: Orientation, event: PointerEvent) => {
    if (event.button !== 0) return;

    dragOrientation = orientation;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartScrollLeft = viewportElement?.scrollLeft ?? 0;
    dragStartScrollTop = viewportElement?.scrollTop ?? 0;

    const thumb = orientation === "vertical" ? verticalThumb : horizontalThumb;
    thumb?.setPointerCapture(event.pointerId);
  };

  const drag = (event: PointerEvent) => {
    const viewport = viewportElement;
    if (!viewport || dragOrientation === undefined || dragPointerId !== event.pointerId) return;

    const scrollbar = dragOrientation === "vertical" ? verticalScrollbar : horizontalScrollbar;
    const thumb = dragOrientation === "vertical" ? verticalThumb : horizontalThumb;
    if (!scrollbar || !thumb) return;

    const vertical = dragOrientation === "vertical";
    const scrollbarOffset = getAxisOffset(scrollbar, "padding", vertical ? "y" : "x");
    const thumbMargin = getAxisOffset(thumb, "margin", vertical ? "y" : "x");
    const thumbSize = vertical ? thumb.offsetHeight : thumb.offsetWidth;
    const trackSize = vertical ? scrollbar.offsetHeight : scrollbar.offsetWidth;
    const maxThumbOffset = trackSize - thumbSize - scrollbarOffset - thumbMargin;
    const maxScroll = vertical
      ? viewport.scrollHeight - viewport.clientHeight
      : viewport.scrollWidth - viewport.clientWidth;
    if (maxThumbOffset <= 0 || maxScroll <= 0) return;

    const delta = vertical ? event.clientY - dragStartY : event.clientX - dragStartX;
    const nextScroll =
      (vertical ? dragStartScrollTop : dragStartScrollLeft) + (delta / maxThumbOffset) * maxScroll;

    if (vertical) viewport.scrollTop = nextScroll;
    else viewport.scrollLeft = nextScroll;
    event.preventDefault();
    markScrolling(dragOrientation);
    measure();
  };

  const endDrag = (event: PointerEvent) => {
    if (dragPointerId !== event.pointerId || dragOrientation === undefined) return;

    const orientation = dragOrientation;
    const thumb = orientation === "vertical" ? verticalThumb : horizontalThumb;
    if (thumb?.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);

    if (orientation === "vertical") {
      clearTimeout(scrollingYTimer);
      setScrollingY(false);
    } else {
      clearTimeout(scrollingXTimer);
      setScrollingX(false);
    }
    dragOrientation = undefined;
    dragPointerId = undefined;
  };

  const handleUserInteraction = () => {
    programmaticScroll = false;
  };

  const handleScroll = () => {
    const viewport = viewportElement;
    if (!viewport) return;

    measure();
    if (!programmaticScroll) {
      if (viewport.scrollLeft !== previousScrollLeft) markScrolling("horizontal");
      if (viewport.scrollTop !== previousScrollTop) markScrolling("vertical");
    }
    previousScrollLeft = viewport.scrollLeft;
    previousScrollTop = viewport.scrollTop;

    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      programmaticScroll = true;
    }, 100);
  };

  const context: ScrollAreaContextValue = {
    beginDrag,
    cornerHeight,
    cornerWidth,
    drag,
    endDrag,
    getThumb: (orientation) => (orientation === "vertical" ? verticalThumb : horizontalThumb),
    hasOverflowX,
    hasOverflowY,
    hovering,
    markScrolling,
    measure,
    overflowDistances,
    overflowEdges,
    rootId,
    scrollingX,
    scrollingY,
    setScrollbar,
    setThumb,
    thumbHeight,
    thumbOffsetX,
    thumbOffsetY,
    thumbWidth,
    viewport: () => viewportElement,
  };

  createEffect(() => {
    registeredPartsRevision();
    threshold();
    queueMicrotask(measure);
  });

  onMount(() => {
    const viewport = viewportElement;
    if (!viewport) return;

    if (viewport.matches(":hover")) setHovering(true);

    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    const observeContent = () => {
      if (!resizeObserver) return;
      for (const child of viewport.children) resizeObserver.observe(child);
    };

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(viewport);
      observeContent();
    }
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        observeContent();
        measure();
      });
      mutationObserver.observe(viewport, { childList: true, subtree: true });
    }

    queueMicrotask(measure);
    onCleanup(() => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    });
  });

  onCleanup(() => {
    clearTimeout(scrollEndTimer);
    clearTimeout(scrollingXTimer);
    clearTimeout(scrollingYTimer);
  });

  return (
    <ScrollAreaContext.Provider value={context}>
      <div
        data-slot="scroll-area"
        data-scrolling={scrollingX() || scrollingY() ? "" : undefined}
        data-has-overflow-x={hasOverflowX() ? "" : undefined}
        data-has-overflow-y={hasOverflowY() ? "" : undefined}
        data-overflow-x-start={overflowEdges().xStart ? "" : undefined}
        data-overflow-x-end={overflowEdges().xEnd ? "" : undefined}
        data-overflow-y-start={overflowEdges().yStart ? "" : undefined}
        data-overflow-y-end={overflowEdges().yEnd ? "" : undefined}
        class={cn("z-scroll-area relative", local.class)}
        role={local.role ?? "presentation"}
        ref={(element) => {
          if (typeof local.ref === "function") local.ref(element);
        }}
        style={mergeStyles(
          {
            "--scroll-area-corner-height": `${cornerHeight()}px`,
            "--scroll-area-corner-width": `${cornerWidth()}px`,
            position: "relative",
          } as JSX.CSSProperties,
          local.style,
        )}
        onPointerEnter={(event) => {
          callEventHandler(local.onPointerEnter, event);
          if (event.pointerType !== "touch") setHovering(true);
        }}
        onPointerMove={(event) => {
          callEventHandler(local.onPointerMove, event);
          if (event.pointerType !== "touch") setHovering(true);
        }}
        onPointerDown={(event) => {
          callEventHandler(local.onPointerDown, event);
          if (event.pointerType === "touch") setHovering(false);
        }}
        onPointerLeave={(event) => {
          callEventHandler(local.onPointerLeave, event);
          setHovering(false);
        }}
        {...others}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the native scroll viewport must observe pointer, wheel, touch, and keyboard input to distinguish user scrolling while retaining Base UI's presentation role */}
        <div
          data-id={`${rootId}-viewport`}
          data-slot="scroll-area-viewport"
          data-scrolling={scrollingX() || scrollingY() ? "" : undefined}
          data-has-overflow-x={hasOverflowX() ? "" : undefined}
          data-has-overflow-y={hasOverflowY() ? "" : undefined}
          data-overflow-x-start={overflowEdges().xStart ? "" : undefined}
          data-overflow-x-end={overflowEdges().xEnd ? "" : undefined}
          data-overflow-y-start={overflowEdges().yStart ? "" : undefined}
          data-overflow-y-end={overflowEdges().yEnd ? "" : undefined}
          class="z-scroll-area-viewport size-full rounded-[inherit] outline-none transition-[color,box-shadow] [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
          role="presentation"
          tabIndex={hasOverflowX() || hasOverflowY() ? 0 : -1}
          ref={(element) => {
            viewportElement = element;
            previousScrollLeft = element.scrollLeft;
            previousScrollTop = element.scrollTop;
            setRegisteredPartsRevision((revision) => revision + 1);
          }}
          style={
            {
              "--scroll-area-overflow-x-end": `${overflowDistances().xEnd}px`,
              "--scroll-area-overflow-x-start": `${overflowDistances().xStart}px`,
              "--scroll-area-overflow-y-end": `${overflowDistances().yEnd}px`,
              "--scroll-area-overflow-y-start": `${overflowDistances().yStart}px`,
              overflow: "scroll",
            } as JSX.CSSProperties
          }
          onScroll={handleScroll}
          onWheel={handleUserInteraction}
          onTouchMove={handleUserInteraction}
          onPointerMove={handleUserInteraction}
          onPointerEnter={handleUserInteraction}
          onKeyDown={handleUserInteraction}
        >
          {local.children}
        </div>
        <ScrollBar />
        <Show when={hasOverflowX() && hasOverflowY()}>
          <div
            data-slot="scroll-area-corner"
            style={{
              bottom: "0",
              height: `${cornerHeight()}px`,
              "inset-inline-end": "0",
              position: "absolute",
              width: `${cornerWidth()}px`,
            }}
          />
        </Show>
      </div>
    </ScrollAreaContext.Provider>
  );
};

type ScrollBarProps = ComponentProps<"div"> & {
  keepMounted?: boolean;
  orientation?: Orientation;
};

const ScrollBar = (rawProps: ScrollBarProps) => {
  const props = mergeProps({ keepMounted: false, orientation: "vertical" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "keepMounted",
    "onPointerCancel",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onWheel",
    "orientation",
    "ref",
    "style",
  ]);
  const context = useScrollArea();
  const orientation = () => local.orientation ?? "vertical";
  const vertical = () => orientation() === "vertical";
  const hasOverflow = () => (vertical() ? context.hasOverflowY() : context.hasOverflowX());
  const scrolling = () => (vertical() ? context.scrollingY() : context.scrollingX());
  const [trackElement, setTrackElement] = createSignal<HTMLDivElement>();

  const handleTrackPointerDown = (event: PointerEvent) => {
    callEventHandler(local.onPointerDown, event);
    if (event.defaultPrevented || event.button !== 0) return;

    const thumb = context.getThumb(orientation());
    if (thumb?.contains(event.target as Node)) return;
    const viewport = context.viewport();
    const scrollbar = trackElement();
    if (!viewport || !scrollbar || !thumb) return;

    const isVertical = vertical();
    const thumbSize = isVertical ? thumb.offsetHeight : thumb.offsetWidth;
    const scrollbarOffset = getAxisOffset(scrollbar, "padding", isVertical ? "y" : "x");
    const thumbMargin = getAxisOffset(thumb, "margin", isVertical ? "y" : "x");
    const rect = scrollbar.getBoundingClientRect();
    const pointer = isVertical ? event.clientY - rect.top : event.clientX - rect.left;
    const trackSize = isVertical ? scrollbar.offsetHeight : scrollbar.offsetWidth;
    const maxThumbOffset = trackSize - thumbSize - scrollbarOffset - thumbMargin;
    const thumbOffset = clamp(
      pointer - thumbSize / 2 - scrollbarOffset + thumbMargin / 2,
      0,
      maxThumbOffset,
    );
    const maxScroll = isVertical
      ? viewport.scrollHeight - viewport.clientHeight
      : viewport.scrollWidth - viewport.clientWidth;
    const nextScroll = maxThumbOffset <= 0 ? 0 : (thumbOffset / maxThumbOffset) * maxScroll;

    if (isVertical) viewport.scrollTop = nextScroll;
    else viewport.scrollLeft = nextScroll;
    context.markScrolling(orientation());
    context.measure();
    context.beginDrag(orientation(), event);
  };

  const handleWheel = (event: WheelEvent) => {
    callEventHandler(
      local.onWheel,
      event as WheelEvent & { currentTarget: HTMLDivElement; target: Element },
    );
    if (event.defaultPrevented || event.ctrlKey) return;

    const viewport = context.viewport();
    if (!viewport) return;

    const isVertical = vertical();
    const delta = isVertical ? event.deltaY : event.deltaX;
    if (delta === 0) return;

    const maxScroll = isVertical
      ? viewport.scrollHeight - viewport.clientHeight
      : viewport.scrollWidth - viewport.clientWidth;
    const currentScroll = isVertical ? viewport.scrollTop : viewport.scrollLeft;
    if ((currentScroll <= 0 && delta < 0) || (currentScroll >= maxScroll && delta > 0)) return;

    event.preventDefault();
    const nextScroll = clamp(currentScroll + delta, 0, maxScroll);
    if (isVertical) viewport.scrollTop = nextScroll;
    else viewport.scrollLeft = nextScroll;
    context.markScrolling(orientation());
    context.measure();
  };

  createEffect(() => {
    const element = trackElement();
    if (!element) return;

    element.addEventListener("wheel", handleWheel, { passive: false });
    onCleanup(() => element.removeEventListener("wheel", handleWheel));
  });

  createEffect(() => {
    orientation();
    hasOverflow();
    queueMicrotask(context.measure);
  });

  onCleanup(() => {
    context.setScrollbar(orientation(), undefined);
    context.setThumb(orientation(), undefined);
  });

  return (
    <Show when={local.keepMounted || hasOverflow()}>
      <div
        data-id={`${context.rootId}-scrollbar`}
        data-slot="scroll-area-scrollbar"
        data-orientation={orientation()}
        data-hovering={context.hovering() ? "" : undefined}
        data-scrolling={scrolling() ? "" : undefined}
        data-has-overflow-x={context.hasOverflowX() ? "" : undefined}
        data-has-overflow-y={context.hasOverflowY() ? "" : undefined}
        data-overflow-x-start={context.overflowEdges().xStart ? "" : undefined}
        data-overflow-x-end={context.overflowEdges().xEnd ? "" : undefined}
        data-overflow-y-start={context.overflowEdges().yStart ? "" : undefined}
        data-overflow-y-end={context.overflowEdges().yEnd ? "" : undefined}
        class={cn(
          "z-scroll-area-scrollbar flex touch-none select-none p-px transition-colors",
          local.class,
        )}
        ref={(element) => {
          setTrackElement(element);
          context.setScrollbar(orientation(), element);
          if (typeof local.ref === "function") local.ref(element);
        }}
        style={mergeStyles(
          {
            ...(vertical()
              ? {
                  "--scroll-area-thumb-height": `${context.thumbHeight()}px`,
                  bottom: "var(--scroll-area-corner-height)",
                  "inset-inline-end": "0",
                  top: "0",
                }
              : {
                  "--scroll-area-thumb-width": `${context.thumbWidth()}px`,
                  bottom: "0",
                  "inset-inline-end": "var(--scroll-area-corner-width)",
                  "inset-inline-start": "0",
                }),
            position: "absolute",
            "touch-action": "none",
            "user-select": "none",
            "-webkit-user-select": "none",
          } as JSX.CSSProperties,
          local.style,
        )}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={(event) => callEventHandler(local.onPointerMove, event)}
        onPointerUp={(event) => {
          callEventHandler(local.onPointerUp, event);
          context.endDrag(event);
        }}
        onPointerCancel={(event) => {
          callEventHandler(local.onPointerCancel, event);
          context.endDrag(event);
        }}
        {...others}
      >
        <div
          data-slot="scroll-area-thumb"
          data-orientation={orientation()}
          data-scrolling={scrolling() ? "" : undefined}
          class="z-scroll-area-thumb relative flex-1 bg-border"
          ref={(element) => context.setThumb(orientation(), element)}
          style={
            vertical()
              ? {
                  height: "var(--scroll-area-thumb-height)",
                  transform: `translate3d(0,${context.thumbOffsetY()}px,0)`,
                }
              : {
                  transform: `translate3d(${context.thumbOffsetX()}px,0,0)`,
                  width: "var(--scroll-area-thumb-width)",
                }
          }
          onPointerDown={(event) => context.beginDrag(orientation(), event)}
          onPointerMove={context.drag}
          onPointerUp={context.endDrag}
          onPointerCancel={context.endDrag}
        />
      </div>
    </Show>
  );
};

export { ScrollArea, ScrollBar };
