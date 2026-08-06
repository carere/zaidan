import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as PopperPrimitive from "@kobalte/core/popper";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-solid";
import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { cn } from "@/lib/utils";

type NavigationMenuAlign = "center" | "end" | "start";
type NavigationMenuOrientation = "horizontal" | "vertical";
type NavigationMenuPhysicalSide = "bottom" | "left" | "right" | "top";
type NavigationMenuSide = NavigationMenuPhysicalSide | "inline-end" | "inline-start";
type NavigationMenuValue = unknown;

type NavigationMenuCollisionPadding = number | Partial<Record<NavigationMenuPhysicalSide, number>>;

type NavigationMenuVirtualElement = {
  contextElement?: Element;
  getBoundingClientRect: () => DOMRect | { height: number; width: number; x: number; y: number };
};

type NavigationMenuAnchorTarget = Element | NavigationMenuVirtualElement;
type NavigationMenuAnchor =
  | NavigationMenuAnchorTarget
  | { current: NavigationMenuAnchorTarget | null }
  | (() => NavigationMenuAnchorTarget | null)
  | null;

type NavigationMenuOffsetData = {
  align: NavigationMenuAlign;
  anchor: { height: number; width: number };
  positioner: { height: number; width: number };
  side: NavigationMenuSide;
};

type NavigationMenuOffset = number | ((data: NavigationMenuOffsetData) => number);

type NavigationMenuCollisionAvoidance = {
  align?: "flip" | "none" | "shift";
  fallbackAxisSide?: "end" | "none" | "start";
  side?: "flip" | "none" | "shift";
};

type NavigationMenuChangeEventReason =
  | "escape-key"
  | "focus-out"
  | "link-press"
  | "list-navigation"
  | "none"
  | "outside-press"
  | "trigger-hover"
  | "trigger-press";

type NavigationMenuChangeEventDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  readonly event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  readonly reason: NavigationMenuChangeEventReason;
  readonly trigger: Element | undefined;
};

type NavigationMenuActions = {
  unmount: () => void;
};

type NavigationMenuPosition = {
  align: NavigationMenuAlign;
  alignOffset: number;
  anchor?: NavigationMenuAnchor;
  arrowPadding: number;
  collisionPadding: NavigationMenuCollisionPadding;
  flip: boolean | string;
  overlap: boolean;
  positionMethod: "absolute" | "fixed";
  side: NavigationMenuSide;
  sideOffset: number;
  slide: boolean;
};

type NavigationMenuTransition = {
  direction: "down" | "left" | "right" | "up" | undefined;
  from: NavigationMenuValue | null;
  status: "ending" | "starting" | undefined;
  to: NavigationMenuValue | null;
};

type NavigationMenuRootContextValue = {
  activeContent: Accessor<HTMLElement | undefined>;
  activeTrigger: Accessor<HTMLElement | undefined>;
  cancelClosing: () => void;
  close: (
    reason: NavigationMenuChangeEventReason,
    event?: Event,
  ) => NavigationMenuChangeEventDetails | undefined;
  closeDelay: Accessor<number>;
  contentId: (value: NavigationMenuValue) => string | undefined;
  currentPlacement: Accessor<string>;
  delay: Accessor<number>;
  focusAfterTrigger: (trigger: HTMLElement) => void;
  hasMountedValue: (value: NavigationMenuValue) => boolean;
  isAfterActiveTrigger: (element: HTMLElement) => boolean;
  isTabStop: (element: HTMLElement) => boolean;
  open: (value: NavigationMenuValue, reason: NavigationMenuChangeEventReason, event: Event) => void;
  orientation: Accessor<NavigationMenuOrientation>;
  position: Accessor<NavigationMenuPosition>;
  popup: Accessor<HTMLElement | undefined>;
  registerContent: (value: NavigationMenuValue, element: HTMLElement) => () => void;
  registerContentId: (value: NavigationMenuValue, id: string) => () => void;
  registerItem: (value: NavigationMenuValue, element: HTMLElement) => () => void;
  registerKeepMounted: (value: NavigationMenuValue, keepMounted: boolean) => () => void;
  registerTopLevelItem: (element: HTMLElement) => () => void;
  registerTrigger: (value: NavigationMenuValue, element: HTMLElement) => () => void;
  requestCloseWithDelay: (event: Event) => void;
  setPopup: (element: HTMLElement | undefined) => void;
  setPosition: (position: NavigationMenuPosition) => void;
  setTabStop: (element: HTMLElement) => void;
  setViewport: (element: HTMLElement | undefined) => void;
  shouldMountPositioner: Accessor<boolean>;
  transition: Accessor<NavigationMenuTransition>;
  value: Accessor<NavigationMenuValue | null>;
  viewport: Accessor<HTMLElement | undefined>;
};

type NavigationMenuItemContextValue = {
  contentId: Accessor<string | undefined>;
  setContentId: (id: string | undefined) => void;
  setTriggerId: (id: string | undefined) => void;
  triggerId: Accessor<string | undefined>;
  value: Accessor<NavigationMenuValue>;
};

const NavigationMenuRootContext = createContext<NavigationMenuRootContextValue>();
const NavigationMenuItemContext = createContext<NavigationMenuItemContextValue>();
const NavigationMenuContentContext = createContext(false);

function useNavigationMenuRootContext() {
  const context = useContext(NavigationMenuRootContext);
  if (!context) throw new Error("NavigationMenu parts must be used within NavigationMenu");
  return context;
}

