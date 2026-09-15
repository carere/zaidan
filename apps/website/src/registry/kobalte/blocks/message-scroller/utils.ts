import type { JSX } from "solid-js";

// Solid-side helpers replacing upstream's React utilities: useLatest is
// unnecessary because Solid props are live, and composeRefs collapses to
// forwarding function refs.

// Dispatches a Solid JSX.EventHandlerUnion (plain function or bound-data tuple).
function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") {
    handler(event);
  } else {
    handler?.[0](handler[1], event);
  }
}

// Forwards an element to a user-supplied function ref, if any.
function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") {
    (ref as (element: HTMLElement) => void)(element);
  }
}

export { callEventHandler, setElementRef };
