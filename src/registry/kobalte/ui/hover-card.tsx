import * as HoverCardPrimitive from "@kobalte/core/hover-card";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
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
  open: () => boolean;
  recordChange: (reason: HoverCardChangeEventReason, event: Event, trigger?: Element) => void;
  recordPlacement: (placement: HoverCardPlacement) => void;
  setContent: (element: HTMLElement | undefined) => void;
  setTrigger: (element: HTMLElement | undefined) => void;
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

/**
 * The pinned Base UI root surface adapted to Solid.
 *
 * Base UI's detached `handle`, trigger IDs/payload, and render-function children need a
 * shared cross-tree trigger store that Kobalte does not provide. Solid callers use controlled
 * `open`, `onOpenChange`, `actionsRef`, JSX children, and polymorphic `as` props instead.
 */
type HoverCardProps = {
  actionsRef?: { current: HoverCardActions | null };
  children?: JSX.Element;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: HoverCardChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  open?: boolean;
};

type HoverCardActions = {
  close: () => void;
  unmount: () => void;
};

const HoverCard = (props: HoverCardProps) => {
  const [local] = splitProps(props, [
    "actionsRef",
    "children",
    "defaultOpen",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
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
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [openDelay, setOpenDelay] = createSignal(600);
  const [closeDelay, setCloseDelay] = createSignal(300);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [transitionStatus, setTransitionStatus] = createSignal<HoverCardTransitionStatus>();
  const [content, setContent] = createSignal<HTMLElement>();
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const open = () => local.open ?? uncontrolledOpen();
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
  ) => {
    if (nextOpen === open()) return;
    let shouldPreventUnmount = false;
    const details = createChangeDetails(reason, event, changeTrigger ?? trigger(), () => {
      shouldPreventUnmount = !nextOpen;
    });
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return;
    if (nextOpen) setPreventedUnmount(false);
    else if (shouldPreventUnmount) setPreventedUnmount(true);
    if (local.open === undefined) setUncontrolledOpen(nextOpen);
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
    open,
    recordChange: (reason, event, changeTrigger) => {
      pendingChange = { event, reason, trigger: changeTrigger };
    },
    recordPlacement: (placement) => {
      setCurrentPlacement(placement);
    },
    setContent,
    setTrigger,
    transitionStatus,
    trigger,
  };

  createEffect(() => {
    if (!open()) return;
    const recordEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        pendingChange = { event, reason: "escape-key", trigger: trigger() };
    };
    const recordOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (trigger()?.contains(target) || content()?.contains(target)) return;
      pendingChange = { event, reason: "outside-press", trigger: trigger() };
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
    setTrigger(undefined);
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
        {local.children}
      </HoverCardPrimitive.Root>
    </HoverCardContext.Provider>
  );
};

type HoverCardTriggerProps<T extends ValidComponent = "a"> = PolymorphicProps<
  T,
  { closeDelay?: number; delay?: number }
>;

const HoverCardTrigger = <T extends ValidComponent = "a">(props: HoverCardTriggerProps<T>) => {
  const context = useHoverCardContext();
  const [local, others] = splitProps(props as HoverCardTriggerProps, [
    "closeDelay",
    "delay",
    "onBlur",
    "onFocus",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
  ]);
  const configureDelays = () => context.configureDelays(local.delay, local.closeDelay);

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
    configureDelays();
    context.recordChange("trigger-hover", event, event.currentTarget);
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.pointerType !== "mouse") return;
    configureDelays();
    context.recordChange("trigger-hover", event, event.currentTarget);
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    configureDelays();
    context.recordChange("trigger-focus", event, event.currentTarget);
  };
  const onBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    configureDelays();
    context.recordChange("trigger-focus", event, event.currentTarget);
  };

  return (
    <HoverCardPrimitive.Trigger
      ref={(element) => {
        context.setTrigger(element);
        setElementRef(local.ref, element);
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-popup-open={context.open() ? "" : undefined}
      data-slot="hover-card-trigger"
      {...others}
    />
  );
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
  const [local, others] = splitProps(props as HoverCardContentProps, [
    "align",
    "alignOffset",
    "children",
    "class",
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
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
  });

  const setContentRef = (element: HTMLElement) => {
    context.setContent(element);
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
      resizeObserver = new ResizeObserver(updateMeasurements);
      resizeObserver.observe(trigger);
      resizeObserver.observe(element);
    }
  };

  const side = () => exposedSide(context.currentPlacement(), requestedPosition().side);
  const align = () => placementParts(context.currentPlacement()).align;

  return (
    <HoverCardPrimitive.Portal
      ref={(element) => element.setAttribute("data-slot", "hover-card-portal")}
    >
      <HoverCardPrimitive.Content
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
        {...others}
      >
        {local.children}
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  );
};

export type {
  HoverCardActions,
  HoverCardAlign,
  HoverCardChangeEventDetails,
  HoverCardChangeEventReason,
  HoverCardContentProps,
  HoverCardOffset,
  HoverCardOffsetData,
  HoverCardProps,
  HoverCardSide,
};
export { HoverCard, HoverCardContent, HoverCardTrigger };