function useNavigationMenuItemContext() {
  const context = useContext(NavigationMenuItemContext);
  if (!context) throw new Error("NavigationMenuTrigger and Content must be used within an Item");
  return context;
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

function physicalSide(side: NavigationMenuSide): NavigationMenuPhysicalSide {
  if (side === "inline-start") return "left";
  if (side === "inline-end") return "right";
  return side;
}

function resolveNavigationMenuAnchor(anchor: NavigationMenuAnchor | undefined) {
  const resolved = typeof anchor === "function" ? anchor() : anchor;
  if (resolved && "current" in resolved) return resolved.current;
  return resolved ?? undefined;
}

function navigationMenuPlacement(position: NavigationMenuPosition) {
  const side = physicalSide(position.side);
  return position.align === "center" ? side : (`${side}-${position.align}` as const);
}

function navigationMenuFlipPlacements(
  side: NavigationMenuSide,
  align: NavigationMenuAlign,
  collisionAvoidance: NavigationMenuCollisionAvoidance | undefined,
) {
  const physical = physicalSide(side);
  const sideCollision = collisionAvoidance?.side ?? "flip";
  const alignCollision = collisionAvoidance?.align ?? "flip";
  const fallbackAxisSide = collisionAvoidance?.fallbackAxisSide ?? "none";
  const oppositeSide: Record<NavigationMenuPhysicalSide, NavigationMenuPhysicalSide> = {
    bottom: "top",
    left: "right",
    right: "left",
    top: "bottom",
  };
  const placement = (nextSide: NavigationMenuPhysicalSide, nextAlign = align) =>
    nextAlign === "center" ? nextSide : `${nextSide}-${nextAlign}`;
  const placements: string[] = [];
  const oppositeAlign = align === "start" ? "end" : align === "end" ? "start" : "center";
  if (alignCollision === "flip" && align !== "center") {
    placements.push(placement(physical, oppositeAlign));
  }
  if (sideCollision === "flip") {
    placements.push(placement(oppositeSide[physical]));
    if (alignCollision === "flip" && align !== "center") {
      placements.push(placement(oppositeSide[physical], oppositeAlign));
    }
  }
  if (fallbackAxisSide !== "none") {
    const perpendicular: [NavigationMenuPhysicalSide, NavigationMenuPhysicalSide] =
      physical === "bottom" || physical === "top" ? ["left", "right"] : ["top", "bottom"];
    if (fallbackAxisSide === "end") perpendicular.reverse();
    placements.push(...perpendicular.map((fallbackSide) => placement(fallbackSide)));
  }
  return placements.length > 0 ? placements.join(" ") : false;
}

/** Kobalte Popper exposes one overflow padding value, so asymmetric Base UI padding is
 * conservatively represented by its largest edge. The public shape remains compatible. */
function collisionPaddingValue(padding: NavigationMenuCollisionPadding) {
  if (typeof padding === "number") return padding;
  return Math.max(0, ...Object.values(padding).filter((value) => value !== undefined));
}

function resolveNavigationMenuOffset(offset: NavigationMenuOffset, data: NavigationMenuOffsetData) {
  return typeof offset === "function" ? offset(data) : offset;
}

function nextNavigationMenuAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function createChangeDetails(
  reason: NavigationMenuChangeEventReason,
  event: Event | undefined,
  trigger: Element | undefined,
): NavigationMenuChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  const changeEvent = event ?? new Event("navigation-menu-value-change");
  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: changeEvent,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
    trigger,
  };
}

function isSameValue(left: NavigationMenuValue | null, right: NavigationMenuValue | null) {
  return Object.is(left, right);
}

function focusableContentItems(content: HTMLElement | undefined) {
  if (!content) return [];
  return Array.from(
    content.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && !element.closest("[inert]"));
}

type NavigationMenuProps<T extends ValidComponent = "nav", Value = unknown> = PolymorphicProps<
  T,
  {
    actionsRef?: { current: NavigationMenuActions | null };
    align?: NavigationMenuAlign;
    children?: JSX.Element;
    class?: string;
    closeDelay?: number;
    defaultValue?: Value | null;
    delay?: number;
    onValueChange?: (value: Value | null, details: NavigationMenuChangeEventDetails) => void;
    onOpenChangeComplete?: (open: boolean) => void;
    orientation?: NavigationMenuOrientation;
    value?: Value | null;
  }
>;

/**
 * Base UI's list anatomy cannot be expressed through Kobalte NavigationMenu because that Root
 * owns its `<ul>` and every Trigger owns a `<li>`. This Solid adapter keeps Kobalte's maintained
 * Popper foundation while implementing the pinned `nav > ul > li` navigation semantics directly.
 */
