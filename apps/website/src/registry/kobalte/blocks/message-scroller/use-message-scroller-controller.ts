import { createEffect, onCleanup } from "solid-js";
import {
  getContentBottom,
  getElementTop,
  getElementViewportTop,
  getFirstVisibleMessageItem,
  getFlexGap,
  getLastScrollAnchor,
  getMessageScrollerItems,
  getMessageScrollerScrollable,
  getMessageScrollerVisibilityState,
  getNewScrollAnchor,
  getUnanchoredScrollAnchor,
  hasMultipleNewScrollAnchors,
} from "./geometry";
import {
  areScrollStatesEqual,
  createMessageScrollerStore,
  createMessageScrollerVisibilityStore,
} from "./stores";
import type {
  MessageScrollerContextValue,
  MessageScrollerProviderProps,
  MessageScrollerRegisterMessage,
  MessageScrollerScrollable,
} from "./types";
import {
  EMPTY_MESSAGE_SCROLLER_SCROLLABLE,
  EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE,
  SCROLL_POSITION_EPSILON,
} from "./types";
import { createMessageScrollerCommands } from "./use-message-scroller-commands";
import { createMessageScrollerState } from "./use-message-scroller-refs";

// Orchestrator for one MessageScrollerProvider. Decides when to scroll and
// delegates the moves to createMessageScrollerCommands; state and visibility
// commits are coalesced on a requestAnimationFrame and torn down on cleanup.
// Runs once per Provider — prop changes are reacted to via createEffect instead
// of upstream's render-time ref mirroring.
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
  const state = createMessageScrollerState({
    autoScroll: props.autoScroll,
    defaultScrollPosition: props.defaultScrollPosition,
    scrollEdgeThreshold: props.scrollEdgeThreshold,
    scrollMargin: props.scrollMargin,
    scrollPreviousItemPeek: props.scrollPreviousItemPeek,
  });
  const stateStore = createMessageScrollerStore(
    EMPTY_MESSAGE_SCROLLER_SCROLLABLE,
    areScrollStatesEqual,
  );
  const visibilityStore = createMessageScrollerVisibilityStore();

  function writeStateAttributes(nextState: MessageScrollerScrollable) {
    const scrollable = [nextState.start && "start", nextState.end && "end"]
      .filter(Boolean)
      .join(" ");

    for (const element of [state.root, state.viewport]) {
      if (!element) {
        continue;
      }

      if (scrollable) {
        element.setAttribute("data-scrollable", scrollable);
      } else {
        element.removeAttribute("data-scrollable");
      }

      element.toggleAttribute("data-autoscrolling", state.autoscrolling);
    }
  }

  // Owns the one follow-bottom transition: arm at the bottom, release on any
  // scroll away (including a scrollbar drag), suppressed during a programmatic
  // scroll so the auto-scroll animation cannot release itself. Arming also
  // skips the anchored-to-message hold: the tail spacer makes a freshly
  // anchored turn read as "at the end", and re-arming there would let the
  // first streamed chunk yank the reader off the anchor. The hold hands back
  // to following in handleResize, once the reply consumes the tail spacer.
  function reconcileFollowMode(scrollable: MessageScrollerScrollable) {
    const scrollTop = state.viewport?.scrollTop ?? 0;
    // Content growing past the live edge also reads as "not at the end", but
    // only a scrollbar drag moves scrollTop up. Growth must not release
    // follow-output: the resize handler is coalesced onto a frame, so a state
    // commit can observe the grown content before follow catches up.
    const scrolledUp = scrollTop < state.lastScrollTop - SCROLL_POSITION_EPSILON;

    state.lastScrollTop = scrollTop;

    if (
      state.autoScroll &&
      !scrollable.end &&
      state.mode !== "settling-jump" &&
      state.mode !== "anchored-to-message"
    ) {
      state.mode = "following-bottom";
    } else if (
      state.mode === "following-bottom" &&
      scrollable.end &&
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

    // While follow-output is engaged the scroller is already closing any gap a
    // streamed chunk just opened, so publishing it as scrollable toward the
    // end would strobe the scroll button once per chunk. Reconcile runs on the
    // raw geometry first, so a commit that releases follow still publishes the
    // gap it released over.
    const publishedState =
      state.mode === "following-bottom" ? { ...nextState, end: false } : nextState;

    writeStateAttributes(publishedState);
    stateStore.setSnapshot(publishedState);
  }

  function scheduleStateCommit() {
    if (state.stateFrame !== null || typeof window === "undefined") {
      return;
    }

    state.stateFrame = window.requestAnimationFrame(() => {
      state.stateFrame = null;
      commitScrollState();
    });
  }

  function scheduleVisibilitySync() {
    if (
      !visibilityStore.hasSubscribers() ||
      state.visibilityFrame !== null ||
      typeof window === "undefined"
    ) {
      return;
    }

    state.visibilityFrame = window.requestAnimationFrame(() => {
      state.visibilityFrame = null;

      // A frame can outlive the last unsubscribe. Recomputing here would
      // overwrite the EMPTY snapshot that teardown just wrote, leaving a stale
      // value for the next subscriber to read.
      if (!visibilityStore.hasSubscribers()) {
        return;
      }

      visibilityStore.setSnapshot(
        getMessageScrollerVisibilityState({
          content: state.content,
          scrollMargin: state.scrollMargin,
          scrollPreviousItemPeek: state.scrollPreviousItemPeek,
          spacer: state.spacer,
          viewport: state.viewport,
          visibleMessageIds: state.visibleMessageIds,
        }),
      );
    });
  }

  const {
    flushPendingScrollToMessage,
    reanchorToAnchoredMessage,
    scrollToElement,
    scrollToEnd,
    scrollToMessage,
    scrollToStart,
  } = createMessageScrollerCommands({
    state,
    commitScrollState,
    scheduleStateCommit,
    scheduleVisibilitySync,
  });

  function restorePrependedAnchor() {
    const anchor = state.prependRestore;
    const viewport = state.viewport;

    if (!anchor || !viewport || !anchor.element.isConnected) {
      return false;
    }

    // Compare the anchor relative to the viewport, not to the content. Native
    // scroll anchoring leaves the viewport-relative position unchanged, so this
    // is a no-op where the browser already handled the prepend and only corrects
    // the scroll where it did not (e.g. Safari) — without trusting a capability
    // flag, which some engines report incorrectly.
    const nextViewportTop = getElementViewportTop(anchor.element, viewport);
    const delta = nextViewportTop - anchor.viewportTop;

    if (Math.abs(delta) <= SCROLL_POSITION_EPSILON) {
      return false;
    }

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
      ? {
          element: anchor,
          viewportTop: getElementViewportTop(anchor, state.viewport),
        }
      : null;
  }

  function schedulePendingScrollToMessageFlush() {
    if (state.pendingScrollFrame !== null || typeof window === "undefined") {
      return;
    }

    state.pendingScrollFrame = window.requestAnimationFrame(() => {
      state.pendingScrollFrame = null;

      if (flushPendingScrollToMessage()) {
        capturePrependAnchor();
      }
    });
  }

  function applyDefaultScrollPosition() {
    if (state.defaultScrollPositionApplied || state.itemCount === 0) {
      return false;
    }

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
        // A short last turn already fits below the anchor, so opening at the end
        // shows the whole turn without leaving a blank gap beneath it.
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

    if (handled) {
      state.defaultScrollPositionApplied = true;
    }

    return handled;
  }

  // Reconciles the scroll position with the new content, then re-captures the
  // prepend anchor. Branch order is load-bearing: pending jump, first-content,
  // prepended, appended, updated.
  function handleContentChange() {
    if (!state.content) {
      return;
    }

    const items = getMessageScrollerItems(state.content, state.spacer);
    // Track which elements are genuinely new: Solid's For recreates DOM nodes
    // when backing objects are replaced, so the childList churns without the
    // list changing (see getUnanchoredScrollAnchor).
    const newItems = items.filter((item) => !state.seenItems.has(item));

    for (const item of newItems) {
      state.seenItems.add(item);
    }

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
      // Prepended rows are not new appends. Restore the prior scroll position.
      // The restore is a no-op where native scroll anchoring already did it.
      restorePrependedAnchor();
      capturePrependAnchor();
      return;
    }

    if (items.length > previousItemCount) {
      const anchor = getNewScrollAnchor(items, previousItemCount);

      if (anchor) {
        // While the reader is following the live end, a batch of several
        // anchored turns arriving at once should keep following the end — not
        // yank back to anchor the first turn of the batch. A single new anchor
        // still moves to the top as usual.
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
      const anchor = getUnanchoredScrollAnchor(newItems, state.handledScrollAnchors);

      if (anchor) {
        scrollToElement(anchor, { align: "start" }, { keepPreviousPeek: true });
        state.handledScrollAnchors.add(anchor);
        capturePrependAnchor();
        return;
      }
    }

    // Appends with no new anchor (and content-only updates) fall through here:
    // keep following the end if we still are, otherwise just recommit state.
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

    // Hold the anchored turn in place as content below it resizes (a reply
    // streaming in, or a transient marker collapsing) — otherwise the shrinking
    // content lets the browser clamp scrollTop and the turn drops.
    const previousSpacerHeight = state.spacerHeight;

    if (reanchorToAnchoredMessage()) {
      // The reply streaming below the anchor consumes the tail spacer as it
      // grows. Once the last of it is gone the reply has filled the viewport
      // and the reader is genuinely at the live edge, so autoScroll hands off
      // from the anchor hold to following the bottom. Requiring the >0 → 0
      // transition keeps a turn taller than the viewport (placed with no
      // spacer) held instead of yanked to the end.
      if (state.autoScroll && previousSpacerHeight > 0 && state.spacerHeight === 0) {
        scrollToEnd({ behavior: "auto" });
      }

      return;
    }

    scheduleStateCommit();
    scheduleVisibilitySync();
  }

  function startVisibilityObservation() {
    if (!state.viewport || !visibilityStore.hasSubscribers()) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      scheduleVisibilitySync();
      return;
    }

    if (!state.visibilityObserver) {
      state.visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const messageId = (entry.target as HTMLElement).dataset.messageId;

            if (!messageId) {
              continue;
            }

            if (entry.isIntersecting) {
              state.visibleMessageIds.add(messageId);
            } else {
              state.visibleMessageIds.delete(messageId);
            }
          }

          scheduleVisibilitySync();
        },
        {
          root: state.viewport,
          // Shrink the root's top edge to the anchoring line so a previous turn
          // peeking in the scrollMargin + peek band is not reported as visible,
          // keeping visibleMessageIds consistent with currentAnchorId. Captured
          // at observe time; a prop change rebuilds the observer on resubscribe.
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
    visibilityStore.setSnapshot(EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE);
  }

  function subscribeVisibility() {
    return visibilityStore.subscribe(startVisibilityObservation, stopVisibilityObservation);
  }

  const registerMessage: MessageScrollerRegisterMessage = (messageId, element, removedElement) => {
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
  };

  function userScrollIntent() {
    if (
      state.mode === "following-bottom" ||
      state.mode === "anchored-to-message" ||
      state.mode === "settling-jump"
    ) {
      // A deliberate gesture releases auto-follow, turn-anchoring, and an in-flight
      // programmatic jump so re-pinning (and re-arming) never fights the reader.
      state.streamingTurn = null;
      state.mode = "free-scrolling";
    }
  }

  // The element setters re-mirror the current snapshot on mount because
  // data-scrollable/data-autoscrolling are written imperatively, outside
  // Solid's reactivity — without this the attributes would be missing until
  // the first scroll or resize commit.
  function setRootElement(element: HTMLDivElement | null) {
    state.root = element;

    if (element) {
      writeStateAttributes(stateStore.snapshot());
    }
  }

  function setViewportElement(element: HTMLDivElement | null) {
    state.viewport = element;

    if (element) {
      state.lastScrollTop = element.scrollTop;
      writeStateAttributes(stateStore.snapshot());

      if (visibilityStore.hasSubscribers()) {
        startVisibilityObservation();
      }
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

  // Prop reactions replace upstream's render-time ref mirroring and the
  // previousDefaultScrollPosition comparison.
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
    if (state.stateFrame !== null) {
      window.cancelAnimationFrame(state.stateFrame);
      state.stateFrame = null;
    }

    if (state.visibilityFrame !== null) {
      window.cancelAnimationFrame(state.visibilityFrame);
      state.visibilityFrame = null;
    }

    if (state.autoscrollingTimeout !== null) {
      window.clearTimeout(state.autoscrollingTimeout);
      state.autoscrollingTimeout = null;
    }

    if (state.pendingScrollFrame !== null) {
      window.cancelAnimationFrame(state.pendingScrollFrame);
      state.pendingScrollFrame = null;
    }

    state.visibilityObserver?.disconnect();
    state.visibilityObserver = null;
  });

  return {
    handleContentChange,
    handleResize,
    registerMessage,
    scrollable: stateStore.snapshot,
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
    visibility: visibilityStore.snapshot,
  };
}

export { createMessageScrollerController };
