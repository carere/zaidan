import * as ContextMenuPrimitive from "@kobalte/core/context-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronRight } from "lucide-solid";
import {
  type Accessor,
  type ComponentProps,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";

type ContextMenuChangeReason =
  | "cancel-open"
  | "close-press"
  | "escape-key"
  | "focus-out"
  | "imperative-action"
  | "item-press"
  | "list-navigation"
  | "none"
  | "outside-press"
  | "sibling-open"
  | "trigger-focus"
  | "trigger-hover"
  | "trigger-press";

type ContextMenuChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  reason: ContextMenuChangeReason;
  trigger: Element | undefined;
};

type ContextMenuAlign = "center" | "end" | "start";
type ContextMenuPhysicalSide = "bottom" | "left" | "right" | "top";
type ContextMenuSide = ContextMenuPhysicalSide | "inline-end" | "inline-start";
type ContextMenuPlacement =
  | ContextMenuPhysicalSide
  | `${ContextMenuPhysicalSide}-end`
  | `${ContextMenuPhysicalSide}-start`;
type ContextMenuPosition = {
  align: ContextMenuAlign;
  alignOffset: number;
  side: ContextMenuSide;
  sideOffset: number;
};

const DEFAULT_POSITION: ContextMenuPosition = {
  align: "start",
  alignOffset: 4,
  side: "right",
  sideOffset: 0,
};

function physicalSide(side: ContextMenuSide): ContextMenuPhysicalSide {
  if (side !== "inline-start" && side !== "inline-end") return side;
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  if (side === "inline-start") return rtl ? "right" : "left";
  return rtl ? "left" : "right";
}

function positionToPlacement(position: ContextMenuPosition): ContextMenuPlacement {
  const side = physicalSide(position.side);
  return position.align === "center" ? side : `${side}-${position.align}`;
}

function createChangeDetails(
  reason: ContextMenuChangeReason,
  event?: Event,
  trigger?: Element,
  preventUnmountOnClose: () => void = () => {},
): ContextMenuChangeDetails {
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
  };
}

type ContextMenuRootContextValue = {
  closeParentOnEsc: Accessor<boolean>;
  configurePosition: (position: ContextMenuPosition) => void;
  currentPlacement: Accessor<ContextMenuPlacement>;
  disabled: Accessor<boolean>;
  highlightItemOnHover: Accessor<boolean>;
  loopFocus: Accessor<boolean>;
  lastEvent: Accessor<Event | undefined>;
  open: Accessor<boolean>;
  orientation: Accessor<"horizontal" | "vertical">;
  position: Accessor<ContextMenuPosition>;
  preserveOnSubmenuEscape: () => void;
  recordChange: (reason: ContextMenuChangeReason, event: Event, trigger?: Element) => void;
  registerKeepMounted: () => () => void;
  requestOpenChange: (
    open: boolean,
    reason: ContextMenuChangeReason,
    event?: Event,
    trigger?: Element,
  ) => ContextMenuChangeDetails | undefined;
  setContentRef: (element: HTMLElement | undefined) => void;
  triggerId: Accessor<string | undefined>;
};

const ContextMenuRootContext = createContext<ContextMenuRootContextValue>();

function useContextMenuRootContext() {
  const context = useContext(ContextMenuRootContext);
  if (!context) throw new Error("ContextMenu parts must be used within ContextMenu");
  return context;
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

type ContextMenuItemInteractionsOptions = {
  disabled: Accessor<boolean>;
  highlightItemOnHover: Accessor<boolean>;
  onActivate: (event: KeyboardEvent | PointerEvent) => void;
  onKeyDown?: JSX.EventHandlerUnion<HTMLElement, KeyboardEvent>;
  onPointerMove?: JSX.EventHandlerUnion<HTMLElement, PointerEvent>;
  onPointerUp?: JSX.EventHandlerUnion<HTMLElement, PointerEvent>;
};

function createContextMenuItemInteractions(options: ContextMenuItemInteractionsOptions) {
  const onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(options.onKeyDown, event);
    if (options.disabled() || event.repeat) return;
    if (event.key === "Enter" || event.key === " ") options.onActivate(event);
  };
  const onPointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(options.onPointerMove, event);
    if (!options.highlightItemOnHover()) event.preventDefault();
  };
  const onPointerUp: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(options.onPointerUp, event);
    if (!options.disabled() && event.button === 0) options.onActivate(event);
  };

  return { onKeyDown, onPointerMove, onPointerUp };
}

type ContextMenuActions = {
  close: () => void;
  unmount: () => void;
};

type ContextMenuProps = Omit<
  ContextMenuPrimitive.ContextMenuRootProps,
  "defaultOpen" | "forceMount" | "onOpenChange" | "open" | "orientation"
