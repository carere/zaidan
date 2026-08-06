import { ArrowDown } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import {
  children,
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

const DEFAULT_SCROLL_EDGE_THRESHOLD = 8;
const DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK = 64;
const DEFAULT_SCROLL_MARGIN = 0;
const SCROLL_POSITION_EPSILON = 0.5;
const AUTOSCROLLING_CLEAR_DELAY = 180;

const USER_SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

type MessageScrollerMode =
  | "following-bottom"
  | "free-scrolling"
  | "anchored-to-message"
  | "settling-jump";

type MessageScrollerDefaultScrollPosition = "start" | "end" | "last-anchor";
type MessageScrollerButtonDirection = "start" | "end";
type MessageScrollerScrollAlign = "start" | "center" | "end" | "nearest";

type MessageScrollerScrollOptions = {
  align?: MessageScrollerScrollAlign;
  behavior?: ScrollBehavior;
  scrollMargin?: number;
};

type MessageScrollerScrollable = {
  start: boolean;
  end: boolean;
};

type MessageScrollerVisibilityState = {
  currentAnchorId: string | null;
  visibleMessageIds: string[];
};

type MessageScrollerProviderProps = {
  children?: JSX.Element;
  autoScroll?: boolean;
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition;
  scrollEdgeThreshold?: number;
  scrollPreviousItemPeek?: number;
  scrollMargin?: number;
};

type MessageScrollerProps = ComponentProps<"div">;

type MessageScrollerViewportProps = ComponentProps<"div"> & {
  preserveScrollOnPrepend?: boolean;
};

type MessageScrollerContentProps = ComponentProps<"div"> & {
  spacerClassName?: string;
};

type MessageScrollerItemProps = ComponentProps<"div"> & {
  messageId?: string;
  scrollAnchor?: boolean;
};

type MessageScrollerButtonRenderState = {
  active: boolean;
  direction: MessageScrollerButtonDirection;
};

type MessageScrollerButtonProps = ButtonProps & {
  behavior?: ScrollBehavior;
  direction?: MessageScrollerButtonDirection;
  /**
   * Solid component/render-function equivalent of the React element-or-function
   * render prop. Solid JSX elements cannot be cloned to merge behavior props;
   * pass a component here or use Button's `as` prop instead.
   */
  render?: (props: ButtonProps, state: MessageScrollerButtonRenderState) => JSX.Element;
};

type PendingScrollToMessage = {
  messageId: string;
  options?: MessageScrollerScrollOptions;
};

type MessageScrollerControllerState = {
  autoScroll: boolean;
  autoscrolling: boolean;
  autoscrollingTimeout: number | null;
  content: HTMLDivElement | null;
  defaultScrollPosition: MessageScrollerDefaultScrollPosition;
  defaultScrollPositionApplied: boolean;
  firstItem: HTMLElement | null;
  handledScrollAnchors: WeakSet<HTMLElement>;
  itemCount: number;
  lastScrollTop: number;
  messageElements: Map<string, HTMLElement>;
  mode: MessageScrollerMode;
  pendingScrollFrame: number | null;
  pendingScrollToMessage: PendingScrollToMessage | null;
  prependRestore: { element: HTMLElement; viewportTop: number } | null;
  preserveScrollOnPrepend: boolean;
  root: HTMLDivElement | null;
  scrollEdgeThreshold: number;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
  spacer: HTMLDivElement | null;
  spacerGap: number;
  spacerHeight: number;
  stateFrame: number | null;
  streamingTurn: HTMLElement | null;
  viewport: HTMLDivElement | null;
  visibilityFrame: number | null;
  visibilityObserver: IntersectionObserver | null;
  visibilitySubscribers: number;
  visibleMessageIds: Set<string>;
};

type MessageScrollerContextValue = {
  handleContentChange: () => void;
  handleResize: () => void;
  registerMessage: (
    messageId: string,
    element: HTMLElement | null,
    removedElement?: HTMLElement | null,
  ) => void;
  scrollable: () => MessageScrollerScrollable;
  scrollToEnd: (options?: MessageScrollerScrollOptions) => boolean;
  scrollToMessage: (messageId: string, options?: MessageScrollerScrollOptions) => boolean;
  scrollToStart: (options?: MessageScrollerScrollOptions) => boolean;
  setContentElement: (element: HTMLDivElement | null) => void;
  setPreserveScrollOnPrepend: (preserve: boolean) => void;
  setRootElement: (element: HTMLDivElement | null) => void;
  setSpacerElement: (element: HTMLDivElement | null) => void;
  setViewportElement: (element: HTMLDivElement | null) => void;
  subscribeVisibility: () => () => void;
  syncAfterScroll: () => void;
  userScrollIntent: () => void;
  visibility: () => MessageScrollerVisibilityState;
};

const EMPTY_MESSAGE_SCROLLER_SCROLLABLE: MessageScrollerScrollable = {
  start: false,
  end: false,
};

const EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE: MessageScrollerVisibilityState = {
  currentAnchorId: null,
  visibleMessageIds: [],
};

const MessageScrollerContext = createContext<MessageScrollerContextValue>();

function useMessageScrollerContext() {
  const context = useContext(MessageScrollerContext);

  if (!context) {
    throw new Error("MessageScroller parts must be used within MessageScrollerProvider.");
  }

  return context;
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") (ref as (element: HTMLElement) => void)(element);
}

function areScrollStatesEqual(current: MessageScrollerScrollable, next: MessageScrollerScrollable) {
  return current.start === next.start && current.end === next.end;
}

function areVisibilityStatesEqual(
  current: MessageScrollerVisibilityState,
  next: MessageScrollerVisibilityState,
) {
  return (
    current.currentAnchorId === next.currentAnchorId &&
    current.visibleMessageIds.length === next.visibleMessageIds.length &&
    current.visibleMessageIds.every(
      (messageId, index) => messageId === next.visibleMessageIds[index],
    )
  );
}

function getMessageScrollerItems(content: HTMLElement, spacer: HTMLElement | null) {
  return Array.from(content.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child !== spacer,
  );
}

function getNewScrollAnchor(items: HTMLElement[], previousItemCount: number) {
  for (let index = previousItemCount; index < items.length; index += 1) {
    const item = items[index];

    if (item?.dataset.scrollAnchor === "true") return item;
  }

  return null;
}

function getUnanchoredScrollAnchor(items: HTMLElement[], handledAnchors: WeakSet<HTMLElement>) {
  for (const item of items) {
    if (item.dataset.scrollAnchor === "true" && !handledAnchors.has(item)) return item;
  }

  return null;
}

function hasMultipleNewScrollAnchors(items: HTMLElement[], previousItemCount: number) {
  let count = 0;

  for (let index = previousItemCount; index < items.length; index += 1) {
    const item = items[index];

    if (item?.dataset.scrollAnchor !== "true") continue;

    count += 1;
    if (count > 1) return true;
  }

  return false;
}

function getLastScrollAnchor(items: HTMLElement[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (item?.dataset.scrollAnchor === "true") return item;
  }

  return null;
}

function getFirstVisibleMessageItem({
  content,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const viewportRect = viewport.getBoundingClientRect();

  for (const item of getMessageScrollerItems(content, spacer)) {
    if (!item.dataset.messageId) continue;

    const rect = item.getBoundingClientRect();

    if (rect.bottom > viewportRect.top && rect.top < viewportRect.bottom) return item;
  }

  return null;
}

function readCssPixel(value: string | undefined) {
  if (!value) return 0;

  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function getBlockPadding(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return {
    end: readCssPixel(style.paddingBlockEnd || style.paddingBottom),
    start: readCssPixel(style.paddingBlockStart || style.paddingTop),
  };
}

function getContentBlockPadding(spacer: HTMLElement | null) {
  const content = spacer?.parentElement;

  return content ? getBlockPadding(content) : { end: 0, start: 0 };
}

function getElementTop(element: HTMLElement, viewport: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();

  return elementRect.top - viewportRect.top + viewport.scrollTop;
}

function getElementViewportTop(element: HTMLElement, viewport: HTMLElement) {
  return element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
}

function getContentBottom({
  content,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const items = getMessageScrollerItems(content, spacer);
  const padding = getBlockPadding(content);
  const viewportRect = viewport.getBoundingClientRect();
  const scrollTop = viewport.scrollTop;
  let contentBottom = padding.start + padding.end;

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    contentBottom = Math.max(
      contentBottom,
      rect.bottom - viewportRect.top + scrollTop + padding.end,
    );
  }

  return contentBottom;
}

function getMaxScrollTop(viewport: HTMLElement) {
  return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
}

function getElementScrollTop({
  align,
  element,
  scrollMargin,
  spacer,
  viewport,
}: {
  align: MessageScrollerScrollAlign;
  element: HTMLElement;
  scrollMargin: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  const elementTop = getElementTop(element, viewport);
  const elementHeight = element.getBoundingClientRect().height;
  const contentPadding = getContentBlockPadding(spacer);

  if (align === "center") {
    const insetHeight = Math.max(
      0,
      viewport.clientHeight - contentPadding.start - contentPadding.end,
    );

    return elementTop - contentPadding.start - (insetHeight - elementHeight) / 2 - scrollMargin;
  }

  if (align === "end") {
    return elementTop - viewport.clientHeight + elementHeight + contentPadding.end + scrollMargin;
  }

  if (align === "nearest") {
    const elementBottom = elementTop + elementHeight;
    const viewportTop = viewport.scrollTop + contentPadding.start;
    const viewportBottom = viewport.scrollTop + viewport.clientHeight - contentPadding.end;

    if (elementTop >= viewportTop && elementBottom <= viewportBottom) {
      return viewport.scrollTop;
    }

    if (elementTop < viewportTop) {
      return elementTop - contentPadding.start - scrollMargin;
    }

    return elementBottom - viewport.clientHeight + contentPadding.end + scrollMargin;
  }

  return elementTop - contentPadding.start - scrollMargin;
}

function getTailSpacerHeight({
  content,
  scrollTop,
  spacer,
  viewport,
}: {
  content: HTMLElement;
  scrollTop: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement;
}) {
  return scrollTop + viewport.clientHeight - getContentBottom({ content, spacer, viewport });
}

function getFlexGap(element: HTMLElement | null) {
  if (!element) return 0;

  const style = window.getComputedStyle(element);
  return readCssPixel(style.rowGap === "normal" ? style.gap : style.rowGap);
}

function getMessageScrollerScrollable({
  content,
  scrollEdgeThreshold,
  spacer,
  viewport,
}: {
  content: HTMLElement | null;
  scrollEdgeThreshold: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement | null;
}): MessageScrollerScrollable {
  if (!viewport || !content) return EMPTY_MESSAGE_SCROLLER_SCROLLABLE;

  const contentBottom = getContentBottom({ content, spacer, viewport });

  return {
    start: viewport.scrollTop > scrollEdgeThreshold,
    end: contentBottom - viewport.scrollTop - viewport.clientHeight > scrollEdgeThreshold,
  };
}

function getMessageScrollerVisibilityState({
  content,
  scrollMargin,
  scrollPreviousItemPeek,
  spacer,
  viewport,
  visibleMessageIds,
}: {
  content: HTMLElement | null;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
  spacer: HTMLElement | null;
  viewport: HTMLElement | null;
  visibleMessageIds: Set<string>;
}): MessageScrollerVisibilityState {
  if (!content || !viewport) return EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE;

  const viewportRect = viewport.getBoundingClientRect();
  const lineTop = viewportRect.top + scrollMargin + scrollPreviousItemPeek;
  const trackByLayout = typeof IntersectionObserver === "undefined";
  const visible: string[] = [];
  let currentAnchorId: string | null = null;

  for (const item of getMessageScrollerItems(content, spacer)) {
    const messageId = item.dataset.messageId;
    if (!messageId) continue;

    const isAnchor = item.dataset.scrollAnchor === "true";
    const rect = isAnchor || trackByLayout ? item.getBoundingClientRect() : null;
    const isVisible =
      trackByLayout && rect
        ? rect.bottom > lineTop && rect.top < viewportRect.bottom
        : visibleMessageIds.has(messageId);

    if (isVisible) visible.push(messageId);

    if (isAnchor && rect && rect.top <= lineTop + SCROLL_POSITION_EPSILON) {
      currentAnchorId = messageId;
    }
  }

  if (visible.length === 0 && currentAnchorId === null) {
    return EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE;
  }

  return { currentAnchorId, visibleMessageIds: visible };
}

function createMessageScrollerController(
  props: Required<
    Pick<
      MessageScrollerProviderProps,
      | "autoScroll"
      | "defaultScrollPosition"
      | "scrollEdgeThreshold"
      | "scrollMargin"
      | "scrollPreviousItemPeek"
    >
  >,
): MessageScrollerContextValue {
  const state: MessageScrollerControllerState = {
    autoScroll: props.autoScroll,
    autoscrolling: false,
    autoscrollingTimeout: null,
    content: null,
    defaultScrollPosition: props.defaultScrollPosition,
    defaultScrollPositionApplied: false,
    firstItem: null,
    handledScrollAnchors: new WeakSet(),
    itemCount: 0,
    lastScrollTop: 0,
    messageElements: new Map(),
    mode: props.autoScroll ? "following-bottom" : "free-scrolling",
    pendingScrollFrame: null,
    pendingScrollToMessage: null,
    prependRestore: null,
    preserveScrollOnPrepend: true,
    root: null,
    scrollEdgeThreshold: props.scrollEdgeThreshold,
    scrollMargin: props.scrollMargin,
    scrollPreviousItemPeek: props.scrollPreviousItemPeek,
    spacer: null,
    spacerGap: 0,
    spacerHeight: 0,
    stateFrame: null,
    streamingTurn: null,
    viewport: null,
    visibilityFrame: null,
    visibilityObserver: null,
    visibilitySubscribers: 0,
    visibleMessageIds: new Set(),
  };
  const [scrollable, setScrollable] = createSignal(EMPTY_MESSAGE_SCROLLER_SCROLLABLE);
  const [visibility, setVisibility] = createSignal(EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE);

  function writeStateAttributes(nextState: MessageScrollerScrollable) {
    const scrollableEdges = [nextState.start && "start", nextState.end && "end"]
      .filter(Boolean)
      .join(" ");

    for (const element of [state.root, state.viewport]) {
      if (!element) continue;

      if (scrollableEdges) element.setAttribute("data-scrollable", scrollableEdges);
      else element.removeAttribute("data-scrollable");

      element.toggleAttribute("data-autoscrolling", state.autoscrolling);
    }
  }

  function reconcileFollowMode(nextState: MessageScrollerScrollable) {
    const scrollTop = state.viewport?.scrollTop ?? 0;
    const scrolledUp = scrollTop < state.lastScrollTop - SCROLL_POSITION_EPSILON;
    state.lastScrollTop = scrollTop;

    if (
      state.autoScroll &&
      !nextState.end &&
      state.mode !== "settling-jump" &&
      state.mode !== "anchored-to-message"
    ) {
      state.mode = "following-bottom";
    } else if (
      state.mode === "following-bottom" &&
      nextState.end &&
      scrolledUp &&
      !state.autoscrolling
    ) {
      state.mode = "free-scrolling";
    }
  }

  function commitScrollState() {
    const nextState = getMessageScrollerScrollable({
      content: state.content,
      scrollEdgeThreshold: state.scrollEdgeThreshold,
      spacer: state.spacer,
      viewport: state.viewport,
    });
    reconcileFollowMode(nextState);

    const publishedState =
      state.mode === "following-bottom" ? { ...nextState, end: false } : nextState;
    writeStateAttributes(publishedState);
    setScrollable((current) =>
      areScrollStatesEqual(current, publishedState) ? current : publishedState,
    );
  }

  function scheduleStateCommit() {
    if (state.stateFrame !== null || typeof window === "undefined") return;

    state.stateFrame = window.requestAnimationFrame(() => {
      state.stateFrame = null;
      commitScrollState();
    });
  }

  function scheduleVisibilitySync() {
    if (
      state.visibilitySubscribers === 0 ||
      state.visibilityFrame !== null ||
      typeof window === "undefined"
    ) {
      return;
    }

    state.visibilityFrame = window.requestAnimationFrame(() => {
      state.visibilityFrame = null;
      if (state.visibilitySubscribers === 0) return;

      const nextVisibility = getMessageScrollerVisibilityState({
        content: state.content,
        scrollMargin: state.scrollMargin,
        scrollPreviousItemPeek: state.scrollPreviousItemPeek,
        spacer: state.spacer,
        viewport: state.viewport,
        visibleMessageIds: state.visibleMessageIds,
      });
      setVisibility((current) =>
        areVisibilityStatesEqual(current, nextVisibility) ? current : nextVisibility,
      );
    });
  }

  function setAutoScrolling(autoscrolling: boolean) {
    if (state.autoscrollingTimeout !== null) {
      window.clearTimeout(state.autoscrollingTimeout);
      state.autoscrollingTimeout = null;
    }

    if (state.autoscrolling !== autoscrolling) {
      state.autoscrolling = autoscrolling;
      commitScrollState();
    }

    if (autoscrolling) {
      state.autoscrollingTimeout = window.setTimeout(() => {
        state.autoscrollingTimeout = null;
        state.autoscrolling = false;
        commitScrollState();
      }, AUTOSCROLLING_CLEAR_DELAY);
    }
  }

  function setTailSpacerHeight(height: number) {
    if (!state.spacer) return;

    const nextHeight = Math.max(0, Math.ceil(height));
    if (state.spacerHeight === nextHeight) return;

    state.spacerHeight = nextHeight;
    state.spacer.hidden = nextHeight === 0;
    state.spacer.style.height = `${nextHeight}px`;
    state.spacer.style.marginTop = nextHeight > 0 ? `${-state.spacerGap}px` : "";
  }

  function scrollToPosition(
    scrollTop: number,
    {
      behavior = "auto",
      autoscrolling = false,
    }: { behavior?: ScrollBehavior; autoscrolling?: boolean } = {},
  ) {
    if (!state.viewport) return;

    const nextScrollTop = Math.max(0, scrollTop);

    if (Math.abs(state.viewport.scrollTop - nextScrollTop) <= SCROLL_POSITION_EPSILON) {
      state.viewport.scrollTop = nextScrollTop;
      commitScrollState();
      return;
    }

    if (autoscrolling) setAutoScrolling(true);
    state.viewport.scrollTo({ top: nextScrollTop, behavior });
    scheduleStateCommit();
  }

  function scrollToStart({ behavior = "auto" }: MessageScrollerScrollOptions = {}) {
    if (!state.viewport) return false;

    setTailSpacerHeight(0);
    state.streamingTurn = null;
    state.mode = "free-scrolling";
    scrollToPosition(0, { behavior });
    scheduleVisibilitySync();
    return true;
  }

  function scrollToEnd({ behavior = "auto" }: MessageScrollerScrollOptions = {}) {
    if (!state.viewport) return false;

    setTailSpacerHeight(0);
    state.streamingTurn = null;
    state.mode = state.autoScroll ? "following-bottom" : "free-scrolling";
    scrollToPosition(getMaxScrollTop(state.viewport), {
      autoscrolling: true,
      behavior,
    });
    scheduleVisibilitySync();
    return true;
  }

  function scrollToElement(
    element: HTMLElement,
    {
      align = "start",
      behavior = "auto",
      scrollMargin = state.scrollMargin,
    }: MessageScrollerScrollOptions = {},
    { keepPreviousPeek = false }: { keepPreviousPeek?: boolean } = {},
  ) {
    if (!state.content || !state.viewport || !state.content.contains(element)) return false;

    const scrollTop = getElementScrollTop({
      align,
      element,
      scrollMargin: keepPreviousPeek ? scrollMargin + state.scrollPreviousItemPeek : scrollMargin,
      spacer: state.spacer,
      viewport: state.viewport,
    });
    const nextSpacerHeight = getTailSpacerHeight({
      content: state.content,
      scrollTop,
      spacer: state.spacer,
      viewport: state.viewport,
    });

    setTailSpacerHeight(nextSpacerHeight);
    state.prependRestore = {
      element,
      viewportTop: getElementViewportTop(element, state.viewport),
    };
    state.mode = keepPreviousPeek ? "anchored-to-message" : "settling-jump";
    state.streamingTurn = keepPreviousPeek ? element : null;
    scrollToPosition(scrollTop, { behavior });
    scheduleVisibilitySync();
    return true;
  }

  function reanchorToAnchoredMessage() {
    if (!state.streamingTurn?.isConnected || state.mode !== "anchored-to-message") {
      return false;
    }

    return scrollToElement(state.streamingTurn, { align: "start" }, { keepPreviousPeek: true });
  }

  function scrollToMessage(messageId: string, options?: MessageScrollerScrollOptions) {
    const element = state.messageElements.get(messageId);

    if (!element) {
      if (state.itemCount === 0) {
        state.pendingScrollToMessage = { messageId, options };
        state.defaultScrollPositionApplied = true;
        return true;
      }

      return false;
    }

    state.defaultScrollPositionApplied = true;

    if (scrollToElement(element, options)) {
      state.pendingScrollToMessage = null;
      return true;
    }

    state.pendingScrollToMessage = { messageId, options };
    return true;
  }

  function flushPendingScrollToMessage() {
    const pending = state.pendingScrollToMessage;
    if (!pending) return false;

    const element = state.messageElements.get(pending.messageId);
    if (!element || !scrollToElement(element, pending.options)) return false;

    state.pendingScrollToMessage = null;
    state.defaultScrollPositionApplied = true;
    return true;
  }

  function restorePrependedAnchor() {
    const anchor = state.prependRestore;
    const viewport = state.viewport;

    if (!anchor || !viewport || !anchor.element.isConnected) return false;

    const nextViewportTop = getElementViewportTop(anchor.element, viewport);
    const delta = nextViewportTop - anchor.viewportTop;
    if (Math.abs(delta) <= SCROLL_POSITION_EPSILON) return false;

    viewport.scrollTop += delta;
    anchor.viewportTop = getElementViewportTop(anchor.element, viewport);
    scheduleStateCommit();
    scheduleVisibilitySync();
    return true;
  }

  function capturePrependAnchor() {
    if (!state.content || !state.viewport) {
      state.prependRestore = null;
      return;
    }

    const anchor = getFirstVisibleMessageItem({
      content: state.content,
      spacer: state.spacer,
      viewport: state.viewport,
    });
    state.prependRestore = anchor
      ? { element: anchor, viewportTop: getElementViewportTop(anchor, state.viewport) }
      : null;
  }

  function schedulePendingScrollToMessageFlush() {
    if (state.pendingScrollFrame !== null || typeof window === "undefined") return;

    state.pendingScrollFrame = window.requestAnimationFrame(() => {
      state.pendingScrollFrame = null;
      if (flushPendingScrollToMessage()) capturePrependAnchor();
    });
  }

  function applyDefaultScrollPosition() {
    if (state.defaultScrollPositionApplied || state.itemCount === 0) return false;

    let handled = false;

    if (state.defaultScrollPosition === "last-anchor") {
      const anchor =
        state.content && state.viewport
          ? getLastScrollAnchor(getMessageScrollerItems(state.content, state.spacer))
          : null;

      if (!state.content || !state.viewport || !anchor) {
        handled = scrollToEnd({ behavior: "auto" });
      } else {
        const anchorTop = getElementTop(anchor, state.viewport);
        const contentBottom = getContentBottom({
          content: state.content,
          spacer: state.spacer,
          viewport: state.viewport,
        });
        const lastTurnFits = contentBottom - anchorTop <= state.viewport.clientHeight;
        handled = lastTurnFits
          ? scrollToEnd({ behavior: "auto" })
          : scrollToElement(anchor, { align: "start" }, { keepPreviousPeek: true });
      }
    } else {
      handled =
        state.defaultScrollPosition === "end"
          ? scrollToEnd({ behavior: "auto" })
          : scrollToStart({ behavior: "auto" });
    }

    if (handled) state.defaultScrollPositionApplied = true;
    return handled;
  }

  function handleContentChange() {
    if (!state.content) return;

    const items = getMessageScrollerItems(state.content, state.spacer);
    const previousItemCount = state.itemCount;
    const previousFirstItem = state.firstItem;
    state.itemCount = items.length;
    state.firstItem = items[0] ?? null;

    if (flushPendingScrollToMessage()) {
      capturePrependAnchor();
      return;
    }

    if (previousItemCount === 0) {
      if (
        !applyDefaultScrollPosition() &&
        !(items.length > 0 && state.autoScroll && scrollToEnd({ behavior: "auto" }))
      ) {
        commitScrollState();
        scheduleVisibilitySync();
      }
      capturePrependAnchor();
      return;
    }

    const previousFirstItemIndex = previousFirstItem ? items.indexOf(previousFirstItem) : -1;
    const didPrepend = state.preserveScrollOnPrepend && previousFirstItemIndex > 0;

    if (didPrepend) {
      restorePrependedAnchor();
      capturePrependAnchor();
      return;
    }

    if (items.length > previousItemCount) {
      const anchor = getNewScrollAnchor(items, previousItemCount);

      if (anchor) {
        if (
          state.autoScroll &&
          state.mode === "following-bottom" &&
          hasMultipleNewScrollAnchors(items, previousItemCount)
        ) {
          scrollToEnd({ behavior: "auto" });
        } else {
          scrollToElement(anchor, { align: "start" }, { keepPreviousPeek: true });
          state.handledScrollAnchors.add(anchor);
        }
        capturePrependAnchor();
        return;
      }
    }

    if (items.length === previousItemCount) {
      const anchor = getUnanchoredScrollAnchor(items, state.handledScrollAnchors);

      if (anchor) {
        scrollToElement(anchor, { align: "start" }, { keepPreviousPeek: true });
        state.handledScrollAnchors.add(anchor);
        capturePrependAnchor();
        return;
      }
    }

    if (state.mode === "following-bottom" && state.autoScroll) {
      scrollToEnd({ behavior: "auto" });
    } else {
      commitScrollState();
      scheduleVisibilitySync();
    }
    capturePrependAnchor();
  }

  function handleResize() {
    if (state.mode === "following-bottom" && state.autoScroll) {
      scrollToEnd({ behavior: "auto" });
      return;
    }

    const previousSpacerHeight = state.spacerHeight;

    if (reanchorToAnchoredMessage()) {
      if (state.autoScroll && previousSpacerHeight > 0 && state.spacerHeight === 0) {
        scrollToEnd({ behavior: "auto" });
      }
      return;
    }

    scheduleStateCommit();
    scheduleVisibilitySync();
  }

  function startVisibilityObservation() {
    if (!state.viewport || state.visibilitySubscribers === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      scheduleVisibilitySync();
      return;
    }

    if (!state.visibilityObserver) {
      state.visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const messageId = (entry.target as HTMLElement).dataset.messageId;
            if (!messageId) continue;

            if (entry.isIntersecting) state.visibleMessageIds.add(messageId);
            else state.visibleMessageIds.delete(messageId);
          }
          scheduleVisibilitySync();
        },
        {
          root: state.viewport,
          rootMargin: `${-(state.scrollMargin + state.scrollPreviousItemPeek)}px 0px 0px 0px`,
          threshold: [0, 0.01, 0.5, 1],
        },
      );
    }

    state.messageElements.forEach((element) => {
      state.visibilityObserver?.observe(element);
    });
    scheduleVisibilitySync();
  }

  function stopVisibilityObservation() {
    if (state.visibilityFrame !== null) {
      window.cancelAnimationFrame(state.visibilityFrame);
      state.visibilityFrame = null;
    }

    state.visibilityObserver?.disconnect();
    state.visibilityObserver = null;
    state.visibleMessageIds.clear();
    setVisibility(EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE);
  }

  function subscribeVisibility() {
    state.visibilitySubscribers += 1;
    if (state.visibilitySubscribers === 1) startVisibilityObservation();

    return () => {
      state.visibilitySubscribers = Math.max(0, state.visibilitySubscribers - 1);
      if (state.visibilitySubscribers === 0) stopVisibilityObservation();
    };
  }

  function registerMessage(
    messageId: string,
    element: HTMLElement | null,
    removedElement?: HTMLElement | null,
  ) {
    if (element) {
      state.messageElements.set(messageId, element);
      state.visibilityObserver?.observe(element);
      scheduleVisibilitySync();

      if (state.pendingScrollToMessage?.messageId === messageId) {
        schedulePendingScrollToMessageFlush();
      }
      return;
    }

    if (removedElement && state.messageElements.get(messageId) === removedElement) {
      state.messageElements.delete(messageId);
      state.visibleMessageIds.delete(messageId);
      state.visibilityObserver?.unobserve(removedElement);
      scheduleVisibilitySync();
    }
  }

  function userScrollIntent() {
    if (
      state.mode === "following-bottom" ||
      state.mode === "anchored-to-message" ||
      state.mode === "settling-jump"
    ) {
      state.streamingTurn = null;
      state.mode = "free-scrolling";
    }
  }

  function setRootElement(element: HTMLDivElement | null) {
    state.root = element;
    if (element) writeStateAttributes(scrollable());
  }

  function setViewportElement(element: HTMLDivElement | null) {
    state.viewport = element;
    if (element) {
      state.lastScrollTop = element.scrollTop;
      writeStateAttributes(scrollable());
      if (state.visibilitySubscribers > 0) startVisibilityObservation();
    }
  }

  function setContentElement(element: HTMLDivElement | null) {
    state.content = element;
  }

  function setSpacerElement(element: HTMLDivElement | null) {
    state.spacer = element;
    state.spacerGap = getFlexGap(element?.parentElement ?? null);
  }

  function syncAfterScroll() {
    commitScrollState();
    scheduleVisibilitySync();
    capturePrependAnchor();
  }

  createEffect(() => {
    state.scrollEdgeThreshold = props.scrollEdgeThreshold;
    state.scrollMargin = props.scrollMargin;
    state.scrollPreviousItemPeek = props.scrollPreviousItemPeek;
  });

  createEffect(() => {
    const nextDefaultPosition = props.defaultScrollPosition;

    if (state.defaultScrollPosition !== nextDefaultPosition) {
      state.defaultScrollPosition = nextDefaultPosition;
      state.defaultScrollPositionApplied = false;
      applyDefaultScrollPosition();
    }
  });

  createEffect(() => {
    const nextAutoScroll = props.autoScroll;
    state.autoScroll = nextAutoScroll;

    if (nextAutoScroll && state.mode === "following-bottom" && state.itemCount > 0) {
      scrollToEnd({ behavior: "auto" });
    } else {
      commitScrollState();
    }
  });

  onCleanup(() => {
    if (state.stateFrame !== null) window.cancelAnimationFrame(state.stateFrame);
    if (state.visibilityFrame !== null) window.cancelAnimationFrame(state.visibilityFrame);
    if (state.autoscrollingTimeout !== null) window.clearTimeout(state.autoscrollingTimeout);
    if (state.pendingScrollFrame !== null) window.cancelAnimationFrame(state.pendingScrollFrame);
    state.visibilityObserver?.disconnect();
  });

  return {
    handleContentChange,
    handleResize,
    registerMessage,
    scrollable,
    scrollToEnd,
    scrollToMessage,
    scrollToStart,
    setContentElement,
    setPreserveScrollOnPrepend: (preserve) => {
      state.preserveScrollOnPrepend = preserve;
    },
    setRootElement,
    setSpacerElement,
    setViewportElement,
    subscribeVisibility,
    syncAfterScroll,
    userScrollIntent,
    visibility,
  };
}

function useMessageScroller() {
  const { scrollToEnd, scrollToMessage, scrollToStart } = useMessageScrollerContext();
  return { scrollToEnd, scrollToMessage, scrollToStart };
}

function useMessageScrollerScrollable(): MessageScrollerScrollable {
  const context = useMessageScrollerContext();

  return {
    get start() {
      return context.scrollable().start;
    },
    get end() {
      return context.scrollable().end;
    },
  };
}

function useMessageScrollerVisibility(): MessageScrollerVisibilityState {
  const context = useMessageScrollerContext();
  const unsubscribe = context.subscribeVisibility();
  onCleanup(unsubscribe);

  return {
    get currentAnchorId() {
      return context.visibility().currentAnchorId;
    },
    get visibleMessageIds() {
      return context.visibility().visibleMessageIds;
    },
  };
}

const MessageScrollerProvider = (rawProps: MessageScrollerProviderProps) => {
  const props = mergeProps(
    {
      autoScroll: false,
      defaultScrollPosition: "end" as const,
      scrollEdgeThreshold: DEFAULT_SCROLL_EDGE_THRESHOLD,
      scrollMargin: DEFAULT_SCROLL_MARGIN,
      scrollPreviousItemPeek: DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK,
    },
    rawProps,
  );
  const context = createMessageScrollerController(props);

  return (
    <MessageScrollerContext.Provider value={context}>
      {props.children}
    </MessageScrollerContext.Provider>
  );
};

const MessageScroller = (props: MessageScrollerProps) => {
  const context = useMessageScrollerContext();
  const [local, others] = splitProps(props, ["class", "ref"]);
  let rootElement: HTMLDivElement | undefined;

  onCleanup(() => {
    if (rootElement) context.setRootElement(null);
  });

  return (
    <div
      ref={(element) => {
        rootElement = element;
        context.setRootElement(element);
        setElementRef(local.ref, element);
      }}
      data-slot="message-scroller"
      class={cn(
        "z-message-scroller group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
        local.class,
      )}
      {...others}
    />
  );
};

const MessageScrollerViewport = (rawProps: MessageScrollerViewportProps) => {
  const props = mergeProps({ preserveScrollOnPrepend: true }, rawProps);
  const context = useMessageScrollerContext();
  const [local, others] = splitProps(props, [
    "aria-label",
    "children",
    "class",
    "onKeyDown",
    "onScroll",
    "onTouchMove",
    "onWheel",
    "preserveScrollOnPrepend",
    "ref",
    "role",
    "tabIndex",
  ]);
  let viewportElement: HTMLDivElement | undefined;

  createEffect(() => context.setPreserveScrollOnPrepend(local.preserveScrollOnPrepend));

  onMount(() => {
    if (!viewportElement || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(context.handleResize);
    });
    observer.observe(viewportElement);

    onCleanup(() => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    });
  });

  onCleanup(() => {
    if (viewportElement) context.setViewportElement(null);
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useAriaPropsSupportedByRole: the labelled native scroll viewport needs scroll-intent handlers and receives a region role by default
    <div
      ref={(element) => {
        viewportElement = element;
        context.setViewportElement(element);
        setElementRef(local.ref, element);
      }}
      data-slot="message-scroller-viewport"
      role={local.role ?? "region"}
      aria-label={local["aria-label"] ?? "Messages"}
      tabIndex={local.tabIndex ?? 0}
      onKeyDown={(event) => {
        if (USER_SCROLL_KEYS.has(event.key)) context.userScrollIntent();
        callEventHandler(local.onKeyDown, event);
      }}
      onScroll={(event) => {
        context.syncAfterScroll();
        callEventHandler(local.onScroll, event);
      }}
      onTouchMove={(event) => {
        context.userScrollIntent();
        callEventHandler(local.onTouchMove, event);
      }}
      onWheel={(event) => {
        context.userScrollIntent();
        callEventHandler(local.onWheel, event);
      }}
      class={cn(
        "z-message-scroller-viewport size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-thumb-transparent data-autoscrolling:scrollbar-track-transparent",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
};

const MessageScrollerContent = (props: MessageScrollerContentProps) => {
  const context = useMessageScrollerContext();
  const [local, others] = splitProps(props, [
    "aria-relevant",
    "children",
    "class",
    "ref",
    "role",
    "spacerClassName",
  ]);
  let contentElement: HTMLDivElement | undefined;
  let spacerElement: HTMLDivElement | undefined;

  onMount(() => {
    if (!contentElement) return;

    context.handleContentChange();

    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(context.handleContentChange);
    mutationObserver?.observe(contentElement, { childList: true });

    let frame = 0;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(context.handleResize);
          });
    resizeObserver?.observe(contentElement);

    onCleanup(() => {
      window.cancelAnimationFrame(frame);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    });
  });

  onCleanup(() => {
    if (contentElement) context.setContentElement(null);
    if (spacerElement) context.setSpacerElement(null);
  });

  return (
    <div
      ref={(element) => {
        contentElement = element;
        context.setContentElement(element);
        setElementRef(local.ref, element);
      }}
      data-slot="message-scroller-content"
      role={local.role ?? "log"}
      aria-relevant={local["aria-relevant"] ?? "additions"}
      class={cn("z-message-scroller-content flex h-max min-h-full flex-col", local.class)}
      {...others}
    >
      {local.children}
      <div
        ref={(element) => {
          spacerElement = element;
          context.setSpacerElement(element);
        }}
        aria-hidden="true"
        data-message-scroller-spacer=""
        hidden
        class={local.spacerClassName}
      />
    </div>
  );
};

const MessageScrollerItem = (rawProps: MessageScrollerItemProps) => {
  const props = mergeProps({ scrollAnchor: false }, rawProps);
  const context = useMessageScrollerContext();
  const [local, others] = splitProps(props, ["class", "messageId", "ref", "scrollAnchor"]);
  let itemElement: HTMLDivElement | undefined;

  createEffect(() => {
    const messageId = local.messageId;
    if (!messageId || !itemElement) return;

    context.registerMessage(messageId, itemElement);
    onCleanup(() => context.registerMessage(messageId, null, itemElement));
  });

  return (
    <div
      ref={(element) => {
        itemElement = element;
        setElementRef(local.ref, element);
      }}
      data-slot="message-scroller-item"
      data-message-id={local.messageId}
      data-scroll-anchor={local.scrollAnchor ? "true" : "false"}
      class={cn(
        "z-message-scroller-item min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
        local.class,
      )}
      {...others}
    />
  );
};

const MessageScrollerButton = (rawProps: MessageScrollerButtonProps) => {
  const props = mergeProps(
    {
      behavior: "smooth" as const,
      direction: "end" as const,
      size: "icon-sm" as const,
      type: "button" as const,
      variant: "secondary" as const,
    },
    rawProps,
  );
  const context = useMessageScrollerContext();
  const [local, others] = splitProps(props, [
    "behavior",
    "children",
    "class",
    "direction",
    "inert",
    "onClick",
    "render",
    "size",
    "tabIndex",
    "type",
    "variant",
  ]);
  const isActive = () => {
    const state = context.scrollable();
    return local.direction === "start" ? state.start : state.end;
  };
  const resolvedChildren = children(() => local.children);
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (!isActive()) return;

    callEventHandler(local.onClick, event);
    if (event.defaultPrevented) return;

    event.currentTarget.blur();
    if (local.direction === "start") context.scrollToStart({ behavior: local.behavior });
    else context.scrollToEnd({ behavior: local.behavior });
  };
  const buttonClass = () =>
    cn(
      "z-message-scroller-button absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180",
      local.class,
    );
  const defaultChildren = () =>
    resolvedChildren() ?? (
      <>
        <ArrowDown />
        <span class="sr-only">
          {local.direction === "end" ? "Scroll to end" : "Scroll to start"}
        </span>
      </>
    );
  const renderProps = mergeProps(others, {
    get class() {
      return buttonClass();
    },
    get children() {
      return defaultChildren();
    },
    get "data-active"() {
      return isActive() ? "true" : "false";
    },
    get "data-direction"() {
      return local.direction;
    },
    get "data-size"() {
      return local.size;
    },
    "data-slot": "message-scroller-button",
    get "data-variant"() {
      return local.variant;
    },
    get inert() {
      return local.inert ?? !isActive();
    },
    onClick: handleClick,
    get size() {
      return local.size;
    },
    get tabIndex() {
      return isActive() ? local.tabIndex : -1;
    },
    get type() {
      return local.type;
    },
    get variant() {
      return local.variant;
    },
  }) as ButtonProps;
  const renderState: MessageScrollerButtonRenderState = {
    get active() {
      return isActive();
    },
    get direction() {
      return local.direction;
    },
  };

  if (local.render) return <>{local.render(renderProps, renderState)}</>;

  return (
    <Button
      {...others}
      data-slot="message-scroller-button"
      data-direction={local.direction}
      data-variant={local.variant}
      data-size={local.size}
      data-active={isActive() ? "true" : "false"}
      inert={local.inert ?? !isActive()}
      tabIndex={isActive() ? local.tabIndex : -1}
      type={local.type}
      variant={local.variant}
      size={local.size}
      class={buttonClass()}
      onClick={handleClick}
    >
      {defaultChildren()}
    </Button>
  );
};

export type {
  MessageScrollerButtonDirection,
  MessageScrollerButtonProps,
  MessageScrollerButtonRenderState,
  MessageScrollerContentProps,
  MessageScrollerDefaultScrollPosition,
  MessageScrollerItemProps,
  MessageScrollerProps,
  MessageScrollerProviderProps,
  MessageScrollerScrollAlign,
  MessageScrollerScrollable,
  MessageScrollerScrollOptions,
  MessageScrollerViewportProps,
  MessageScrollerVisibilityState,
};
export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
