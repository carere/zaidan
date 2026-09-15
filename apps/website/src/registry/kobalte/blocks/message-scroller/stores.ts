import { createSignal } from "solid-js";
import type {
  MessageScrollerScrollable,
  MessageScrollerStore,
  MessageScrollerVisibilityState,
  MessageScrollerVisibilityStore,
} from "./types";
import { EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE } from "./types";

// Signal-backed replacement for upstream's useSyncExternalStore stores: the
// snapshot stays referentially equal while isEqual holds, so subscribers only
// react to real transitions. Solid's reactivity replaces the listener set.
function createMessageScrollerStore<T extends object>(
  initialSnapshot: T,
  isEqual: (a: T, b: T) => boolean,
): MessageScrollerStore<T> {
  const [snapshot, setSnapshot] = createSignal(initialSnapshot);

  return {
    snapshot,
    setSnapshot: (nextSnapshot: T) => {
      setSnapshot((current) => (isEqual(current, nextSnapshot) ? current : nextSnapshot));
    },
  };
}

// Visibility store with reference-counting so tracking stays lazy: the first
// subscriber starts observation, the last unsubscribe stops it. Replaces the
// subscribe-time lifecycle callbacks of upstream's external store.
function createMessageScrollerVisibilityStore(): MessageScrollerVisibilityStore {
  const store = createMessageScrollerStore(
    EMPTY_MESSAGE_SCROLLER_VISIBILITY_STATE,
    areVisibilityStatesEqual,
  );
  let subscribers = 0;

  return {
    ...store,
    hasSubscribers: () => subscribers > 0,
    subscribe: (onFirstSubscribe: () => void, onLastUnsubscribe: () => void) => {
      subscribers += 1;

      if (subscribers === 1) {
        onFirstSubscribe();
      }

      let unsubscribed = false;

      return () => {
        if (unsubscribed) {
          return;
        }

        unsubscribed = true;
        subscribers -= 1;

        if (subscribers === 0) {
          onLastUnsubscribe();
        }
      };
    },
  };
}

function areScrollStatesEqual(current: MessageScrollerScrollable, next: MessageScrollerScrollable) {
  return current.start === next.start && current.end === next.end;
}

function areVisibilityStatesEqual(
  current: MessageScrollerVisibilityState,
  next: MessageScrollerVisibilityState,
) {
  if (current.currentAnchorId !== next.currentAnchorId) {
    return false;
  }

  if (current.visibleMessageIds.length !== next.visibleMessageIds.length) {
    return false;
  }

  return current.visibleMessageIds.every(
    (messageId, index) => messageId === next.visibleMessageIds[index],
  );
}

export {
  areScrollStatesEqual,
  areVisibilityStatesEqual,
  createMessageScrollerStore,
  createMessageScrollerVisibilityStore,
};
