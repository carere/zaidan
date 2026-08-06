/** biome-ignore-all lint/a11y/noAriaHiddenOnFocusable: Base UI focus guards are intentionally hidden tab stops that preserve portal tab order. */
/** biome-ignore-all lint/a11y/noNoninteractiveTabindex: Base UI focus guards require focusable spans to redirect focus without adding interactive semantics. */
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopoverPrimitive from "@kobalte/core/popover";
import { getAllTabbableIn } from "@kobalte/utils";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  children as resolveChildren,
  Show,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";

type PopoverAlign = "center" | "end" | "start";
type PopoverPhysicalSide = "bottom" | "left" | "right" | "top";
type PopoverSide = PopoverPhysicalSide | "inline-end" | "inline-start";
type PopoverPlacement =
  | PopoverPhysicalSide
  | `${PopoverPhysicalSide}-end`
  | `${PopoverPhysicalSide}-start`;
type PopoverInteractionType = "" | "keyboard" | "mouse" | "pen" | "touch";
type PopoverInstantType = "click" | "dismiss" | "focus" | "trigger-change" | undefined;
type PopoverTransitionStatus = "ending" | "starting" | undefined;

type PopoverOffsetData = {
  align: PopoverAlign;
  anchor: { height: number; width: number };
  positioner: { height: number; width: number };
  side: PopoverSide;
};

type PopoverOffset = number | ((data: PopoverOffsetData) => number);

type PopoverPosition = {
  align: PopoverAlign;
  alignOffset: PopoverOffset;
  side: PopoverSide;
  sideOffset: PopoverOffset;
};

type ResolvedPopoverPosition = Omit<PopoverPosition, "alignOffset" | "sideOffset"> & {
  alignOffset: number;
  sideOffset: number;
};

type PopoverChangeEventReason =
  | "close-press"
  | "escape-key"
  | "focus-out"
  | "imperative-action"
  | "none"
  | "outside-press"
  | "trigger-focus"
  | "trigger-hover"
  | "trigger-press";

type PopoverChangeEventMap = {
  "close-press": KeyboardEvent | MouseEvent | PointerEvent;
  "escape-key": KeyboardEvent;
  "focus-out": FocusEvent | KeyboardEvent;
  "imperative-action": Event;
  none: Event;
  "outside-press": MouseEvent | PointerEvent | TouchEvent;
  "trigger-focus": FocusEvent;
  "trigger-hover": MouseEvent;
  "trigger-press": KeyboardEvent | MouseEvent | PointerEvent | TouchEvent;
};

type PopoverChangeEventDetail<Reason extends PopoverChangeEventReason> = {
  allowPropagation: () => void;
  cancel: () => void;
  event: PopoverChangeEventMap[Reason];
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  reason: Reason;
  trigger: Element | undefined;
};

type PopoverChangeEventDetails = {
  [Reason in PopoverChangeEventReason]: PopoverChangeEventDetail<Reason>;
}[PopoverChangeEventReason];

type PopoverPayloadChildRenderFunction<Payload> = (props: {
  payload: Payload | undefined;
}) => JSX.Element;

type PopoverActions = {
  close: () => void;
  unmount: () => void;
};

type PopoverTriggerRegistration<Payload> = {
  closeDelay: () => number;
  element: HTMLElement;
  openOnHover: () => boolean;
  payload: () => Payload | undefined;
};

type PopoverHandleRequest = (
  open: boolean,
  reason: PopoverChangeEventReason,
  event: Event | undefined,
  triggerId: string | null,
) => boolean;

class PopoverHandle<Payload = unknown> {
  readonly #openState = createSignal(false);
  readonly #openReasonState = createSignal<PopoverChangeEventReason>("none");
  readonly #activeTriggerIdState = createSignal<string | null>(null);
  readonly #beforeContentGuardState = createSignal<HTMLElement>();
  readonly #contentIdState = createSignal<string>();
  readonly #mountedState = createSignal(false);
  readonly #triggerVersionState = createSignal(0);
  readonly #triggers = new Map<string, PopoverTriggerRegistration<Payload>>();
  #closeTimer: number | undefined;
  #closeReason: PopoverChangeEventReason = "none";
  #content: HTMLElement | undefined;
  #currentPlacement: PopoverPlacement = "bottom";
  #hoverOpenedAt = 0;
  #interactionType: PopoverInteractionType = "";
  #isComposing = false;
  #outsidePressEligible = false;
  #pendingOutsidePress = false;
  #compositionTimer: number | undefined;
  #request: PopoverHandleRequest | undefined;
  #stopHoverTransit: (() => void) | undefined;

  get isOpen() {
    return this.#openState[0]();
  }

  open(triggerId: string) {
    if (triggerId && !this.#triggers.has(triggerId)) {
      throw new Error(`Base UI: PopoverHandle.open: No trigger found with id "${triggerId}".`);
    }
    this.#interactionType = "";
    this._requestOpen(true, "imperative-action", undefined, triggerId || null);
  }

  close() {
    this.#interactionType = "";
    this._requestOpen(false, "imperative-action", undefined, null);
  }

  _activeTriggerId() {
    return this.#activeTriggerIdState[0]();
  }

  _bindRequest(request: PopoverHandleRequest) {
    this.#request = request;
    return () => {
      if (this.#request === request) this.#request = undefined;
    };
  }

  _beforeContentGuard() {
    return this.#beforeContentGuardState[0]();
  }

  _compositionEnd() {
    if (typeof window === "undefined") {
      this.#isComposing = false;
      return;
    }
    window.clearTimeout(this.#compositionTimer);
    this.#compositionTimer = window.setTimeout(() => {
      this.#isComposing = false;
      this.#compositionTimer = undefined;
    }, 5);
  }

