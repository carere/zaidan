import * as DropdownMenuPrimitive from "@kobalte/core/dropdown-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronRight } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";

type DropdownMenuChangeReason =
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

type DropdownMenuChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  reason: DropdownMenuChangeReason;
  trigger: Element | undefined;
};

function createChangeDetails(
  reason: DropdownMenuChangeReason,
  event?: Event,
  trigger?: Element,
): DropdownMenuChangeDetails {
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
    // Kobalte owns exit presence rather than exposing Base UI's externally completed unmount.
    preventUnmountOnClose: () => {},
    reason,
    trigger,
  };
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

type DropdownMenuProps = Omit<DropdownMenuPrimitive.DropdownMenuRootProps, "onOpenChange"> & {
  actionsRef?: { current: DropdownMenuActions | null };
  closeParentOnEsc?: boolean;
  defaultTriggerId?: string | null;
  disabled?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  onOpenChange?: (open: boolean, details: DropdownMenuChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  triggerId?: string | null;
};

type DropdownMenuActions = {
  close: () => void;
  unmount: () => void;
};

type DropdownMenuInteractionType = "keyboard" | "mouse" | "pen" | "touch";
type DropdownMenuFinalFocus =
  | boolean
  | { current: HTMLElement | null }
  | ((interactionType: DropdownMenuInteractionType) => boolean | HTMLElement | null | undefined);

type DropdownMenuSide = "bottom" | "inline-end" | "inline-start" | "left" | "right" | "top";
type DropdownMenuAlign = "center" | "end" | "start";

type DropdownMenuPositioning = {
  align: DropdownMenuAlign;
  alignOffset: number;
  side: DropdownMenuSide;
  sideOffset: number;
};

type DropdownMenuContextValue = {
  currentChange: () =>
    | { event: Event; reason: DropdownMenuChangeReason; trigger?: Element }
    | undefined;
  currentPlacement: () => string;
  disabled: () => boolean;
  focusAfterClose: (event?: Event, previouslyFocused?: HTMLElement) => void;
  highlightItemOnHover: () => boolean;
  isOpen: () => boolean;
  loopFocus: () => boolean;
  preventNextClose: () => void;
  recordChange: (reason: DropdownMenuChangeReason, event: Event, trigger?: Element) => void;
  requestOpen: (
    open: boolean,
    reason: DropdownMenuChangeReason,
    event: Event,
    trigger?: Element,
  ) => void;
  setCurrentPlacement: (placement: string) => void;
  setFocusAfterClose: (focus: (event?: Event, previouslyFocused?: HTMLElement) => void) => void;
  setKeepMounted: (keepMounted: boolean) => void;
  setPositioning: (positioning: DropdownMenuPositioning) => void;
  setTrigger: (trigger: HTMLElement) => void;
  trigger: () => HTMLElement | undefined;
  triggerId: () => string | undefined;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue>();

function toKobaltePlacement(
  positioning: DropdownMenuPositioning,
): NonNullable<DropdownMenuPrimitive.DropdownMenuRootProps["placement"]> {
  // Direction and RTL are intentionally outside this release-sync campaign. Keep the Base UI
  // logical aliases useful for the supported LTR surface while Kobalte consumes physical sides.
  const side =
    positioning.side === "inline-start"
      ? "left"
      : positioning.side === "inline-end"
        ? "right"
        : positioning.side;

  return (positioning.align === "center" ? side : `${side}-${positioning.align}`) as NonNullable<
    DropdownMenuPrimitive.DropdownMenuRootProps["placement"]
  >;
}

function placementParts(placement: string) {
  const [side, align = "center"] = placement.split("-");
  return { align, side };
}

function placementFromTransformOrigin(origin: string) {
  const [reverseSide, crossAxis = "center"] = origin.trim().split(/\s+/);
  const side = { bottom: "top", left: "right", right: "left", top: "bottom" }[reverseSide];
  if (!side) return undefined;

  const align =
    crossAxis === "center"
      ? "center"
      : side === "left" || side === "right"
        ? crossAxis === "top"
          ? "start"
          : "end"
        : crossAxis === "left"
          ? "start"
          : "end";
  return align === "center" ? side : `${side}-${align}`;
}

function observeKobaltePlacement(
  content: HTMLElement,
  setCurrentPlacement: (placement: string) => void,
) {
  const positioner = content.parentElement;
  if (!positioner) return () => {};

  const update = () => {
    const origin = positioner.style.getPropertyValue("--kb-popper-content-transform-origin");
    const placement = placementFromTransformOrigin(origin);
    if (placement) setCurrentPlacement(placement);
  };
  const observer = new MutationObserver(update);
  observer.observe(positioner, { attributeFilter: ["style"], attributes: true });
  queueMicrotask(update);
  return () => observer.disconnect();
}

function interactionType(event?: Event): DropdownMenuInteractionType {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof PointerEvent) {
    return event.pointerType === "touch" || event.pointerType === "pen"
      ? event.pointerType
      : "mouse";
  }
  return "mouse";
}

function applyFinalFocus(
  finalFocus: DropdownMenuFinalFocus | undefined,
  event: Event | undefined,
  defaultTarget: HTMLElement | undefined,
  previouslyFocused: HTMLElement | undefined,
) {
  const result =
    typeof finalFocus === "function"
      ? finalFocus(interactionType(event))
      : finalFocus && typeof finalFocus === "object"
        ? finalFocus.current
        : finalFocus;

  if (result === true || finalFocus === undefined) {
    defaultTarget?.focus();
  } else if (typeof HTMLElement !== "undefined" && result instanceof HTMLElement) {
    result.focus();
  } else if (previouslyFocused?.isConnected) {
    // Kobalte restores trigger focus unconditionally, so put focus back when the Base UI
    // contract explicitly requests no move or a focus callback returns no target.
    previouslyFocused.focus();
  }
}

function preventFocusLoop(event: KeyboardEvent & { currentTarget: HTMLElement }) {
  if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;

  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
    ),
  ).filter(
    (item) =>
      item.getAttribute("aria-disabled") !== "true" &&
      item.closest<HTMLElement>('[role="menu"]') === event.currentTarget,
  );
  const activeIndex = items.indexOf(event.target as HTMLElement);
  const atBoundary =
    (event.key === "ArrowUp" && activeIndex === 0) ||
    (event.key === "ArrowDown" && activeIndex === items.length - 1);
  if (!atBoundary) return;

  event.preventDefault();
  event.stopPropagation();
}