> & {
  actionsRef?: { current: ContextMenuActions | null };
  closeParentOnEsc?: boolean;
  defaultOpen?: boolean;
  defaultTriggerId?: string | null;
  disabled?: boolean;
  forceMount?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  onOpenChange?: (open: boolean, details: ContextMenuChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  open?: boolean;
  orientation?: "horizontal" | "vertical";
  triggerId?: string | null;
};

// Base UI's `handle` and payload render-function children are React-specific.
// Solid consumers control the root with `open`, `onOpenChange`, and `actionsRef` instead.

const ControllableContextMenuRoot = ContextMenuPrimitive.Root as unknown as (
  props: ContextMenuPrimitive.ContextMenuRootProps & {
    "data-slot"?: string;
    fitViewport?: boolean;
    gutter?: number;
    onCurrentPlacementChange?: (placement: ContextMenuPlacement) => void;
    open: boolean;
    placement?: ContextMenuPlacement;
    shift?: number;
  },
) => JSX.Element;

const ContextMenu = (props: ContextMenuProps) => {
  const [local, others] = splitProps(props, [
    "closeParentOnEsc",
    "defaultOpen",
    "defaultTriggerId",
    "disabled",
    "forceMount",
    "highlightItemOnHover",
    "loopFocus",
    "actionsRef",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "orientation",
    "triggerId",
  ]);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [keepMountedPortals, setKeepMountedPortals] = createSignal(0);
  const [preventedUnmount, setPreventedUnmount] = createSignal(false);
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const [lastEvent, setLastEvent] = createSignal<Event>();
  const [position, setPosition] = createSignal(DEFAULT_POSITION);
  const [currentPlacement, setCurrentPlacement] = createSignal<ContextMenuPlacement>(
    positionToPlacement(DEFAULT_POSITION),
  );
  const open = () => local.open ?? uncontrolledOpen();
  let pendingChange:
    | { event: Event; reason: ContextMenuChangeReason; trigger?: Element }
    | undefined;
  let previousOpen = open();
  let completeVersion = 0;
  let preserveSubmenuEscape = false;

  const requestOpenChange: ContextMenuRootContextValue["requestOpenChange"] = (
    nextOpen,
    reason,
    event,
    trigger,
  ) => {
    if (nextOpen === open()) return undefined;
    let shouldPreventUnmount = false;
    const details = createChangeDetails(reason, event, trigger, () => {
      shouldPreventUnmount = !nextOpen;
    });
    if (event) setLastEvent(event);
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return details;
    if (shouldPreventUnmount) setPreventedUnmount(true);
    if (nextOpen) setPreventedUnmount(false);
    if (local.open !== undefined) return details;
    setUncontrolledOpen(nextOpen);
    return details;
  };

  const context: ContextMenuRootContextValue = {
    closeParentOnEsc: () => local.closeParentOnEsc ?? false,
    configurePosition: (nextPosition) => {
      setPosition(nextPosition);
      setCurrentPlacement(positionToPlacement(nextPosition));
    },
    currentPlacement,
    disabled: () => local.disabled ?? false,
    highlightItemOnHover: () => local.highlightItemOnHover ?? true,
    lastEvent,
    loopFocus: () => local.loopFocus ?? true,
    open,
    orientation: () => local.orientation ?? "vertical",
    position,
    preserveOnSubmenuEscape: () => {
      preserveSubmenuEscape = true;
      window.setTimeout(() => {
        preserveSubmenuEscape = false;
      }, 0);
    },
    recordChange: (reason, event, trigger) => {
      setLastEvent(event);
      pendingChange = { event, reason, trigger };
    },
    registerKeepMounted: () => {
      setKeepMountedPortals((count) => count + 1);
      return () => setKeepMountedPortals((count) => Math.max(0, count - 1));
    },
    requestOpenChange,
    setContentRef,
    triggerId: () => local.triggerId ?? local.defaultTriggerId ?? undefined,
  };

  const handleOpenChange = (nextOpen: boolean) => {
    const change = pendingChange;
    pendingChange = undefined;
    if (!nextOpen && preserveSubmenuEscape) {
      preserveSubmenuEscape = false;
      return;
    }
    requestOpenChange(nextOpen, change?.reason ?? "none", change?.event, change?.trigger);
  };

  createEffect(() => {
    const nextOpen = open();
    if (nextOpen === previousOpen) return;
    previousOpen = nextOpen;
    const version = ++completeVersion;
    queueMicrotask(async () => {
      const element = contentRef();
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      if (version === completeVersion) local.onOpenChangeComplete?.(nextOpen);
    });
  });

  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const actions: ContextMenuActions = {
      close: () => requestOpenChange(false, "imperative-action"),
      unmount: () => setPreventedUnmount(false),
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  onCleanup(() => {
    completeVersion += 1;
  });

  return (
    <ContextMenuRootContext.Provider value={context}>
      <ControllableContextMenuRoot
        data-slot="context-menu"
        fitViewport
        forceMount={local.forceMount || keepMountedPortals() > 0 || preventedUnmount()}
        gutter={position().sideOffset}
        onOpenChange={handleOpenChange}
        onCurrentPlacementChange={setCurrentPlacement}
        open={open()}
        orientation={local.orientation === "horizontal" ? "vertical" : "horizontal"}
        placement={positionToPlacement(position())}
        shift={position().alignOffset}
        {...others}
      />
    </ContextMenuRootContext.Provider>
  );
};

type ContextMenuTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuTriggerProps<T>
> & {
  class?: string | undefined;
};

const ContextMenuTrigger = <T extends ValidComponent = "div">(
  props: ContextMenuTriggerProps<T>,
) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props as ContextMenuTriggerProps, [
    "class",
    "disabled",
    "id",
    "onContextMenu",
    "onPointerCancel",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
  ]);
  const disabled = () => root.disabled() || (local.disabled ?? false);
  let longPressTimer = 0;
  let longPressStart:
    | { event: PointerEvent; trigger: HTMLElement; x: number; y: number }
    | undefined;

  const clearLongPress = () => {
    if (typeof window === "undefined") return;
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
    longPressStart = undefined;
  };
  const isTouchOrPen = (event: PointerEvent) =>
    event.pointerType === "touch" || event.pointerType === "pen";
  const handleContextMenu: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onContextMenu as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (!disabled() && !event.defaultPrevented) {
      root.recordChange("trigger-press", event, event.currentTarget);
    }
  };
  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (disabled() || event.defaultPrevented || !isTouchOrPen(event)) return;

    clearLongPress();
    longPressStart = {
      event,
      trigger: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
    };
    longPressTimer = window.setTimeout(() => {
      const start = longPressStart;
      longPressTimer = 0;
      if (!start) return;
      root.requestOpenChange(true, "trigger-press", start.event, start.trigger);
    }, 500);
  };
  const handlePointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (!longPressStart || !isTouchOrPen(event)) return;
    if (
      Math.abs(event.clientX - longPressStart.x) > 10 ||
      Math.abs(event.clientY - longPressStart.y) > 10
    ) {
      clearLongPress();
    }
  };
  const handlePointerCancel: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerCancel as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    clearLongPress();
  };
  const handlePointerUp: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    clearLongPress();
  };

  onCleanup(clearLongPress);

  return (
    <ContextMenuPrimitive.Trigger
      class={cn("z-context-menu-trigger select-none", local.class)}
      data-slot="context-menu-trigger"
      disabled={disabled()}
      id={local.id ?? root.triggerId()}
      onContextMenu={handleContextMenu}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...others}
    />
  );
};