const NavigationMenu = <Value = unknown, T extends ValidComponent = "nav">(
  props: NavigationMenuProps<T, Value>,
) => {
  const mergedProps = mergeProps(
    {
      align: "start" as NavigationMenuAlign,
      closeDelay: 50,
      delay: 50,
      orientation: "horizontal" as NavigationMenuOrientation,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps as NavigationMenuProps, [
    "actionsRef",
    "align",
    "as",
    "children",
    "class",
    "closeDelay",
    "defaultValue",
    "delay",
    "onKeyDownCapture",
    "onOpenChangeComplete",
    "onValueChange",
    "orientation",
    "ref",
    "value",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<NavigationMenuValue | null>(
    local.defaultValue ?? null,
  );
  const [root, setRoot] = createSignal<HTMLElement>();
  const [popup, setPopup] = createSignal<HTMLElement>();
  const [viewport, setViewport] = createSignal<HTMLElement>();
  const [position, setPosition] = createSignal<NavigationMenuPosition>({
    align: local.align ?? "start",
    alignOffset: 0,
    arrowPadding: 5,
    collisionPadding: 5,
    flip: true,
    overlap: false,
    positionMethod: "absolute",
    side: "bottom",
    sideOffset: 8,
    slide: true,
  });
  const [currentPlacement, setCurrentPlacement] = createSignal<string>(
    navigationMenuPlacement(position()),
  );
  const [mountedValues, setMountedValues] = createSignal<Set<NavigationMenuValue>>(new Set());
  const [transition, setTransition] = createSignal<NavigationMenuTransition>({
    direction: undefined,
    from: null,
    status: undefined,
    to: null,
  });
  const [tabStop, setTabStop] = createSignal<HTMLElement>();
  const [registrationsVersion, setRegistrationsVersion] = createSignal(0);
  const itemElements = new Map<NavigationMenuValue, HTMLElement>();
  const triggerElements = new Map<NavigationMenuValue, HTMLElement>();
  const triggerValues = new WeakMap<HTMLElement, NavigationMenuValue>();
  const contentElements = new Map<NavigationMenuValue, HTMLElement>();
  const contentIds = new Map<NavigationMenuValue, string>();
  const keepMountedValues = new Set<NavigationMenuValue>();
  const topLevelItems = new Set<HTMLElement>();
  let closeTimer: number | undefined;
  let transitionVersion = 0;
  const value = () => (local.value === undefined ? uncontrolledValue() : (local.value ?? null));
  const activeTrigger = () => {
    registrationsVersion();
    const currentValue = value();
    return currentValue === null ? undefined : triggerElements.get(currentValue);
  };
  const positioningAnchor = () => resolveNavigationMenuAnchor(position().anchor);
  const positioningAnchorElement = () => {
    const anchor = positioningAnchor();
    return typeof HTMLElement !== "undefined" && anchor instanceof HTMLElement
      ? anchor
      : activeTrigger();
  };
  const positioningAnchorRect = () =>
    positioningAnchor()?.getBoundingClientRect() ?? activeTrigger()?.getBoundingClientRect();
  const activeContent = () => {
    registrationsVersion();
    const currentValue = value();
    return currentValue === null ? undefined : contentElements.get(currentValue);
  };
  const shouldMountPositioner = () => {
    registrationsVersion();
    return mountedValues().size > 0 || keepMountedValues.size > 0;
  };
  const bumpRegistrations = () => setRegistrationsVersion((version) => version + 1);
  const clearCloseTimer = () => {
    if (typeof window !== "undefined") window.clearTimeout(closeTimer);
    closeTimer = undefined;
  };
  const orderedValues = () => Array.from(itemElements.keys());
  const focusAfterTrigger = (trigger: HTMLElement) => {
    const items = Array.from(topLevelItems).filter(
      (element) =>
        element.isConnected &&
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-disabled") !== "true",
    );
    const nextItem = items[items.indexOf(trigger) + 1];
    if (nextItem) {
      setTabStop(nextItem);
      nextItem.focus();
      return;
    }
    const rootElement = root();
    if (!rootElement) return;
    const nextDocumentItem = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).find(
      (element) =>
        !rootElement.contains(element) &&
        !popup()?.contains(element) &&
        Boolean(rootElement.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    nextDocumentItem?.focus();
  };
  const activationDirection = (
    previousValue: NavigationMenuValue | null,
    nextValue: NavigationMenuValue | null,
  ) => {
    if (previousValue === null || nextValue === null) return undefined;
    const values = orderedValues();
    const previousIndex = values.findIndex((itemValue) => Object.is(itemValue, previousValue));
    const nextIndex = values.findIndex((itemValue) => Object.is(itemValue, nextValue));
    if (previousIndex === -1 || nextIndex === -1 || previousIndex === nextIndex) return undefined;
    if (local.orientation === "vertical") return nextIndex > previousIndex ? "down" : "up";
    return nextIndex > previousIndex ? "right" : "left";
  };

  const completeTransition = async (
    previousValue: NavigationMenuValue | null,
    nextValue: NavigationMenuValue | null,
    version: number,
  ) => {
    await nextNavigationMenuAnimationFrame();
    if (version !== transitionVersion) return;
    const popupElement = popup();
    const animations =
      popupElement && "getAnimations" in popupElement
        ? popupElement.getAnimations().filter((animation) => animation.playState !== "finished")
        : [];
    if (animations.length > 0) {
      await Promise.allSettled(animations.map((animation) => animation.finished));
    }
    if (version !== transitionVersion) return;
    if (nextValue === null && local.actionsRef) return;
    setTransition({
      direction: undefined,
      from: nextValue,
      status: undefined,
      to: nextValue,
    });
    setMountedValues((current) => {
      const next = new Set(current);
      if (previousValue !== null) next.delete(previousValue);
      if (nextValue === null) next.clear();
      return next;
    });
    if (nextValue === null) local.onOpenChangeComplete?.(false);
  };

  let observedValue = value();
  if (observedValue !== null) setMountedValues(new Set([observedValue]));
  createRenderEffect(() => {
    const nextValue = value();
    if (isSameValue(nextValue, observedValue)) return;
    const previousValue = observedValue;
    observedValue = nextValue;
    const direction = activationDirection(previousValue, nextValue);
    setMountedValues((current) => {
      const next = new Set(current);
      if (previousValue !== null) next.add(previousValue);
      if (nextValue !== null) next.add(nextValue);
      return next;
    });
    setTransition({
      direction,
      from: previousValue,
      status: previousValue === null ? "starting" : nextValue === null ? "ending" : undefined,
      to: nextValue,
    });
    void completeTransition(previousValue, nextValue, ++transitionVersion);
  });

  const requestValueChange = (
    nextValue: NavigationMenuValue | null,
    reason: NavigationMenuChangeEventReason,
    event?: Event,
    trigger?: Element,
  ) => {
    if (isSameValue(nextValue, value())) return undefined;
    const details = createChangeDetails(reason, event, trigger);
    local.onValueChange?.(nextValue, details);
    if (details.isCanceled) return details;
    if (local.value === undefined) setUncontrolledValue(nextValue);
    return details;
  };

  const close = (reason: NavigationMenuChangeEventReason, event?: Event) => {
    clearCloseTimer();
    return requestValueChange(null, reason, event, activeTrigger());
  };
  const open = (
    nextValue: NavigationMenuValue,
    reason: NavigationMenuChangeEventReason,
    event: Event,
  ) => {
    clearCloseTimer();
    requestValueChange(nextValue, reason, event, triggerElements.get(nextValue));
  };
  const requestCloseWithDelay = (event: Event) => {
    clearCloseTimer();
    if (typeof window === "undefined") return;
    closeTimer = window.setTimeout(() => close("trigger-hover", event), local.closeDelay);
  };

  createEffect(() => {
    if (value() === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (root()?.contains(target) || popup()?.contains(target)) return;
      close("outside-press", event);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (root()?.contains(target) || popup()?.contains(target)) return;
      close("focus-out", event);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    });
  });

  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const actions: NavigationMenuActions = {
      unmount: () => {
        transitionVersion += 1;
        clearCloseTimer();
        if (local.value === undefined) setUncontrolledValue(null);
        setTransition({ direction: undefined, from: null, status: undefined, to: null });
        setMountedValues(new Set());
        setPopup(undefined);
        setViewport(undefined);
        local.onOpenChangeComplete?.(false);
      },
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  const context: NavigationMenuRootContextValue = {
    activeContent,
    activeTrigger,
    cancelClosing: clearCloseTimer,
    close,
    closeDelay: () => local.closeDelay,
    contentId: (itemValue) => {
      registrationsVersion();
      return contentIds.get(itemValue);
    },
    currentPlacement,
    delay: () => local.delay,
    focusAfterTrigger,
    hasMountedValue: (itemValue) => {
      const current = mountedValues();
      return Array.from(current).some((mountedValue) => Object.is(mountedValue, itemValue));
    },
    isAfterActiveTrigger: (element) => {
      const active = activeTrigger();
      if (!active) return false;
      const items = Array.from(topLevelItems).filter(
        (item) =>
          item.isConnected &&
          !item.hasAttribute("disabled") &&
          item.getAttribute("aria-disabled") !== "true",
      );
      return items[items.indexOf(active) + 1] === element;
    },
    isTabStop: (element) => tabStop() === element,
    open,
    orientation: () => local.orientation,
    position,
    popup,
    registerContent: (itemValue, element) => {
      contentElements.set(itemValue, element);
      bumpRegistrations();
      return () => {
        if (contentElements.get(itemValue) === element) contentElements.delete(itemValue);
        bumpRegistrations();
      };
    },
    registerContentId: (itemValue, id) => {
      contentIds.set(itemValue, id);
      bumpRegistrations();
      return () => {
        if (contentIds.get(itemValue) === id) contentIds.delete(itemValue);
        bumpRegistrations();
      };
    },
    registerItem: (itemValue, element) => {
      itemElements.set(itemValue, element);
      bumpRegistrations();
      return () => {
        if (itemElements.get(itemValue) === element) itemElements.delete(itemValue);
        bumpRegistrations();
      };
    },
    registerKeepMounted: (itemValue, keepMounted) => {
      if (keepMounted) keepMountedValues.add(itemValue);
      bumpRegistrations();
      return () => {
        keepMountedValues.delete(itemValue);
        bumpRegistrations();
      };
    },
    registerTopLevelItem: (element) => {
      topLevelItems.add(element);
      if (!untrack(tabStop)) setTabStop(element);
      return () => {
        topLevelItems.delete(element);
        if (untrack(tabStop) === element) setTabStop(Array.from(topLevelItems)[0]);
      };
    },
    registerTrigger: (itemValue, element) => {
      triggerElements.set(itemValue, element);
      triggerValues.set(element, itemValue);
      bumpRegistrations();
      return () => {
        if (triggerElements.get(itemValue) === element) triggerElements.delete(itemValue);
        triggerValues.delete(element);
        bumpRegistrations();
      };
    },
    requestCloseWithDelay,
    setPopup,
    setPosition,
    setTabStop,
    setViewport,
    shouldMountPositioner,
    transition,
    value,
    viewport,
  };

  const onKeyDownCapture: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDownCapture as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && value() !== null) {
      const trigger = activeTrigger();
      const details = close("escape-key", event);
      event.preventDefault();
      if (!details?.isPropagationAllowed) event.stopPropagation();
      trigger?.focus();
      return;
    }
    const target = event.target as Element;
    const topLevelItem = target.closest<HTMLElement>(
      '[data-slot="navigation-menu-trigger"], [data-navigation-menu-top-level-link]',
    );
    if (!topLevelItem || topLevelItem.closest('[data-slot="navigation-menu-content"]')) return;
    const items = Array.from(topLevelItems).filter(
      (element) =>
        element.isConnected &&
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-disabled") !== "true",
    );
    const index = items.indexOf(topLevelItem);
    if (index === -1) return;
    const previousKey = local.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const nextKey = local.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    let nextIndex: number | undefined;
    if (event.key === previousKey) nextIndex = index - 1;
    if (event.key === nextKey) nextIndex = index + 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const nextItem = items[nextIndex];
    if (nextItem) {
      const nextValue = triggerValues.get(nextItem);
      if (value() !== null && nextValue !== undefined) {
        open(nextValue, "list-navigation", event);
      }
      setTabStop(nextItem);
      nextItem.focus();
    }
  };

  onCleanup(() => {
    transitionVersion += 1;
    clearCloseTimer();
  });

  return (
    <PopperPrimitive.Root
      anchorRef={positioningAnchorElement}
      contentRef={popup}
      getAnchorRect={positioningAnchorRect}
      placement={navigationMenuPlacement(position())}
      onCurrentPlacementChange={setCurrentPlacement}
      gutter={position().sideOffset}
      shift={position().alignOffset}
      flip={position().flip}
      slide={position().slide}
      overlap={position().overlap}
      fitViewport
      arrowPadding={position().arrowPadding}
      overflowPadding={collisionPaddingValue(position().collisionPadding)}
    >
      <NavigationMenuRootContext.Provider value={context}>
        <Dynamic
          component={local.as ?? "nav"}
          {...others}
          ref={(element: HTMLElement) => {
            setRoot(element);
            setElementRef(local.ref, element);
          }}
          data-orientation={local.orientation}
          data-slot="navigation-menu"
          data-viewport="true"
          class={cn(
            "group/navigation-menu relative z-navigation-menu flex max-w-max flex-1 items-center justify-center",
            local.class,
          )}
          onKeyDownCapture={onKeyDownCapture}
        >
          {local.children}
          <NavigationMenuPositioner align={local.align} />
        </Dynamic>
      </NavigationMenuRootContext.Provider>
    </PopperPrimitive.Root>
  );
};

type NavigationMenuListProps<T extends ValidComponent = "ul"> = PolymorphicProps<
  T,
  ComponentProps<T> & { class?: string }
>;

const NavigationMenuList = <T extends ValidComponent = "ul">(props: NavigationMenuListProps<T>) => {
  const [local, others] = splitProps(props as NavigationMenuListProps, ["as", "class"]);
  return (
    <Dynamic
      component={local.as ?? "ul"}
      {...others}
      data-slot="navigation-menu-list"
      class={cn(
        "group z-navigation-menu-list flex flex-1 list-none items-center justify-center",
        local.class,
      )}
    />
  );
};

type NavigationMenuItemProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  ComponentProps<T> & { class?: string; value?: NavigationMenuValue }
>;

const NavigationMenuItem = <T extends ValidComponent = "li">(props: NavigationMenuItemProps<T>) => {
  const rootContext = useNavigationMenuRootContext();
  const [local, others] = splitProps(props as NavigationMenuItemProps, [
    "as",
    "children",
    "class",
    "ref",
    "value",
  ]);
  const fallbackValue = Symbol(`navigation-menu-item-${createUniqueId()}`);
  const value = () => local.value ?? fallbackValue;
  const [element, setElement] = createSignal<HTMLElement>();
  const [triggerId, setTriggerId] = createSignal<string>();
  const [contentId, setContentId] = createSignal<string>();
  const context: NavigationMenuItemContextValue = {
    contentId,
    setContentId,
    setTriggerId,
    triggerId,
    value,
  };

  createEffect(() => {
    const itemElement = element();
    if (!itemElement) return;
    onCleanup(rootContext.registerItem(value(), itemElement));
  });

  return (
    <NavigationMenuItemContext.Provider value={context}>
      <Dynamic
        component={local.as ?? "li"}
        {...others}
        ref={(itemElement: HTMLElement) => {
          setElement(itemElement);
          setElementRef(local.ref, itemElement);
        }}
        data-slot="navigation-menu-item"
        class={cn("relative z-navigation-menu-item", local.class)}
      >
        {local.children}
      </Dynamic>
    </NavigationMenuItemContext.Provider>
  );
};

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger z-navigation-menu-trigger inline-flex h-9 w-max items-center justify-center outline-none disabled:pointer-events-none",
);

type NavigationMenuTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ComponentProps<T> & { class?: string }
>;

const NavigationMenuTrigger = <T extends ValidComponent = "button">(
  props: NavigationMenuTriggerProps<T>,
) => {
  const rootContext = useNavigationMenuRootContext();
  const itemContext = useNavigationMenuItemContext();
  const [local, others] = splitProps(props as NavigationMenuTriggerProps, [
    "as",
    "children",
    "class",
    "disabled",
    "id",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
    "tabIndex",
  ]);
  const generatedId = `navigation-menu-trigger-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const [element, setElement] = createSignal<HTMLElement>();
  let openTimer: number | undefined;
  let hoverOpenedAt = 0;
  const isOpen = () => isSameValue(rootContext.value(), itemContext.value());
  const cancelOpening = () => {
    if (typeof window !== "undefined") window.clearTimeout(openTimer);
    openTimer = undefined;
  };
  const openWithDelay = (event: PointerEvent) => {
    cancelOpening();
    rootContext.cancelClosing();
    if (isOpen()) return;
    const openFromHover = () => {
      hoverOpenedAt = Date.now();
      rootContext.open(itemContext.value(), "trigger-hover", event);
    };
    if (rootContext.value() !== null) {
      openFromHover();
      return;
    }
    if (typeof window === "undefined") return;
    openTimer = window.setTimeout(openFromHover, rootContext.delay());
  };

  createEffect(() => {
    const trigger = element();
    if (!trigger) return;
    itemContext.setTriggerId(id());
    const cancelTrigger = rootContext.registerTrigger(itemContext.value(), trigger);
    const cancelTopLevel = rootContext.registerTopLevelItem(trigger);
    onCleanup(() => {
      cancelTrigger();
      cancelTopLevel();
      if (itemContext.triggerId() === id()) itemContext.setTriggerId(undefined);
    });
  });

  const onClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled) return;
    if (isOpen() && Date.now() - hoverOpenedAt < 500) return;
    if (isOpen()) rootContext.close("trigger-press", event);
    else {
      hoverOpenedAt = 0;
      rootContext.open(itemContext.value(), "trigger-press", event);
    }
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    rootContext.cancelClosing();
    rootContext.setTabStop(event.currentTarget);
  };
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled) return;
    if (
      event.key === "Tab" &&
      event.shiftKey &&
      !isOpen() &&
      rootContext.isAfterActiveTrigger(event.currentTarget)
    ) {
      const items = focusableContentItems(rootContext.activeContent());
      const lastItem = items[items.length - 1];
      if (lastItem) {
        event.preventDefault();
        lastItem.focus();
      }
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && isOpen()) {
      const firstItem = focusableContentItems(rootContext.activeContent())[0];
      if (firstItem) {
        event.preventDefault();
        firstItem.focus();
      }
      return;
    }
    const firstKey = rootContext.orientation() === "horizontal" ? "ArrowDown" : "ArrowRight";
    const lastKey = rootContext.orientation() === "horizontal" ? "ArrowUp" : "ArrowLeft";
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen()) rootContext.close("trigger-press", event);
      else {
        hoverOpenedAt = 0;
        rootContext.open(itemContext.value(), "trigger-press", event);
      }
      return;
    }
    if (event.key !== firstKey && event.key !== lastKey) return;
    event.preventDefault();
    hoverOpenedAt = 0;
    rootContext.open(itemContext.value(), "list-navigation", event);
    queueMicrotask(() => {
      const items = focusableContentItems(rootContext.activeContent());
      const item = event.key === firstKey ? items[0] : items[items.length - 1];
      item?.focus();
    });
  };
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled || event.pointerType === "touch") return;
    openWithDelay(event);
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    cancelOpening();
    if (event.pointerType !== "touch" && isOpen()) rootContext.requestCloseWithDelay(event);
  };
  const tabIndex = () => {
    if (local.tabIndex !== undefined) return local.tabIndex;
    const trigger = element();
    return trigger && rootContext.isTabStop(trigger) ? 0 : -1;
  };

  onCleanup(cancelOpening);

  return (
    <Dynamic
      component={local.as ?? "button"}
      {...others}
      ref={(trigger: HTMLElement) => {
        setElement(trigger);
        setElementRef(local.ref, trigger);
      }}
      id={id()}
      type={(local.as ?? "button") === "button" ? "button" : undefined}
      disabled={local.disabled}
      aria-controls={isOpen() ? rootContext.popup()?.id : undefined}
      aria-expanded={isOpen()}
      data-open={isOpen() ? "" : undefined}
      data-popup-open={isOpen() ? "" : undefined}
      data-slot="navigation-menu-trigger"
      tabIndex={tabIndex()}
      class={cn(navigationMenuTriggerStyle(), "group", local.class)}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {local.children} <ChevronDown class="z-navigation-menu-trigger-icon" aria-hidden="true" />
    </Dynamic>
  );
};

type NavigationMenuContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComponentProps<T> & { class?: string; keepMounted?: boolean }
>;

const NavigationMenuContent = <T extends ValidComponent = "div">(
  props: NavigationMenuContentProps<T>,
) => {
  const rootContext = useNavigationMenuRootContext();
  const itemContext = useNavigationMenuItemContext();
  const [local, others] = splitProps(props as NavigationMenuContentProps, [
    "as",
    "children",
    "class",
    "id",
    "keepMounted",
    "onFocusOut",
    "onKeyDown",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
  ]);
  const generatedId = `navigation-menu-content-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const [element, setElement] = createSignal<HTMLElement>();
  const isOpen = () => isSameValue(rootContext.value(), itemContext.value());
  const shouldRender = () =>
    (local.keepMounted ?? false) || rootContext.hasMountedValue(itemContext.value());
  const isStarting = () =>
    isOpen() &&
    (rootContext.transition().status === "starting" ||
      rootContext.transition().direction !== undefined) &&
    isSameValue(rootContext.transition().to, itemContext.value());
  const isEnding = () =>
    !isOpen() &&
    (rootContext.transition().status === "ending" ||
      rootContext.transition().direction !== undefined) &&
    isSameValue(rootContext.transition().from, itemContext.value());
  const motion = () => {
    const transition = rootContext.transition();
    const isHorizontalForward = transition.direction === "right";
    const isHorizontalBackward = transition.direction === "left";
    if (isStarting()) {
      if (isHorizontalForward) return "from-end";
      if (isHorizontalBackward) return "from-start";
    }
    if (isEnding()) {
      if (isHorizontalForward) return "to-start";
      if (isHorizontalBackward) return "to-end";
    }
    return undefined;
  };

  createEffect(() => {
    itemContext.setContentId(id());
    const cancelId = rootContext.registerContentId(itemContext.value(), id());
    const cancelKeepMounted = rootContext.registerKeepMounted(
      itemContext.value(),
      local.keepMounted ?? false,
    );
    onCleanup(() => {
      cancelId();
      cancelKeepMounted();
      if (itemContext.contentId() === id()) itemContext.setContentId(undefined);
    });
  });
  createEffect(() => {
    const content = element();
    if (!content) return;
    onCleanup(rootContext.registerContent(itemContext.value(), content));
  });
  createEffect(() => {
    const content = element();
    if (!content) return;
    content.inert = !isOpen();
  });

  const onFocusOut: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onFocusOut as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    const nextTarget = event.relatedTarget as Node | null;
    if (rootContext.popup()?.contains(nextTarget)) return;
    if (nextTarget instanceof Element && nextTarget.closest('[data-slot="navigation-menu"]'))
      return;
    rootContext.close("focus-out", event);
  };
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      const trigger = rootContext.activeTrigger();
      const details = rootContext.close("escape-key", event);
      event.preventDefault();
      if (!details?.isPropagationAllowed) event.stopPropagation();
      trigger?.focus();
      return;
    }
    const items = focusableContentItems(event.currentTarget);
    const target = (event.target as Element).closest<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const index = target ? items.indexOf(target) : -1;
    if (event.key === "Tab") {
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        rootContext.activeTrigger()?.focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        const trigger = rootContext.activeTrigger();
        if (trigger) rootContext.focusAfterTrigger(trigger);
      }
      return;
    }
    let nextIndex: number | undefined;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + items.length) % items.length;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % items.length;
    }
    if (nextIndex === undefined) return;
    const item = items[nextIndex];
    if (!item) return;
    event.preventDefault();
    item.focus();
  };
  const onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.pointerType !== "touch") rootContext.cancelClosing();
  };
  const onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.pointerType !== "touch") rootContext.requestCloseWithDelay(event);
  };
  const setContentRef = (content: HTMLElement) => {
    setElement(content);
    setElementRef(local.ref, content);
  };
  const contentClass = () =>
    cn(
      "absolute top-0 left-0 z-navigation-menu-content h-full w-auto transition-[opacity,transform,translate] duration-[0.35s] data-ending-style:data-activation-direction=left:translate-x-[50%] data-ending-style:data-activation-direction=right:translate-x-[-50%] data-starting-style:data-activation-direction=left:translate-x-[-50%] data-starting-style:data-activation-direction=right:translate-x-[50%] data-ending-style:opacity-0 data-starting-style:opacity-0 **:data-[slot=navigation-menu-link]:focus:outline-none **:data-[slot=navigation-menu-link]:focus:ring-0",
      local.class,
    );

  return (
    <Show
      when={rootContext.viewport()}
      fallback={
        <Show when={local.keepMounted}>
          <NavigationMenuContentContext.Provider value={true}>
            <Dynamic
              component={local.as ?? "div"}
              {...others}
              ref={setContentRef}
              id={id()}
              aria-labelledby={itemContext.triggerId()}
              data-closed=""
              data-slot="navigation-menu-content"
              hidden
              inert
              class={contentClass()}
              onFocusOut={onFocusOut}
              onKeyDown={onKeyDown}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              {local.children}
            </Dynamic>
          </NavigationMenuContentContext.Provider>
        </Show>
      }
    >
      {(viewport) => (
        <Portal mount={viewport()}>
          <Show when={shouldRender()}>
            <NavigationMenuContentContext.Provider value={true}>
              <Dynamic
                component={local.as ?? "div"}
                {...others}
                ref={setContentRef}
                id={id()}
                aria-labelledby={itemContext.triggerId()}
                data-activation-direction={rootContext.transition().direction}
                data-closed={isOpen() ? undefined : ""}
                data-ending-style={isEnding() ? "" : undefined}
                data-motion={motion()}
                data-open={isOpen() ? "" : undefined}
                data-slot="navigation-menu-content"
                data-starting-style={isStarting() ? "" : undefined}
                hidden={
                  local.keepMounted && !rootContext.hasMountedValue(itemContext.value())
                    ? true
                    : undefined
                }
                class={contentClass()}
                onFocusOut={onFocusOut}
                onKeyDown={onKeyDown}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
              >
                {local.children}
              </Dynamic>
            </NavigationMenuContentContext.Provider>
          </Show>
        </Portal>
      )}
    </Show>
  );
};

type NavigationMenuPositionerProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComponentProps<T> & {
    align?: NavigationMenuAlign;
    alignOffset?: NavigationMenuOffset;
    anchor?: NavigationMenuAnchor;
    arrowPadding?: number;
    class?: string;
    collisionAvoidance?: NavigationMenuCollisionAvoidance;
    collisionBoundary?:
      | "clipping-ancestors"
      | Element
      | Element[]
      | { height: number; width: number; x: number; y: number };
    collisionPadding?: NavigationMenuCollisionPadding;
    disableAnchorTracking?: boolean;
    positionMethod?: "absolute" | "fixed";
    side?: NavigationMenuSide;
    sideOffset?: NavigationMenuOffset;
    sticky?: boolean;
  }
>;

/**
 * Kobalte Popper provides the maintained Solid collision engine. It has a single viewport
 * boundary, always tracks its anchor, and computes absolute coordinates. Therefore
 * `collisionBoundary` and `disableAnchorTracking` are accepted for Base UI source compatibility
 * but cannot alter those primitive-level behaviors; `positionMethod="fixed"` changes the CSS
 * positioning mode but retains Kobalte's absolute coordinate computation.
 */
const NavigationMenuPositioner = <T extends ValidComponent = "div">(
  props: NavigationMenuPositionerProps<T>,
) => {
  const rootContext = useNavigationMenuRootContext();
  const mergedProps = mergeProps(
    {
      align: "start" as NavigationMenuAlign,
      alignOffset: 0,
      arrowPadding: 5,
      collisionPadding: 5 as NavigationMenuCollisionPadding,
      positionMethod: "absolute" as const,
      side: "bottom" as NavigationMenuSide,
      sideOffset: 8,
      sticky: false,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps as NavigationMenuPositionerProps, [
    "align",
    "alignOffset",
    "anchor",
    "arrowPadding",
    "as",
    "children",
    "class",
    "collisionAvoidance",
    "collisionBoundary",
    "collisionPadding",
    "disableAnchorTracking",
    "positionMethod",
    "ref",
    "side",
    "sideOffset",
    "sticky",
    "style",
  ]);
  const [popupSize, setPopupSize] = createSignal({ height: 0, width: 0 });
  const [popupElement, setPopupElement] = createSignal<HTMLElement>();
  const popupId = `navigation-menu-popup-${createUniqueId()}`;

  createEffect(() => {
    const anchorRect =
      resolveNavigationMenuAnchor(local.anchor)?.getBoundingClientRect() ??
      rootContext.activeTrigger()?.getBoundingClientRect();
    const offsetData: NavigationMenuOffsetData = {
      align: local.align,
      anchor: { height: anchorRect?.height ?? 0, width: anchorRect?.width ?? 0 },
      positioner: popupSize(),
      side: local.side,
    };
    const sideCollision = local.collisionAvoidance?.side ?? "flip";
    const alignCollision = local.collisionAvoidance?.align ?? "flip";
    rootContext.setPosition({
      align: local.align,
      alignOffset: resolveNavigationMenuOffset(local.alignOffset, offsetData),
      anchor: local.anchor,
      arrowPadding: local.arrowPadding,
      collisionPadding: local.collisionPadding,
      flip: navigationMenuFlipPlacements(local.side, local.align, local.collisionAvoidance),
      overlap: alignCollision === "shift",
      positionMethod: local.positionMethod,
      side: local.side,
      sideOffset: resolveNavigationMenuOffset(local.sideOffset, offsetData),
      slide: sideCollision === "shift" || local.sticky,
    });
  });
  createEffect(() => {
    const content = rootContext.activeContent();
    if (!content) return;
    const updateSize = () => {
      const rect = content.getBoundingClientRect();
      setPopupSize({
        height: Math.max(content.scrollHeight, rect.height),
        width: Math.max(content.scrollWidth, rect.width),
      });
    };
    updateSize();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(content);
    onCleanup(() => observer.disconnect());
  });
  createEffect(() => {
    const element = popupElement();
    if (!element) return;
    element.inert = rootContext.value() === null;
  });

  const placementSide = () =>
    rootContext.currentPlacement().split("-")[0] as NavigationMenuPhysicalSide;
  const placementAlign = () =>
    (rootContext.currentPlacement().split("-")[1] as NavigationMenuAlign | undefined) ?? "center";
  const size = () => popupSize();
  const positionerStyle = createMemo(() => {
    const anchorRect =
      resolveNavigationMenuAnchor(local.anchor)?.getBoundingClientRect() ??
      rootContext.activeTrigger()?.getBoundingClientRect();
    const customProperties = {
      "--anchor-height": `${anchorRect?.height ?? 0}px`,
      "--anchor-width": `${anchorRect?.width ?? 0}px`,
      "--available-height": "var(--kb-popper-content-available-height)",
      "--available-width": "var(--kb-popper-content-available-width)",
      "--positioner-height": size().height ? `${size().height}px` : "auto",
      "--positioner-width": size().width ? `${size().width}px` : "auto",
      "--transform-origin": "var(--kb-popper-content-transform-origin)",
      position: local.positionMethod,
    } as JSX.CSSProperties;
    if (typeof local.style === "string") {
      return `${local.style};${Object.entries(customProperties)
        .map(([property, propertyValue]) => `${property}:${propertyValue}`)
        .join(";")}`;
    }
    return { ...(local.style as JSX.CSSProperties | undefined), ...customProperties };
  });
  const popupStyle = createMemo(
    () =>
      ({
        "--popup-height": size().height ? `${size().height}px` : "auto",
        "--popup-width": size().width ? `${size().width}px` : "auto",
        "--transform-origin": "var(--kb-popper-content-transform-origin)",
      }) as JSX.CSSProperties,
  );

  return (
    <Show when={rootContext.shouldMountPositioner()}>
      <Portal ref={(element) => element.setAttribute("data-slot", "navigation-menu-portal")}>
        <PopperPrimitive.Positioner
          as={local.as ?? "div"}
          {...others}
          ref={(element: HTMLElement) => setElementRef(local.ref, element)}
          data-align={placementAlign()}
          data-instant={rootContext.transition().direction !== undefined ? "" : undefined}
          data-side={placementSide()}
          data-slot="navigation-menu-positioner"
          role="presentation"
          style={positionerStyle()}
          class={cn(
            "isolate z-50 z-navigation-menu-positioner h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-[0.35s] data-instant:transition-none",
            local.class,
          )}
        >
          <div
            ref={(element) => {
              setPopupElement(element);
              rootContext.setPopup(element);
            }}
            id={popupId}
            data-align={placementAlign()}
            data-closed={rootContext.value() === null ? "" : undefined}
            data-ending-style={rootContext.transition().status === "ending" ? "" : undefined}
            data-open={rootContext.value() === null ? undefined : ""}
            data-side={placementSide()}
            data-slot="navigation-menu-popup"
            data-starting-style={rootContext.transition().status === "starting" ? "" : undefined}
            style={popupStyle()}
            class="relative z-navigation-menu-popup h-(--popup-height) w-(--popup-width) origin-(--transform-origin) transition-[opacity,transform,width,height,scale,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:ease-[ease] xs:w-(--popup-width)"
            onPointerEnter={rootContext.cancelClosing}
            onPointerLeave={rootContext.requestCloseWithDelay}
          >
            <div
              ref={rootContext.setViewport}
              data-closed={rootContext.value() === null ? "" : undefined}
              data-open={rootContext.value() === null ? undefined : ""}
              data-slot="navigation-menu-viewport"
              class="relative z-navigation-menu-viewport size-full overflow-hidden"
            />
          </div>
        </PopperPrimitive.Positioner>
      </Portal>
    </Show>
  );
};

type NavigationMenuLinkProps<T extends ValidComponent = "a"> = PolymorphicProps<
  T,
  ComponentProps<T> & { active?: boolean; class?: string; closeOnClick?: boolean }
>;

const NavigationMenuLink = <T extends ValidComponent = "a">(props: NavigationMenuLinkProps<T>) => {
  const rootContext = useNavigationMenuRootContext();
  const inContent = useContext(NavigationMenuContentContext);
  const mergedProps = mergeProps({ active: false, closeOnClick: false }, props);
  const [local, others] = splitProps(mergedProps as NavigationMenuLinkProps, [
    "active",
    "as",
    "class",
    "closeOnClick",
    "onClick",
    "onFocus",
    "onKeyDown",
    "ref",
    "tabIndex",
  ]);
  const [element, setElement] = createSignal<HTMLElement>();

  createEffect(() => {
    const link = element();
    if (!link || inContent) return;
    onCleanup(rootContext.registerTopLevelItem(link));
  });

  const onClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || !local.closeOnClick) return;
    rootContext.close("link-press", event);
  };
  const onFocus: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || inContent) return;
    rootContext.cancelClosing();
    rootContext.setTabStop(event.currentTarget);
  };
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (
      event.defaultPrevented ||
      inContent ||
      event.key !== "Tab" ||
      !event.shiftKey ||
      !rootContext.isAfterActiveTrigger(event.currentTarget)
    )
      return;
    const items = focusableContentItems(rootContext.activeContent());
    const lastItem = items[items.length - 1];
    if (!lastItem) return;
    event.preventDefault();
    lastItem.focus();
  };
  const tabIndex = () => {
    if (local.tabIndex !== undefined) return local.tabIndex;
    if (inContent) return undefined;
    const link = element();
    return link && rootContext.isTabStop(link) ? 0 : -1;
  };

  return (
    <Dynamic
      component={local.as ?? "a"}
      {...others}
      ref={(link: HTMLElement) => {
        setElement(link);
        setElementRef(local.ref, link);
      }}
      aria-current={local.active ? "page" : undefined}
      data-active={local.active ? "true" : undefined}
      data-navigation-menu-top-level-link={inContent ? undefined : ""}
      data-slot="navigation-menu-link"
      tabIndex={tabIndex()}
      class={cn("z-navigation-menu-link", local.class)}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
};

type NavigationMenuIndicatorProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ComponentProps<T> & { class?: string }
>;

const NavigationMenuIndicator = <T extends ValidComponent = "span">(
  props: NavigationMenuIndicatorProps<T>,
) => {
  const rootContext = useNavigationMenuRootContext();
  const itemContext = useNavigationMenuItemContext();
  const [local, others] = splitProps(props as NavigationMenuIndicatorProps, [
    "as",
    "children",
    "class",
  ]);
  const visible = createMemo(() => isSameValue(rootContext.value(), itemContext.value()));
  return (
    <Dynamic
      component={local.as ?? "span"}
      {...others}
      aria-hidden="true"
      data-open={visible() ? "" : undefined}
      data-popup-open={visible() ? "" : undefined}
      data-slot="navigation-menu-indicator"
      data-state={visible() ? "visible" : "hidden"}
      class={cn(
        "top-full z-1 z-navigation-menu-indicator flex h-1.5 items-end justify-center overflow-hidden",
        local.class,
      )}
    >
      {local.children ?? (
        <div class="relative top-[60%] z-navigation-menu-indicator-arrow h-2 w-2 rotate-45" />
      )}
    </Dynamic>
  );
};

export type {
  NavigationMenuActions,
  NavigationMenuAlign,
  NavigationMenuAnchor,
  NavigationMenuChangeEventDetails,
  NavigationMenuChangeEventReason,
  NavigationMenuCollisionAvoidance,
  NavigationMenuCollisionPadding,
  NavigationMenuContentProps,
  NavigationMenuIndicatorProps,
  NavigationMenuItemProps,
  NavigationMenuLinkProps,
  NavigationMenuListProps,
  NavigationMenuOffset,
  NavigationMenuOffsetData,
  NavigationMenuOrientation,
  NavigationMenuPositionerProps,
  NavigationMenuProps,
  NavigationMenuSide,
  NavigationMenuTriggerProps,
};
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