const DropdownMenu = (props: DropdownMenuProps) => {
  const [local, others] = splitProps(props, [
    "actionsRef",
    "children",
    "closeParentOnEsc",
    "defaultOpen",
    "defaultTriggerId",
    "disabled",
    "forceMount",
    "gutter",
    "highlightItemOnHover",
    "loopFocus",
    "onOpenChange",
    "onOpenChangeComplete",
    "open",
    "orientation",
    "placement",
    "sameWidth",
    "shift",
    "triggerId",
  ]);
  const initialPlacement = placementParts(local.placement ?? "bottom-start");
  const [positioning, setPositioning] = createSignal<DropdownMenuPositioning>({
    align: initialPlacement.align as DropdownMenuAlign,
    alignOffset: local.shift ?? 0,
    side: initialPlacement.side as DropdownMenuSide,
    sideOffset: local.gutter ?? 4,
  });
  const [currentPlacement, setCurrentPlacement] = createSignal(toKobaltePlacement(positioning()));
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [keepMounted, setKeepMounted] = createSignal(false);
  const open = () => local.open ?? uncontrolledOpen();
  let pendingChange:
    | { event: Event; reason: DropdownMenuChangeReason; trigger?: Element }
    | undefined;
  let ignoreNextClose = false;
  let completionTimer: ReturnType<typeof setTimeout> | undefined;
  let focusAfterClose = (event?: Event, previouslyFocused?: HTMLElement) =>
    applyFinalFocus(undefined, event, trigger(), previouslyFocused);
  const applyOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && ignoreNextClose) {
      ignoreNextClose = false;
      pendingChange = undefined;
      return;
    }
    const change = pendingChange;
    pendingChange = undefined;
    const details = createChangeDetails(change?.reason ?? "none", change?.event, change?.trigger);
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return;

    const previouslyFocused =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    if (local.open === undefined) setUncontrolledOpen(nextOpen);
    if (!nextOpen) {
      const closeEvent = change?.event;
      queueMicrotask(() => focusAfterClose(closeEvent, previouslyFocused));
    }
    clearTimeout(completionTimer);
    completionTimer = setTimeout(() => local.onOpenChangeComplete?.(nextOpen), 100);
  };
  const actions: DropdownMenuActions = {
    close: () => {
      pendingChange = { event: new Event("base-ui"), reason: "imperative-action" };
      applyOpenChange(false);
    },
    unmount: () => {
      // Kobalte has no separate manual presence-unmount action; closing releases its portal.
      pendingChange = { event: new Event("base-ui"), reason: "imperative-action" };
      applyOpenChange(false);
    },
  };
  createEffect(() => {
    const actionsRef = local.actionsRef;
    if (!actionsRef) return;
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });
  onCleanup(() => clearTimeout(completionTimer));
  const context: DropdownMenuContextValue = {
    currentChange: () => pendingChange,
    currentPlacement,
    disabled: () => local.disabled ?? false,
    focusAfterClose: (event, previouslyFocused) => focusAfterClose(event, previouslyFocused),
    highlightItemOnHover: () => local.highlightItemOnHover ?? true,
    isOpen: open,
    loopFocus: () => local.loopFocus ?? true,
    preventNextClose: () => {
      ignoreNextClose = true;
    },
    recordChange: (reason, event, trigger) => {
      pendingChange = { event, reason, trigger };
    },
    requestOpen: (nextOpen, reason, event, trigger) => {
      if ((nextOpen && local.disabled) || nextOpen === open()) return;
      pendingChange = { event, reason, trigger };
      applyOpenChange(nextOpen);
    },
    setCurrentPlacement,
    setFocusAfterClose: (focus) => {
      focusAfterClose = focus;
    },
    setKeepMounted,
    setPositioning: (nextPositioning) => {
      setPositioning(nextPositioning);
      setCurrentPlacement(toKobaltePlacement(nextPositioning));
    },
    setTrigger,
    trigger,
    triggerId: () => local.triggerId ?? local.defaultTriggerId ?? undefined,
  };

  return (
    <DropdownMenuContext.Provider value={context}>
      <DropdownMenuPrimitive.Root
        data-slot="dropdown-menu"
        open={open()}
        defaultOpen={undefined}
        forceMount={(local.forceMount ?? false) || keepMounted()}
        placement={toKobaltePlacement(positioning())}
        gutter={positioning().sideOffset}
        shift={positioning().alignOffset}
        sameWidth={local.sameWidth ?? true}
        orientation={local.orientation === "horizontal" ? "vertical" : "horizontal"}
        onOpenChange={applyOpenChange}
        {...others}
      >
        {local.children}
      </DropdownMenuPrimitive.Root>
    </DropdownMenuContext.Provider>
  );
};

