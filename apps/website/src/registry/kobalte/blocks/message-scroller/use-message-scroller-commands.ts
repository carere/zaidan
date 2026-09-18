import {
  getElementScrollTop,
  getElementViewportTop,
  getMaxScrollTop,
  getTailSpacerHeight,
} from "./geometry";
import type { MessageScrollerControllerState, MessageScrollerScrollOptions } from "./types";
import { AUTOSCROLLING_CLEAR_DELAY, SCROLL_POSITION_EPSILON } from "./types";

// Imperative scroll primitives, split from the controller so the move mechanics
// live apart from the policy that decides when to run them. Each command resolves
// a target scrollTop and returns false when the viewport is not mounted yet.
// Plain closures over the shared state object replace upstream's memoized callbacks.
function createMessageScrollerCommands({
  state,
  commitScrollState,
  scheduleStateCommit,
  scheduleVisibilitySync,
}: {
  state: MessageScrollerControllerState;
  commitScrollState: () => void;
  scheduleStateCommit: () => void;
  scheduleVisibilitySync: () => void;
}) {
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
    const spacer = state.spacer;

    if (!spacer) {
      return;
    }

    const nextHeight = Math.max(0, Math.ceil(height));

    if (state.spacerHeight === nextHeight) {
      return;
    }

    state.spacerHeight = nextHeight;
    spacer.hidden = nextHeight === 0;
    spacer.style.height = `${nextHeight}px`;
    spacer.style.marginTop = nextHeight > 0 ? `${-state.spacerGap}px` : "";
  }

  function scrollToPosition(
    scrollTop: number,
    {
      behavior = "auto",
      autoscrolling = false,
    }: {
      behavior?: ScrollBehavior;
      autoscrolling?: boolean;
    } = {},
  ) {
    const viewport = state.viewport;

    if (!viewport) {
      return;
    }

    const nextScrollTop = Math.max(0, scrollTop);

    if (Math.abs(viewport.scrollTop - nextScrollTop) <= SCROLL_POSITION_EPSILON) {
      viewport.scrollTop = nextScrollTop;
      commitScrollState();
      return;
    }

    if (autoscrolling) {
      setAutoScrolling(true);
    }

    viewport.scrollTo({
      top: nextScrollTop,
      behavior,
    });
    scheduleStateCommit();
  }

  function scrollToStart({ behavior = "auto" }: MessageScrollerScrollOptions = {}) {
    if (!state.viewport) {
      return false;
    }

    setTailSpacerHeight(0);
    state.streamingTurn = null;
    state.mode = "free-scrolling";
    scrollToPosition(0, { behavior });
    scheduleVisibilitySync();

    return true;
  }

  function scrollToEnd({ behavior = "auto" }: MessageScrollerScrollOptions = {}) {
    const viewport = state.viewport;

    if (!viewport) {
      return false;
    }

    setTailSpacerHeight(0);
    state.streamingTurn = null;
    state.mode = state.autoScroll ? "following-bottom" : "free-scrolling";
    scrollToPosition(getMaxScrollTop(viewport), {
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
    {
      keepPreviousPeek = false,
    }: {
      keepPreviousPeek?: boolean;
    } = {},
  ) {
    const content = state.content;
    const viewport = state.viewport;

    if (!content || !viewport || !content.contains(element)) {
      return false;
    }

    const scrollTop = getElementScrollTop({
      align,
      element,
      scrollMargin: keepPreviousPeek ? scrollMargin + state.scrollPreviousItemPeek : scrollMargin,
      spacer: state.spacer,
      viewport,
    });

    const nextSpacerHeight = getTailSpacerHeight({
      content,
      scrollTop,
      spacer: state.spacer,
      viewport,
    });

    setTailSpacerHeight(nextSpacerHeight);
    // Seed the prepend anchor with the jump target so a prepend that lands
    // before this scroll settles still preserves the jumped-to row; once it
    // settles, syncAfterScroll's capturePrependAnchor re-captures it from the
    // first visible row.
    state.prependRestore = {
      element,
      viewportTop: getElementViewportTop(element, viewport),
    };

    state.mode = keepPreviousPeek ? "anchored-to-message" : "settling-jump";
    state.streamingTurn = keepPreviousPeek ? element : null;

    scrollToPosition(scrollTop, { behavior });
    scheduleVisibilitySync();

    return true;
  }

  function reanchorToAnchoredMessage() {
    const element = state.streamingTurn;

    if (!element?.isConnected || state.mode !== "anchored-to-message") {
      return false;
    }

    // Re-run the placement so the tail spacer is recomputed for the new content
    // height and the turn is held at the reading line.
    return scrollToElement(element, { align: "start" }, { keepPreviousPeek: true });
  }

  // The target row may not be mounted yet (e.g. an async-loaded transcript).
  // When it is missing the request is queued in state.pendingScrollToMessage and
  // flushed later — on registerMessage for that id, or on the next content
  // change. An explicit jump also marks the mount default as applied, so
  // defaultScrollPosition does not override it.
  function scrollToMessage(messageId: string, options?: MessageScrollerScrollOptions) {
    const element = state.messageElements.get(messageId);

    if (!element) {
      if (state.itemCount === 0) {
        state.pendingScrollToMessage = {
          messageId,
          options,
        };
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

    state.pendingScrollToMessage = {
      messageId,
      options,
    };

    return true;
  }

  function flushPendingScrollToMessage() {
    const pending = state.pendingScrollToMessage;

    if (!pending) {
      return false;
    }

    const element = state.messageElements.get(pending.messageId);

    if (!element) {
      return false;
    }

    const handled = scrollToElement(element, pending.options);

    if (!handled) {
      return false;
    }

    state.pendingScrollToMessage = null;
    state.defaultScrollPositionApplied = true;

    return true;
  }

  return {
    flushPendingScrollToMessage,
    reanchorToAnchoredMessage,
    scrollToElement,
    scrollToEnd,
    scrollToMessage,
    scrollToPosition,
    scrollToStart,
    setAutoScrolling,
    setTailSpacerHeight,
  };
}

export { createMessageScrollerCommands };
