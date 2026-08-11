import type { Accessor, ComponentProps, JSX } from "solid-js";
import type { ButtonProps } from "@/registry/kobalte/ui/button";

// Default scrollEdgeThreshold. Sub-pixel tolerance so edge detection does not
// flicker across engines that round scrollTop differently.
const DEFAULT_SCROLL_EDGE_THRESHOLD = 8;

// Default scrollPreviousItemPeek. Pixels of the previous item kept visible above
// a newly anchored row.
const DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK = 64;

// Default scrollMargin for scrollToMessage and programmatic targets.
const DEFAULT_SCROLL_MARGIN = 0;

// Two fractional scrollTop values within this range are treated as equal, to
// absorb zoom and HiDPI rounding drift.
const SCROLL_POSITION_EPSILON = 0.5;

// How long (ms) data-autoscrolling stays set during a programmatic smooth scroll
// before clearing.
const AUTOSCROLLING_CLEAR_DELAY = 180;

// Viewport keys that count as deliberate scroll intent and release follow-bottom.
const USER_SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ", // Space key.
]);

// Internal scroll mode. Derived from intent and commands; decides how the
// viewport reacts to content and resize.
type MessageScrollerMode =
  | "following-bottom" // autoScroll on, pinned to the latest message.
  | "free-scrolling" // reader scrolled away; position left alone (prepends still preserved).
  | "anchored-to-message" // holding a turn at the reading line while it streams.
  | "settling-jump"; // a programmatic jump is animating; intent detection suppressed until it settles.

// Where a saved transcript opens on the first non-empty render.
type MessageScrollerDefaultScrollPosition = "start" | "end" | "last-anchor";

// Which transcript edge MessageScrollerButton scrolls toward.
type MessageScrollerButtonDirection = "start" | "end";

// Viewport alignment for scrollToMessage and programmatic jumps.
type MessageScrollerScrollAlign = "start" | "center" | "end" | "nearest";

// Options for scrollToMessage, scrollToEnd, and scrollToStart.
type MessageScrollerScrollOptions = {
  // Viewport edge or center to align the target to.
  align?: MessageScrollerScrollAlign;
  // Native scroll behavior.
  behavior?: ScrollBehavior;
  // Margin on the aligned edge, in pixels. Defaults to the provider scrollMargin.
  scrollMargin?: number;
};

// Scroll snapshot from useMessageScrollerScrollable: which edges the viewport can
// still scroll toward.
type MessageScrollerScrollable = {
  // The viewport can scroll toward the start (content is hidden above).
  start: boolean;
  // The viewport can scroll toward the end (content is hidden below).
  end: boolean;
};

// Visibility snapshot from useMessageScrollerVisibility.
type MessageScrollerVisibilityState = {
  // The anchored turn the reader is in, or null. Stays set after the anchor
  // scrolls above the viewport.
  currentAnchorId: string | null;
  // messageId values intersecting the viewport, in document order.
  visibleMessageIds: string[];
};

// Headless provider for a chat transcript scroller. Owns scroll behavior and
// state; renders no DOM.
type MessageScrollerProviderProps = {
  children?: JSX.Element;
  // Follow new content at the bottom while the viewport is already at the end.
  autoScroll?: boolean;
  // Opening position on the first non-empty render, applied once.
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition;
  // Distance from an edge that still counts as at-top/at-bottom. Defaults to 8.
  scrollEdgeThreshold?: number;
  // Extra top margin for a newly anchored row, added to scrollMargin. Defaults to 64.
  scrollPreviousItemPeek?: number;
  // Default margin on the aligned edge for commands and visibility. Defaults to 0.
  scrollMargin?: number;
};

// Frame container for a chat transcript scroller. Must render inside a
// MessageScrollerProvider.
type MessageScrollerProps = ComponentProps<"div">;

// Scrollable viewport. Owns native scroll events and prepend preservation.
type MessageScrollerViewportProps = ComponentProps<"div"> & {
  // Keep the first visible messageId row stable on prepend. Defaults to true.
  preserveScrollOnPrepend?: boolean;
};

// Transcript row container. Every direct child should be a MessageScrollerItem.
type MessageScrollerContentProps = ComponentProps<"div"> & {
  // Class name for the internal tail spacer used when anchoring turns near the top.
  spacerClassName?: string;
};

// One transcript row: a message, marker, typing row, separator, or load-more row.
type MessageScrollerItemProps = ComponentProps<"div"> & {
  // Stable row id for scrollToMessage, visibility, and prepend preservation.
  messageId?: string;
  // Marks a turn boundary that newly appended anchors and last-anchor restore use.
  scrollAnchor?: boolean;
};

// State passed to MessageScrollerButton's render prop.
type MessageScrollerButtonRenderState = {
  // Whether overflow exists toward this button's direction.
  active: boolean;
  direction: MessageScrollerButtonDirection;
};

// Scroll control for the start or end of the transcript.
type MessageScrollerButtonProps = ButtonProps & {
  // Native scroll behavior when clicked. Defaults to "smooth".
  behavior?: ScrollBehavior;
  // Transcript edge to scroll toward. Defaults to "end".
  direction?: MessageScrollerButtonDirection;
  /**
   * Solid render-function equivalent of the upstream element-or-function render
   * prop. Solid JSX elements are real DOM nodes and cannot be cloned to merge
   * behavior props; pass a function here or use Button's `as` prop instead.
   */
  render?: (props: ButtonProps, state: MessageScrollerButtonRenderState) => JSX.Element;
};