type DropdownMenuPortalProps = DropdownMenuPrimitive.DropdownMenuPortalProps & {
  keepMounted?: boolean;
};

const DropdownMenuPortal = (props: DropdownMenuPortalProps) => {
  const rootContext = useContext(DropdownMenuContext);
  const [local, others] = splitProps(props, ["keepMounted", "ref"]);
  createEffect(() => rootContext?.setKeepMounted(local.keepMounted ?? false));
  onCleanup(() => rootContext?.setKeepMounted(false));
  return (
    <DropdownMenuPrimitive.Portal
      ref={(element) => {
        element.dataset.slot = "dropdown-menu-portal";
        if (typeof local.ref === "function") local.ref(element);
      }}
      {...others}
    />
  );
};

type DropdownMenuTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {
    closeDelay?: number;
    delay?: number;
    openOnHover?: boolean;
  };

const DropdownMenuTrigger = <T extends ValidComponent = "button">(
  props: DropdownMenuTriggerProps<T>,
) => {
  const rootContext = useContext(DropdownMenuContext);
  const [local, others] = splitProps(props as DropdownMenuTriggerProps, [
    "class",
    "closeDelay",
    "delay",
    "disabled",
    "id",
    "onClick",
    "onKeyDown",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerDown",
    "openOnHover",
    "ref",
  ]);
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
  });
  return (
    <DropdownMenuPrimitive.Trigger
      class={local.class}
      data-slot="dropdown-menu-trigger"
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      id={local.id ?? rootContext?.triggerId()}
      ref={(element) => {
        rootContext?.setTrigger(element);
        if (typeof local.ref === "function") local.ref(element);
      }}
      onClick={(event) => {
        rootContext?.recordChange("trigger-press", event, event.currentTarget);
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
      }}
      onKeyDown={(event) => {
        if ([" ", "ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
          rootContext?.recordChange("trigger-press", event, event.currentTarget);
        }
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
      }}
      onPointerDown={(event) => {
        rootContext?.recordChange("trigger-press", event, event.currentTarget);
        callEventHandler(
          local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
      }}
      onPointerEnter={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (!local.openOnHover || local.disabled || event.pointerType === "touch") return;
        clearTimeout(closeTimer);
        const target = event.currentTarget;
        openTimer = setTimeout(
          () => rootContext?.requestOpen(true, "trigger-hover", event, target),
          local.delay ?? 100,
        );
      }}
      onPointerLeave={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (!local.openOnHover || local.disabled || event.pointerType === "touch") return;
        clearTimeout(openTimer);
        const relatedTarget = event.relatedTarget;
        if (
          relatedTarget instanceof Element &&
          relatedTarget.closest('[data-slot="dropdown-menu-content"]')
        ) {
          return;
        }
        const target = event.currentTarget;
        closeTimer = setTimeout(
          () => rootContext?.requestOpen(false, "trigger-hover", event, target),
          local.closeDelay ?? 0,
        );
      }}
      {...others}
    />
  );
};

type DropdownMenuContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuContentProps<T>
> &
  Pick<ComponentProps<T>, "class"> &
  Partial<DropdownMenuPositioning> & {
    finalFocus?: DropdownMenuFinalFocus;
  };

const DropdownMenuContent = <T extends ValidComponent = "div">(
  props: DropdownMenuContentProps<T>,
) => {
  const mergedProps = mergeProps(
    { align: "start", alignOffset: 0, side: "bottom", sideOffset: 4 } as const,
    props,
  );
  const [local, others] = splitProps(mergedProps as DropdownMenuContentProps, [
    "align",
    "alignOffset",
    "class",
    "finalFocus",
    "onEscapeKeyDown",
    "onFocusOutside",
    "onPointerDownOutside",
    "ref",
    "side",
    "sideOffset",
  ]);
  const positionContext = useContext(DropdownMenuContext);
  let contentElement: HTMLDivElement | undefined;
  let stopObservingPlacement: (() => void) | undefined;
  const handleKeyDownCapture = (event: KeyboardEvent) => {
    if (!positionContext?.loopFocus()) {
      preventFocusLoop(event as KeyboardEvent & { currentTarget: HTMLElement });
    }
  };
  const setContentElement = (element: HTMLDivElement) => {
    contentElement?.removeEventListener("keydown", handleKeyDownCapture, true);
    contentElement = element;
    contentElement.addEventListener("keydown", handleKeyDownCapture, true);
    stopObservingPlacement?.();
    if (positionContext) {
      stopObservingPlacement = observeKobaltePlacement(
        contentElement,
        positionContext.setCurrentPlacement,
      );
    }
    if (typeof local.ref === "function") local.ref(element);
  };
  onCleanup(() => {
    contentElement?.removeEventListener("keydown", handleKeyDownCapture, true);
    stopObservingPlacement?.();
  });
  createEffect(() => {
    positionContext?.setPositioning({
      align: local.align ?? "start",
      alignOffset: local.alignOffset ?? 0,
      side: local.side ?? "bottom",
      sideOffset: local.sideOffset ?? 4,
    });
  });
  createEffect(() => {
    const finalFocus = local.finalFocus;
    positionContext?.setFocusAfterClose((event, previouslyFocused) =>
      applyFinalFocus(finalFocus, event, positionContext.trigger(), previouslyFocused),
    );
    onCleanup(() => {
      positionContext?.setFocusAfterClose((event, previouslyFocused) =>
        applyFinalFocus(undefined, event, positionContext.trigger(), previouslyFocused),
      );
    });
  });
  const currentPosition = () =>
    placementParts(
      positionContext?.currentPlacement() ?? toKobaltePlacement(local as DropdownMenuPositioning),
    );

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        ref={setContentElement}
        data-align={currentPosition().align}
        data-side={currentPosition().side}
        class={cn(
          "z-50 z-dropdown-menu-content z-dropdown-menu-content-logical z-menu-target z-menu-translucent max-h-(--kb-popper-content-available-height) w-(--kb-popper-anchor-width) origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden",
          local.class,
        )}
        onEscapeKeyDown={(event) => {
          positionContext?.recordChange("escape-key", event);
          local.onEscapeKeyDown?.(event);
        }}
        onFocusOutside={(event) => {
          positionContext?.recordChange("focus-out", event);
          local.onFocusOutside?.(event);
        }}
        onPointerDownOutside={(event) => {
          positionContext?.recordChange("outside-press", event);
          local.onPointerDownOutside?.(event);
        }}
        {...others}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

type DropdownMenuGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuGroupProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DropdownMenuGroup = <T extends ValidComponent = "div">(props: DropdownMenuGroupProps<T>) => {
  const [local, others] = splitProps(props as DropdownMenuGroupProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Group class={local.class} data-slot="dropdown-menu-group" {...others} />
  );
};

type DropdownMenuLabelProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuGroupLabelProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {
    inset?: boolean;
  };

const DropdownMenuLabel = <T extends ValidComponent = "span">(props: DropdownMenuLabelProps<T>) => {
  const [local, others] = splitProps(props as DropdownMenuLabelProps, ["class", "inset"]);
  return (
    <DropdownMenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={local.inset}
      class={cn("z-dropdown-menu-label data-inset:pl-8", local.class)}
      {...others}
    />
  );
};

type DropdownMenuItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, DropdownMenuPrimitive.DropdownMenuItemProps<T>>,
  "closeOnSelect" | "textValue"
> &
  Pick<ComponentProps<T>, "class"> & {
    closeOnClick?: boolean;
    inset?: boolean;
    label?: string;
    variant?: "default" | "destructive";
  };

const DropdownMenuItem = <T extends ValidComponent = "div">(rawProps: DropdownMenuItemProps<T>) => {
  const props = mergeProps({ variant: "default" } as DropdownMenuItemProps<T>, rawProps);
  const rootContext = useContext(DropdownMenuContext);
  const [local, others] = splitProps(props as DropdownMenuItemProps, [
    "class",
    "closeOnClick",
    "disabled",
    "inset",
    "label",
    "onClick",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
    "variant",
  ]);
  const recordItemPress = (event: Event, trigger: Element) =>
    rootContext?.recordChange("item-press", event, trigger);
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={local.inset}
      data-variant={local.variant}
      closeOnSelect={local.closeOnClick ?? true}
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      textValue={local.label}
      onClick={(event) =>
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        )
      }
      onKeyDown={(event) => {
        if ([" ", "Enter"].includes(event.key)) recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
      }}
      onPointerMove={(event) => {
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (!rootContext?.highlightItemOnHover()) event.preventDefault();
      }}
      onPointerUp={(event) => {
        recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
      }}
      class={cn(
        "group/dropdown-menu-item relative z-dropdown-menu-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-inset:pl-8 data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      {...others}
    />
  );
};

type DropdownMenuSubProps = Omit<DropdownMenuPrimitive.DropdownMenuSubProps, "onOpenChange"> & {
  closeParentOnEsc?: boolean;
  disabled?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  onOpenChange?: (open: boolean, details: DropdownMenuChangeDetails) => void;
};

const PositionedSub = DropdownMenuPrimitive.Sub as unknown as (
  props: DropdownMenuPrimitive.DropdownMenuSubProps & {
    placement: NonNullable<DropdownMenuPrimitive.DropdownMenuRootProps["placement"]>;
  },
) => JSX.Element;

const DropdownMenuSub = (props: DropdownMenuSubProps) => {
  const [local, others] = splitProps(props, [
    "children",
    "closeParentOnEsc",
    "defaultOpen",
    "disabled",
    "gutter",
    "highlightItemOnHover",
    "loopFocus",
    "onOpenChange",
    "open",
    "shift",
  ]);
  const initialPlacement = placementParts("right-start");
  const [positioning, setPositioning] = createSignal<DropdownMenuPositioning>({
    align: initialPlacement.align as DropdownMenuAlign,
    alignOffset: local.shift ?? -3,
    side: initialPlacement.side as DropdownMenuSide,
    sideOffset: local.gutter ?? 0,
  });
  const [currentPlacement, setCurrentPlacement] = createSignal(toKobaltePlacement(positioning()));
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [subTrigger, setSubTrigger] = createSignal<HTMLElement>();
  const open = () => local.open ?? uncontrolledOpen();
  const parentContext = useContext(DropdownMenuContext);
  let focusAfterClose = (event?: Event, previouslyFocused?: HTMLElement) =>
    applyFinalFocus(undefined, event, subTrigger(), previouslyFocused);
  const applySubOpenChange = (nextOpen: boolean) => {
    const change = parentContext?.currentChange();
    const details = createChangeDetails(change?.reason ?? "none", change?.event, change?.trigger);
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return;
    if (!nextOpen && details.reason === "escape-key" && !local.closeParentOnEsc) {
      parentContext?.preventNextClose();
    }
    const previouslyFocused =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    if (local.open === undefined) setUncontrolledOpen(nextOpen);
    if (!nextOpen) {
      setTimeout(() => focusAfterClose(change?.event, previouslyFocused));
    }
  };
  const context: DropdownMenuContextValue = {
    currentChange: () => parentContext?.currentChange(),
    currentPlacement,
    disabled: () => (parentContext?.disabled() ?? false) || (local.disabled ?? false),
    focusAfterClose: (event, previouslyFocused) => focusAfterClose(event, previouslyFocused),
    highlightItemOnHover: () =>
      local.highlightItemOnHover ?? parentContext?.highlightItemOnHover() ?? true,
    isOpen: open,
    loopFocus: () => local.loopFocus ?? parentContext?.loopFocus() ?? true,
    preventNextClose: () => parentContext?.preventNextClose(),
    recordChange: (reason, event, trigger) => parentContext?.recordChange(reason, event, trigger),
    requestOpen: (nextOpen, reason, event, trigger) => {
      if (nextOpen === open()) return;
      parentContext?.recordChange(reason, event, trigger);
      applySubOpenChange(nextOpen);
    },
    setCurrentPlacement,
    setFocusAfterClose: (focus) => {
      focusAfterClose = focus;
    },
    setKeepMounted: (keepMounted) => parentContext?.setKeepMounted(keepMounted),
    setPositioning: (nextPositioning) => {
      setPositioning(nextPositioning);
      setCurrentPlacement(toKobaltePlacement(nextPositioning));
    },
    setTrigger: setSubTrigger,
    trigger: subTrigger,
    triggerId: () => undefined,
  };

  return (
    <DropdownMenuContext.Provider value={context}>
      <PositionedSub
        data-slot="dropdown-menu-sub"
        open={open()}
        placement={toKobaltePlacement(positioning())}
        gutter={positioning().sideOffset}
        shift={positioning().alignOffset}
        onOpenChange={applySubOpenChange}
        {...others}
      >
        {local.children}
      </PositionedSub>
    </DropdownMenuContext.Provider>
  );
};

type DropdownMenuSubTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuSubTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    closeDelay?: number;
    delay?: number;
    inset?: boolean;
    openOnHover?: boolean;
  };

