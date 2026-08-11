import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  children as resolveChildren,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";

type TooltipSide = "bottom" | "inline-end" | "inline-start" | "left" | "right" | "top";
type TooltipPhysicalSide = Exclude<TooltipSide, "inline-end" | "inline-start">;
type TooltipAlign = "center" | "end" | "start";
type TooltipPlacement = NonNullable<TooltipPrimitive.TooltipRootProps["placement"]>;
type TooltipInstant = "delay" | "dismiss" | "focus" | undefined;
type TooltipTransitionStatus = "ending" | "starting" | undefined;

type TooltipOffsetData = {
  align: TooltipAlign;
  anchor: { height: number; width: number };
  positioner: { height: number; width: number };
  side: TooltipSide;
};

type TooltipOffset = number | ((data: TooltipOffsetData) => number);

type TooltipPosition = {
  align: TooltipAlign;
  alignOffset: TooltipOffset;
  side: TooltipSide;
  sideOffset: TooltipOffset;
};

type ResolvedTooltipPosition = Omit<TooltipPosition, "alignOffset" | "sideOffset"> & {
  alignOffset: number;
  sideOffset: number;
};

type TooltipChangeReason =
  | "disabled"
  | "escape-key"
  | "imperative-action"
  | "none"
  | "outside-press"
  | "trigger-focus"
  | "trigger-hover"
  | "trigger-press";

type TooltipChange = {
  event: Event;
  reason: TooltipChangeReason;
  trigger?: Element;
  triggerId?: string | null;
};

type TooltipChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  reason: TooltipChangeReason;
  trigger: Element | undefined;
};

function createChangeDetails(
  change: TooltipChange,
  preventUnmountOnClose: () => void,
): TooltipChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: change.event,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    preventUnmountOnClose,
    reason: change.reason,
    trigger: change.trigger,
  };
}

function baseEvent() {
  return new Event("base-ui");
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

function physicalSide(side: TooltipSide): TooltipPhysicalSide {
  // Direction and RTL are intentionally outside this release-sync campaign. Keep logical sides
  // useful for the supported LTR surface while Kobalte consumes physical placements.
  if (side === "inline-start") return "left";
  if (side === "inline-end") return "right";
  return side;
}

function toKobaltePlacement(position: Pick<TooltipPosition, "align" | "side">): TooltipPlacement {
  const side = physicalSide(position.side);
  return (position.align === "center" ? side : `${side}-${position.align}`) as TooltipPlacement;
}

function placementParts(placement: string) {
  const [side, align = "center"] = placement.split("-") as [TooltipPhysicalSide, TooltipAlign?];
  return { align, side };
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      queueMicrotask(resolve);
    }
  });
}

type TooltipTriggerRegistration<Payload> = {
  closeDelay: () => number;
  element: HTMLElement;
  payload: () => Payload | undefined;
};

type TooltipHandleRequest = (
  open: boolean,
  reason: TooltipChangeReason,
  event: Event,
  triggerId: string | null,
) => boolean;

class TooltipHandle<Payload = unknown> {
  readonly #openState = createSignal(false);
  readonly #activeTriggerIdState = createSignal<string | null>(null);
  readonly #contentIdState = createSignal<string>();
  readonly #contentState = createSignal<HTMLElement>();
  readonly #disabledState = createSignal(false);
  readonly #pointerState = createSignal<{ x: number; y: number }>();
  readonly #triggerVersionState = createSignal(0);
  readonly #triggers = new Map<string, TooltipTriggerRegistration<Payload>>();
  #pendingChange: TooltipChange | undefined;
  #request: TooltipHandleRequest | undefined;
  #openTimer: number | undefined;
  #closeTimer: number | undefined;

  get isOpen() {
    return this.#openState[0]();
  }

  open(triggerId: string) {
    if (!this.#triggers.has(triggerId)) {
      throw new Error(`TooltipHandle.open: No trigger found with id "${triggerId}".`);
    }
    this._requestOpen(true, "imperative-action", baseEvent(), triggerId);
  }

  close() {
    this._requestOpen(false, "imperative-action", baseEvent(), this._activeTriggerId());
  }