// Minimal signal-backed store shape shared by scroll state and visibility.
// Replaces upstream's useSyncExternalStore stores: the snapshot accessor is a
// Solid signal, and setSnapshot preserves the current reference while the
// comparator holds so subscribers only react to real transitions.
type MessageScrollerStore<T> = {
  snapshot: Accessor<T>;
  setSnapshot: (nextSnapshot: T) => void;
};

// Store backing useMessageScrollerVisibility. Adds reference-counting so
// tracking stays lazy: observation starts on the first subscriber and stops on
// the last unsubscribe.
type MessageScrollerVisibilityStore = MessageScrollerStore<MessageScrollerVisibilityState> & {
  hasSubscribers: () => boolean;
  subscribe: (onFirstSubscribe: () => void, onLastUnsubscribe: () => void) => () => void;
};

// Registers (or, with removedElement, unregisters) a MessageScrollerItem node by
// messageId.
type MessageScrollerRegisterMessage = (
  messageId: string,
  element: HTMLElement | null,
  removedElement?: HTMLElement | null,
) => void;

// A scrollToMessage request whose target row is not mounted yet.
type PendingScrollToMessage = {
  messageId: string;
  options?: MessageScrollerScrollOptions;
};

// Shared mutable state for one MessageScroller, closed over by both the
// controller and the commands so writes are visible across them without prop
// threading. Replaces upstream's per-field React ref bag: Solid components run
// once, so one plain object created per Provider is enough.
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
  // The scrollTop seen by the previous state commit, so follow-release can tell
  // a reader scrolling up from content growing past the live edge.
  lastScrollTop: number;
  messageElements: Map<string, HTMLElement>;
  mode: MessageScrollerMode;
  pendingScrollFrame: number | null;
  pendingScrollToMessage: PendingScrollToMessage | null;
  // The row to hold steady on the next prepend: the first visible row, or a jump
  // target seeded by scrollToElement. restorePrependedAnchor reads only this.
  prependRestore: { element: HTMLElement; viewportTop: number } | null;
  preserveScrollOnPrepend: boolean;
  root: HTMLDivElement | null;
  scrollEdgeThreshold: number;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
  // Elements already seen by handleContentChange. Solid's For recreates DOM
  // nodes when backing objects are replaced, so the childList can churn without
  // the list truly changing; this set tells genuinely new rows apart.
  seenItems: WeakSet<HTMLElement>;
  spacer: HTMLDivElement | null;
  spacerGap: number;
  spacerHeight: number;
  stateFrame: number | null;
  // The turn held at the reading line so a reply streaming in below it can re-pin
  // it instead of letting scrollTop clamp it loose.
  streamingTurn: HTMLElement | null;
  viewport: HTMLDivElement | null;
  visibilityFrame: number | null;
  visibilityObserver: IntersectionObserver | null;
  visibleMessageIds: Set<string>;
};

// Internal context wiring the parts together. Not part of the public API.
type MessageScrollerContextValue = {
  handleContentChange: () => void;
  handleResize: () => void;
  registerMessage: MessageScrollerRegisterMessage;
  scrollable: Accessor<MessageScrollerScrollable>;
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
  visibility: Accessor<MessageScrollerVisibilityState>;
};

// Initial MessageScrollerScrollable before measurement. Stable reference for the
// server and first-render snapshot.
const EMPTY_MESSAGE_SCROLLER_SCROLLABLE: MessageScrollerScrollable = {
  start: false,
  end: false,
};

// Shared empty array so empty visibility snapshots stay referentially stable.
const EMPTY_VISIBLE_MESSAGE_IDS: string[] = [];

// Initial MessageScrollerVisibilityState. Nothing tracked, no current anchor.
const EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE: MessageScrollerVisibilityState = {
  currentAnchorId: null,
  visibleMessageIds: EMPTY_VISIBLE_MESSAGE_IDS,
};

export type {
  MessageScrollerButtonDirection,
  MessageScrollerButtonProps,
  MessageScrollerButtonRenderState,
  MessageScrollerContentProps,
  MessageScrollerContextValue,
  MessageScrollerControllerState,
  MessageScrollerDefaultScrollPosition,
  MessageScrollerItemProps,
  MessageScrollerMode,
  MessageScrollerProps,
  MessageScrollerProviderProps,
  MessageScrollerRegisterMessage,
  MessageScrollerScrollAlign,
  MessageScrollerScrollable,
  MessageScrollerScrollOptions,
  MessageScrollerStore,
  MessageScrollerViewportProps,
  MessageScrollerVisibilityState,
  MessageScrollerVisibilityStore,
  PendingScrollToMessage,
};
export {
  AUTOSCROLLING_CLEAR_DELAY,
  DEFAULT_SCROLL_EDGE_THRESHOLD,
  DEFAULT_SCROLL_MARGIN,
  DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK,
  EMPTY_MESSAGE_SCROLLER_SCROLLABLE,
  EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE,
  EMPTY_VISIBLE_MESSAGE_IDS,
  SCROLL_POSITION_EPSILON,
  USER_SCROLL_KEYS,
};
