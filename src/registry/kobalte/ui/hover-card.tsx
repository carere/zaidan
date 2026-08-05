import * as HoverCardPrimitive from "@kobalte/core/hover-card";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopperPrimitive from "@kobalte/core/popper";
import type { JSX, ValidComponent } from "solid-js";
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
  closeDelay: () => number;
  element: HTMLElement;
  payload: () => Payload | undefined;
};

type HoverCardInlineRectCoordinates = {
  element: HTMLElement;
  lineIndex: number | undefined;
  x: number;
  y: number;
};

type HoverCardRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
};

function createHoverCardRect(left: number, top: number, right: number, bottom: number) {
  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
    x: left,
    y: top,
  } satisfies HoverCardRect;
}

function hoverCardLineRects(element: HTMLElement) {
  const lines: HoverCardRect[] = [];
  let previousRect: DOMRect | undefined;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const rect of Array.from(element.getClientRects()).sort((a, b) => a.top - b.top)) {
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
    if (!previousRect || rect.top - previousRect.top > previousRect.height / 2) {
      lines.push(createHoverCardRect(rect.left, rect.top, rect.right, rect.bottom));
    } else {
      const line = lines[lines.length - 1];
      lines[lines.length - 1] = createHoverCardRect(
        Math.min(line.left, rect.left),
        line.top,
        Math.max(line.right, rect.right),
        Math.max(line.bottom, rect.bottom),
      );
    }
    previousRect = rect;
  }

  return { lines, fallback: createHoverCardRect(left, top, right, bottom) };
}

function hoverCardLineIndex(lines: HoverCardRect[], x: number, y: number) {
  const lineIndex = lines.findIndex(
    (line) => x > line.left - 2 && x < line.right + 2 && y > line.top - 2 && y < line.bottom + 2,
  );
  return lineIndex === -1 ? undefined : lineIndex;
}

function hoverCardInlineRect(
  element: HTMLElement,
  placement: HoverCardPlacement,
  coordinates: HoverCardInlineRectCoordinates | undefined,
) {
  const { fallback, lines } = hoverCardLineRects(element);
  if (lines.length < 2) return element.getBoundingClientRect();
  if (coordinates?.lineIndex !== undefined && lines[coordinates.lineIndex]) {
    return lines[coordinates.lineIndex];
  }
  if (coordinates) {
    const lineIndex = hoverCardLineIndex(lines, coordinates.x, coordinates.y);
    if (lineIndex !== undefined) return lines[lineIndex];
    if (lines.length === 2 && lines[0].left > lines[1].right) return fallback;
  }

  const side = placementParts(placement).side;
  if (side === "top" || side === "bottom") {
    const firstRect = lines[0];
    const lastRect = lines[lines.length - 1];
    const targetRect = side === "top" ? firstRect : lastRect;
    return createHoverCardRect(targetRect.left, firstRect.top, targetRect.right, lastRect.bottom);
  }

  const isLeft = side === "left";
  let left = lines[0].left;
  let right = lines[0].right;
  let edge = isLeft ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  let targetFirstRect = lines[0];
  let targetLastRect = lines[0];
  for (const rect of lines) {
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    const nextEdge = isLeft ? rect.left : rect.right;
    if ((isLeft && nextEdge < edge) || (!isLeft && nextEdge > edge)) {
      edge = nextEdge;
      targetFirstRect = rect;
      targetLastRect = rect;
    } else if (nextEdge === edge) {
      targetLastRect = rect;
    }
  }
  return createHoverCardRect(left, targetFirstRect.top, right, targetLastRect.bottom);
}

class HoverCardHandle<Payload = unknown> {
  readonly #triggers = new Map<string, HoverCardTriggerRegistration<Payload>>();
  readonly #openState = createSignal(false);
  readonly #activeTriggerIdState = createSignal<string | null>(null);
  readonly #payloadState = createSignal<Payload>();
  #request: HoverCardHandleRequest | undefined;
  #closeTimer: number | undefined;
  #content: HTMLElement | undefined;
  #hoverClosing = false;
  #inlineRectCoordinates: HoverCardInlineRectCoordinates | undefined;

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