  _activeCloseDelay(fallback: number) {
    const triggerId = this._activeTriggerId();
    return triggerId ? (this.#triggers.get(triggerId)?.closeDelay() ?? fallback) : fallback;
  }

  _activeTriggerId() {
    return this.#activeTriggerIdState[0]();
  }

  _bindRequest(request: TooltipHandleRequest) {
    this.#request = request;
    return () => {
      if (this.#request === request) this.#request = undefined;
    };
  }

  _cancelClosing() {
    if (typeof window !== "undefined") window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  }

  _cancelOpening() {
    if (typeof window !== "undefined") window.clearTimeout(this.#openTimer);
    this.#openTimer = undefined;
  }

  _clearChange() {
    this.#pendingChange = undefined;
  }

  _commit(open: boolean, triggerId: string | null) {
    if (open) this._activate(triggerId);
    this.#openState[1](open);
  }

  _activate(triggerId: string | null) {
    this.#activeTriggerIdState[1](triggerId);
  }

  _contentContains(target: EventTarget | null) {
    return target instanceof Node && this.#contentState[0]()?.contains(target);
  }

  _contentId() {
    return this.#contentIdState[0]();
  }

  _initialize(open: boolean, triggerId: string | null) {
    if (this.#openState[0]() === open && (!open || this._activeTriggerId() === triggerId)) return;
    this._commit(open, triggerId);
  }

  _isDisabled() {
    return this.#disabledState[0]();
  }

  _isOpenedBy(triggerId: string) {
    return this.isOpen && this._activeTriggerId() === triggerId;
  }

  _implicitTriggerId(triggerId: string | null) {
    if (triggerId && this.#triggers.has(triggerId)) return triggerId;
    if (this.#triggers.size !== 1) return null;
    return this.#triggers.keys().next().value ?? null;
  }

  _payload() {
    this.#triggerVersionState[0]();
    const triggerId = this._activeTriggerId();
    return triggerId ? this.#triggers.get(triggerId)?.payload() : undefined;
  }

  _payloadFor(triggerId: string | null | undefined) {
    this.#triggerVersionState[0]();
    return triggerId ? this.#triggers.get(triggerId)?.payload() : undefined;
  }

  _pointer() {
    return this.#pointerState[0]();
  }

  _recordChange(change: TooltipChange) {
    this.#pendingChange = change;
  }

  _takeChange() {
    const change = this.#pendingChange;
    this.#pendingChange = undefined;
    return change;
  }

  _recordPointer(event: PointerEvent) {
    this.#pointerState[1]({ x: event.clientX, y: event.clientY });
  }

  _register(triggerId: string, registration: TooltipTriggerRegistration<Payload>) {
    this.#triggers.set(triggerId, registration);
    this.#triggerVersionState[1]((version) => version + 1);
    if (this._activeTriggerId() === null && this.isOpen) this._activate(triggerId);
    return () => {
      if (this.#triggers.get(triggerId) !== registration) return;
      this.#triggers.delete(triggerId);
      this.#triggerVersionState[1]((version) => version + 1);
      if (this._activeTriggerId() === triggerId && this.isOpen) {
        queueMicrotask(() => {
          if (
            this.isOpen &&
            this._activeTriggerId() === triggerId &&
            !this.#triggers.has(triggerId)
          ) {
            this._requestOpen(false, "none", baseEvent(), triggerId);
          }
        });
      }
    };
  }

  _requestOpen(open: boolean, reason: TooltipChangeReason, event: Event, triggerId: string | null) {
    this._cancelOpening();
    this._cancelClosing();
    this.#pendingChange = undefined;
    if (open && triggerId && !this.#triggers.has(triggerId)) return false;
    if (this.#request) return this.#request(open, reason, event, triggerId);
    this._commit(open, triggerId);
    return true;
  }

  _scheduleClose(delay: number, event: Event, triggerId: string) {
    this._cancelClosing();
    if (typeof window === "undefined") return;
    this.#closeTimer = window.setTimeout(() => {
      this.#closeTimer = undefined;
      this._requestOpen(false, "trigger-hover", event, triggerId);
    }, delay);
  }

  _scheduleOpen(delay: number, reason: TooltipChangeReason, event: Event, triggerId: string) {
    this._cancelOpening();
    this._cancelClosing();
    if (delay <= 0) {
      this._requestOpen(true, reason, event, triggerId);
      return;
    }
    if (typeof window === "undefined") return;
    this.#openTimer = window.setTimeout(() => {
      this.#openTimer = undefined;
      this._requestOpen(true, reason, event, triggerId);
    }, delay);
  }

  _setContent(element: HTMLElement | undefined) {
    this.#contentState[1](element);
    this.#contentIdState[1](element?.id);
  }

  _setDisabled(disabled: boolean) {
    this.#disabledState[1](disabled);
  }

  _trigger(triggerId = this._activeTriggerId()) {
    this.#triggerVersionState[0]();
    return triggerId ? this.#triggers.get(triggerId)?.element : undefined;
  }
}

function createTooltipHandle<Payload = unknown>() {
  return new TooltipHandle<Payload>();
}

type TooltipProviderContextValue = {
  activate: (handle: TooltipHandle<unknown>) => boolean;
  closeDelay: () => number | undefined;
  deactivate: (handle: TooltipHandle<unknown>) => void;
  delay: () => number | undefined;
  isInstant: () => boolean;
};

const TooltipProviderContext = createContext<TooltipProviderContextValue>();

type TooltipProviderProps = {
  children?: JSX.Element;
  closeDelay?: number;
  delay?: number;
  timeout?: number;
};

const TooltipProvider = (props: TooltipProviderProps) => {
  const mergedProps = mergeProps({ delay: 0, timeout: 400 }, props);
  const [instant, setInstant] = createSignal(false);
  let activeHandle: TooltipHandle<unknown> | undefined;
  let cooldownTimer: number | undefined;
  const context: TooltipProviderContextValue = {
    activate: (handle) => {
      const shouldOpenInstantly = instant();
      if (activeHandle && activeHandle !== handle) {
        activeHandle._requestOpen(false, "none", baseEvent(), activeHandle._activeTriggerId());
      }
      if (typeof window !== "undefined") window.clearTimeout(cooldownTimer);
      cooldownTimer = undefined;
      activeHandle = handle;
      setInstant(true);
      return shouldOpenInstantly;
    },
    closeDelay: () => mergedProps.closeDelay,
    deactivate: (handle) => {
      if (activeHandle !== handle) return;
      activeHandle = undefined;
      if (typeof window === "undefined") {
        setInstant(false);
        return;
      }
      window.clearTimeout(cooldownTimer);
      cooldownTimer = window.setTimeout(() => {
        cooldownTimer = undefined;
        setInstant(false);
      }, mergedProps.timeout);
    },
    delay: () => mergedProps.delay,
    isInstant: instant,
  };

  onCleanup(() => {
    if (typeof window !== "undefined") window.clearTimeout(cooldownTimer);
  });

  return (
    <TooltipProviderContext.Provider value={context}>
      {mergedProps.children}
    </TooltipProviderContext.Provider>
  );
};

type TooltipContextValue<Payload = unknown> = {
  anchorRect: () => { height?: number; width?: number; x?: number; y?: number } | undefined;
  anchorHidden: () => boolean;
  closeDelay: () => number;
  configurePosition: (position: ResolvedTooltipPosition) => void;
  currentPlacement: () => TooltipPlacement;
  defaultPosition: ResolvedTooltipPosition;
  delay: () => number;
  disableHoverablePopup: () => boolean;
  disabled: () => boolean;
  forceUnmounted: () => boolean;
  handle: TooltipHandle<Payload>;
  hoverInteractionDisabled: () => boolean;
  instant: () => TooltipInstant;
  isOpen: () => boolean;
  recordChange: (change: TooltipChange) => void;
  setAnchorHidden: (hidden: boolean) => void;
  setContent: (element: HTMLElement | undefined) => void;
  transitionStatus: () => TooltipTransitionStatus;
  trackCursorAxis: () => "both" | "none" | "x" | "y";
  trigger: () => HTMLElement | undefined;
  triggerOnFocusOnly: () => boolean;
};

const TooltipContext = createContext<TooltipContextValue>();

function useTooltipContext() {
  const context = useContext(TooltipContext);
  if (!context) throw new Error("Tooltip components must be used within Tooltip");
  return context;
}

type TooltipActions = {
  close: () => void;
  unmount: () => void;
};

type TooltipPayloadChildRenderFunction<Payload> = (props: {
  payload: Payload | undefined;
}) => JSX.Element;

type TooltipProps<Payload = unknown> = Omit<
  TooltipPrimitive.TooltipRootProps,
  "children" | "onOpenChange"
> & {
  actionsRef?: { current: TooltipActions | null };
  children?: JSX.Element | TooltipPayloadChildRenderFunction<Payload>;
  defaultTriggerId?: string | null;
  disableHoverablePopup?: boolean;
  handle?: TooltipHandle<Payload>;
  onOpenChange?: (open: boolean, details: TooltipChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  trackCursorAxis?: "both" | "none" | "x" | "y";
  triggerId?: string | null;
};

type TooltipHandleAnchorProps = {
  anchor: () => HTMLElement | undefined;
  ref?: HTMLElement | ((element: HTMLElement) => void);
};

const TooltipHandleAnchor = (props: TooltipHandleAnchorProps) => {
  createEffect(() => {
    const anchor = props.anchor();
    if (anchor) setElementRef(props.ref, anchor);
  });
  return null;
};

type TooltipRenderedChildrenProps<Payload> = {
  getChildren: () => JSX.Element | TooltipPayloadChildRenderFunction<Payload> | undefined;
  payload: () => Payload | undefined;
};

const TooltipRenderedChildren = <Payload,>(props: TooltipRenderedChildrenProps<Payload>) => {
  type ChildBox = { child: JSX.Element | TooltipPayloadChildRenderFunction<Payload> | undefined };
  const resolved = resolveChildren(
    () => ({ child: props.getChildren() }) as unknown as JSX.Element,
  );
  const rendered = createMemo(() => {
    const child = (resolved() as unknown as ChildBox).child;
    return typeof child === "function" ? child({ payload: props.payload() }) : child;
  });
  return <>{rendered()}</>;
};

const Tooltip = <Payload,>(props: TooltipProps<Payload>) => {
  const provider = useContext(TooltipProviderContext);
  const [local, others] = splitProps(props, [
    "actionsRef",
    "arrowPadding",
    "children",
    "closeDelay",
    "defaultOpen",
    "defaultTriggerId",
    "disabled",
    "disableHoverablePopup",
    "forceMount",
    "getAnchorRect",
    "gutter",
    "handle",
    "hideWhenDetached",
    "ignoreSafeArea",
    "onCurrentPlacementChange",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "openDelay",
    "overflowPadding",
    "placement",
    "shift",
    "skipDelayDuration",
    "trackCursorAxis",
    "triggerId",
    "triggerOnFocusOnly",
  ]);
  const defaultPlacement = createMemo(() => placementParts(local.placement ?? "top"));
  const defaultPosition: ResolvedTooltipPosition = {
    get align() {
      return defaultPlacement().align;
    },
    get alignOffset() {
      return local.shift ?? 0;
    },
    get side() {
      return defaultPlacement().side;
    },
    get sideOffset() {
      return local.gutter ?? 4;
    },
  };
  const [position, setPosition] = createSignal<ResolvedTooltipPosition>({
    align: defaultPosition.align,
    alignOffset: defaultPosition.alignOffset,
    side: defaultPosition.side,
    sideOffset: defaultPosition.sideOffset,
  });
  const [currentPlacement, setCurrentPlacement] = createSignal(toKobaltePlacement(defaultPosition));
  const [content, setContent] = createSignal<HTMLElement>();
  const [anchorHidden, setAnchorHidden] = createSignal(false);
  const [forceUnmounted, setForceUnmounted] = createSignal(false);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [instant, setInstant] = createSignal<TooltipInstant>();
  const [transitionStatus, setTransitionStatus] = createSignal<TooltipTransitionStatus>();
  const handle = local.handle ?? createTooltipHandle<Payload>();
  if (local.open === undefined && local.defaultOpen && !handle.isOpen) {
    handle._initialize(true, local.defaultTriggerId ?? null);
  }
  const activeTriggerId = () =>
    local.triggerId !== undefined ? local.triggerId : handle._activeTriggerId();
  const trigger = () => handle._trigger(activeTriggerId());
  const requestedOpen = () => local.open ?? handle.isOpen;
  const open = () => !forceUnmounted() && !(local.disabled ?? false) && requestedOpen();
  const hoverInteractionDisabled = () =>
    (local.disableHoverablePopup ?? false) || local.trackCursorAxis === "both";
  const payload = () =>
    local.triggerId !== undefined ? handle._payloadFor(local.triggerId) : handle._payload();
  let requestedPlacement = toKobaltePlacement(defaultPosition);
  let completionVersion = 0;
  let previousOpen = open();
  let completeInitialOpen = previousOpen;
  let previousRequestedOpen = requestedOpen();
  let previousControlledOpen = local.open;

  const requestOpenChange = (
    nextOpen: boolean,
    reason: TooltipChangeReason,
    event: Event,
    triggerId: string | null,
  ) => {
    if (nextOpen && (local.disabled ?? false)) return false;
    const switchesTrigger = nextOpen && triggerId !== null && triggerId !== activeTriggerId();
    if (nextOpen === requestedOpen() && !switchesTrigger) return false;
    let shouldPreventUnmount = false;
    const changeTrigger = handle._trigger(triggerId);
    const reportsTrigger =
      nextOpen ||
      reason === "trigger-focus" ||
      reason === "trigger-hover" ||
      reason === "trigger-press";
    const details = createChangeDetails(
      { event, reason, trigger: reportsTrigger ? changeTrigger : undefined, triggerId },
      () => {
        if (!nextOpen) shouldPreventUnmount = true;
      },
    );
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return false;
    if (nextOpen) {
      setForceUnmounted(false);
      setPreventedUnmount(false);
      const providerInstant = provider?.activate(handle as TooltipHandle<unknown>) ?? false;
      setInstant(reason === "trigger-focus" ? "focus" : providerInstant ? "delay" : undefined);
    } else {
      if (shouldPreventUnmount) setPreventedUnmount(true);
      provider?.deactivate(handle as TooltipHandle<unknown>);
      if (reason === "none") setInstant("delay");
      else if (reason === "escape-key" || reason === "trigger-press") setInstant("dismiss");
      else if (reason === "trigger-hover") setInstant(undefined);
    }
    if (local.open === undefined) {
      handle._commit(nextOpen, triggerId);
    } else if (nextOpen && local.triggerId === undefined) {
      handle._activate(triggerId);
    }
    return true;
  };

  const cancelHandleBinding = handle._bindRequest(requestOpenChange);
  onCleanup(cancelHandleBinding);

  createEffect(() => {
    const isDisabled = local.disabled ?? false;
    handle._setDisabled(isDisabled);
    if (isDisabled && requestedOpen()) {
      requestOpenChange(false, "disabled", baseEvent(), activeTriggerId());
    }
  });

  createEffect(() => {
    const nextRequestedOpen = requestedOpen();
    if (nextRequestedOpen && !previousRequestedOpen) setForceUnmounted(false);
    previousRequestedOpen = nextRequestedOpen;
  });

  createEffect(() => {
    const controlledOpen = local.open;
    if (controlledOpen === undefined) return;
    if (controlledOpen && previousControlledOpen === false) setForceUnmounted(false);
    previousControlledOpen = controlledOpen;
    const triggerId =
      local.triggerId !== undefined
        ? local.triggerId
        : controlledOpen
          ? handle._implicitTriggerId(handle._activeTriggerId())
          : handle._activeTriggerId();
    handle._initialize(
      controlledOpen && !(local.disabled ?? false) && !forceUnmounted(),
      triggerId,
    );
  });

  createEffect(() => {
    const nextOpen = open();
    if (nextOpen === previousOpen && !completeInitialOpen) return;
    const wasOpen = previousOpen;
    previousOpen = nextOpen;
    completeInitialOpen = false;
    setTransitionStatus(nextOpen ? "starting" : "ending");
    const version = ++completionVersion;
    void (async () => {
      await nextAnimationFrame();
      const element = content();
      if (element?.isConnected && typeof getComputedStyle === "function") {
        void getComputedStyle(element).animationName;
      }
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      if (version !== completionVersion) return;
      setTransitionStatus(undefined);
      if (!nextOpen && preventedUnmount()) {
        setInstant(undefined);
        return;
      }
      if (!nextOpen && !preventedUnmount() && !(local.forceMount ?? false)) setContent(undefined);
      if (!nextOpen) handle._activate(null);
      setInstant(undefined);
      if (wasOpen !== nextOpen || nextOpen) local.onOpenChangeComplete?.(nextOpen);
    })();
  });

  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const close = () =>
      handle._requestOpen(false, "imperative-action", baseEvent(), activeTriggerId());
    const actions: TooltipActions = {
      close,
      unmount: () => {
        completionVersion += 1;
        setPreventedUnmount(false);
        setForceUnmounted(true);
        setTransitionStatus(undefined);
        setContent(undefined);
        handle._commit(false, activeTriggerId());
        handle._activate(null);
        provider?.deactivate(handle as TooltipHandle<unknown>);
        local.onOpenChangeComplete?.(false);
      },
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  onCleanup(() => {
    completionVersion += 1;
    handle._setContent(undefined);
    handle._setDisabled(false);
    provider?.deactivate(handle as TooltipHandle<unknown>);
  });

  const trackedAnchorRect = () => {
    const axis = local.trackCursorAxis ?? "none";
    const point = axis === "none" ? undefined : handle._pointer();
    return (anchor?: HTMLElement) => {
      const source = local.getAnchorRect?.(anchor) ?? anchor?.getBoundingClientRect();
      if (!source || !point) return source;
      const x = source.x ?? 0;
      const y = source.y ?? 0;
      const width = source.width ?? 0;
      const height = source.height ?? 0;
      return {
        x: axis === "x" || axis === "both" ? point.x : x,
        y: axis === "y" || axis === "both" ? point.y : y,
        width: axis === "x" || axis === "both" ? 0 : width,
        height: axis === "y" || axis === "both" ? 0 : height,
      };
    };
  };

  const context: TooltipContextValue<Payload> = {
    anchorRect: () => trackedAnchorRect()(trigger()),
    anchorHidden,
    closeDelay: () => local.closeDelay ?? provider?.closeDelay() ?? 0,
    configurePosition: (nextPosition) => {
      const nextPlacement = toKobaltePlacement(nextPosition);
      setPosition(nextPosition);
      if (nextPlacement !== requestedPlacement) {
        requestedPlacement = nextPlacement;
        setCurrentPlacement(nextPlacement);
      }
    },
    currentPlacement,
    defaultPosition,
    delay: () => local.openDelay ?? provider?.delay() ?? 600,
    disableHoverablePopup: () => local.disableHoverablePopup ?? false,
    disabled: () => local.disabled ?? false,
    forceUnmounted,
    handle,
    hoverInteractionDisabled,
    instant,
    isOpen: open,
    recordChange: (change) => {
      handle._recordChange(change);
    },
    setAnchorHidden,
    setContent: (element) => {
      setContent(element);
      handle._setContent(element);
    },
    transitionStatus,
    trackCursorAxis: () => local.trackCursorAxis ?? "none",
    trigger,
    triggerOnFocusOnly: () => local.triggerOnFocusOnly ?? false,
  };

  return (
    <TooltipContext.Provider value={context as TooltipContextValue}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        open={open()}
        defaultOpen={undefined}
        disabled={local.disabled}
        forceMount={(local.forceMount ?? false) || preventedUnmount()}
        getAnchorRect={trackedAnchorRect()}
        openDelay={local.openDelay ?? 0}
        closeDelay={handle._activeCloseDelay(provider?.closeDelay() ?? 0)}
        skipDelayDuration={local.skipDelayDuration ?? -1}
        placement={toKobaltePlacement(position())}
        gutter={position().sideOffset}
        shift={position().alignOffset}
        arrowPadding={local.arrowPadding ?? 5}
        overflowPadding={local.overflowPadding ?? 5}
        hideWhenDetached={local.hideWhenDetached ?? true}
        ignoreSafeArea={hoverInteractionDisabled() || (local.ignoreSafeArea ?? false)}
        triggerOnFocusOnly={local.triggerOnFocusOnly}
        onCurrentPlacementChange={(placement) => {
          setCurrentPlacement(placement);
          local.onCurrentPlacementChange?.(placement);
        }}
        onOpenChange={(nextOpen) => {
          const change = handle._takeChange() ?? {
            event: baseEvent(),
            reason: "none" as const,
            triggerId: activeTriggerId(),
          };
          requestOpenChange(nextOpen, change.reason, change.event, change.triggerId ?? null);
        }}
        {...others}
      >
        <TooltipPrimitive.Trigger as={TooltipHandleAnchor} anchor={trigger} />
        <TooltipRenderedChildren getChildren={() => local.children} payload={payload} />
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  );
};

type TooltipTriggerProps<T extends ValidComponent = "button", Payload = unknown> = PolymorphicProps<
  T,
  {
    closeDelay?: number;
    closeOnClick?: boolean;
    delay?: number;
    disabled?: boolean;
    handle?: TooltipHandle<Payload>;
    payload?: Payload;
  }
> &
  Partial<Pick<ComponentProps<T>, "class" | "children">>;

const TooltipTrigger = <T extends ValidComponent = "button", Payload = unknown>(
  props: TooltipTriggerProps<T, Payload>,
) => {
  const rootContext = useContext(TooltipContext) as TooltipContextValue<Payload> | undefined;
  const provider = useContext(TooltipProviderContext);
  const handle = props.handle ?? rootContext?.handle;
  if (!handle) {
    throw new Error("TooltipTrigger must be used within Tooltip or provided with a handle");
  }
  const mergedProps = mergeProps({ closeOnClick: true }, props);
  const [local, others] = splitProps(mergedProps as TooltipTriggerProps<ValidComponent, Payload>, [
    "as",
    "closeDelay",
    "closeOnClick",
    "delay",
    "disabled",
    "handle",
    "id",
    "onBlur",
    "onClick",
    "onFocus",
    "onPointerDown",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerMove",
    "payload",
    "ref",
  ]);
  const generatedId = `tooltip-trigger-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const [element, setElement] = createSignal<HTMLElement>();
  let pointerDown = false;

  createEffect(() => {
    const triggerElement = element();
    if (triggerElement && !handle._isOpenedBy(id())) {
      triggerElement.removeAttribute("aria-describedby");
    }
  });

  createEffect(() => {
    const triggerElement = element();
    if (!triggerElement) return;
    const unregister = handle._register(id(), {
      closeDelay: () =>
        local.closeDelay ?? rootContext?.closeDelay() ?? provider?.closeDelay() ?? 0,
      element: triggerElement,
      payload: () => local.payload,
    });
    onCleanup(unregister);
  });

  const disabled = () =>
    local.disabled ??
    (handle === rootContext?.handle ? rootContext.disabled() : handle._isDisabled());
  const openDelay = () =>
    provider?.isInstant() ? 0 : (local.delay ?? rootContext?.delay() ?? provider?.delay() ?? 600);
  const onPointerUp = () => {
    pointerDown = false;
  };

  onCleanup(() => {
    handle._cancelOpening();
    if (typeof document !== "undefined") document.removeEventListener("pointerup", onPointerUp);
  });

  return (
    <Dynamic
      component={local.as ?? "button"}
      {...others}
      id={id()}
      ref={(triggerElement: HTMLElement) => {
        setElement(triggerElement);
        setElementRef(local.ref, triggerElement);
      }}
      data-popup-open={handle._isOpenedBy(id()) ? "" : undefined}
      data-trigger-disabled={disabled() ? "" : undefined}
      data-slot="tooltip-trigger"
      onPointerEnter={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        handle._recordPointer(event);
        handle._clearChange();
        if (
          event.defaultPrevented ||
          event.pointerType === "touch" ||
          disabled() ||
          rootContext?.triggerOnFocusOnly()
        )
          return;
        handle._cancelClosing();
        handle._scheduleOpen(openDelay(), "trigger-hover", event, id());
      }}
      onPointerMove={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        handle._recordPointer(event);
      }}
      onPointerLeave={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || event.pointerType === "touch") return;
        if (!handle.isOpen) {
          handle._cancelOpening();
        } else if (!handle._contentContains(event.relatedTarget)) {
          handle._recordChange({ event, reason: "trigger-hover", triggerId: id() });
          if (rootContext?.hoverInteractionDisabled() ?? false) {
            handle._scheduleClose(
              local.closeDelay ?? rootContext?.closeDelay() ?? provider?.closeDelay() ?? 0,
              event,
              id(),
            );
          }
        }
      }}
      onPointerDown={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || disabled()) return;
        pointerDown = true;
        if (typeof document !== "undefined") {
          document.addEventListener("pointerup", onPointerUp, { once: true });
        }
      }}
      onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || pointerDown || disabled()) return;
        handle._clearChange();
        handle._scheduleOpen(0, "trigger-focus", event, id());
      }}
      onBlur={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
          event,
        );
        if (handle._contentContains(event.relatedTarget)) return;
        handle._requestOpen(false, "trigger-focus", event, id());
      }}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || disabled()) return;
        if (local.closeOnClick) {
          handle._cancelOpening();
          if (handle.isOpen) handle._requestOpen(false, "trigger-press", event, id());
        }
      }}
    />
  );
};

type TooltipContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TooltipPrimitive.TooltipContentProps<T>
> &
  Partial<Pick<ComponentProps<T>, "class" | "children">> &
  Partial<TooltipPosition>;

const TooltipContent = <T extends ValidComponent = "div">(props: TooltipContentProps<T>) => {
  const context = useTooltipContext();
  const [local, others] = splitProps(props as TooltipContentProps, [
    "align",
    "alignOffset",
    "children",
    "class",
    "onEscapeKeyDown",
    "onPointerDownOutside",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
    "side",
    "sideOffset",
  ]);
  const [positioner, setPositioner] = createSignal<HTMLElement>();
  const [arrow, setArrow] = createSignal<HTMLElement>();
  const [arrowPositionVersion, setArrowPositionVersion] = createSignal(0);
  const [measurementVersion, setMeasurementVersion] = createSignal(0);
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let previousMeasurements:
    | { anchorHeight: number; anchorWidth: number; height: number; width: number }
    | undefined;
  let contentElement: HTMLElement | undefined;

  const requestedPosition = (): TooltipPosition => ({
    align: local.align ?? context.defaultPosition.align,
    alignOffset: local.alignOffset ?? context.defaultPosition.alignOffset,
    side: local.side ?? context.defaultPosition.side,
    sideOffset: local.sideOffset ?? context.defaultPosition.sideOffset,
  });

  const resolvedPosition = (): ResolvedTooltipPosition => {
    measurementVersion();
    const requested = requestedPosition();
    const current = placementParts(context.currentPlacement());
    const anchorRect = context.anchorRect();
    const positionerRect = positioner()?.getBoundingClientRect();
    const offsetData: TooltipOffsetData = {
      align: current.align,
      anchor: { height: anchorRect?.height ?? 0, width: anchorRect?.width ?? 0 },
      positioner: {
        height: positionerRect?.height ?? 0,
        width: positionerRect?.width ?? 0,
      },
      side: current.side,
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
    const current = placementParts(context.currentPlacement());
    element.toggleAttribute("data-open", context.isOpen());
    element.toggleAttribute("data-closed", !context.isOpen());
    element.toggleAttribute("data-anchor-hidden", context.anchorHidden());
    element.setAttribute("data-side", current.side);
    element.setAttribute("data-align", current.align);
    const positionerInstant =
      context.trackCursorAxis() === "none" ? context.instant() : "tracking-cursor";
    if (positionerInstant) element.setAttribute("data-instant", positionerInstant);
    else element.removeAttribute("data-instant");
    const inert = !context.isOpen() || context.hoverInteractionDisabled();
    element.inert = inert;
    element.style.pointerEvents = inert ? "none" : "";
  });

  const updateMeasurements = () => {
    const positionerElement = positioner();
    const anchorRect = context.anchorRect();
    if (!positionerElement) return;
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
      positionerElement.style.setProperty("--anchor-height", `${anchorRect.height ?? 0}px`);
    setMeasurementVersion((version) => version + 1);
  };

  const setContentRef = (element: HTMLElement) => {
    contentElement = element;
    context.setContent(element);
    queueMicrotask(() => {
      if (contentElement !== element || !context.isOpen() || !element.id) return;
      context.trigger()?.setAttribute("aria-describedby", element.id);
    });
    setElementRef(local.ref, element);
    const positionerElement = element.parentElement;
    if (!positionerElement) return;
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    previousMeasurements = undefined;
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
    const updatePositionerState = () => {
      context.setAnchorHidden(positionerElement.style.visibility === "hidden");
    };
    mutationObserver = new MutationObserver(updatePositionerState);
    mutationObserver.observe(positionerElement, {
      attributeFilter: ["style"],
      attributes: true,
    });
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(updateMeasurements);
      resizeObserver.observe(positionerElement);
      const anchor = context.trigger();
      if (anchor) resizeObserver.observe(anchor);
    }
    updatePositionerState();
    updateMeasurements();
  };

  createEffect(updateMeasurements);

  createEffect(() => {
    const arrowElement = arrow();
    if (!arrowElement) return;
    const observer = new MutationObserver(() => {
      setArrowPositionVersion((version) => version + 1);
    });
    observer.observe(arrowElement, { attributeFilter: ["style"], attributes: true });
    onCleanup(() => observer.disconnect());
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    const trigger = context.trigger();
    if (
      trigger &&
      contentElement &&
      trigger.getAttribute("aria-describedby") === contentElement.id
    ) {
      trigger.removeAttribute("aria-describedby");
    }
    context.setContent(undefined);
    setPositioner(undefined);
  });

  const currentPosition = () => placementParts(context.currentPlacement());
  const arrowUncentered = () => {
    arrowPositionVersion();
    measurementVersion();
    const arrowElement = arrow();
    const positionerElement = positioner();
    const anchorRect = context.anchorRect();
    if (!arrowElement || !positionerElement || !anchorRect) return false;
    const side = currentPosition().side;
    const positionerRect = positionerElement.getBoundingClientRect();
    const isVerticalSide = side === "top" || side === "bottom";
    const arrowOffset = Number.parseFloat(
      isVerticalSide ? arrowElement.style.left : arrowElement.style.top,
    );
    if (!Number.isFinite(arrowOffset)) return false;
    const expected = isVerticalSide
      ? (anchorRect.x ?? 0) + (anchorRect.width ?? 0) / 2 - positionerRect.left
      : (anchorRect.y ?? 0) + (anchorRect.height ?? 0) / 2 - positionerRect.top;
    const actual =
      arrowOffset + (isVerticalSide ? arrowElement.offsetWidth : arrowElement.offsetHeight) / 2;
    return Math.abs(actual - expected) > 1;
  };

  return (
    <Show when={!context.forceUnmounted()}>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          data-base-ui-focusable=""
          data-open={context.isOpen() ? "" : undefined}
          data-ending-style={context.transitionStatus() === "ending" ? "" : undefined}
          data-starting-style={context.transitionStatus() === "starting" ? "" : undefined}
          data-instant={context.instant()}
          data-align={currentPosition().align}
          data-side={currentPosition().side}
          tabIndex={-1}
          ref={setContentRef}
          class={cn(
            "z-50 z-tooltip-content w-fit max-w-xs origin-(--transform-origin) bg-foreground text-background",
            local.class,
          )}
          onEscapeKeyDown={(event) => {
            context.recordChange({
              event,
              reason: "escape-key",
              triggerId: context.handle._activeTriggerId(),
            });
            local.onEscapeKeyDown?.(event);
            if (event.defaultPrevented) context.handle._clearChange();
          }}
          onPointerDownOutside={(event) => {
            context.recordChange({
              event,
              reason: "outside-press",
              triggerId: context.handle._activeTriggerId(),
            });
            local.onPointerDownOutside?.(event);
            if (event.defaultPrevented) context.handle._clearChange();
          }}
          onPointerEnter={(
            event: PointerEvent & { currentTarget: HTMLElement; target: Element },
          ) => {
            callEventHandler(
              local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
              event,
            );
            context.handle._clearChange();
            context.handle._cancelClosing();
          }}
          onPointerLeave={(
            event: PointerEvent & { currentTarget: HTMLElement; target: Element },
          ) => {
            callEventHandler(
              local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
              event,
            );
            if (context.trigger()?.contains(event.relatedTarget as Node | null)) return;
            const triggerId = context.handle._activeTriggerId();
            if (triggerId) {
              context.recordChange({ event, reason: "trigger-hover", triggerId });
              if (context.hoverInteractionDisabled()) {
                context.handle._scheduleClose(
                  context.handle._activeCloseDelay(context.closeDelay()),
                  event,
                  triggerId,
                );
              }
            }
          }}
          {...others}
        >
          {local.children}
          <TooltipPrimitive.Arrow
            size={10}
            ref={(element) => setArrow(element)}
            data-open={context.isOpen() ? "" : undefined}
            data-closed={context.isOpen() ? undefined : ""}
            data-instant={context.instant()}
            data-uncentered={arrowUncentered() ? "" : undefined}
            data-align={currentPosition().align}
            data-side={currentPosition().side}
            class="z-50 z-tooltip-arrow size-2.5 rotate-45 bg-foreground fill-foreground data-[side=bottom]:translate-y-[calc(50%+2px)] data-[side=left]:translate-x-[calc(-50%-2px)] data-[side=right]:translate-x-[calc(50%+2px)] data-[side=top]:translate-y-[calc(-50%-2px)] [&_svg]:hidden"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </Show>
  );
};

export type {
  TooltipActions,
  TooltipAlign,
  TooltipChangeDetails,
  TooltipChangeReason,
  TooltipContentProps,
  TooltipOffset,
  TooltipOffsetData,
  TooltipPayloadChildRenderFunction,
  TooltipProps,
  TooltipProviderProps,
  TooltipSide,
  TooltipTriggerProps,
};
export {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipHandle,
  TooltipProvider,
  TooltipTrigger,
};