  _compositionStart() {
    if (typeof window !== "undefined") window.clearTimeout(this.#compositionTimer);
    this.#compositionTimer = undefined;
    this.#isComposing = true;
  }

  _cancelClosing() {
    if (typeof window !== "undefined") window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
    this.#stopHoverTransit?.();
    this.#stopHoverTransit = undefined;
  }

  _commit(
    open: boolean,
    triggerId: string | null,
    reason: PopoverChangeEventReason = "none",
    requestedOpen = open,
  ) {
    this.#openState[1](open);
    this.#openReasonState[1](requestedOpen ? reason : "none");
    this.#closeReason = requestedOpen ? "none" : reason;
    this.#hoverOpenedAt = requestedOpen && reason === "trigger-hover" ? Date.now() : 0;
    if (triggerId !== null) this.#activeTriggerIdState[1](triggerId);
  }

  _contentId() {
    return this.#contentIdState[0]();
  }

  _contentElement() {
    return this.#content;
  }

  _closeReason() {
    return this.#closeReason;
  }

  _hasTriggerTarget(target: EventTarget | null) {
    if (!(target instanceof Node)) return false;
    return Array.from(this.#triggers.values()).some(({ element }) => element.contains(target));
  }

  _initialize(open: boolean, triggerId: string | null) {
    this.#openState[1](open);
    this.#activeTriggerIdState[1](triggerId);
  }

  _interaction() {
    return this.#interactionType;
  }

  _openReason() {
    return this.#openReasonState[0]();
  }

  _isOpenedBy(triggerId: string) {
    return this.isOpen && this._activeTriggerId() === triggerId;
  }

  _isComposingText() {
    return this.#isComposing;
  }

  _isMountedBy(triggerId: string) {
    return this.#mountedState[0]() && this._activeTriggerId() === triggerId;
  }

  _isPressOpenedBy(triggerId: string) {
    return this._isOpenedBy(triggerId) && this.#openReasonState[0]() === "trigger-press";
  }

  _isPendingOutsidePress() {
    return this.#pendingOutsidePress;
  }

  _markOutsidePressEligible(eligible: boolean) {
    this.#outsidePressEligible = eligible;
  }

  _takeOutsidePressEligibility() {
    const eligible = this.#outsidePressEligible;
    this.#outsidePressEligible = false;
    return eligible;
  }

  _shouldStickHoverOpen(triggerId: string) {
    return (
      this._isOpenedBy(triggerId) &&
      this.#openReasonState[0]() === "trigger-hover" &&
      Date.now() - this.#hoverOpenedAt < 500
    );
  }

  _payload() {
    this.#triggerVersionState[0]();
    const triggerId = this._activeTriggerId();
    return triggerId ? this.#triggers.get(triggerId)?.payload() : undefined;
  }

  _ownsPopup(triggerId: string) {
    this.#triggerVersionState[0]();
    return (
      this._isOpenedBy(triggerId) ||
      (this.isOpen && this.#triggers.size === 1 && this.#triggers.has(triggerId))
    );
  }

  _register(triggerId: string, registration: PopoverTriggerRegistration<Payload>) {
    this.#triggers.set(triggerId, registration);
    this.#triggerVersionState[1]((version) => version + 1);
    if (this.isOpen && this._activeTriggerId() === null) this.#activeTriggerIdState[1](triggerId);
    return () => {
      if (this.#triggers.get(triggerId) === registration) {
        this.#triggers.delete(triggerId);
        this.#triggerVersionState[1]((version) => version + 1);
      }
    };
  }

  _requestOpen(
    open: boolean,
    reason: PopoverChangeEventReason,
    event: Event | undefined,
    triggerId: string | null,
  ) {
    this._cancelClosing();
    if (this.#request) return this.#request(open, reason, event, triggerId);
    this._commit(open, triggerId, reason);
    return true;
  }

  _scheduleClose(
    delay: number,
    event: Event,
    triggerId: string,
    reason: "trigger-focus" | "trigger-hover",
  ) {
    this._cancelClosing();
    if (typeof window === "undefined") return;
    this.#closeTimer = window.setTimeout(() => {
      this.#closeTimer = undefined;
      this._requestOpen(false, reason, event, triggerId);
    }, delay);
  }

  _scheduleHoverClose(delay: number, event: PointerEvent, triggerId: string) {
    this._cancelClosing();
    const trigger = this._trigger(triggerId);
    const content = this.#content;
    if (!trigger || !content || typeof document === "undefined") {
      this._scheduleClose(delay, event, triggerId, "trigger-hover");
      return;
    }
    const safeArea = popoverSafeArea(this.#currentPlacement, trigger, content);
    const trackTransit = (pointerEvent: PointerEvent) => {
      const target = pointerEvent.target;
      if (
        (target instanceof Node && (trigger.contains(target) || content.contains(target))) ||
        isPointInPopoverArea(pointerEvent.clientX, pointerEvent.clientY, safeArea)
      )
        return;
      this._scheduleClose(delay, pointerEvent, triggerId, "trigger-hover");
    };
    document.addEventListener("pointermove", trackTransit, true);
    this.#stopHoverTransit = () => document.removeEventListener("pointermove", trackTransit, true);
  }

  _setContent(element: HTMLElement | undefined) {
    this.#content = element;
    if (element) this.#contentIdState[1](element.id);
  }

  _setContentId(id: string) {
    this.#contentIdState[1](id);
  }

  _setBeforeContentGuard(element: HTMLElement | undefined) {
    this.#beforeContentGuardState[1](element);
  }

  _setInteractionType(interactionType: PopoverInteractionType) {
    this.#interactionType = interactionType;
  }

  _setMounted(mounted: boolean) {
    this.#mountedState[1](mounted);
  }

  _setPendingOutsidePress(pending: boolean) {
    this.#pendingOutsidePress = pending;
  }

  _unmount() {
    this._cancelClosing();
    this.#activeTriggerIdState[1](null);
    this.#mountedState[1](false);
    this.#openState[1](false);
    this.#openReasonState[1]("none");
    this.#closeReason = "none";
    this.#interactionType = "";
    this.#outsidePressEligible = false;
    this.#pendingOutsidePress = false;
  }

  _setPlacement(placement: PopoverPlacement) {
    this.#currentPlacement = placement;
  }

  _trigger(triggerId = this._activeTriggerId()) {
    this.#triggerVersionState[0]();
    return triggerId ? this.#triggers.get(triggerId)?.element : undefined;
  }

  _triggerCloseDelay(triggerId = this._activeTriggerId()) {
    this.#triggerVersionState[0]();
    return triggerId ? (this.#triggers.get(triggerId)?.closeDelay() ?? 0) : 0;
  }

  _triggerOpensOnHover(triggerId = this._activeTriggerId()) {
    this.#triggerVersionState[0]();
    return triggerId ? (this.#triggers.get(triggerId)?.openOnHover() ?? false) : false;
  }
}

function createPopoverHandle<Payload = unknown>() {
  return new PopoverHandle<Payload>();
}

const DEFAULT_POSITION: ResolvedPopoverPosition = {
  align: "center",
  alignOffset: 0,
  side: "bottom",
  sideOffset: 4,
};

type PopoverContextValue = {
  anchorRect: () => DOMRect | undefined;
  configurePosition: (position: ResolvedPopoverPosition) => void;
  contentId: string;
  currentPlacement: () => PopoverPlacement;
  defaultPosition: ResolvedPopoverPosition;
  forceUnmounted: () => boolean;
  handle: PopoverHandle<unknown>;
  instantType: () => PopoverInstantType;
  modal: () => boolean | "trap-focus";
  open: () => boolean;
  position: () => ResolvedPopoverPosition;
  recordChange: (reason: PopoverChangeEventReason, event: Event) => void;
  setContent: (element: HTMLElement | undefined) => void;
  transitionStatus: () => PopoverTransitionStatus;
};

const PopoverContext = createContext<PopoverContextValue>();

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("Popover parts must be used within Popover");
  return context;
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

const POPOVER_FOCUS_GUARD_STYLE: JSX.CSSProperties = {
  border: "0",
  clip: "rect(0 0 0 0)",
  "clip-path": "inset(50%)",
  height: "1px",
  margin: "0 -1px -1px 0",
  overflow: "hidden",
  padding: "0",
  position: "fixed",
  width: "1px",
  "white-space": "nowrap",
};

type PopoverFocusGuardProps = {
  onFocus: JSX.EventHandler<HTMLSpanElement, FocusEvent>;
  ref?: (element: HTMLSpanElement) => void;
};

const PopoverFocusGuard = (props: PopoverFocusGuardProps) => (
  <span
    ref={props.ref}
    aria-hidden="true"
    data-base-ui-focus-guard=""
    style={POPOVER_FOCUS_GUARD_STYLE}
    tabIndex={0}
    onFocus={props.onFocus}
  />
);

type PopoverInternalBackdropProps = {
  cutout: () => HTMLElement | undefined;
};

const PopoverInternalBackdrop = (props: PopoverInternalBackdropProps) => {
  const clipPath = () => {
    const rect = props.cutout()?.getBoundingClientRect();
    return rect
      ? `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`
      : undefined;
  };
  return (
    <div
      role="presentation"
      data-base-ui-inert=""
      style={{
        "clip-path": clipPath(),
        inset: "0",
        position: "fixed",
        "user-select": "none",
        "-webkit-user-select": "none",
      }}
    />
  );
};

function adjacentPopoverTabbable(element: HTMLElement, direction: -1 | 1, excluded?: HTMLElement) {
  const tabbable = getAllTabbableIn(element.ownerDocument.body, true);
  for (
    let index = tabbable.indexOf(element) + direction;
    index >= 0 && index < tabbable.length;
    index += direction
  ) {
    const candidate = tabbable[index];
    if (
      !candidate.hasAttribute("data-base-ui-focus-guard") &&
      !(excluded?.contains(candidate) ?? false)
    )
      return candidate;
  }
  return undefined;
}

function firstPopoverTabbable(content: HTMLElement | undefined) {
  return content
    ? getAllTabbableIn(content, true).find(
        (element) => !element.hasAttribute("data-base-ui-focus-guard"),
      )
    : undefined;
}

function lastPopoverTabbable(content: HTMLElement | undefined) {
  if (!content) return undefined;
  const tabbable = getAllTabbableIn(content, true);
  for (let index = tabbable.length - 1; index >= 0; index -= 1) {
    if (!tabbable[index].hasAttribute("data-base-ui-focus-guard")) return tabbable[index];
  }
  return undefined;
}

function createChangeDetails(
  reason: PopoverChangeEventReason,
  event: Event | undefined,
  trigger: Element | undefined,
  preventUnmountOnClose: () => void,
): PopoverChangeEventDetails {
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
  } as PopoverChangeEventDetails;
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else queueMicrotask(resolve);
  });
}

function positionToPlacement(position: Pick<PopoverPosition, "align" | "side">) {
  // RTL is outside the pinned synchronization campaign, so logical sides use their LTR physical
  // equivalents while remaining exposed as logical values on the rendered content.
  const side =
    position.side === "inline-start"
      ? "left"
      : position.side === "inline-end"
        ? "right"
        : position.side;
  return (position.align === "center" ? side : `${side}-${position.align}`) as PopoverPlacement;
}

function popoverFallbackPlacements(position: Pick<PopoverPosition, "align" | "side">) {
  const requested = positionToPlacement(position);
  const { align, side } = placementParts(requested);
  const oppositeSide: Record<PopoverPhysicalSide, PopoverPhysicalSide> = {
    bottom: "top",
    left: "right",
    right: "left",
    top: "bottom",
  };
  const crossAxisSides: Record<PopoverPhysicalSide, PopoverPhysicalSide[]> = {
    bottom: ["right", "left"],
    left: ["bottom", "top"],
    right: ["bottom", "top"],
    top: ["right", "left"],
  };
  const placement = (nextSide: PopoverPhysicalSide, nextAlign = align) =>
    (nextAlign === "center" ? nextSide : `${nextSide}-${nextAlign}`) as PopoverPlacement;
  const candidates = [
    placement(oppositeSide[side]),
    ...crossAxisSides[side].map((nextSide) => placement(nextSide)),
  ];

  if (align !== "center") {
    const oppositeAlign = align === "start" ? "end" : "start";
    candidates.splice(1, 0, placement(side, oppositeAlign));
    candidates.push(
      placement(oppositeSide[side], oppositeAlign),
      ...crossAxisSides[side].map((nextSide) => placement(nextSide, oppositeAlign)),
    );
  }

  return candidates.join(" ");
}

function placementParts(placement: PopoverPlacement) {
  const [side, align = "center"] = placement.split("-") as [PopoverPhysicalSide, PopoverAlign?];
  return { align, side };
}

function exposedSide(placement: PopoverPlacement, requestedSide: PopoverSide): PopoverSide {
  const renderedSide = placementParts(placement).side;
  if (requestedSide === "inline-start" || requestedSide === "inline-end") {
    if (renderedSide === "left") return "inline-start";
    if (renderedSide === "right") return "inline-end";
  }
  return renderedSide;
}

type PopoverPoint = [number, number];

function popoverSafeArea(placement: PopoverPlacement, anchor: HTMLElement, content: HTMLElement) {
  const side = placementParts(placement).side;
  const anchorRect = anchor.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const points: PopoverPoint[] = [];

  if (side === "top") {
    points.push(
      [anchorRect.left, anchorCenterY],
      [contentRect.left, contentRect.bottom],
      [contentRect.left, contentRect.top],
      [contentRect.right, contentRect.top],
      [contentRect.right, contentRect.bottom],
      [anchorRect.right, anchorCenterY],
    );
  } else if (side === "right") {
    points.push(
      [anchorCenterX, anchorRect.top],
      [contentRect.left, contentRect.top],
      [contentRect.right, contentRect.top],
      [contentRect.right, contentRect.bottom],
      [contentRect.left, contentRect.bottom],
      [anchorCenterX, anchorRect.bottom],
    );
  } else if (side === "bottom") {
    points.push(
      [anchorRect.left, anchorCenterY],
      [contentRect.left, contentRect.top],
      [contentRect.left, contentRect.bottom],
      [contentRect.right, contentRect.bottom],
      [contentRect.right, contentRect.top],
      [anchorRect.right, anchorCenterY],
    );
  } else {
    points.push(
      [anchorCenterX, anchorRect.top],
      [contentRect.right, contentRect.top],
      [contentRect.left, contentRect.top],
      [contentRect.left, contentRect.bottom],
      [contentRect.right, contentRect.bottom],
      [anchorCenterX, anchorRect.bottom],
    );
  }
  return points;
}

function isPointInPopoverArea(x: number, y: number, points: PopoverPoint[]) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [currentX, currentY] = points[index];
    const [previousX, previousY] = points[previous];
    if (
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") (ref as (element: HTMLElement) => void)(element);
}

type PopoverHandleAnchorProps = {
  anchor: () => HTMLElement | undefined;
  ref?: HTMLElement | ((element: HTMLElement) => void);
};

const PopoverHandleAnchor = (props: PopoverHandleAnchorProps) => {
  createEffect(() => {
    const anchor = props.anchor();
    if (anchor) setElementRef(props.ref, anchor);
  });
  return null;
};

type PopoverRenderedChildrenProps<Payload> = {
  getChildren: () => JSX.Element | PopoverPayloadChildRenderFunction<Payload>;
  payload: () => Payload | undefined;
};

const PopoverRenderedChildren = <Payload,>(
  props: PopoverRenderedChildrenProps<Payload>,
): JSX.Element => {
  type ChildBox = { child: JSX.Element | PopoverPayloadChildRenderFunction<Payload> };
  const resolved = resolveChildren(
    () => ({ child: props.getChildren() }) as unknown as JSX.Element,
  );
  const renderedChild = createMemo(() => {
    const child = (resolved() as unknown as ChildBox).child;
    return typeof child === "function" ? child({ payload: props.payload() }) : child;
  });
  return <>{renderedChild()}</>;
};

type PopoverProps<Payload = unknown> = {
  actionsRef?: { current: PopoverActions | null };
  children?: JSX.Element | PopoverPayloadChildRenderFunction<Payload>;
  defaultOpen?: boolean;
  defaultTriggerId?: string | null;
  handle?: PopoverHandle<Payload>;
  modal?: boolean | "trap-focus";
  onOpenChange?: (open: boolean, details: PopoverChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  open?: boolean;
  triggerId?: string | null;
};

type ControllablePopoverRootProps = PopoverPrimitive.PopoverRootProps & {
  "data-slot"?: string;
  onCurrentPlacementChange?: (placement: PopoverPlacement) => void;
};

const ControllablePopoverRoot = PopoverPrimitive.Root as unknown as (
  props: ControllablePopoverRootProps,
) => JSX.Element;

const Popover = <Payload,>(props: PopoverProps<Payload>) => {
  const [local] = splitProps(props, [
    "actionsRef",
    "children",
    "defaultOpen",
    "defaultTriggerId",
    "handle",
    "modal",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "triggerId",
  ]);
  const handle = local.handle ?? createPopoverHandle<Payload>();
  const contentId = `popover-content-${createUniqueId()}`;
  handle._setContentId(contentId);
  if (local.open === undefined && local.defaultOpen && !handle.isOpen) {
    handle._initialize(true, local.defaultTriggerId ?? null);
  }

  const [position, setPosition] = createSignal(DEFAULT_POSITION);
  const [currentPlacement, setCurrentPlacement] = createSignal<PopoverPlacement>(
    positionToPlacement(DEFAULT_POSITION),
  );
  const [content, setContent] = createSignal<HTMLElement>();
  const [forceUnmounted, setForceUnmounted] = createSignal(false);
  const [instantType, setInstantType] = createSignal<PopoverInstantType>();
  const [mounted, setMounted] = createSignal(local.open ?? local.defaultOpen ?? handle.isOpen);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [transitionStatus, setTransitionStatus] = createSignal<PopoverTransitionStatus>();
  const open = () => !forceUnmounted() && (local.open ?? handle.isOpen);
  const activeTriggerId = () =>
    local.triggerId !== undefined ? local.triggerId : handle._activeTriggerId();
  const trigger = () => handle._trigger(activeTriggerId());
  const shouldPreventScroll = () => {
    if (!open() || local.modal !== true || handle._openReason() === "trigger-hover") return false;
    if (handle._interaction() !== "touch") return true;
    const popup = content();
    const positioner = popup?.parentElement;
    if (!popup || !positioner) return false;
    return positioner.offsetWidth >= popup.ownerDocument.documentElement.clientWidth - 20;
  };
  let pendingChange: { event: Event; reason: PopoverChangeEventReason } | undefined;
  let controlledSyncInitialized = false;
  let previousControlledOpen = local.open;
  let previousControlledTrigger: HTMLElement | undefined;
  let previousControlledTriggerId = local.triggerId;
  let previousOpen = false;
  let completeVersion = 0;

  const requestOpenChange = (
    nextOpen: boolean,
    reason: PopoverChangeEventReason,
    event?: Event,
    changeTriggerId?: string | null,
  ) => {
    pendingChange = undefined;
    const nextTriggerId = changeTriggerId !== undefined ? changeTriggerId : activeTriggerId();
    const switchesTrigger =
      nextOpen && nextTriggerId !== null && nextTriggerId !== handle._activeTriggerId();
    const sticksHoverOpen =
      nextOpen &&
      reason === "trigger-press" &&
      handle._openReason() === "trigger-hover" &&
      nextTriggerId === handle._activeTriggerId();
    if (nextOpen === open() && !switchesTrigger && !sticksHoverOpen) return false;

    let shouldPreventUnmount = false;
    const changeTrigger = reason.startsWith("trigger-")
      ? handle._trigger(nextTriggerId)
      : reason === "imperative-action" && nextOpen
        ? handle._trigger(nextTriggerId)
        : reason === "focus-out" && event instanceof FocusEvent
          ? event.currentTarget instanceof Element
            ? event.currentTarget
            : undefined
          : undefined;
    const details = createChangeDetails(reason, event, changeTrigger, () => {
      shouldPreventUnmount = !nextOpen;
    });
    local.onOpenChange?.(nextOpen, details);
    if (reason === "escape-key" && !details.isPropagationAllowed) event?.stopPropagation();
    if (details.isCanceled) return false;

    const isKeyboardPress =
      reason === "trigger-press" &&
      (event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0));
    setInstantType(
      isKeyboardPress
        ? "click"
        : !nextOpen && (reason === "escape-key" || reason === "none")
          ? "dismiss"
          : reason === "focus-out"
            ? "focus"
            : switchesTrigger
              ? "trigger-change"
              : undefined,
    );

    if (nextOpen) {
      setForceUnmounted(false);
      setMounted(true);
      setPreventedUnmount(false);
    } else if (shouldPreventUnmount) {
      setPreventedUnmount(true);
    }
    handle._commit(local.open ?? nextOpen, nextTriggerId, reason, nextOpen);
    return true;
  };

  const anchorRect = () => trigger()?.getBoundingClientRect();

  const configurePosition = (nextPosition: ResolvedPopoverPosition) => {
    const previous = untrack(position);
    if (
      previous.align === nextPosition.align &&
      previous.alignOffset === nextPosition.alignOffset &&
      previous.side === nextPosition.side &&
      previous.sideOffset === nextPosition.sideOffset
    )
      return;
    setPosition(nextPosition);
    if (previous.align !== nextPosition.align || previous.side !== nextPosition.side) {
      setCurrentPlacement(positionToPlacement(nextPosition));
    }
  };

  const context: PopoverContextValue = {
    anchorRect,
    configurePosition,
    contentId,
    currentPlacement,
    defaultPosition: DEFAULT_POSITION,
    forceUnmounted,
    handle: handle as PopoverHandle<unknown>,
    instantType,
    modal: () => local.modal ?? false,
    open,
    position,
    recordChange: (reason, event) => {
      pendingChange = { event, reason };
    },
    setContent: (element) => {
      setContent(element);
      handle._setContent(element);
    },
    transitionStatus,
  };

  createEffect(() => {
    const unbind = handle._bindRequest((nextOpen, reason, event, triggerId) =>
      requestOpenChange(nextOpen, reason, event, triggerId),
    );
    onCleanup(unbind);
  });

  createEffect(() => {
    handle._setMounted(mounted() || preventedUnmount());
    onCleanup(() => handle._setMounted(false));
  });

  createEffect(() => {
    const controlledOpen = local.open;
    if (controlledOpen === undefined) return;
    const controlledTriggerId =
      local.triggerId !== undefined ? local.triggerId : handle._activeTriggerId();
    const controlledTrigger = handle._trigger(controlledTriggerId);
    if (
      controlledSyncInitialized &&
      previousControlledOpen === true &&
      controlledOpen &&
      (local.triggerId !== undefined || previousControlledTriggerId !== undefined) &&
      previousControlledTrigger !== undefined &&
      controlledTrigger !== undefined &&
      controlledTrigger !== previousControlledTrigger
    ) {
      setInstantType("trigger-change");
    }
    if (previousControlledOpen === true && !controlledOpen && handle._closeReason() === "none") {
      handle._setInteractionType("");
    }
    previousControlledOpen = controlledOpen;
    previousControlledTriggerId = controlledTriggerId;
    if (controlledTrigger) previousControlledTrigger = controlledTrigger;
    controlledSyncInitialized = true;
    if (controlledOpen) {
      setForceUnmounted(false);
      setMounted(true);
    }
    handle._initialize(controlledOpen, controlledTriggerId);
  });

  createRenderEffect(() => {
    const nextOpen = open();
    if (nextOpen === previousOpen) return;
    previousOpen = nextOpen;
    setTransitionStatus(nextOpen ? "starting" : "ending");
    const version = ++completeVersion;
    queueMicrotask(async () => {
      await nextAnimationFrame();
      if (version !== completeVersion) return;
      if (nextOpen) setTransitionStatus(undefined);
      const element = content();
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) await Promise.allSettled(animations.map(({ finished }) => finished));
      if (version !== completeVersion) return;
      setTransitionStatus(undefined);
      if (!nextOpen && preventedUnmount()) return;
      if (!nextOpen) {
        setMounted(false);
        context.setContent(undefined);
        handle._unmount();
      }
      local.onOpenChangeComplete?.(nextOpen);
    });
  });

  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const actions: PopoverActions = {
      close: () => {
        handle._setInteractionType("");
        requestOpenChange(false, "imperative-action", undefined, null);
      },
      unmount: () => {
        completeVersion += 1;
        previousOpen = false;
        setTransitionStatus(undefined);
        setPreventedUnmount(false);
        setForceUnmounted(true);
        setMounted(false);
        context.setContent(undefined);
        handle._unmount();
        local.onOpenChangeComplete?.(false);
      },
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  createEffect(() => {
    if (!open()) return;
    const popup = content();
    const activeTrigger = trigger();
    const ownerDocument = popup?.ownerDocument ?? activeTrigger?.ownerDocument;
    if (!ownerDocument) return;
    let pressStartedInside = false;
    let pointerType = "";
    let suppressNextClick = false;
    let pendingOutsidePressTimeout: number | undefined;

    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      ((popup?.contains(target) ?? false) || handle._hasTriggerTarget(target));
    const onPointerDown = (event: PointerEvent) => {
      handle._setInteractionType(
        event.pointerType === "touch" || event.pointerType === "pen"
          ? event.pointerType
          : event.pointerType === "mouse"
            ? "mouse"
            : "keyboard",
      );
      window.clearTimeout(pendingOutsidePressTimeout);
      pendingOutsidePressTimeout = undefined;
      handle._markOutsidePressEligible(false);
      if (event.button !== 0) {
        handle._setPendingOutsidePress(false);
        return;
      }
      pressStartedInside = isInside(event.target);
      pointerType = event.pointerType;
      handle._setPendingOutsidePress(
        !pressStartedInside && (event.pointerType === "touch" || local.modal !== "trap-focus"),
      );
    };
    const onPointerUp = () => {
      if (pointerType === "touch") {
        pressStartedInside = false;
        pointerType = "";
        suppressNextClick = true;
        pendingOutsidePressTimeout = window.setTimeout(() => {
          pendingOutsidePressTimeout = undefined;
          handle._setPendingOutsidePress(false);
        }, 1000);
      }
    };
    const onPointerCancel = () => {
      window.clearTimeout(pendingOutsidePressTimeout);
      pendingOutsidePressTimeout = undefined;
      pressStartedInside = false;
      pointerType = "";
      suppressNextClick = false;
      handle._markOutsidePressEligible(false);
      handle._setPendingOutsidePress(false);
    };
    const onClick = (event: MouseEvent) => {
      window.clearTimeout(pendingOutsidePressTimeout);
      pendingOutsidePressTimeout = undefined;
      if (suppressNextClick) {
        suppressNextClick = false;
        handle._markOutsidePressEligible(false);
        handle._setPendingOutsidePress(false);
        return;
      }
      const outsidePressEligible = handle._takeOutsidePressEligibility();
      if (
        pointerType !== "touch" &&
        local.modal !== "trap-focus" &&
        outsidePressEligible &&
        !pressStartedInside &&
        !isInside(event.target) &&
        open()
      ) {
        requestOpenChange(false, "outside-press", event, null);
      }
      pressStartedInside = false;
      pointerType = "";
      handle._setPendingOutsidePress(false);
    };
    const onCompositionStart = () => handle._compositionStart();
    const onCompositionEnd = () => handle._compositionEnd();
    const onKeyDown = () => handle._setInteractionType("keyboard");

    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    ownerDocument.addEventListener("pointerup", onPointerUp, true);
    ownerDocument.addEventListener("pointercancel", onPointerCancel, true);
    ownerDocument.addEventListener("click", onClick, true);
    ownerDocument.addEventListener("keydown", onKeyDown, true);
    ownerDocument.addEventListener("compositionstart", onCompositionStart);
    ownerDocument.addEventListener("compositionend", onCompositionEnd);
    onCleanup(() => {
      ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
      ownerDocument.removeEventListener("pointerup", onPointerUp, true);
      ownerDocument.removeEventListener("pointercancel", onPointerCancel, true);
      ownerDocument.removeEventListener("click", onClick, true);
      ownerDocument.removeEventListener("keydown", onKeyDown, true);
      ownerDocument.removeEventListener("compositionstart", onCompositionStart);
      ownerDocument.removeEventListener("compositionend", onCompositionEnd);
      window.clearTimeout(pendingOutsidePressTimeout);
      handle._markOutsidePressEligible(false);
      handle._setPendingOutsidePress(false);
    });
  });

  onCleanup(() => {
    completeVersion += 1;
    context.setContent(undefined);
  });

  const kobalteOpenChange = (nextOpen: boolean) => {
    const change = pendingChange;
    pendingChange = undefined;
    requestOpenChange(nextOpen, change?.reason ?? "none", change?.event, activeTriggerId());
  };
  const recordCurrentPlacement = (placement: PopoverPlacement) => {
    setCurrentPlacement(placement);
    handle._setPlacement(placement);
  };
  return (
    <PopoverContext.Provider value={context}>
      <ControllablePopoverRoot
        data-slot="popover"
        anchorRef={trigger}
        arrowPadding={5}
        flip={popoverFallbackPlacements(position())}
        forceMount={mounted() || preventedUnmount()}
        getAnchorRect={anchorRect}
        gutter={position().sideOffset}
        hideWhenDetached
        modal={false}
        onCurrentPlacementChange={recordCurrentPlacement}
        onOpenChange={kobalteOpenChange}
        open={open()}
        overflowPadding={5}
        placement={positionToPlacement(position())}
        preventScroll={shouldPreventScroll()}
        shift={position().alignOffset}
        slide
      >
        <PopoverPrimitive.Trigger as={PopoverHandleAnchor} anchor={trigger} />
        <PopoverRenderedChildren
          getChildren={() => local.children}
          payload={() => handle._payload()}
        />
      </ControllablePopoverRoot>
    </PopoverContext.Provider>
  );
};

type PopoverTriggerProps<T extends ValidComponent = "button", Payload = unknown> = PolymorphicProps<
  T,
  {
    closeDelay?: number;
    delay?: number;
    disabled?: boolean;
    handle?: PopoverHandle<Payload>;
    nativeButton?: boolean;
    openOnHover?: boolean;
    payload?: Payload;
  }
>;

const processedEscapeEvents = new WeakSet<Event>();

const PopoverTrigger = <T extends ValidComponent = "button", Payload = unknown>(
  props: PopoverTriggerProps<T, Payload>,
) => {
  const root = useContext(PopoverContext);
  const [local, others] = splitProps(props as PopoverTriggerProps<ValidComponent, Payload>, [
    "as",
    "class",
    "closeDelay",
    "delay",
    "disabled",
    "handle",
    "id",
    "nativeButton",
    "onBlur",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onKeyUp",
    "onPointerDown",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerMove",
    "openOnHover",
    "payload",
    "ref",
    "role",
    "tabIndex",
    "type",
  ]);
  const handle = local.handle ?? (root?.handle as PopoverHandle<Payload> | undefined);
  if (!handle) throw new Error("PopoverTrigger must be used within Popover or provided a handle");
  const generatedId = `popover-trigger-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const [triggerElement, setTriggerElement] = createSignal<HTMLElement>();
  let openTimer: number | undefined;

  createEffect(() => {
    const element = triggerElement();
    if (!element) return;
    const unregister = handle._register(id(), {
      closeDelay: () => local.closeDelay ?? 0,
      element,
      openOnHover: () => local.openOnHover ?? false,
      payload: () => local.payload,
    });
    onCleanup(unregister);
  });

  const cancelOpening = () => {
    if (typeof window !== "undefined") window.clearTimeout(openTimer);
    openTimer = undefined;
  };
  const requestToggle = (event: Event) => {
    if (local.disabled) return;
    cancelOpening();
    const nextOpen = !handle._isOpenedBy(id()) || handle._shouldStickHoverOpen(id());
    handle._requestOpen(nextOpen, "trigger-press", event, id());
  };
  const scheduleOpen = (event: PointerEvent) => {
    cancelOpening();
    handle._cancelClosing();
    const delay = handle.isOpen ? 0 : (local.delay ?? 300);
    if (typeof window === "undefined") return;
    openTimer = window.setTimeout(() => {
      openTimer = undefined;
      handle._setInteractionType(event.pointerType === "pen" ? "pen" : "mouse");
      handle._requestOpen(true, "trigger-hover", event, id());
    }, delay);
  };
  const nativeButton = () => local.nativeButton ?? true;

  const onClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      return;
    }
    callEventHandler(local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent>, event);
    if (event.detail === 0) handle._setInteractionType("keyboard");
    if (!event.defaultPrevented) requestToggle(event);
  };
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>, event);
    handle._setInteractionType("keyboard");
    if (!event.defaultPrevented && event.key === "Escape") {
      if (event.isComposing || handle._isComposingText()) {
        processedEscapeEvents.add(event);
        event.stopPropagation();
        return;
      }
      processedEscapeEvents.add(event);
      if (handle._requestOpen(false, "escape-key", event, null)) event.preventDefault();
      return;
    }
    if (event.defaultPrevented || nativeButton() || event.repeat) return;
    const isCurrentTarget = event.target === event.currentTarget;
    const isLink =
      event.currentTarget.tagName === "A" &&
      Boolean((event.currentTarget as HTMLAnchorElement).href);
    if (!isCurrentTarget || isLink) return;
    if (event.key === "Enter") {
      requestToggle(event);
    } else if (event.key === " ") {
      event.preventDefault();
    }
  };
  const onKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>, event);
    const shouldActivate =
      !event.defaultPrevented &&
      !nativeButton() &&
      event.target === event.currentTarget &&
      !(event.currentTarget.tagName === "A" && (event.currentTarget as HTMLAnchorElement).href) &&
      event.key === " ";
    if (shouldActivate) requestToggle(event);
  };
  const onPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    handle._setInteractionType(
      event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse",
    );
  };
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    if (
      event.defaultPrevented ||
      !local.openOnHover ||
      event.pointerType === "touch" ||
      local.disabled
    )
      return;
    scheduleOpen(event);
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    cancelOpening();
    if (local.openOnHover && handle._isOpenedBy(id()) && handle._openReason() === "trigger-hover") {
      handle._scheduleHoverClose(local.closeDelay ?? 0, event, id());
    }
  };
  const onPointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    if (
      event.defaultPrevented ||
      event.pointerType === "touch" ||
      !local.openOnHover ||
      local.disabled ||
      handle._isOpenedBy(id()) ||
      (openTimer !== undefined && event.movementX ** 2 + event.movementY ** 2 < 2)
    )
      return;
    scheduleOpen(event);
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent>, event);
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent>, event);
    cancelOpening();
  };
  const onBeforeTriggerGuardFocus: JSX.EventHandler<HTMLSpanElement, FocusEvent> = (event) => {
    const previous = adjacentPopoverTabbable(event.currentTarget, -1);
    handle._requestOpen(false, "focus-out", event, null);
    previous?.focus();
  };
  const onAfterTriggerGuardFocus: JSX.EventHandler<HTMLSpanElement, FocusEvent> = (event) => {
    const content = handle._contentElement();
    if (content && event.relatedTarget instanceof Node && content.contains(event.relatedTarget)) {
      const next = adjacentPopoverTabbable(event.currentTarget, 1, content);
      handle._requestOpen(false, "focus-out", event, null);
      next?.focus();
      return;
    }
    (firstPopoverTabbable(content) ?? content ?? handle._trigger(id()))?.focus();
  };

  onCleanup(() => {
    cancelOpening();
  });

  return (
    <>
      <Show when={handle._isMountedBy(id())}>
        <PopoverFocusGuard onFocus={onBeforeTriggerGuardFocus} />
      </Show>
      <Dynamic
        component={local.as ?? "button"}
        {...others}
        ref={(element: HTMLElement) => {
          setTriggerElement(element);
          setElementRef(local.ref, element);
        }}
        id={id()}
        class={local.class}
        disabled={nativeButton() ? local.disabled : undefined}
        role={local.role ?? (nativeButton() ? undefined : "button")}
        tabIndex={local.tabIndex ?? (nativeButton() ? undefined : local.disabled ? -1 : 0)}
        type={nativeButton() ? (local.type ?? "button") : undefined}
        aria-controls={handle._ownsPopup(id()) ? handle._contentId() : undefined}
        aria-disabled={!nativeButton() && local.disabled ? true : undefined}
        aria-expanded={handle._isOpenedBy(id())}
        aria-haspopup="dialog"
        data-disabled={local.disabled ? "" : undefined}
        data-popup-open={handle._isOpenedBy(id()) ? "" : undefined}
        data-pressed={handle._isPressOpenedBy(id()) ? "" : undefined}
        data-slot="popover-trigger"
        onBlur={onBlur}
        onClick={onClick}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      />
      <Show when={handle._isMountedBy(id())}>
        <PopoverFocusGuard onFocus={onAfterTriggerGuardFocus} />
      </Show>
    </>
  );
};

type PopoverFocusTarget =
  | boolean
  | { current: HTMLElement | null }
  | ((interactionType: PopoverInteractionType) => boolean | HTMLElement | null | undefined);

type PopoverContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  {
    align?: PopoverAlign;
    alignOffset?: PopoverOffset;
    children?: JSX.Element;
    class?: string;
    finalFocus?: PopoverFocusTarget;
    initialFocus?: PopoverFocusTarget;
    side?: PopoverSide;
    sideOffset?: PopoverOffset;
  }
>;

function resolveFocusTarget(target: PopoverFocusTarget, interactionType: PopoverInteractionType) {
  if (typeof target === "function") return target(interactionType);
  if (typeof target === "object") return target.current;
  return target;
}

const PopoverContent = <T extends ValidComponent = "div">(props: PopoverContentProps<T>) => {
  const context = usePopoverContext();
  const [local, others] = splitProps(props as PopoverContentProps, [
    "align",
    "alignOffset",
    "children",
    "class",
    "finalFocus",
    "id",
    "initialFocus",
    "onKeyDown",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
    "side",
    "sideOffset",
  ]);
  const [positioner, setPositioner] = createSignal<HTMLElement>();
  const [measurementVersion, setMeasurementVersion] = createSignal(0);
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let measurementAnimationFrame: number | undefined;
  let contentElement: HTMLElement | undefined;

  const requestedPosition = (): PopoverPosition => ({
    align: local.align ?? context.defaultPosition.align,
    alignOffset: local.alignOffset ?? context.defaultPosition.alignOffset,
    side: local.side ?? context.defaultPosition.side,
    sideOffset: local.sideOffset ?? context.defaultPosition.sideOffset,
  });
  const resolvedPosition = (): ResolvedPopoverPosition => {
    measurementVersion();
    const requested = requestedPosition();
    const anchorRect = context.anchorRect();
    const positionerRect = positioner()?.getBoundingClientRect();
    const offsetData: PopoverOffsetData = {
      align: placementParts(context.currentPlacement()).align,
      anchor: { height: anchorRect?.height ?? 0, width: anchorRect?.width ?? 0 },
      positioner: {
        height: positionerRect?.height ?? 0,
        width: positionerRect?.width ?? 0,
      },
      side: exposedSide(context.currentPlacement(), requested.side),
    };
    return {
      ...requested,
      alignOffset:
        typeof requested.alignOffset === "function"
          ? requested.alignOffset(offsetData)
          : requested.alignOffset,
      sideOffset:
        typeof requested.sideOffset === "function"
          ? requested.sideOffset(offsetData)
          : requested.sideOffset,
    };
  };
  const side = () => exposedSide(context.currentPlacement(), requestedPosition().side);
  const align = () => placementParts(context.currentPlacement()).align;

  const cleanupPositioner = () => {
    if (measurementAnimationFrame !== undefined) cancelAnimationFrame(measurementAnimationFrame);
    measurementAnimationFrame = undefined;
    mutationObserver?.disconnect();
    mutationObserver = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    setPositioner(undefined);
  };

  const updatePositionerState = () => {
    const element = positioner();
    if (!element) return;
    const anchorRect = context.anchorRect();
    const popup = element.firstElementChild as HTMLElement | null;
    const positionerRect = element.getBoundingClientRect();
    const popupRect = popup?.getBoundingClientRect();
    element.inert = !context.open();
    element.toggleAttribute("data-open", context.open());
    element.toggleAttribute("data-closed", !context.open());
    element.toggleAttribute("data-anchor-hidden", element.style.visibility === "hidden");
    element.toggleAttribute("data-starting-style", context.transitionStatus() === "starting");
    element.toggleAttribute("data-ending-style", context.transitionStatus() === "ending");
    element.setAttribute("data-align", align());
    element.setAttribute("data-side", side());
    const instant = context.instantType();
    if (instant) element.setAttribute("data-instant", instant);
    else element.removeAttribute("data-instant");
    if (anchorRect) {
      element.style.setProperty("--anchor-height", `${anchorRect.height}px`);
      element.style.setProperty("--anchor-width", `${anchorRect.width}px`);
    }
    element.style.setProperty("--positioner-height", `${positionerRect.height}px`);
    element.style.setProperty("--positioner-width", `${positionerRect.width}px`);
    if (popup && popupRect) {
      popup.style.setProperty("--popup-height", `${popupRect.height}px`);
      popup.style.setProperty("--popup-width", `${popupRect.width}px`);
    }
    setMeasurementVersion((version) => version + 1);
  };

  const configurePositioner = (contentElement: HTMLElement) => {
    const positionerElement = contentElement.parentElement;
    if (!positionerElement) return;
    cleanupPositioner();
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
    updatePositionerState();
    mutationObserver = new MutationObserver(() => {
      positionerElement.toggleAttribute(
        "data-anchor-hidden",
        positionerElement.style.visibility === "hidden",
      );
    });
    mutationObserver.observe(positionerElement, {
      attributeFilter: ["style"],
      attributes: true,
    });
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(() => {
        if (measurementAnimationFrame !== undefined)
          cancelAnimationFrame(measurementAnimationFrame);
        measurementAnimationFrame = requestAnimationFrame(() => {
          measurementAnimationFrame = undefined;
          updatePositionerState();
        });
      });
      const trigger = context.handle._trigger();
      if (trigger) resizeObserver.observe(trigger);
      resizeObserver.observe(contentElement);
    }
  };

  const setContentElement = (element: HTMLElement) => {
    contentElement = element;
    context.setContent(element);
    setElementRef(local.ref, element);
    queueMicrotask(() => configurePositioner(element));
  };

  const onOpenAutoFocus = (event: Event) => {
    if (context.handle._openReason() === "trigger-hover") {
      event.preventDefault();
      return;
    }
    const target = local.initialFocus;
    if (target === undefined) {
      if (context.handle._interaction() !== "touch") return;
      event.preventDefault();
      queueMicrotask(() => contentElement?.focus());
      return;
    }
    const resolved = resolveFocusTarget(target, context.handle._interaction());
    if (resolved === true || resolved === null) return;
    event.preventDefault();
    if (resolved instanceof HTMLElement) queueMicrotask(() => resolved.focus());
  };
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>, event);
    context.handle._setInteractionType("keyboard");
    if (event.defaultPrevented || event.key !== "Escape") return;
    if (event.isComposing || context.handle._isComposingText()) {
      processedEscapeEvents.add(event);
      event.stopPropagation();
      return;
    }
    processedEscapeEvents.add(event);
    if (context.handle._requestOpen(false, "escape-key", event, null)) event.preventDefault();
  };
  const onCloseAutoFocus = (event: Event) => {
    const closeReason = context.handle._closeReason();
    if (closeReason === "trigger-hover") {
      event.preventDefault();
      return;
    }
    const target = local.finalFocus;
    const resolved =
      target === undefined ? undefined : resolveFocusTarget(target, context.handle._interaction());
    if (
      (closeReason === "focus-out" || closeReason === "outside-press") &&
      !(resolved instanceof HTMLElement)
    ) {
      event.preventDefault();
      return;
    }
    if (target === undefined) return;
    if (resolved === true || resolved === null) return;
    event.preventDefault();
    if (resolved instanceof HTMLElement) queueMicrotask(() => resolved.focus());
  };
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    context.handle._cancelClosing();
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent>,
      event,
    );
    const triggerId = context.handle._activeTriggerId();
    if (
      triggerId &&
      context.handle._triggerOpensOnHover(triggerId) &&
      context.handle._openReason() === "trigger-hover" &&
      !context.handle._trigger(triggerId)?.contains(event.relatedTarget as Node | null)
    ) {
      context.handle._scheduleHoverClose(
        context.handle._triggerCloseDelay(triggerId),
        event,
        triggerId,
      );
    }
  };
  const onBeforeContentGuardFocus: JSX.EventHandler<HTMLSpanElement, FocusEvent> = (event) => {
    if (
      contentElement &&
      event.relatedTarget instanceof Node &&
      contentElement.contains(event.relatedTarget)
    ) {
      (context.handle._trigger() ?? contentElement).focus();
      return;
    }
    (firstPopoverTabbable(contentElement) ?? contentElement)?.focus();
  };
  const onAfterContentGuardFocus: JSX.EventHandler<HTMLSpanElement, FocusEvent> = (event) => {
    if (
      contentElement &&
      event.relatedTarget instanceof Node &&
      contentElement.contains(event.relatedTarget)
    ) {
      const activeTrigger = context.handle._trigger();
      const next = activeTrigger
        ? adjacentPopoverTabbable(activeTrigger, 1, contentElement)
        : undefined;
      context.handle._requestOpen(false, "focus-out", event, null);
      next?.focus();
      return;
    }
    (lastPopoverTabbable(contentElement) ?? contentElement)?.focus();
  };

  createEffect(() => context.configurePosition(resolvedPosition()));
  createEffect(() => context.handle._setContentId(local.id ?? context.contentId));
  createEffect(updatePositionerState);
  createEffect(() => {
    if (context.forceUnmounted()) cleanupPositioner();
  });
  onCleanup(() => {
    cleanupPositioner();
    contentElement = undefined;
    context.handle._setBeforeContentGuard(undefined);
    context.setContent(undefined);
  });

  return (
    <PopoverPrimitive.Portal>
      <Show
        when={
          context.open() &&
          context.modal() === true &&
          context.handle._openReason() !== "trigger-hover"
        }
      >
        <PopoverInternalBackdrop cutout={() => context.handle._trigger()} />
      </Show>
      <PopoverFocusGuard
        ref={(element) => context.handle._setBeforeContentGuard(element)}
        onFocus={onBeforeContentGuardFocus}
      />
      <PopoverPrimitive.Content
        {...others}
        ref={setContentElement}
        id={local.id ?? context.contentId}
        data-align={align()}
        data-base-ui-focusable=""
        data-closed={context.open() ? undefined : ""}
        data-ending-style={context.transitionStatus() === "ending" ? "" : undefined}
        data-instant={context.instantType()}
        data-open={context.open() ? "" : undefined}
        data-side={side()}
        data-slot="popover-content"
        data-starting-style={context.transitionStatus() === "starting" ? "" : undefined}
        class={cn(
          "z-popover-content z-popover-content-logical z-50 w-72 origin-(--transform-origin) outline-hidden",
          local.class,
        )}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (processedEscapeEvents.has(event)) {
            event.preventDefault();
            return;
          }
          if (event.isComposing || context.handle._isComposingText()) {
            event.preventDefault();
            return;
          }
          context.handle._setInteractionType("keyboard");
          context.recordChange("escape-key", event);
        }}
        onFocusOutside={(event) => {
          const originalEvent = event.detail.originalEvent;
          const target = originalEvent.target;
          if (
            context.handle._isPendingOutsidePress() ||
            context.handle._hasTriggerTarget(target) ||
            (target instanceof Element && target.hasAttribute("data-base-ui-focus-guard"))
          ) {
            event.preventDefault();
            return;
          }
          context.recordChange("focus-out", originalEvent);
        }}
        onOpenAutoFocus={onOpenAutoFocus}
        onKeyDown={onKeyDown}
        onPointerDownOutside={(event) => {
          const originalEvent = event.detail.originalEvent;
          if (context.handle._hasTriggerTarget(originalEvent.target)) {
            event.preventDefault();
            return;
          }
          context.handle._setInteractionType(
            originalEvent.pointerType === "touch" || originalEvent.pointerType === "pen"
              ? originalEvent.pointerType
              : "mouse",
          );
          if (originalEvent.pointerType === "touch" || context.modal() !== "trap-focus") {
            event.preventDefault();
            if (originalEvent.pointerType === "touch") {
              context.handle._requestOpen(false, "outside-press", originalEvent, null);
            } else {
              context.handle._markOutsidePressEligible(true);
            }
            return;
          }
          context.recordChange("outside-press", originalEvent);
        }}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {local.children}
      </PopoverPrimitive.Content>
      <PopoverFocusGuard onFocus={onAfterContentGuardFocus} />
    </PopoverPrimitive.Portal>
  );
};

type PopoverHeaderProps = ComponentProps<"div">;

const PopoverHeader = (props: PopoverHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div data-slot="popover-header" class={cn("z-popover-header", local.class)} {...others} />;
};

type PopoverTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<
  T,
  PopoverPrimitive.PopoverTitleProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const PopoverTitle = <T extends ValidComponent = "h2">(props: PopoverTitleProps<T>) => {
  const [local, others] = splitProps(props as PopoverTitleProps, ["class"]);
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      class={cn("z-popover-title", local.class)}
      {...others}
    />
  );
};

type PopoverDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<
  T,
  PopoverPrimitive.PopoverDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const PopoverDescription = <T extends ValidComponent = "p">(props: PopoverDescriptionProps<T>) => {
  const [local, others] = splitProps(props as PopoverDescriptionProps, ["class"]);
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      class={cn("z-popover-description", local.class)}
      {...others}
    />
  );
};

export type {
  PopoverActions,
  PopoverAlign,
  PopoverChangeEventDetails,
  PopoverChangeEventReason,
  PopoverContentProps,
  PopoverHandle,
  PopoverOffset,
  PopoverOffsetData,
  PopoverPayloadChildRenderFunction,
  PopoverProps,
  PopoverSide,
  PopoverTriggerProps,
};
export {
  createPopoverHandle,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