type ContextMenuPortalContainer =
  | HTMLElement
  | ShadowRoot
  | { current: HTMLElement | ShadowRoot | null }
  | null;

type ContextMenuPortalProps = Omit<ContextMenuPrimitive.ContextMenuPortalProps, "mount"> & {
  container?: ContextMenuPortalContainer;
  keepMounted?: boolean;
};

const ContextMenuPortal = (props: ContextMenuPortalProps) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props, ["container", "keepMounted", "ref"]);
  const mount = () => {
    const container = local.container;
    if (container && "current" in container) return container.current ?? undefined;
    return container ?? undefined;
  };
  createEffect(() => {
    if (!local.keepMounted) return;
    const unregister = root.registerKeepMounted();
    onCleanup(unregister);
  });
  return (
    <ContextMenuPrimitive.Portal
      mount={mount()}
      ref={(element) => {
        element.dataset.slot = "context-menu-portal";
        if (typeof local.ref === "function") local.ref(element);
      }}
      {...others}
    />
  );
};

type ContextMenuFinalFocus =
  | boolean
  | { current: HTMLElement | null }
  | ((
      interactionType: "keyboard" | "mouse" | "pen" | "touch",
    ) => boolean | HTMLElement | null | undefined);

type ContextMenuContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuContentProps<T>
> & {
  align?: ContextMenuAlign;
  alignOffset?: number;
  class?: string | undefined;
  finalFocus?: ContextMenuFinalFocus;
  side?: ContextMenuSide;
  sideOffset?: number;
};

const ContextMenuContent = <T extends ValidComponent = "div">(
  props: ContextMenuContentProps<T>,
) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props as ContextMenuContentProps, [
    "class",
    "align",
    "alignOffset",
    "onEscapeKeyDown",
    "finalFocus",
    "onCloseAutoFocus",
    "onInteractOutside",
    "onKeyDown",
    "ref",
    "side",
    "sideOffset",
  ]);
  const requestedPosition = (): ContextMenuPosition => ({
    align: local.align ?? DEFAULT_POSITION.align,
    alignOffset: local.alignOffset ?? DEFAULT_POSITION.alignOffset,
    side: local.side ?? DEFAULT_POSITION.side,
    sideOffset: local.sideOffset ?? DEFAULT_POSITION.sideOffset,
  });
  createEffect(() => root.configurePosition(requestedPosition()));
  onCleanup(() => root.setContentRef(undefined));
  const renderedSide = () => {
    const requestedSide = requestedPosition().side;
    if (requestedSide === "inline-start" || requestedSide === "inline-end") return requestedSide;
    return root.currentPlacement().split("-")[0];
  };
  const renderedAlign = () => root.currentPlacement().split("-")[1] ?? "center";
  const interactionType = () => {
    const event = root.lastEvent();
    if (event instanceof KeyboardEvent) return "keyboard" as const;
    if (event instanceof PointerEvent) {
      if (event.pointerType === "touch" || event.pointerType === "pen") return event.pointerType;
    }
    return "mouse" as const;
  };
  const handleCloseAutoFocus = (event: Event) => {
    local.onCloseAutoFocus?.(event);
    if (event.defaultPrevented || local.finalFocus === undefined || local.finalFocus === true)
      return;

    let focusTarget: boolean | HTMLElement | null | undefined;
    if (typeof local.finalFocus === "function") focusTarget = local.finalFocus(interactionType());
    else if (typeof local.finalFocus === "object") focusTarget = local.finalFocus.current;
    else focusTarget = local.finalFocus;

    if (focusTarget === false || focusTarget == null) {
      event.preventDefault();
      return;
    }
    if (focusTarget instanceof HTMLElement) {
      event.preventDefault();
      queueMicrotask(() => focusTarget.focus());
    }
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    if (!event.currentTarget.contains(event.target as Node)) return;

    if (!root.loopFocus()) {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          '[role^="menuitem"]:not([aria-disabled="true"])',
        ),
      );
      const first = items[0];
      const last = items.at(-1);
      const previousKey = root.orientation() === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = root.orientation() === "vertical" ? "ArrowDown" : "ArrowRight";
      if (
        (event.key === previousKey && document.activeElement === first) ||
        (event.key === nextKey && document.activeElement === last)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (event.key !== "Escape") return;

    local.onEscapeKeyDown?.(event);
    event.preventDefault();
    const details = root.requestOpenChange(false, "escape-key", event, event.currentTarget);
    if (!details?.isPropagationAllowed) event.stopPropagation();
  };
  const handleInteractOutside = (event: Event) => {
    local.onInteractOutside?.(event as never);
    if (event.defaultPrevented) return;

    const originalEvent =
      (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent ?? event;
    root.recordChange(
      originalEvent instanceof FocusEvent ? "focus-out" : "outside-press",
      originalEvent,
      originalEvent.target instanceof Element ? originalEvent.target : undefined,
    );
  };
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        class={cn(
          "z-50 z-context-menu-content z-context-menu-content-logical z-menu-target z-menu-translucent max-h-(--kb-popper-content-available-height) origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto outline-none",
          local.class,
        )}
        data-align={renderedAlign()}
        data-side={renderedSide()}
        data-slot="context-menu-content"
        onCloseAutoFocus={handleCloseAutoFocus}
        onInteractOutside={handleInteractOutside}
        onKeyDown={handleKeyDown}
        ref={(element) => {
          root.setContentRef(element);
          if (typeof local.ref === "function") local.ref(element);
        }}
        {...others}
      />
    </ContextMenuPrimitive.Portal>
  );
};

type ContextMenuGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuGroupProps<T>
> & {
  class?: string | undefined;
};

const ContextMenuGroup = <T extends ValidComponent = "div">(props: ContextMenuGroupProps<T>) => {
  const [local, others] = splitProps(props as ContextMenuGroupProps, [
    "aria-labelledby",
    "children",
    "class",
    "ref",
  ]);
  return (
    <ContextMenuPrimitive.Group
      aria-labelledby={local["aria-labelledby"]}
      class={local.class}
      data-slot="context-menu-group"
      ref={(element: HTMLDivElement) => {
        queueMicrotask(() => {
          if (local["aria-labelledby"] || element.hasAttribute("aria-labelledby")) return;
          const label = element.querySelector<HTMLElement>('[data-slot="context-menu-label"]');
          if (label?.id) element.setAttribute("aria-labelledby", label.id);
        });
        if (typeof local.ref === "function") local.ref(element);
      }}
      {...others}
    >
      {local.children}
    </ContextMenuPrimitive.Group>
  );
};

type ContextMenuLabelProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuGroupLabelProps<T>
> & {
  class?: string | undefined;
  inset?: boolean;
};

const ContextMenuLabel = <T extends ValidComponent = "div">(props: ContextMenuLabelProps<T>) => {
  const [local, others] = splitProps(props as ContextMenuLabelProps, [
    "as",
    "class",
    "id",
    "inset",
  ]);
  const id = local.id ?? `context-menu-label-${createUniqueId()}`;
  return (
    <Dynamic
      aria-hidden="true"
      class={cn("z-context-menu-label data-inset:pl-8", local.class)}
      component={local.as ?? "div"}
      data-slot="context-menu-label"
      data-inset={local.inset}
      id={id}
      {...others}
    />
  );
};

type ContextMenuItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ContextMenuPrimitive.ContextMenuItemProps<T>>,
  "closeOnSelect" | "textValue"
> & {
  class?: string | undefined;
  closeOnClick?: boolean;
  inset?: boolean;
  label?: string;
  variant?: "default" | "destructive";
};