  _activeTriggerId() {
    return this.#activeTriggerIdState[0]();
  }

  _activeCloseDelay() {
    const triggerId = this.#activeTriggerIdState[0]();
    return triggerId ? (this.#triggers.get(triggerId)?.closeDelay() ?? 300) : 300;
  }

  _anchorRect(placement: HoverCardPlacement) {
    const trigger = this._trigger(this._activeTriggerId());
    if (!trigger) return undefined;
    const coordinates =
      this.#inlineRectCoordinates?.element === trigger ? this.#inlineRectCoordinates : undefined;
    return hoverCardInlineRect(trigger, placement, coordinates);
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
    if (open) this._activate(triggerId);
    this.#openState[1](open);
  }

  _activate(triggerId: string | null) {
    const registration = triggerId ? this.#triggers.get(triggerId) : undefined;
    this.#activeTriggerIdState[1](triggerId);
    this.#payloadState[1](() => registration?.payload());
  }

  _contentContains(target: EventTarget | null) {
    return target instanceof Node && this.#content?.contains(target);
  }

  _clearInlineRect() {
    this.#inlineRectCoordinates = undefined;
  }

  _hasScheduledClose() {
    return this.#closeTimer !== undefined;
  }

  _isHoverClosing() {
    return this.#hoverClosing;
  }

  _hasTriggerTarget(target: EventTarget | null) {
    return (
      target instanceof Node &&
      Array.from(this.#triggers.values()).some(({ element }) => element.contains(target))
    );
  }

  _initialize(open: boolean, triggerId: string | null) {
    if (this.#openState[0]() === open && this.#activeTriggerIdState[0]() === triggerId) return;
    this._commit(open, triggerId);
  }

  _isOpenedBy(triggerId: string) {
    return this.#openState[0]() && this.#activeTriggerIdState[0]() === triggerId;
  }

  _implicitTriggerId(triggerId: string | null) {
    if (triggerId && this.#triggers.has(triggerId)) return triggerId;
    if (this.#triggers.size !== 1) return null;
    return this.#triggers.keys().next().value ?? null;
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
        queueMicrotask(() => {
          if (
            this.#openState[0]() &&
            this.#activeTriggerIdState[0]() === triggerId &&
            !this.#triggers.has(triggerId)
          ) {
            if (this._requestOpen(false, "none", undefined, triggerId)) this._activate(null);
          }
        });
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
    if (this.#request) return this.#request(open, reason, event, triggerId);
    if (open && this.#openState[0]() && triggerId !== this.#activeTriggerIdState[0]()) {
      this._commit(true, triggerId);
      return true;
    }
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

  _setHoverClosing(hoverClosing: boolean) {
    this.#hoverClosing = hoverClosing;
  }

  _updateInlineRect(element: HTMLElement, x: number, y: number) {
    const { lines } = hoverCardLineRects(element);
    this.#inlineRectCoordinates =
      lines.length < 2 ? undefined : { element, lineIndex: hoverCardLineIndex(lines, x, y), x, y };
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

function isMouseLikePointerType(pointerType: string) {
  return pointerType === "" || pointerType === "mouse" || pointerType === "pen";
}

function nextHoverCardAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      queueMicrotask(resolve);
    }
  });
}

type HoverCardContextValue = {
  ancestorHandles: readonly HoverCardHandle<unknown>[];
  configurePosition: (position: ResolvedHoverCardPosition) => void;
  currentPlacement: () => HoverCardPlacement;
  defaultPosition: ResolvedHoverCardPosition;
  forceUnmounted: () => boolean;
  handle: HoverCardHandle<unknown>;
  mounted: () => boolean;
  open: () => boolean;
  recordPlacement: (placement: HoverCardPlacement) => void;
  setContent: (element: HTMLElement | undefined) => void;
  transitionStatus: () => HoverCardTransitionStatus;
  trigger: () => HTMLElement | undefined;
};

const HoverCardContext = createContext<HoverCardContextValue>();

const hoverCardContentAncestors = new WeakMap<HTMLElement, Set<HoverCardHandle<unknown>>>();

function isTargetWithinDescendantHoverCard(
  target: EventTarget | null,
  handle: HoverCardHandle<unknown>,
) {
  let element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  while (element) {
    if (hoverCardContentAncestors.get(element as HTMLElement)?.has(handle)) return true;
    element = element.parentElement;
  }
  return false;
}

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

type HoverCardPoint = [number, number];

function hoverCardSafeArea(
  placement: HoverCardPlacement,
  anchor: HTMLElement,
  content: HTMLElement,
) {
  const side = placementParts(placement).side;
  const anchorRect = anchor.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const points: HoverCardPoint[] = [];

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

function isPointInHoverCardArea(x: number, y: number, points: HoverCardPoint[]) {
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
  type ChildBox = { child: JSX.Element | HoverCardPayloadChildRenderFunction<Payload> };
  const resolved = resolveChildren(
    () => ({ child: props.getChildren() }) as unknown as JSX.Element,
  );
  const renderedChild = createMemo(() => {
    const child = (resolved() as unknown as ChildBox).child;
    return typeof child === "function" ? child({ payload: props.payload() }) : child;
  });
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
  const parentContext = useContext(HoverCardContext);
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
  const [forceUnmounted, setForceUnmounted] = createSignal(false);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [transitionStatus, setTransitionStatus] = createSignal<HoverCardTransitionStatus>();
  const [content, setContentElement] = createSignal<HTMLElement>();
  const handle = local.handle ?? createHoverCardHandle<Payload>();
  const ancestorHandles = parentContext
    ? [...parentContext.ancestorHandles, parentContext.handle]
    : [];
  const setRootContent = (element: HTMLElement | undefined) => {
    const previousElement = untrack(content);
    if (previousElement && previousElement !== element) {
      hoverCardContentAncestors.delete(previousElement);
    }
    if (element && ancestorHandles.length > 0) {
      hoverCardContentAncestors.set(element, new Set(ancestorHandles));
    }
    setContentElement(element);
    handle._setContent(element);
  };
  if (local.open === undefined && local.defaultOpen && !handle.isOpen) {
    handle._initialize(true, local.defaultTriggerId ?? null);
  }
  const activeTriggerId = () =>
    local.triggerId !== undefined ? local.triggerId : handle._activeTriggerId();
  const trigger = () => handle._trigger(activeTriggerId());
  const open = () => local.open ?? handle.isOpen;
  const [mounted, setMounted] = createSignal(open());
  const payload = () =>
    local.triggerId !== undefined ? handle._payloadFor(local.triggerId) : handle._payload();
  let previousOpen = open();
  let shouldCompleteInitialOpen = previousOpen;
  let previousControlledOpen = local.open;
  let completeVersion = 0;

  const requestOpenChange = (
    nextOpen: boolean,
    reason: HoverCardChangeEventReason,
    event?: Event,
    changeTrigger?: Element,
    changeTriggerId?: string | null,
  ) => {
    const nextTriggerId = changeTriggerId ?? changeTrigger?.id ?? handle._activeTriggerId();
    const switchesTrigger =
      nextOpen && nextTriggerId !== null && nextTriggerId !== handle._activeTriggerId();
    if (nextOpen === open() && !switchesTrigger) {
      return { accepted: false } satisfies HoverCardOpenChangeResult;
    }
    let shouldPreventUnmount = false;
    const details = createChangeDetails(
      reason,
      event,
      nextOpen ? (changeTrigger ?? trigger()) : undefined,
      () => {
        shouldPreventUnmount = !nextOpen;
      },
    );
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) {
      return { accepted: false, details } satisfies HoverCardOpenChangeResult;
    }
    if (nextOpen) {
      handle._setHoverClosing(false);
      setForceUnmounted(false);
      setMounted(true);
      setPreventedUnmount(false);
    } else {
      handle._setHoverClosing(reason === "trigger-hover");
      if (shouldPreventUnmount) setPreventedUnmount(true);
    }
    if (local.open === undefined) {
      handle._commit(nextOpen, nextTriggerId);
    } else if (nextOpen && local.triggerId === undefined) {
      handle._activate(nextTriggerId);
    }
    return { accepted: true, details } satisfies HoverCardOpenChangeResult;
  };

  const context: HoverCardContextValue = {
    ancestorHandles,
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
    forceUnmounted,
    handle: handle as HoverCardHandle<unknown>,
    mounted,
    open,
    recordPlacement: (placement) => {
      setCurrentPlacement(placement);
    },
    setContent: setRootContent,
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
    const controlledOpen = local.open;
    if (controlledOpen === undefined) return;
    if (controlledOpen && previousControlledOpen === false) {
      setForceUnmounted(false);
      setMounted(true);
    }
    previousControlledOpen = controlledOpen;
    const triggerId =
      local.triggerId !== undefined
        ? local.triggerId
        : controlledOpen
          ? handle._implicitTriggerId(handle._activeTriggerId())
          : handle._activeTriggerId();
    handle._initialize(controlledOpen, triggerId);
  });

  createEffect(() => {
    if (!open()) return;
    const recordEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const result = requestOpenChange(false, "escape-key", event, trigger());
      if (result.accepted) event.preventDefault();
      if (!result.details?.isPropagationAllowed) event.stopPropagation();
    };
    const recordOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        trigger()?.contains(target) ||
        content()?.contains(target) ||
        isTargetWithinDescendantHoverCard(target, handle as HoverCardHandle<unknown>)
      )
        return;
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
    if (!open()) return;
    const recordPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const activeTrigger = trigger();
      const activeContent = content();
      const target = event.target;
      if (!activeTrigger || !activeContent) return;
      if (
        (target instanceof Node && activeTrigger.contains(target)) ||
        handle._contentContains(target) ||
        isTargetWithinDescendantHoverCard(target, handle as HoverCardHandle<unknown>) ||
        isPointInHoverCardArea(
          event.clientX,
          event.clientY,
          hoverCardSafeArea(currentPlacement(), activeTrigger, activeContent),
        )
      ) {
        handle._cancelClosing();
        return;
      }
      const triggerId = handle._activeTriggerId();
      if (triggerId && !handle._hasScheduledClose()) {
        handle._scheduleClose(handle._activeCloseDelay(), event, triggerId);
      }
    };
    document.addEventListener("pointermove", recordPointerMove, true);
    onCleanup(() => document.removeEventListener("pointermove", recordPointerMove, true));
  });

  createRenderEffect(() => {
    const nextOpen = open();
    const isInitialOpen = shouldCompleteInitialOpen;
    shouldCompleteInitialOpen = false;
    if (nextOpen === previousOpen && !isInitialOpen) return;
    previousOpen = nextOpen;
    setTransitionStatus(isInitialOpen ? undefined : nextOpen ? "starting" : "ending");
    const version = ++completeVersion;
    queueMicrotask(async () => {
      await nextHoverCardAnimationFrame();
      if (version !== completeVersion) return;
      if (nextOpen) setTransitionStatus(undefined);
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
      if (version === completeVersion) {
        setTransitionStatus(undefined);
        if (!nextOpen) handle._setHoverClosing(false);
        if (!nextOpen && preventedUnmount()) return;
        if (!nextOpen) {
          setMounted(false);
          setRootContent(undefined);
        }
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
        completeVersion += 1;
        previousOpen = false;
        setTransitionStatus(undefined);
        setPreventedUnmount(false);
        setForceUnmounted(true);
        setMounted(false);
        setRootContent(undefined);
        handle._setHoverClosing(false);
        handle._activate(null);
        local.onOpenChangeComplete?.(false);
      },
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  onCleanup(() => {
    completeVersion += 1;
    setRootContent(undefined);
    handle._setHoverClosing(false);
  });

  return (
    <HoverCardContext.Provider value={context}>
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        closeDelay={handle._activeCloseDelay()}
        forceMount={mounted()}
        getAnchorRect={() => handle._anchorRect(positionToPlacement(position()))}
        gutter={position().sideOffset}
        hideWhenDetached
        open={open()}
        openDelay={600}
        overflowPadding={5}
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
    "onPointerMove",
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
    if (
      (local.handle?.isOpen && !local.handle._isOpenedBy(id())) ||
      (reason === "trigger-hover" && local.handle?._isHoverClosing())
    ) {
      local.handle._requestOpen(true, reason, event, id());
      return;
    }
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
    if (event.defaultPrevented || !isMouseLikePointerType(event.pointerType)) return;
    local.handle?._updateInlineRect(event.currentTarget, event.clientX, event.clientY);
    openWithDelay("trigger-hover", event);
  };
  const onPointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || !isMouseLikePointerType(event.pointerType)) return;
    if (!local.handle?._isOpenedBy(id())) {
      local.handle?._updateInlineRect(event.currentTarget, event.clientX, event.clientY);
    }
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (!isMouseLikePointerType(event.pointerType)) return;
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
    local.handle?._clearInlineRect();
    if (local.handle?.isOpen && local.handle._hasTriggerTarget(event.relatedTarget)) {
      local.handle._requestOpen(true, "trigger-focus", event, id());
      return;
    }
    openWithDelay("trigger-focus", event);
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    cancelOpening();
    if (local.handle?._contentContains(event.relatedTarget)) return;
    if (local.handle?._hasTriggerTarget(event.relatedTarget)) return;
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
            closeDelay: () => local.closeDelay ?? 300,
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
      onPointerMove={onPointerMove}
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

  const cleanupPositioner = () => {
    if (measurementAnimationFrame !== undefined) {
      cancelAnimationFrame(measurementAnimationFrame);
      measurementAnimationFrame = undefined;
    }
    mutationObserver?.disconnect();
    mutationObserver = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    setPositioner(undefined);
  };

  const resolvedPosition = (): ResolvedHoverCardPosition => {
    measurementVersion();
    const requested = requestedPosition();
    const resolvedPlacement = context.currentPlacement();
    const anchorRect = context.handle._anchorRect(positionToPlacement(requested));
    const positionerRect = positioner()?.getBoundingClientRect();
    const offsetData: HoverCardOffsetData = {
      align: placementParts(resolvedPlacement).align,
      anchor: { height: anchorRect?.height ?? 0, width: anchorRect?.width ?? 0 },
      positioner: {
        height: positionerRect?.height ?? 0,
        width: positionerRect?.width ?? 0,
      },
      side: exposedSide(resolvedPlacement, requested.side),
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
    if (context.forceUnmounted()) cleanupPositioner();
  });
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

  onCleanup(cleanupPositioner);

  const setContentRef = (element: HTMLElement) => {
    context.setContent(element);
    primitiveContext.setContentRef(element);
    setElementRef(local.ref, element);
    queueMicrotask(() => configurePositioner(element));
  };

  const configurePositioner = (element: HTMLElement) => {
    const positionerElement = element.parentElement;
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
      const anchorRect = context.handle._anchorRect(context.currentPlacement());
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
    for (const ancestorHandle of context.ancestorHandles) ancestorHandle._cancelClosing();
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (context.trigger()?.contains(event.relatedTarget as Node | null)) return;
    const triggerId = context.handle._activeTriggerId();
    if (triggerId) {
      context.handle._scheduleClose(context.handle._activeCloseDelay(), event, triggerId);
    }
  };

  return (
    <Show when={context.mounted() && !context.forceUnmounted()}>
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
    </Show>
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
