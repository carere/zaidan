import * as HoverCardPrimitive from "@kobalte/core/hover-card";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopperPrimitive from "@kobalte/core/popper";
import type { JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";

type HoverCardAlign = "center" | "end" | "start";
type HoverCardPhysicalSide = "bottom" | "left" | "right" | "top";
type HoverCardSide = HoverCardPhysicalSide | "inline-end" | "inline-start";
type HoverCardPlacement =
  | HoverCardPhysicalSide
  | `${HoverCardPhysicalSide}-end`
  | `${HoverCardPhysicalSide}-start`;

type HoverCardPosition = {
  align: HoverCardAlign;
  alignOffset: HoverCardOffset;
  side: HoverCardSide;
  sideOffset: HoverCardOffset;
};

type HoverCardOffsetData = {
  align: HoverCardAlign;
  anchor: { height: number; width: number };
  positioner: { height: number; width: number };
  side: HoverCardSide;
};

type HoverCardOffset = number | ((data: HoverCardOffsetData) => number);

type ResolvedHoverCardPosition = Omit<HoverCardPosition, "alignOffset" | "sideOffset"> & {
  alignOffset: number;
  sideOffset: number;
};

type HoverCardTransitionStatus = "ending" | "starting" | undefined;

type HoverCardChangeEventReason =
  | "escape-key"
  | "imperative-action"
  | "none"
  | "outside-press"
  | "trigger-focus"
  | "trigger-hover"
  | "trigger-press";

type HoverCardChangeEventDetails = (
  | { event: KeyboardEvent; reason: "escape-key" }
  | { event: Event; reason: "imperative-action" | "none" }
  | { event: MouseEvent | PointerEvent | TouchEvent; reason: "outside-press" }
  | { event: FocusEvent; reason: "trigger-focus" }
  | { event: MouseEvent; reason: "trigger-hover" }
  | {
      event: KeyboardEvent | MouseEvent | PointerEvent | TouchEvent;
      reason: "trigger-press";
    }
) & {
  allowPropagation: () => void;
  cancel: () => void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  trigger: Element | undefined;
};

type HoverCardPayloadChildRenderFunction<Payload> = (props: {
  payload: Payload | undefined;
}) => JSX.Element;

type HoverCardHandleRequest = (
  open: boolean,
  reason: HoverCardChangeEventReason,
  event: Event | undefined,
  triggerId: string | null,
) => boolean;

type HoverCardOpenChangeResult = {
  accepted: boolean;
  details?: HoverCardChangeEventDetails;
};

type HoverCardTriggerRegistration<Payload> = {
  element: HTMLElement;
  payload: () => Payload | undefined;
};

class HoverCardHandle<Payload = unknown> {
  readonly #triggers = new Map<string, HoverCardTriggerRegistration<Payload>>();
  readonly #openState = createSignal(false);
  readonly #activeTriggerIdState = createSignal<string | null>(null);
  readonly #payloadState = createSignal<Payload>();
  #request: HoverCardHandleRequest | undefined;
  #closeTimer: number | undefined;
  #content: HTMLElement | undefined;

  open(triggerId: string) {
    if (!this.#triggers.has(triggerId)) {
      throw new Error(`HoverCardHandle.open: No trigger found with id "${triggerId}".`);
    }
    this._requestOpen(true, "imperative-action", undefined, triggerId);
  }

  close() {
    this._requestOpen(false, "imperative-action", undefined, this._activeTriggerId());
  }

  get isOpen() {
    return this.#openState[0]();
  }

  _activeTrigger() {
    const triggerId = this.#activeTriggerIdState[0]();
    return triggerId ? this.#triggers.get(triggerId)?.element : undefined;
  }

  _activeTriggerId() {
    return this.#activeTriggerIdState[0]();
  }

  _trigger(triggerId: string | null | undefined) {
    return triggerId ? this.#triggers.get(triggerId)?.element : undefined;
  }

  _bindRequest(request: HoverCardHandleRequest) {
    this.#request = request;
    return () => {
      if (this.#request === request) this.#request = undefined;
    };
  }

  _cancelClosing() {
    if (typeof window !== "undefined") window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  }

  _commit(open: boolean, triggerId: string | null) {
    if (open) {
      const registration = triggerId ? this.#triggers.get(triggerId) : undefined;
      this.#activeTriggerIdState[1](triggerId);
      this.#payloadState[1](() => registration?.payload());
    }
    this.#openState[1](open);
  }

  _contentContains(target: EventTarget | null) {
    return target instanceof Node && this.#content?.contains(target);
  }

  _initialize(open: boolean, triggerId: string | null) {
    if (this.#openState[0]() === open && this.#activeTriggerIdState[0]() === triggerId) return;
    this._commit(open, triggerId);
  }

  _isOpenedBy(triggerId: string) {
    return this.#openState[0]() && this.#activeTriggerIdState[0]() === triggerId;
  }

  _payload() {
    return this.#payloadState[0]();
  }

  _payloadFor(triggerId: string | null | undefined) {
    return triggerId ? this.#triggers.get(triggerId)?.payload() : undefined;
  }

  _register(triggerId: string, registration: HoverCardTriggerRegistration<Payload>) {
    this.#triggers.set(triggerId, registration);
    if (this.#activeTriggerIdState[0]() === null && this.#openState[0]()) {
      this.#activeTriggerIdState[1](triggerId);
      this.#payloadState[1](() => registration.payload());
    } else if (this.#activeTriggerIdState[0]() === triggerId) {
      this.#payloadState[1](() => registration.payload());
    }
    return () => {
      if (this.#triggers.get(triggerId) !== registration) return;
      this.#triggers.delete(triggerId);
      if (this.#activeTriggerIdState[0]() === triggerId && this.#openState[0]()) {
        this._requestOpen(false, "none", undefined, triggerId);
      }
    };
  }

  _requestOpen(
    open: boolean,
    reason: HoverCardChangeEventReason,
    event: Event | undefined,
    triggerId: string | null,
  ) {
    this._cancelClosing();
    if (open && triggerId && !this.#triggers.has(triggerId)) return false;
    if (open && this.#openState[0]() && triggerId !== this.#activeTriggerIdState[0]()) {
      this._commit(true, triggerId);
      return true;
    }
    if (this.#request) return this.#request(open, reason, event, triggerId);
    this._commit(open, triggerId);
    return true;
  }

  _scheduleClose(
    delay: number,
    event: Event,
    triggerId: string,
    reason: "trigger-focus" | "trigger-hover" = "trigger-hover",
  ) {
    this._cancelClosing();
    if (typeof window === "undefined") return;
    this.#closeTimer = window.setTimeout(() => {
      this.#closeTimer = undefined;
      this._requestOpen(false, reason, event, triggerId);
    }, delay);
  }

  _setContent(element: HTMLElement | undefined) {
    this.#content = element;
  }
}

function createHoverCardHandle<Payload = unknown>() {
  return new HoverCardHandle<Payload>();
}

function createChangeDetails(
  reason: HoverCardChangeEventReason,
  event?: Event,
  trigger?: Element,
  preventUnmountOnClose: () => void = () => {},
): HoverCardChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: event ?? new Event("base-ui"),
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    preventUnmountOnClose,
    reason,
    trigger,
  } as HoverCardChangeEventDetails;
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

type HoverCardContextValue = {
  configureDelays: (delay: number | undefined, closeDelay: number | undefined) => void;
  configurePosition: (position: ResolvedHoverCardPosition) => void;
  currentPlacement: () => HoverCardPlacement;
  defaultPosition: ResolvedHoverCardPosition;
  handle: HoverCardHandle<unknown>;
  open: () => boolean;
  recordChange: (reason: HoverCardChangeEventReason, event: Event, trigger?: Element) => void;
  recordPlacement: (placement: HoverCardPlacement) => void;
  setContent: (element: HTMLElement | undefined) => void;
  transitionStatus: () => HoverCardTransitionStatus;
  trigger: () => HTMLElement | undefined;
};

const HoverCardContext = createContext<HoverCardContextValue>();

function useHoverCardContext() {
  const context = useContext(HoverCardContext);
  if (!context) throw new Error("HoverCard parts must be used within HoverCard");
  return context;
}

function physicalSide(side: HoverCardSide): HoverCardPhysicalSide {
  // Direction and RTL are intentionally outside this release-sync campaign. Preserve the
  // pinned logical API for the supported LTR surface while Kobalte consumes physical sides.
  if (side === "inline-start") return "left";
  if (side === "inline-end") return "right";
  return side;
}

function positionToPlacement(position: HoverCardPosition): HoverCardPlacement {
  const side = physicalSide(position.side);
  return position.align === "center" ? side : `${side}-${position.align}`;
}

function placementParts(placement: HoverCardPlacement) {
  const [side, align = "center"] = placement.split("-") as [
    HoverCardPhysicalSide,
    HoverCardAlign | undefined,
  ];
  return { align, side };
}

function exposedSide(placement: HoverCardPlacement, requestedSide: HoverCardSide): HoverCardSide {
  const side = placementParts(placement).side;
  if (requestedSide !== "inline-start" && requestedSide !== "inline-end") return side;
  return side === "left" ? "inline-start" : side === "right" ? "inline-end" : side;
}

function placementFromTransformOrigin(value: string): HoverCardPlacement | undefined {
  const [blockOrigin, inlineOrigin] = value.trim().split(/\s+/);
  const side =
    blockOrigin === "top"
      ? "bottom"
      : blockOrigin === "bottom"
        ? "top"
        : blockOrigin === "left"
          ? "right"
          : blockOrigin === "right"
            ? "left"
            : undefined;
  if (!side) return undefined;

  const align =
    inlineOrigin === "center"
      ? "center"
      : side === "top" || side === "bottom"
        ? inlineOrigin === "left"
          ? "start"
          : inlineOrigin === "right"
            ? "end"
            : undefined
        : inlineOrigin === "top"
          ? "start"
          : inlineOrigin === "bottom"
            ? "end"
            : undefined;
  if (!align) return undefined;
  return align === "center" ? side : `${side}-${align}`;
}

function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") (ref as (element: HTMLElement) => void)(element);
}

type HoverCardHandleAnchorProps = {
  anchor: () => HTMLElement | undefined;
  ref?: HTMLElement | ((element: HTMLElement) => void);
};

const HoverCardHandleAnchor = (props: HoverCardHandleAnchorProps) => {
  createEffect(() => {
    const anchor = props.anchor();
    if (anchor) setElementRef(props.ref, anchor);
  });
  return null;
};

type HoverCardRenderedChildrenProps<Payload> = {
  getChildren: () => JSX.Element | HoverCardPayloadChildRenderFunction<Payload>;
  payload: () => Payload | undefined;
};

const HoverCardRenderedChildren = <Payload,>(
  props: HoverCardRenderedChildrenProps<Payload>,
): JSX.Element => {
  const child = props.getChildren();
  if (typeof child !== "function") return child;
  if (child.length === 0) return child as unknown as JSX.Element;
  const renderedChild = createMemo(() => child({ payload: props.payload() }));
  return <>{renderedChild()}</>;
};

/**
 * The pinned Base UI root surface adapted to Solid.
 *
 * Base UI's detached `handle`, trigger IDs/payload, and render-function children use a
 * Solid store that bridges the active trigger into Kobalte's positioning context.
 */
type HoverCardProps<Payload = unknown> = {
  actionsRef?: { current: HoverCardActions | null };
  children?: JSX.Element | HoverCardPayloadChildRenderFunction<Payload>;
  defaultOpen?: boolean;
  defaultTriggerId?: string | null;
  handle?: HoverCardHandle<Payload>;
  onOpenChange?: (open: boolean, details: HoverCardChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  open?: boolean;
  triggerId?: string | null;
};

type HoverCardActions = {
  close: () => void;
  unmount: () => void;
};

const HoverCard = <Payload,>(props: HoverCardProps<Payload>) => {
  const [local] = splitProps(props, [
    "actionsRef",
    "children",
    "defaultOpen",
    "defaultTriggerId",
    "handle",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "triggerId",
  ]);
  const defaultPosition: ResolvedHoverCardPosition = {
    align: "center",
    alignOffset: 4,
    side: "bottom",
    sideOffset: 4,
  };
  const [position, setPosition] = createSignal(defaultPosition);
  const [currentPlacement, setCurrentPlacement] = createSignal(
    positionToPlacement(defaultPosition),
  );
  const [openDelay, setOpenDelay] = createSignal(600);
  const [closeDelay, setCloseDelay] = createSignal(300);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [transitionStatus, setTransitionStatus] = createSignal<HoverCardTransitionStatus>();
  const [content, setContent] = createSignal<HTMLElement>();
  const handle = local.handle ?? createHoverCardHandle<Payload>();
  if (local.open === undefined && local.defaultOpen && !handle.isOpen) {
    handle._initialize(true, local.defaultTriggerId ?? null);
  }
  const activeTriggerId = () =>
    local.triggerId !== undefined ? local.triggerId : handle._activeTriggerId();
  const trigger = () => handle._trigger(activeTriggerId());
  const open = () => local.open ?? handle.isOpen;
  const payload = () =>
    local.triggerId !== undefined ? handle._payloadFor(local.triggerId) : handle._payload();
  let pendingChange:
    | { event: Event; reason: HoverCardChangeEventReason; trigger?: Element }
    | undefined;
  let previousOpen = false;
  let completeVersion = 0;

  const requestOpenChange = (
    nextOpen: boolean,
    reason: HoverCardChangeEventReason,
    event?: Event,
    changeTrigger?: Element,
    changeTriggerId?: string | null,
  ) => {
    if (nextOpen === open()) return { accepted: false } satisfies HoverCardOpenChangeResult;
    let shouldPreventUnmount = false;
    const details = createChangeDetails(reason, event, changeTrigger ?? trigger(), () => {
      shouldPreventUnmount = !nextOpen;
    });
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) {
      return { accepted: false, details } satisfies HoverCardOpenChangeResult;
    }
    if (nextOpen) setPreventedUnmount(false);
    else if (shouldPreventUnmount) setPreventedUnmount(true);
    if (local.open === undefined) {
      handle._commit(nextOpen, changeTriggerId ?? changeTrigger?.id ?? handle._activeTriggerId());
    }
    return { accepted: true, details } satisfies HoverCardOpenChangeResult;
  };

  const context: HoverCardContextValue = {
    configureDelays: (delay, nextCloseDelay) => {
      if (delay !== undefined) setOpenDelay(delay);
      if (nextCloseDelay !== undefined) setCloseDelay(nextCloseDelay);
    },
    configurePosition: (nextPosition) => {
      const previousPosition = untrack(position);
      const requestedPlacementChanged =
        previousPosition.align !== nextPosition.align ||
        previousPosition.side !== nextPosition.side;
      setPosition(nextPosition);
      if (requestedPlacementChanged) setCurrentPlacement(positionToPlacement(nextPosition));
    },
    currentPlacement,
    defaultPosition,
    handle: handle as HoverCardHandle<unknown>,
    open,
    recordChange: (reason, event, changeTrigger) => {
      pendingChange = { event, reason, trigger: changeTrigger };
    },
    recordPlacement: (placement) => {
      setCurrentPlacement(placement);
    },
    setContent: (element) => {
      setContent(element);
      handle._setContent(element);
    },
    transitionStatus,
    trigger,
  };

  createEffect(() => {
    const unbind = handle._bindRequest(
      (nextOpen, reason, event, triggerId) =>
        requestOpenChange(nextOpen, reason, event, handle._trigger(triggerId), triggerId).accepted,
    );
    onCleanup(unbind);
  });

  createEffect(() => {
    if (local.open === undefined) return;
    handle._initialize(local.open, local.triggerId ?? handle._activeTriggerId());
  });

  createEffect(() => {
    if (!open()) return;
    const recordEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const result = requestOpenChange(false, "escape-key", event, trigger());
      if (!result.details?.isPropagationAllowed) event.stopPropagation();
    };
    const recordOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (trigger()?.contains(target) || content()?.contains(target)) return;
      requestOpenChange(false, "outside-press", event, trigger());
    };
    document.addEventListener("keydown", recordEscape, true);
    document.addEventListener("pointerdown", recordOutsidePress, true);
    onCleanup(() => {
      document.removeEventListener("keydown", recordEscape, true);
      document.removeEventListener("pointerdown", recordOutsidePress, true);
    });
  });

  createEffect(() => {
    const nextOpen = open();
    if (nextOpen === previousOpen) return;
    previousOpen = nextOpen;
    setTransitionStatus(nextOpen ? "starting" : "ending");
    const version = ++completeVersion;
    queueMicrotask(async () => {
      const element = content();
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      if (version === completeVersion) {
        setTransitionStatus(undefined);
        if (!nextOpen && preventedUnmount()) return;
        local.onOpenChangeComplete?.(nextOpen);
      }
    });
  });

  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const actions: HoverCardActions = {
      close: () => requestOpenChange(false, "imperative-action"),
      unmount: () => {
        const completesPreventedClose = untrack(preventedUnmount);
        setPreventedUnmount(false);
        if (completesPreventedClose) {
          completeVersion += 1;
          setTransitionStatus(undefined);
          local.onOpenChangeComplete?.(false);
        }
      },
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  onCleanup(() => {
    completeVersion += 1;
    setContent(undefined);
    handle._setContent(undefined);
  });

  return (
    <HoverCardContext.Provider value={context}>
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        closeDelay={closeDelay()}
        forceMount={preventedUnmount()}
        gutter={position().sideOffset}
        hideWhenDetached
        onOpenChange={(nextOpen) => {
          const change = pendingChange;
          pendingChange = undefined;
          requestOpenChange(
            nextOpen,
            change?.reason ?? "none",
            change?.event,
            change?.trigger ?? trigger(),
          );
        }}
        open={open()}
        openDelay={openDelay()}
        placement={positionToPlacement(position())}
        shift={position().alignOffset}
      >
        <HoverCardPrimitive.Trigger as={HoverCardHandleAnchor} anchor={trigger} />
        <HoverCardRenderedChildren getChildren={() => local.children} payload={payload} />
      </HoverCardPrimitive.Root>
    </HoverCardContext.Provider>
  );
};

type HoverCardTriggerProps<T extends ValidComponent = "a", Payload = unknown> = PolymorphicProps<
  T,
  {
    closeDelay?: number;
    delay?: number;
    handle?: HoverCardHandle<Payload>;
    payload?: Payload;
  }
>;

const HoverCardDetachedTrigger = <T extends ValidComponent = "a", Payload = unknown>(
  props: HoverCardTriggerProps<T, Payload>,
) => {
  const [local, others] = splitProps(props as HoverCardTriggerProps<ValidComponent, Payload>, [
    "as",
    "closeDelay",
    "delay",
    "handle",
    "id",
    "onBlur",
    "onFocus",
    "onPointerDown",
    "onPointerEnter",
    "onPointerLeave",
    "payload",
    "ref",
  ]);
  const generatedId = `hover-card-trigger-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const [triggerElement, setTriggerElement] = createSignal<HTMLElement>();
  let cancelRegistration: (() => void) | undefined;
  let openTimer: number | undefined;
  let pointerDown = false;

  const cancelOpening = () => {
    if (typeof window !== "undefined") window.clearTimeout(openTimer);
    openTimer = undefined;
  };
  const openWithDelay = (
    reason: "trigger-focus" | "trigger-hover",
    event: FocusEvent | PointerEvent,
  ) => {
    cancelOpening();
    local.handle?._cancelClosing();
    if (typeof window === "undefined") return;
    openTimer = window.setTimeout(() => {
      openTimer = undefined;
      local.handle?._requestOpen(true, reason, event, id());
    }, local.delay ?? 600);
  };
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || event.pointerType === "touch") return;
    if (event.pointerType !== "mouse") {
      event.preventDefault();
      return;
    }
    openWithDelay("trigger-hover", event);
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.pointerType !== "mouse") return;
    cancelOpening();
    if (local.handle?._isOpenedBy(id())) {
      local.handle._scheduleClose(local.closeDelay ?? 300, event, id());
    }
  };
  const onPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    pointerDown = true;
    queueMicrotask(() => {
      pointerDown = false;
    });
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || pointerDown) return;
    openWithDelay("trigger-focus", event);
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    cancelOpening();
    if (local.handle?._contentContains(event.relatedTarget)) return;
    if (local.handle?._isOpenedBy(id())) {
      local.handle._scheduleClose(local.closeDelay ?? 300, event, id(), "trigger-focus");
    }
  };

  onCleanup(() => {
    cancelOpening();
    cancelRegistration?.();
  });

  return (
    <Dynamic
      component={local.as ?? "a"}
      {...others}
      ref={(element: HTMLElement) => {
        if (triggerElement() !== element) {
          cancelRegistration?.();
          setTriggerElement(element);
          cancelRegistration = local.handle?._register(id(), {
            element,
            payload: () => local.payload,
          });
        }
        setElementRef(local.ref, element);
      }}
      id={id()}
      role={
        (others as { role?: string }).role ??
        (triggerElement()?.tagName === "BUTTON"
          ? "button"
          : triggerElement() && triggerElement()?.tagName !== "A"
            ? "link"
            : undefined)
      }
      onBlur={onBlur}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-popup-open={local.handle?._isOpenedBy(id()) ? "" : undefined}
      data-slot="hover-card-trigger"
    />
  );
};

const HoverCardTrigger = <T extends ValidComponent = "a", Payload = unknown>(
  props: HoverCardTriggerProps<T, Payload>,
) => {
  const context = useContext(HoverCardContext);
  const handle = props.handle ?? (context?.handle as HoverCardHandle<Payload> | undefined);
  if (!handle) {
    throw new Error("HoverCardTrigger must be used within HoverCard or provided with a handle");
  }
  return <HoverCardDetachedTrigger {...props} handle={handle} />;
};

type HoverCardContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  {
    align?: HoverCardAlign;
    alignOffset?: HoverCardOffset;
    children?: JSX.Element;
    class?: string;
    side?: HoverCardSide;
    sideOffset?: HoverCardOffset;
  }
>;

const HoverCardContent = <T extends ValidComponent = "div">(props: HoverCardContentProps<T>) => {
  const context = useHoverCardContext();
  const primitiveContext = HoverCardPrimitive.useHoverCardContext();
  const [local, others] = splitProps(props as HoverCardContentProps, [
    "align",
    "alignOffset",
    "as",
    "children",
    "class",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
    "side",
    "sideOffset",
  ]);
  const requestedPosition = (): HoverCardPosition => ({
    align: local.align ?? context.defaultPosition.align,
    alignOffset: local.alignOffset ?? context.defaultPosition.alignOffset,
    side: local.side ?? context.defaultPosition.side,
    sideOffset: local.sideOffset ?? context.defaultPosition.sideOffset,
  });
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let measurementAnimationFrame: number | undefined;
  const [positioner, setPositioner] = createSignal<HTMLElement>();
  const [measurementVersion, setMeasurementVersion] = createSignal(0);

  const resolvedPosition = (): ResolvedHoverCardPosition => {
    measurementVersion();
    const requested = requestedPosition();
    const anchorRect = context.trigger()?.getBoundingClientRect();
    const positionerRect = positioner()?.getBoundingClientRect();
    const offsetData: HoverCardOffsetData = {
      align: requested.align,
      anchor: { height: anchorRect?.height ?? 0, width: anchorRect?.width ?? 0 },
      positioner: {
        height: positionerRect?.height ?? 0,
        width: positionerRect?.width ?? 0,
      },
      side: requested.side,
    };
    return {
      align: requested.align,
      alignOffset:
        typeof requested.alignOffset === "function"
          ? requested.alignOffset(offsetData)
          : requested.alignOffset,
      side: requested.side,
      sideOffset:
        typeof requested.sideOffset === "function"
          ? requested.sideOffset(offsetData)
          : requested.sideOffset,
    };
  };

  createEffect(() => context.configurePosition(resolvedPosition()));
  createEffect(() => {
    const element = positioner();
    if (!element) return;
    const open = context.open();
    element.inert = !open;
    element.toggleAttribute("data-open", open);
    element.toggleAttribute("data-closed", !open);
    element.setAttribute("data-side", side());
    element.setAttribute("data-align", align());
  });

  onCleanup(() => {
    if (measurementAnimationFrame !== undefined) {
      cancelAnimationFrame(measurementAnimationFrame);
    }
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
  });

  const setContentRef = (element: HTMLElement) => {
    context.setContent(element);
    primitiveContext.setContentRef(element);
    setElementRef(local.ref, element);
    queueMicrotask(() => configurePositioner(element));
  };

  const configurePositioner = (element: HTMLElement) => {
    const positionerElement = element.parentElement;
    if (!positionerElement) return;
    setPositioner(positionerElement);

    positionerElement.classList.add("isolate", "z-50");
    positionerElement.setAttribute("role", "presentation");
    positionerElement.style.setProperty(
      "--transform-origin",
      "var(--kb-popper-content-transform-origin)",
    );
    positionerElement.style.setProperty(
      "--available-height",
      "var(--kb-popper-content-available-height)",
    );
    positionerElement.style.setProperty(
      "--available-width",
      "var(--kb-popper-content-available-width)",
    );
    positionerElement.style.setProperty("--anchor-width", "var(--kb-popper-anchor-width)");

    const updatePlacement = () => {
      positionerElement.toggleAttribute(
        "data-anchor-hidden",
        positionerElement.style.visibility === "hidden",
      );
      const nextPlacement = placementFromTransformOrigin(
        positionerElement.style.getPropertyValue("--kb-popper-content-transform-origin"),
      );
      if (nextPlacement) context.recordPlacement(nextPlacement);
    };
    mutationObserver = new MutationObserver(updatePlacement);
    mutationObserver.observe(positionerElement, { attributeFilter: ["style"], attributes: true });
    updatePlacement();

    let previousMeasurements:
      | { anchorHeight: number; anchorWidth: number; height: number; width: number }
      | undefined;
    const updateMeasurements = () => {
      const anchorRect = context.trigger()?.getBoundingClientRect();
      const positionerRect = positionerElement.getBoundingClientRect();
      const measurements = {
        anchorHeight: anchorRect?.height ?? 0,
        anchorWidth: anchorRect?.width ?? 0,
        height: positionerRect.height,
        width: positionerRect.width,
      };
      if (
        previousMeasurements?.anchorHeight === measurements.anchorHeight &&
        previousMeasurements.anchorWidth === measurements.anchorWidth &&
        previousMeasurements.height === measurements.height &&
        previousMeasurements.width === measurements.width
      )
        return;
      previousMeasurements = measurements;
      if (anchorRect)
        positionerElement.style.setProperty("--anchor-height", `${anchorRect.height}px`);
      setMeasurementVersion((version) => version + 1);
    };
    updateMeasurements();
    const trigger = context.trigger();
    if (trigger && typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(() => {
        if (measurementAnimationFrame !== undefined) {
          cancelAnimationFrame(measurementAnimationFrame);
        }
        measurementAnimationFrame = requestAnimationFrame(() => {
          measurementAnimationFrame = undefined;
          updateMeasurements();
        });
      });
      resizeObserver.observe(trigger);
      resizeObserver.observe(element);
    }
  };

  const side = () => exposedSide(context.currentPlacement(), requestedPosition().side);
  const align = () => placementParts(context.currentPlacement()).align;
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    context.handle._cancelClosing();
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (context.trigger()?.contains(event.relatedTarget as Node | null)) return;
    const triggerId = context.handle._activeTriggerId();
    if (triggerId) context.handle._scheduleClose(300, event, triggerId);
  };

  return (
    <HoverCardPrimitive.Portal
      ref={(element) => element.setAttribute("data-slot", "hover-card-portal")}
    >
      <PopperPrimitive.Positioner>
        <Dynamic
          component={local.as ?? "div"}
          {...others}
          ref={setContentRef}
          data-align={align()}
          data-base-ui-focusable=""
          data-closed={context.open() ? undefined : ""}
          data-ending-style={context.transitionStatus() === "ending" ? "" : undefined}
          data-open={context.open() ? "" : undefined}
          data-side={side()}
          data-slot="hover-card-content"
          data-starting-style={context.transitionStatus() === "starting" ? "" : undefined}
          tabIndex={-1}
          class={cn(
            "z-50 z-hover-card-content z-hover-card-content-logical origin-(--transform-origin) outline-hidden",
            local.class,
          )}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        >
          {local.children}
        </Dynamic>
      </PopperPrimitive.Positioner>
    </HoverCardPrimitive.Portal>
  );
};

export type {
  HoverCardActions,
  HoverCardAlign,
  HoverCardChangeEventDetails,
  HoverCardChangeEventReason,
  HoverCardContentProps,
  HoverCardHandle,
  HoverCardOffset,
  HoverCardOffsetData,
  HoverCardPayloadChildRenderFunction,
  HoverCardProps,
  HoverCardSide,
  HoverCardTriggerProps,
};
export { createHoverCardHandle, HoverCard, HoverCardContent, HoverCardTrigger };