const ContextMenuItem = <T extends ValidComponent = "div">(props: ContextMenuItemProps<T>) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props as ContextMenuItemProps, [
    "class",
    "closeOnClick",
    "disabled",
    "inset",
    "label",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
    "variant",
  ]);
  const disabled = () => root.disabled() || (local.disabled ?? false);
  const recordItemPress = (event: Event) => {
    if (local.closeOnClick ?? true) {
      root.recordChange("item-press", event, event.currentTarget as Element);
    }
  };
  const interactions = createContextMenuItemInteractions({
    disabled,
    highlightItemOnHover: root.highlightItemOnHover,
    onActivate: recordItemPress,
    onKeyDown: local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
    onPointerMove: local.onPointerMove as
      | JSX.EventHandlerUnion<HTMLElement, PointerEvent>
      | undefined,
    onPointerUp: local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
  });
  return (
    <ContextMenuPrimitive.Item
      class={cn(
        "group/context-menu-item relative z-context-menu-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-inset:pl-8 data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      closeOnSelect={local.closeOnClick ?? true}
      data-slot="context-menu-item"
      data-inset={local.inset}
      data-variant={local.variant ?? "default"}
      disabled={disabled()}
      onKeyDown={interactions.onKeyDown}
      onPointerMove={interactions.onPointerMove}
      onPointerUp={interactions.onPointerUp}
      textValue={local.label}
      {...others}
    />
  );
};

type ContextMenuSubContextValue = {
  cancelHoverClose: () => void;
  cancelHoverOpen: () => void;
  closeParentOnEsc: Accessor<boolean>;
  configurePosition: (position: ContextMenuPosition) => void;
  currentPlacement: Accessor<ContextMenuPlacement>;
  disabled: Accessor<boolean>;
  open: Accessor<boolean>;
  position: Accessor<ContextMenuPosition>;
  recordChange: (reason: ContextMenuChangeReason, event: Event, trigger?: Element) => void;
  requestOpenChange: (
    open: boolean,
    reason: ContextMenuChangeReason,
    event?: Event,
    trigger?: Element,
  ) => ContextMenuChangeDetails | undefined;
  scheduleHoverClose: (delay: number, event: PointerEvent, trigger: Element) => void;
  scheduleHoverOpen: (delay: number, event: PointerEvent, trigger: Element) => void;
  setContentRef: (element: HTMLElement | undefined) => void;
  setTriggerRef: (element: HTMLElement) => void;
  triggerRef: Accessor<HTMLElement | undefined>;
};

const ContextMenuSubContext = createContext<ContextMenuSubContextValue>();

function useContextMenuSubContext() {
  const context = useContext(ContextMenuSubContext);
  if (!context) throw new Error("ContextMenu submenu parts require ContextMenuSub");
  return context;
}

type ContextMenuSubProps = Omit<ContextMenuPrimitive.ContextMenuSubProps, "onOpenChange"> & {
  actionsRef?: { current: ContextMenuActions | null };
  closeParentOnEsc?: boolean;
  disabled?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  onOpenChange?: (open: boolean, details: ContextMenuChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  orientation?: "horizontal" | "vertical";
};

const PositionedContextMenuSub = ContextMenuPrimitive.Sub as unknown as (
  props: ContextMenuPrimitive.ContextMenuSubProps & {
    "data-slot"?: string;
    gutter: number;
    onCurrentPlacementChange: (placement: ContextMenuPlacement) => void;
    placement: ContextMenuPlacement;
    shift: number;
  },
) => JSX.Element;

const ContextMenuSub = (props: ContextMenuSubProps) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props, [
    "actionsRef",
    "closeParentOnEsc",
    "defaultOpen",
    "disabled",
    "highlightItemOnHover",
    "loopFocus",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "orientation",
  ]);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [position, setPosition] = createSignal(DEFAULT_POSITION);
  const [currentPlacement, setCurrentPlacement] = createSignal<ContextMenuPlacement>(
    positionToPlacement(DEFAULT_POSITION),
  );
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();
  const open = () => local.open ?? uncontrolledOpen();
  let pendingChange:
    | { event: Event; reason: ContextMenuChangeReason; trigger?: Element }
    | undefined;
  let previousOpen = open();
  let completeVersion = 0;
  let hoverOpenTimer = 0;
  let hoverCloseTimer = 0;
  let releasePreventedUnmount: (() => void) | undefined;

  const cancelHoverOpen = () => {
    if (typeof window === "undefined") return;
    window.clearTimeout(hoverOpenTimer);
    hoverOpenTimer = 0;
  };
  const cancelHoverClose = () => {
    if (typeof window === "undefined") return;
    window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = 0;
  };
  const unmount = () => {
    releasePreventedUnmount?.();
    releasePreventedUnmount = undefined;
  };

  const requestOpenChange: ContextMenuSubContextValue["requestOpenChange"] = (
    nextOpen,
    reason,
    event,
    trigger,
  ) => {
    if (nextOpen === open()) return undefined;
    let shouldPreventUnmount = false;
    const details = createChangeDetails(reason, event, trigger, () => {
      shouldPreventUnmount = !nextOpen;
    });
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return details;
    if (nextOpen) unmount();
    if (shouldPreventUnmount && !releasePreventedUnmount) {
      releasePreventedUnmount = root.registerKeepMounted();
    }
    if (local.open !== undefined) return details;
    setUncontrolledOpen(nextOpen);
    return details;
  };
  const context: ContextMenuSubContextValue = {
    cancelHoverClose,
    cancelHoverOpen,
    closeParentOnEsc: () => local.closeParentOnEsc ?? root.closeParentOnEsc(),
    configurePosition: (nextPosition) => {
      setPosition(nextPosition);
      setCurrentPlacement(positionToPlacement(nextPosition));
    },
    currentPlacement,
    disabled: () => root.disabled() || (local.disabled ?? false),
    open,
    position,
    recordChange: (reason, event, trigger) => {
      pendingChange = { event, reason, trigger };
    },
    requestOpenChange,
    scheduleHoverClose: (delay, event, trigger) => {
      cancelHoverClose();
      if (delay <= 0) {
        requestOpenChange(false, "trigger-hover", event, trigger);
        return;
      }
      hoverCloseTimer = window.setTimeout(() => {
        hoverCloseTimer = 0;
        requestOpenChange(false, "trigger-hover", event, trigger);
      }, delay);
    },
    scheduleHoverOpen: (delay, event, trigger) => {
      if (hoverOpenTimer || open()) return;
      cancelHoverClose();
      if (delay <= 0) {
        requestOpenChange(true, "trigger-hover", event, trigger);
        return;
      }
      hoverOpenTimer = window.setTimeout(() => {
        hoverOpenTimer = 0;
        requestOpenChange(true, "trigger-hover", event, trigger);
      }, delay);
    },
    setContentRef,
    setTriggerRef,
    triggerRef,
  };
  const handleOpenChange = (nextOpen: boolean) => {
    const change = pendingChange;
    pendingChange = undefined;
    requestOpenChange(nextOpen, change?.reason ?? "none", change?.event, change?.trigger);
  };

  createEffect(() => {
    const nextOpen = open();
    if (nextOpen === previousOpen) return;
    previousOpen = nextOpen;
    const version = ++completeVersion;
    queueMicrotask(async () => {
      const element = contentRef();
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      if (version === completeVersion) local.onOpenChangeComplete?.(nextOpen);
    });
  });
  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    const actions: ContextMenuActions = {
      close: () => requestOpenChange(false, "imperative-action"),
      unmount,
    };
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });
  onCleanup(() => {
    completeVersion += 1;
    cancelHoverOpen();
    cancelHoverClose();
    unmount();
  });

  const nestedRootContext: ContextMenuRootContextValue = {
    ...root,
    disabled: context.disabled,
    highlightItemOnHover: () => local.highlightItemOnHover ?? true,
    loopFocus: () => local.loopFocus ?? true,
    orientation: () => local.orientation ?? "vertical",
  };

  return (
    <ContextMenuSubContext.Provider value={context}>
      <ContextMenuRootContext.Provider value={nestedRootContext}>
        <PositionedContextMenuSub
          data-slot="context-menu-sub"
          gutter={position().sideOffset}
          onCurrentPlacementChange={setCurrentPlacement}
          onOpenChange={handleOpenChange}
          open={open()}
          placement={positionToPlacement(position())}
          shift={position().alignOffset}
          {...others}
        />
      </ContextMenuRootContext.Provider>
    </ContextMenuSubContext.Provider>
  );
};

type ContextMenuSubTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuSubTriggerProps<T>
> & {
  class?: string | undefined;
  children?: JSX.Element;
  closeDelay?: number;
  delay?: number;
  inset?: boolean;
  label?: string;
  openOnHover?: boolean;
};

const ContextMenuSubTrigger = <T extends ValidComponent = "div">(
  props: ContextMenuSubTriggerProps<T>,
) => {
  const root = useContextMenuRootContext();
  const sub = useContextMenuSubContext();
  const [local, others] = splitProps(props as ContextMenuSubTriggerProps, [
    "class",
    "children",
    "closeDelay",
    "delay",
    "disabled",
    "inset",
    "label",
    "onClick",
    "onKeyDown",
    "onPointerLeave",
    "onPointerMove",
    "openOnHover",
    "ref",
    "textValue",
  ]);
  const disabled = () => root.disabled() || sub.disabled() || (local.disabled ?? false);
  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (!disabled()) sub.recordChange("trigger-press", event, event.currentTarget);
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key) && !disabled()) {
      sub.recordChange("list-navigation", event, event.currentTarget);
    }
  };
  const handlePointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (!root.highlightItemOnHover() || local.openOnHover === false) {
      event.preventDefault();
      return;
    }
    if (!disabled() && event.pointerType === "mouse") {
      sub.recordChange("trigger-hover", event, event.currentTarget);
      sub.cancelHoverClose();
      if (local.delay !== undefined && local.delay !== 100) {
        event.preventDefault();
        event.currentTarget.focus();
        sub.scheduleHoverOpen(local.delay, event, event.currentTarget);
      }
    }
  };
  const handlePointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (event.pointerType !== "mouse") return;

    sub.cancelHoverOpen();
    if (!disabled() && sub.open() && local.closeDelay !== undefined && local.closeDelay !== 0) {
      sub.scheduleHoverClose(local.closeDelay, event, event.currentTarget);
    }
  };
  return (
    <ContextMenuPrimitive.SubTrigger
      class={cn(
        "z-context-menu-sub-trigger flex cursor-default select-none items-center outline-hidden data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="context-menu-sub-trigger"
      data-inset={local.inset}
      disabled={disabled()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      ref={(element) => {
        sub.setTriggerRef(element);
        if (typeof local.ref === "function") local.ref(element);
      }}
      textValue={local.label ?? local.textValue}
      {...others}
    >
      {local.children}
      <ChevronRight class="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
};

type ContextMenuSubContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuSubContentProps<T>
> & {
  align?: ContextMenuAlign;
  alignOffset?: number;
  class?: string | undefined;
  finalFocus?: ContextMenuFinalFocus;
  side?: ContextMenuSide;
  sideOffset?: number;
};

const ContextMenuSubContent = <T extends ValidComponent = "div">(
  props: ContextMenuSubContentProps<T>,
) => {
  const root = useContextMenuRootContext();
  const sub = useContextMenuSubContext();
  const [local, others] = splitProps(props as ContextMenuSubContentProps, [
    "align",
    "alignOffset",
    "class",
    "finalFocus",
    "onEscapeKeyDown",
    "onKeyDown",
    "onPointerEnter",
    "ref",
    "side",
    "sideOffset",
  ]);
  const requestedPosition = (): ContextMenuPosition => ({
    align: local.align ?? DEFAULT_POSITION.align,
    alignOffset: local.alignOffset ?? DEFAULT_POSITION.alignOffset,
    side: local.side ?? DEFAULT_POSITION.side,
    sideOffset: local.sideOffset ?? DEFAULT_POSITION.sideOffset,
  });
  createEffect(() => sub.configurePosition(requestedPosition()));
  onCleanup(() => sub.setContentRef(undefined));
  const renderedSide = () => {
    const requestedSide = requestedPosition().side;
    if (requestedSide === "inline-start" || requestedSide === "inline-end") return requestedSide;
    return sub.currentPlacement().split("-")[0];
  };
  const renderedAlign = () => sub.currentPlacement().split("-")[1] ?? "center";
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    if (!event.currentTarget.contains(event.target as Node)) return;

    if (!root.loopFocus()) {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          '[role^="menuitem"]:not([aria-disabled="true"])',
        ),
      );
      const first = items[0];
      const last = items.at(-1);
      const previousKey = root.orientation() === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = root.orientation() === "vertical" ? "ArrowDown" : "ArrowRight";
      if (
        (event.key === previousKey && document.activeElement === first) ||
        (event.key === nextKey && document.activeElement === last)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (event.key !== "Escape") return;

    local.onEscapeKeyDown?.(event);
    if (event.defaultPrevented) return;
    const details = sub.requestOpenChange(false, "escape-key", event, event.currentTarget);
    const propagationAllowed = details?.isPropagationAllowed ?? false;
    event.preventDefault();
    if (!propagationAllowed) {
      event.stopPropagation();
      if (!sub.closeParentOnEsc()) root.preserveOnSubmenuEscape();
    }
    if (details?.isCanceled) return;
    queueMicrotask(() => {
      if (sub.closeParentOnEsc()) {
        root.requestOpenChange(false, "escape-key", event, event.currentTarget);
        return;
      }
      if (local.finalFocus === false) return;

      let focusTarget: boolean | HTMLElement | null | undefined;
      if (typeof local.finalFocus === "function") focusTarget = local.finalFocus("keyboard");
      else if (typeof local.finalFocus === "object") focusTarget = local.finalFocus.current;
      else focusTarget = local.finalFocus;
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
      else if (focusTarget !== false) sub.triggerRef()?.focus();
    });
  };
  const handlePointerEnter: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    sub.cancelHoverClose();
  };
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        class={cn(
          "z-50 z-context-menu-content z-context-menu-content-logical z-context-menu-subcontent z-menu-target z-menu-translucent max-h-(--kb-popper-content-available-height) origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto outline-none",
          local.class,
        )}
        data-align={renderedAlign()}
        data-side={renderedSide()}
        data-slot="context-menu-sub-content"
        onKeyDown={handleKeyDown}
        onPointerEnter={handlePointerEnter}
        ref={(element) => {
          sub.setContentRef(element);
          if (typeof local.ref === "function") local.ref(element);
        }}
        {...others}
      />
    </ContextMenuPrimitive.Portal>
  );
};

type ContextMenuCheckboxItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ContextMenuPrimitive.ContextMenuCheckboxItemProps<T>>,
  "checked" | "closeOnSelect" | "defaultChecked" | "onChange" | "textValue"
> & {
  checked?: boolean;
  class?: string | undefined;
  closeOnClick?: boolean;
  children?: JSX.Element;
  defaultChecked?: boolean;
  inset?: boolean;
  label?: string;
  onCheckedChange?: (checked: boolean, details: ContextMenuChangeDetails) => void;
};

const ContextMenuCheckboxItem = <T extends ValidComponent = "div">(
  props: ContextMenuCheckboxItemProps<T>,
) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props as ContextMenuCheckboxItemProps, [
    "checked",
    "class",
    "closeOnClick",
    "children",
    "defaultChecked",
    "disabled",
    "inset",
    "label",
    "onCheckedChange",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
  ]);
  const [uncontrolledChecked, setUncontrolledChecked] = createSignal(local.defaultChecked ?? false);
  const checked = () => local.checked ?? uncontrolledChecked();
  const disabled = () => root.disabled() || (local.disabled ?? false);
  let pendingEvent: Event | undefined;
  const recordEvent = (event: Event) => {
    pendingEvent = event;
    if (local.closeOnClick) root.recordChange("item-press", event, event.currentTarget as Element);
  };
  const interactions = createContextMenuItemInteractions({
    disabled,
    highlightItemOnHover: root.highlightItemOnHover,
    onActivate: recordEvent,
    onKeyDown: local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
    onPointerMove: local.onPointerMove as
      | JSX.EventHandlerUnion<HTMLElement, PointerEvent>
      | undefined,
    onPointerUp: local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
  });
  const handleChange = (nextChecked: boolean) => {
    const details = createChangeDetails(
      "item-press",
      pendingEvent,
      pendingEvent?.currentTarget as Element | undefined,
    );
    pendingEvent = undefined;
    local.onCheckedChange?.(nextChecked, details);
    if (details.isCanceled || local.checked !== undefined) return;
    setUncontrolledChecked(nextChecked);
  };
  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked()}
      class={cn(
        "relative z-context-menu-checkbox-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      closeOnSelect={local.closeOnClick ?? false}
      data-inset={local.inset}
      data-slot="context-menu-checkbox-item"
      disabled={disabled()}
      onChange={handleChange}
      onKeyDown={interactions.onKeyDown}
      onPointerMove={interactions.onPointerMove}
      onPointerUp={interactions.onPointerUp}
      textValue={local.label}
      {...others}
    >
      <span class="pointer-events-none z-context-menu-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <Check />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </ContextMenuPrimitive.CheckboxItem>
  );
};

