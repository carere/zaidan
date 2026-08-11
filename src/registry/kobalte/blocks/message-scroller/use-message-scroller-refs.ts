import type { MessageScrollerControllerState, MessageScrollerDefaultScrollPosition } from "./types";

// Builds the per-instance mutable state object shared by the controller and the
// commands. Replaces upstream's useMessageScrollerRefs: Solid components run
// once, so plain fields stand in for the React ref bag, and no useLatest
// mirroring is needed — the controller re-reads live props via createEffect.
function createMessageScrollerState({
  autoScroll,
  defaultScrollPosition,
  scrollEdgeThreshold,
  scrollMargin,
  scrollPreviousItemPeek,
}: {
  autoScroll: boolean;
  defaultScrollPosition: MessageScrollerDefaultScrollPosition;
  scrollEdgeThreshold: number;
  scrollMargin: number;
  scrollPreviousItemPeek: number;
}): MessageScrollerControllerState {
  return {
    autoScroll,
    autoscrolling: false,
    autoscrollingTimeout: null,
    content: null,
    defaultScrollPosition,
    defaultScrollPositionApplied: false,
    firstItem: null,
    handledScrollAnchors: new WeakSet(),
    itemCount: 0,
    lastScrollTop: 0,
    messageElements: new Map(),
    mode: autoScroll ? "following-bottom" : "free-scrolling",
    pendingScrollFrame: null,
    pendingScrollToMessage: null,
    prependRestore: null,
    preserveScrollOnPrepend: true,
    root: null,
    scrollEdgeThreshold,
    scrollMargin,
    scrollPreviousItemPeek,
    seenItems: new WeakSet(),
    spacer: null,
    spacerGap: 0,
    spacerHeight: 0,
    stateFrame: null,
    streamingTurn: null,
    viewport: null,
    visibilityFrame: null,
    visibilityObserver: null,
    visibleMessageIds: new Set(),
  };
}

export { createMessageScrollerState };
