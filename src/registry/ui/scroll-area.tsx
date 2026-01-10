import {
  type ComponentProps,
  createEffect,
  createSignal,
  type JSX,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";

type ScrollAreaProps = ComponentProps<"div"> & {
  class?: string | undefined;
  children?: JSX.Element;
};

const ScrollArea = (rawProps: ScrollAreaProps) => {
  const props = mergeProps({}, rawProps);
  const [local, others] = splitProps(props, ["class", "children"]);

  let viewportRef: HTMLDivElement | undefined;
  const [hasOverflowY, setHasOverflowY] = createSignal(false);
  const [hasOverflowX, setHasOverflowX] = createSignal(false);

  const checkOverflow = () => {
    if (viewportRef) {
      setHasOverflowY(viewportRef.scrollHeight > viewportRef.clientHeight);
      setHasOverflowX(viewportRef.scrollWidth > viewportRef.clientWidth);
    }
  };

  onMount(() => {
    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (viewportRef) {
      resizeObserver.observe(viewportRef);
    }
    onCleanup(() => resizeObserver.disconnect());
  });

  return (
    <div
      data-slot="scroll-area"
      class={cn("cn-scroll-area relative", local.class)}
      data-has-overflow-y={hasOverflowY() || undefined}
      data-has-overflow-x={hasOverflowX() || undefined}
      {...others}
    >
      <div
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        class="cn-scroll-area-viewport size-full overflow-auto rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {local.children}
      </div>
      <ScrollBar orientation="vertical" viewportRef={() => viewportRef} />
      <ScrollBar orientation="horizontal" viewportRef={() => viewportRef} />
      <div data-slot="scroll-area-corner" class="cn-scroll-area-corner" />
    </div>
  );
};

type ScrollBarProps = ComponentProps<"div"> & {
  class?: string | undefined;
  orientation?: "vertical" | "horizontal";
  viewportRef?: () => HTMLDivElement | undefined;
};

const ScrollBar = (rawProps: ScrollBarProps) => {
  const props = mergeProps({ orientation: "vertical" as const }, rawProps);
  const [local, others] = splitProps(props, ["class", "orientation", "viewportRef"]);

  let scrollbarRef: HTMLDivElement | undefined;
  let thumbRef: HTMLDivElement | undefined;

  const [thumbSize, setThumbSize] = createSignal(0);
  const [thumbPosition, setThumbPosition] = createSignal(0);
  const [isVisible, setIsVisible] = createSignal(false);
  const [isHovering, setIsHovering] = createSignal(false);
  const [isScrolling, setIsScrolling] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);

  let scrollTimeout: number | undefined;
  let dragStartPosition = 0;
  let dragStartScroll = 0;

  const isVertical = () => local.orientation === "vertical";

  const updateThumb = () => {
    const viewport = local.viewportRef?.();
    if (!viewport || !scrollbarRef) return;

    const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
    const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
    const scrollPosition = isVertical() ? viewport.scrollTop : viewport.scrollLeft;
    const trackSize = isVertical() ? scrollbarRef.clientHeight : scrollbarRef.clientWidth;

    if (scrollSize <= clientSize) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const ratio = clientSize / scrollSize;
    const size = Math.max(ratio * trackSize, 20);
    const maxPosition = trackSize - size;
    const position = (scrollPosition / (scrollSize - clientSize)) * maxPosition;

    setThumbSize(size);
    setThumbPosition(position);
  };

  const handleScroll = () => {
    updateThumb();
    setIsScrolling(true);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = window.setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  const handleThumbPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPosition = isVertical() ? e.clientY : e.clientX;
    const viewport = local.viewportRef?.();
    if (viewport) {
      dragStartScroll = isVertical() ? viewport.scrollTop : viewport.scrollLeft;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e: PointerEvent) => {
    if (!isDragging()) return;

    const viewport = local.viewportRef?.();
    if (!viewport || !scrollbarRef) return;

    const currentPosition = isVertical() ? e.clientY : e.clientX;
    const delta = currentPosition - dragStartPosition;
    const trackSize = isVertical() ? scrollbarRef.clientHeight : scrollbarRef.clientWidth;
    const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
    const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
    const scrollRatio = (scrollSize - clientSize) / (trackSize - thumbSize());
    const newScroll = dragStartScroll + delta * scrollRatio;

    if (isVertical()) {
      viewport.scrollTop = newScroll;
    } else {
      viewport.scrollLeft = newScroll;
    }
  };

  const handleThumbPointerUp = (e: PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleTrackClick = (e: MouseEvent) => {
    if (e.target === thumbRef) return;

    const viewport = local.viewportRef?.();
    if (!viewport || !scrollbarRef) return;

    const rect = scrollbarRef.getBoundingClientRect();
    const clickPosition = isVertical() ? e.clientY - rect.top : e.clientX - rect.left;
    const trackSize = isVertical() ? scrollbarRef.clientHeight : scrollbarRef.clientWidth;
    const scrollSize = isVertical() ? viewport.scrollHeight : viewport.scrollWidth;
    const clientSize = isVertical() ? viewport.clientHeight : viewport.clientWidth;
    const scrollRatio = clickPosition / trackSize;
    const newScroll = scrollRatio * (scrollSize - clientSize);

    if (isVertical()) {
      viewport.scrollTop = newScroll;
    } else {
      viewport.scrollLeft = newScroll;
    }
  };

  createEffect(() => {
    const viewport = local.viewportRef?.();
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll);
    updateThumb();

    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(viewport);

    onCleanup(() => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    });
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Scrollbar is a visual enhancement, keyboard users use native scroll
    // biome-ignore lint/a11y/useFocusableInteractive: Scrollbar is a visual enhancement, keyboard users use native scroll
    <div
      ref={scrollbarRef}
      role="scrollbar"
      aria-controls="scroll-area-viewport"
      aria-valuenow={thumbPosition()}
      data-slot="scroll-area-scrollbar"
      data-orientation={local.orientation}
      data-hovering={isHovering() || undefined}
      data-scrolling={isScrolling() || undefined}
      class={cn(
        "cn-scroll-area-scrollbar flex touch-none select-none p-px transition-colors",
        isVertical()
          ? "absolute top-0 right-0 h-full w-2.5 border-l border-l-transparent p-px"
          : "absolute bottom-0 left-0 h-2.5 w-full border-t border-t-transparent p-px",
        !isVisible() && "hidden",
        local.class,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleTrackClick}
      {...others}
    >
      <div
        ref={thumbRef}
        data-slot="scroll-area-thumb"
        data-orientation={local.orientation}
        class="cn-scroll-area-thumb relative flex-1 rounded-full bg-border"
        style={{
          [isVertical() ? "height" : "width"]: `${thumbSize()}px`,
          [isVertical() ? "top" : "left"]: `${thumbPosition()}px`,
          position: "absolute",
          [isVertical() ? "width" : "height"]: "100%",
        }}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
      />
    </div>
  );
};

export { ScrollArea, ScrollBar };