type ContextMenuRadioGroupContextValue = {
  disabled: Accessor<boolean>;
  recordEvent: (event: Event) => void;
};

const ContextMenuRadioGroupContext = createContext<ContextMenuRadioGroupContextValue>();

type ContextMenuRadioGroupProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ContextMenuPrimitive.ContextMenuRadioGroupProps<T>>,
  "onChange"
> & {
  class?: string | undefined;
  onValueChange?: (value: string, details: ContextMenuChangeDetails) => void;
};

const ContextMenuRadioGroup = <T extends ValidComponent = "div">(
  props: ContextMenuRadioGroupProps<T>,
) => {
  const root = useContextMenuRootContext();
  const [local, others] = splitProps(props as ContextMenuRadioGroupProps, [
    "class",
    "defaultValue",
    "disabled",
    "onValueChange",
    "value",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal(local.defaultValue);
  const value = () => local.value ?? uncontrolledValue();
  let pendingEvent: Event | undefined;
  const context: ContextMenuRadioGroupContextValue = {
    disabled: () => root.disabled() || (local.disabled ?? false),
    recordEvent: (event) => {
      pendingEvent = event;
    },
  };
  const handleChange = (nextValue: string) => {
    const details = createChangeDetails(
      "item-press",
      pendingEvent,
      pendingEvent?.currentTarget as Element | undefined,
    );
    pendingEvent = undefined;
    local.onValueChange?.(nextValue, details);
    if (details.isCanceled || local.value !== undefined) return;
    setUncontrolledValue(nextValue);
  };
  return (
    <ContextMenuRadioGroupContext.Provider value={context}>
      <ContextMenuPrimitive.RadioGroup
        class={local.class}
        data-slot="context-menu-radio-group"
        disabled={context.disabled()}
        onChange={handleChange}
        value={value()}
        {...others}
      />
    </ContextMenuRadioGroupContext.Provider>
  );
};

type ContextMenuRadioItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ContextMenuPrimitive.ContextMenuRadioItemProps<T>>,
  "closeOnSelect" | "textValue"
> & {
  class?: string | undefined;
  closeOnClick?: boolean;
  children?: JSX.Element;
  inset?: boolean;
  label?: string;
};

const ContextMenuRadioItem = <T extends ValidComponent = "div">(
  props: ContextMenuRadioItemProps<T>,
) => {
  const root = useContextMenuRootContext();
  const radioGroup = useContext(ContextMenuRadioGroupContext);
  if (!radioGroup) throw new Error("ContextMenuRadioItem requires ContextMenuRadioGroup");
  const [local, others] = splitProps(props as ContextMenuRadioItemProps, [
    "class",
    "closeOnClick",
    "children",
    "disabled",
    "inset",
    "label",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
  ]);
  const disabled = () => root.disabled() || radioGroup.disabled() || (local.disabled ?? false);
  const recordEvent = (event: Event) => {
    radioGroup.recordEvent(event);
    if (local.closeOnClick) root.recordChange("item-press", event, event.currentTarget as Element);
  };
  const interactions = createContextMenuItemInteractions({
    disabled,
    highlightItemOnHover: root.highlightItemOnHover,
    onActivate: recordEvent,
    onKeyDown: local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
    onPointerMove: local.onPointerMove as
      | JSX.EventHandlerUnion<HTMLElement, PointerEvent>
      | undefined,
    onPointerUp: local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
  });
  return (
    <ContextMenuPrimitive.RadioItem
      class={cn(
        "relative z-context-menu-radio-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      closeOnSelect={local.closeOnClick ?? false}
      data-inset={local.inset}
      data-slot="context-menu-radio-item"
      disabled={disabled()}
      onKeyDown={interactions.onKeyDown}
      onPointerMove={interactions.onPointerMove}
      onPointerUp={interactions.onPointerUp}
      textValue={local.label}
      {...others}
    >
      <span class="pointer-events-none z-context-menu-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <Check />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </ContextMenuPrimitive.RadioItem>
  );
};

type ContextMenuSeparatorProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ContextMenuPrimitive.ContextMenuSeparatorProps<T>
> & {
  class?: string | undefined;
};

const ContextMenuSeparator = <T extends ValidComponent = "div">(
  props: ContextMenuSeparatorProps<T>,
) => {
  const [local, others] = splitProps(props as ContextMenuSeparatorProps, ["class"]);
  return (
    <ContextMenuPrimitive.Separator
      as="div"
      class={cn("z-context-menu-separator", local.class)}
      data-slot="context-menu-separator"
      {...others}
    />
  );
};

type ContextMenuShortcutProps = ComponentProps<"span"> & {
  class?: string | undefined;
};

const ContextMenuShortcut = (props: ContextMenuShortcutProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("z-context-menu-shortcut", local.class)}
      data-slot="context-menu-shortcut"
      {...others}
    />
  );
};

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