const DropdownMenuSubTrigger = <T extends ValidComponent = "div">(
  props: DropdownMenuSubTriggerProps<T>,
) => {
  const rootContext = useContext(DropdownMenuContext);
  const [local, others] = splitProps(props as DropdownMenuSubTriggerProps, [
    "class",
    "closeDelay",
    "children",
    "delay",
    "disabled",
    "inset",
    "onClick",
    "onKeyDown",
    "onPointerLeave",
    "onPointerMove",
    "openOnHover",
    "ref",
  ]);
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
  });
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={local.inset}
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      ref={(element) => {
        rootContext?.setTrigger(element);
        if (typeof local.ref === "function") local.ref(element);
      }}
      onClick={(event) => {
        rootContext?.recordChange("trigger-press", event, event.currentTarget);
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
      }}
      onKeyDown={(event) => {
        if ([" ", "Enter"].includes(event.key)) {
          rootContext?.recordChange("trigger-press", event, event.currentTarget);
        } else if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          rootContext?.recordChange("list-navigation", event, event.currentTarget);
        }
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
      }}
      onPointerMove={(event) => {
        rootContext?.recordChange("trigger-hover", event, event.currentTarget);
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (local.openOnHover !== undefined) {
          event.preventDefault();
          clearTimeout(closeTimer);
          clearTimeout(openTimer);
          if (local.openOnHover && !local.disabled && event.pointerType === "mouse") {
            const target = event.currentTarget;
            target.focus();
            openTimer = setTimeout(
              () => rootContext?.requestOpen(true, "trigger-hover", event, target),
              local.delay ?? 100,
            );
          }
        }
        if (!rootContext?.highlightItemOnHover()) event.preventDefault();
      }}
      onPointerLeave={(event) => {
        callEventHandler(
          local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (local.openOnHover === undefined || event.pointerType !== "mouse") return;
        event.preventDefault();
        clearTimeout(openTimer);
        const relatedTarget = event.relatedTarget;
        if (
          relatedTarget instanceof Element &&
          relatedTarget.closest('[data-slot="dropdown-menu-sub-content"]')
        ) {
          return;
        }
        const target = event.currentTarget;
        closeTimer = setTimeout(
          () => rootContext?.requestOpen(false, "trigger-hover", event, target),
          local.closeDelay ?? 0,
        );
      }}
      class={cn(
        "z-dropdown-menu-sub-trigger flex cursor-default select-none items-center outline-hidden data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <ChevronRight class="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
};

type DropdownMenuSubContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuSubContentProps<T>
> &
  Pick<ComponentProps<T>, "class"> &
  Partial<DropdownMenuPositioning> & {
    finalFocus?: DropdownMenuFinalFocus;
  };

const DropdownMenuSubContent = <T extends ValidComponent = "div">(
  props: DropdownMenuSubContentProps<T>,
) => {
  const mergedProps = mergeProps(
    { align: "start", alignOffset: -3, side: "right", sideOffset: 0 } as const,
    props,
  );
  const [local, others] = splitProps(mergedProps as DropdownMenuSubContentProps, [
    "align",
    "alignOffset",
    "class",
    "finalFocus",
    "onEscapeKeyDown",
    "onFocusOutside",
    "onPointerDownOutside",
    "ref",
    "side",
    "sideOffset",
  ]);
  const positionContext = useContext(DropdownMenuContext);
  let contentElement: HTMLDivElement | undefined;
  let stopObservingPlacement: (() => void) | undefined;
  const handleKeyDownCapture = (event: KeyboardEvent) => {
    if (!positionContext?.loopFocus()) {
      preventFocusLoop(event as KeyboardEvent & { currentTarget: HTMLElement });
    }
  };
  const setContentElement = (element: HTMLDivElement) => {
    contentElement?.removeEventListener("keydown", handleKeyDownCapture, true);
    contentElement = element;
    contentElement.addEventListener("keydown", handleKeyDownCapture, true);
    stopObservingPlacement?.();
    if (positionContext) {
      stopObservingPlacement = observeKobaltePlacement(
        contentElement,
        positionContext.setCurrentPlacement,
      );
    }
    if (typeof local.ref === "function") local.ref(element);
  };
  onCleanup(() => {
    contentElement?.removeEventListener("keydown", handleKeyDownCapture, true);
    stopObservingPlacement?.();
  });
  createEffect(() => {
    positionContext?.setPositioning({
      align: local.align ?? "start",
      alignOffset: local.alignOffset ?? -3,
      side: local.side ?? "right",
      sideOffset: local.sideOffset ?? 0,
    });
  });
  createEffect(() => {
    const finalFocus = local.finalFocus;
    positionContext?.setFocusAfterClose((event, previouslyFocused) =>
      applyFinalFocus(finalFocus, event, positionContext.trigger(), previouslyFocused),
    );
    onCleanup(() => {
      positionContext?.setFocusAfterClose((event, previouslyFocused) =>
        applyFinalFocus(undefined, event, positionContext.trigger(), previouslyFocused),
      );
    });
  });
  const currentPosition = () =>
    placementParts(
      positionContext?.currentPlacement() ?? toKobaltePlacement(local as DropdownMenuPositioning),
    );

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        ref={setContentElement}
        data-align={currentPosition().align}
        data-side={currentPosition().side}
        class={cn(
          "z-50 z-dropdown-menu-content z-dropdown-menu-content-logical z-dropdown-menu-sub-content z-menu-target z-menu-translucent max-h-(--kb-popper-content-available-height) w-auto origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden",
          local.class,
        )}
        onEscapeKeyDown={(event) => {
          positionContext?.recordChange("escape-key", event);
          local.onEscapeKeyDown?.(event);
        }}
        onFocusOutside={(event) => {
          positionContext?.recordChange("focus-out", event);
          local.onFocusOutside?.(event);
        }}
        onPointerDownOutside={(event) => {
          positionContext?.recordChange("outside-press", event);
          local.onPointerDownOutside?.(event);
        }}
        {...others}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

type DropdownMenuCheckboxItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, DropdownMenuPrimitive.DropdownMenuCheckboxItemProps<T>>,
  "closeOnSelect" | "textValue"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    closeOnClick?: boolean;
    inset?: boolean;
    label?: string;
    onCheckedChange?: (checked: boolean, details: DropdownMenuChangeDetails) => void;
  };

const DropdownMenuCheckboxItem = <T extends ValidComponent = "div">(
  props: DropdownMenuCheckboxItemProps<T>,
) => {
  const rootContext = useContext(DropdownMenuContext);
  const [uncontrolledChecked, setUncontrolledChecked] = createSignal(props.defaultChecked ?? false);
  const [local, others] = splitProps(props as DropdownMenuCheckboxItemProps, [
    "checked",
    "class",
    "closeOnClick",
    "children",
    "defaultChecked",
    "disabled",
    "inset",
    "label",
    "onCheckedChange",
    "onChange",
    "onClick",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
  ]);
  const checked = () => local.checked ?? uncontrolledChecked();
  const recordItemPress = (event: Event, trigger: Element) =>
    rootContext?.recordChange("item-press", event, trigger);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={local.inset}
      checked={checked()}
      closeOnSelect={local.closeOnClick ?? false}
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      textValue={local.label}
      onChange={(nextChecked) => {
        const change = rootContext?.currentChange();
        const details = createChangeDetails("item-press", change?.event, change?.trigger);
        local.onCheckedChange?.(nextChecked, details);
        if (details.isCanceled) return;
        local.onChange?.(nextChecked);
        if (local.checked === undefined) setUncontrolledChecked(nextChecked);
      }}
      onClick={(event) =>
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        )
      }
      onKeyDown={(event) => {
        if ([" ", "Enter"].includes(event.key)) recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
      }}
      onPointerMove={(event) => {
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (!rootContext?.highlightItemOnHover()) event.preventDefault();
      }}
      onPointerUp={(event) => {
        recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
      }}
      class={cn(
        "relative z-dropdown-menu-checkbox-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      {...others}
    >
      <span
        class="pointer-events-none z-dropdown-menu-item-indicator"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <Check />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
};

type DropdownMenuRadioGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuRadioGroupProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {
    onValueChange?: (value: string, details: DropdownMenuChangeDetails) => void;
  };

const DropdownMenuRadioGroup = <T extends ValidComponent = "div">(
  props: DropdownMenuRadioGroupProps<T>,
) => {
  const rootContext = useContext(DropdownMenuContext);
  const [uncontrolledValue, setUncontrolledValue] = createSignal(props.defaultValue);
  const [local, others] = splitProps(props as DropdownMenuRadioGroupProps, [
    "class",
    "defaultValue",
    "disabled",
    "onChange",
    "onValueChange",
    "value",
  ]);
  const value = () => local.value ?? uncontrolledValue();
  return (
    <DropdownMenuPrimitive.RadioGroup
      class={local.class}
      data-slot="dropdown-menu-radio-group"
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      value={value()}
      onChange={(nextValue) => {
        const change = rootContext?.currentChange();
        const details = createChangeDetails("item-press", change?.event, change?.trigger);
        local.onValueChange?.(nextValue, details);
        if (details.isCanceled) return;
        local.onChange?.(nextValue);
        if (local.value === undefined) setUncontrolledValue(nextValue);
      }}
      {...others}
    />
  );
};

type DropdownMenuRadioItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, DropdownMenuPrimitive.DropdownMenuRadioItemProps<T>>,
  "closeOnSelect" | "textValue"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    closeOnClick?: boolean;
    inset?: boolean;
    label?: string;
  };

const DropdownMenuRadioItem = <T extends ValidComponent = "div">(
  props: DropdownMenuRadioItemProps<T>,
) => {
  const rootContext = useContext(DropdownMenuContext);
  const [local, others] = splitProps(props as DropdownMenuRadioItemProps, [
    "class",
    "closeOnClick",
    "children",
    "disabled",
    "inset",
    "label",
    "onClick",
    "onKeyDown",
    "onPointerMove",
    "onPointerUp",
  ]);
  const recordItemPress = (event: Event, trigger: Element) =>
    rootContext?.recordChange("item-press", event, trigger);
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={local.inset}
      closeOnSelect={local.closeOnClick ?? false}
      disabled={(rootContext?.disabled() ?? false) || local.disabled}
      textValue={local.label}
      onClick={(event) =>
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        )
      }
      onKeyDown={(event) => {
        if ([" ", "Enter"].includes(event.key)) recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
      }}
      onPointerMove={(event) => {
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (!rootContext?.highlightItemOnHover()) event.preventDefault();
      }}
      onPointerUp={(event) => {
        recordItemPress(event, event.currentTarget);
        callEventHandler(
          local.onPointerUp as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
      }}
      class={cn(
        "relative z-dropdown-menu-radio-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      {...others}
    >
      <span
        class="pointer-events-none z-dropdown-menu-item-indicator"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <Check />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.RadioItem>
  );
};

type DropdownMenuSeparatorProps<T extends ValidComponent = "hr"> = PolymorphicProps<
  T,
  DropdownMenuPrimitive.DropdownMenuSeparatorProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DropdownMenuSeparator = <T extends ValidComponent = "hr">(
  props: DropdownMenuSeparatorProps<T>,
) => {
  const [local, others] = splitProps(props as DropdownMenuSeparatorProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      class={cn("z-dropdown-menu-separator", local.class)}
      {...others}
    />
  );
};

type DropdownMenuShortcutProps = ComponentProps<"span">;

const DropdownMenuShortcut = (props: DropdownMenuShortcutProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      class={cn("z-dropdown-menu-shortcut", local.class)}
      {...others}
    />
  );
};

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
