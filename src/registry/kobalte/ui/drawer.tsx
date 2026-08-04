import {
  Close as CorvuClose,
  type CloseProps as CorvuCloseProps,
  Content as CorvuContent,
  type ContentProps as CorvuContentProps,
  Description as CorvuDescription,
  type DescriptionProps as CorvuDescriptionProps,
  Label as CorvuLabel,
  type LabelProps as CorvuLabelProps,
  Overlay as CorvuOverlay,
  type OverlayProps as CorvuOverlayProps,
  Portal as CorvuPortal,
  Root as CorvuRoot,
  type RootProps as CorvuRootProps,
  Trigger as CorvuTrigger,
  type TriggerProps as CorvuTriggerProps,
  type DynamicProps,
  useContext as useCorvuDrawerContext,
} from "@corvu/drawer";
import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

type DrawerSwipeDirection = "up" | "down" | "left" | "right";
type DrawerSnapPoint = number | `${number}px` | `${number}rem`;
type DrawerModal = boolean | "trap-focus";
type DrawerInteractionType = "keyboard" | "mouse" | "pen" | "touch";
type DrawerChangeReason =
  | "close-press"
  | "close-watcher"
  | "escape-key"
  | "focus-out"
  | "imperative-action"
  | "none"
  | "outside-press"
  | "swipe"
  | "trigger-press";

type DrawerChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  preventUnmountOnClose: () => void;
  readonly shouldPreventUnmount: boolean;
  reason: DrawerChangeReason;
  trigger: Element | undefined;
};

type DrawerSnapPointChangeDetails = Omit<
  DrawerChangeDetails,
  "preventUnmountOnClose" | "shouldPreventUnmount"
>;

type DrawerActions = {
  close: () => void;
  unmount: () => void;
};

type DrawerActionsRef =
  | { current: DrawerActions | null }
  | ((actions: DrawerActions | null) => void);

type DrawerFocusTarget =
  | boolean
  | HTMLElement
  | { current: HTMLElement | null }
  | ((interactionType: DrawerInteractionType) => boolean | HTMLElement | null | undefined);

type DrawerHandleChange<Payload> = {
  event?: Event;
  open: boolean;
  payload?: Payload;
  reason: DrawerChangeReason;
  trigger?: Element;
  triggerId?: string | null;
};

class DrawerHandle<Payload = unknown> {
  #activeTriggerId: string | null = null;
  #listener: ((change: DrawerHandleChange<Payload>) => void) | undefined;
  #listeners = new Set<() => void>();
  #open = false;
  #payload: Payload | undefined;
  #popupId: string | undefined;
  #triggers = new Map<string, { element: HTMLElement; payload: Accessor<Payload | undefined> }>();

  get isOpen() {
    return this.#open;
  }

  get activeTriggerId() {
    return this.#activeTriggerId;
  }

  get payload() {
    return this.#payload;
  }

  get popupId() {
    return this.#popupId;
  }

  open(triggerId: string | null) {
    const trigger = triggerId ? this.#triggers.get(triggerId) : undefined;
    this.#request({
      open: true,
      payload: trigger?.payload(),
      reason: "imperative-action",
      trigger: trigger?.element,
      triggerId,
    });
  }

  openWithPayload(payload: Payload) {
    this.#request({ open: true, payload, reason: "imperative-action", triggerId: null });
  }

  close() {
    this.#request({ open: false, reason: "imperative-action" });
  }

  registerRoot(listener: (change: DrawerHandleChange<Payload>) => void) {
    this.#listener = listener;
    return () => {
      if (this.#listener === listener) this.#listener = undefined;
    };
  }

  registerTrigger(id: string, element: HTMLElement, payload: Accessor<Payload | undefined>) {
    this.#triggers.set(id, { element, payload });
    return () => this.#triggers.delete(id);
  }

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  sync(open: boolean, triggerId: string | null, payload: Payload | undefined, popupId: string) {
    const changed =
      this.#open !== open ||
      this.#activeTriggerId !== triggerId ||
      !Object.is(this.#payload, payload) ||
      this.#popupId !== popupId;
    this.#open = open;
    this.#activeTriggerId = triggerId;
    this.#payload = payload;
    this.#popupId = popupId;
    if (changed) this.#notify();
  }

  toggle(triggerId: string, payload: Payload | undefined, event: MouseEvent, trigger: Element) {
    this.#request({
      event,
      open: !(this.#open && this.#activeTriggerId === triggerId),
      payload,
      reason: "trigger-press",
      trigger,
      triggerId,
    });
  }

  isOpenedBy(triggerId: string) {
    return this.#open && this.#activeTriggerId === triggerId;
  }

  #notify() {
    for (const listener of this.#listeners) listener();
  }

  #request(change: DrawerHandleChange<Payload>) {
    if (change.open) {
      this.#payload = change.payload;
      this.#activeTriggerId = change.triggerId ?? null;
    }
    this.#open = change.open;
    this.#notify();
    this.#listener?.(change);
  }
}

function createDrawerHandle<Payload = unknown>() {
  return new DrawerHandle<Payload>();
}

function createChangeDetails(
  reason: DrawerChangeReason,
  event?: Event,
  trigger?: Element,
): DrawerChangeDetails {
  let canceled = false;
  let propagationAllowed = false;
  let preventUnmount = false;

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
    preventUnmountOnClose: () => {
      preventUnmount = true;
    },
    get shouldPreventUnmount() {
      return preventUnmount;
    },
    reason,
    trigger,
  };
}

function createSnapPointChangeDetails(
  reason: DrawerChangeReason,
  event?: Event,
  trigger?: Element,
): DrawerSnapPointChangeDetails {
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

function interactionTypeFor(event?: Event): DrawerInteractionType {
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) return "keyboard";
  if (typeof MouseEvent !== "undefined" && event instanceof MouseEvent && event.detail === 0)
    return "keyboard";
  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
    if (event.pointerType === "touch" || event.pointerType === "pen") return event.pointerType;
  }
  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) return "touch";
  return "mouse";
}

function sideFor(direction: DrawerSwipeDirection): "top" | "right" | "bottom" | "left" {
  if (direction === "up") return "top";
  if (direction === "down") return "bottom";
  return direction;
}

function normalizeSnapPoint(
  point: DrawerSnapPoint,
  viewportHeight = 0,
  popupHeight = 0,
): number | `${number}px` {
  if (point === 0) return 0;
  if (typeof point === "number" && point <= 1 && viewportHeight <= 0) return point;
  const rootSize =
    typeof document === "undefined"
      ? 16
      : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const height =
    typeof point === "number"
      ? point <= 1 && viewportHeight > 0
        ? point * viewportHeight
        : point
      : Number.parseFloat(point) * (point.endsWith("rem") ? rootSize : 1);
  const maxHeight = popupHeight > 0 ? Math.min(popupHeight, viewportHeight || popupHeight) : height;
  return `${Math.max(0, Math.min(height, maxHeight))}px`;
}

function snapPointOffset(point: number | `${number}px`, size: number) {
  return typeof point === "number" ? size - point * size : size - Number.parseFloat(point);
}

function focusElementFrom(target: DrawerFocusTarget | null | undefined): HTMLElement | undefined {
  if (typeof HTMLElement === "undefined") return undefined;
  if (target instanceof HTMLElement) return target;
  if (typeof target === "object" && target?.current instanceof HTMLElement) return target.current;
  return undefined;
}

type NestedDrawerState = { frontmostHeight: number; open: boolean; swiping: boolean };

type DrawerRootContextValue = {
  activeTriggerId: Accessor<string | null>;
  direction: Accessor<DrawerSwipeDirection>;
  drawerSize: Accessor<number>;
  forceMount: Accessor<boolean>;
  frontmostHeight: Accessor<number>;
  hasSnapPoints: Accessor<boolean>;
  isNested: Accessor<boolean>;
  lastReason: Accessor<DrawerChangeReason>;
  modal: Accessor<DrawerModal>;
  nestedCount: Accessor<number>;
  nestedSwiping: Accessor<boolean>;
  open: Accessor<boolean>;
  normalizeSnapPoint: (point: DrawerSnapPoint) => number | `${number}px`;
  popupId: Accessor<string>;
  recordChange: (
    reason: DrawerChangeReason,
    event?: Event,
    trigger?: Element,
    payload?: unknown,
    triggerId?: string | null,
  ) => void;
  registerNested: (token: symbol, state?: NestedDrawerState) => void;
  setDrawerSize: (size: number) => void;
  setFocusTargets: (
    initial: Accessor<DrawerFocusTarget | undefined>,
    final: Accessor<DrawerFocusTarget | undefined>,
  ) => void;
  setSwipeProgress: (progress: number) => void;
  setSwipeStrength: (strength: number) => void;
  setSwiping: (swiping: boolean) => void;
  showSwipeHandle: Accessor<boolean>;
  snapPoints: Accessor<DrawerSnapPoint[] | undefined>;
  swipeProgress: Accessor<number>;
  swipeStrength: Accessor<number>;
};

const DrawerRootContext = createContext<DrawerRootContextValue>();

function useDrawerRootContext() {
  const context = useContext(DrawerRootContext);
  if (!context) throw new Error("Drawer parts must be used within Drawer");
  return context;
}

type DrawerProps<Payload = unknown> = Omit<
  CorvuRootProps,
  | "activeSnapPoint"
  | "allowSkippingSnapPoints"
  | "children"
  | "defaultSnapPoint"
  | "initialFocusEl"
  | "initialOpen"
  | "modal"
  | "onActiveSnapPointChange"
  | "onContentPresentChange"
  | "onFinalFocus"
  | "onInitialFocus"
  | "onOpenChange"
  | "open"
  | "side"
  | "snapPoints"
  | "trapFocus"
> & {
  actionsRef?: DrawerActionsRef;
  children?: JSX.Element | ((arg: { payload: Payload | undefined }) => JSX.Element);
  defaultOpen?: boolean;
  defaultSnapPoint?: DrawerSnapPoint | null;
  defaultTriggerId?: string | null;
  disablePointerDismissal?: boolean;
  handle?: DrawerHandle<Payload>;
  modal?: DrawerModal;
  onOpenChange?: (open: boolean, details: DrawerChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onSnapPointChange?: (
    snapPoint: DrawerSnapPoint | null,
    details: DrawerSnapPointChangeDetails,
  ) => void;
  open?: boolean;
  showSwipeHandle?: boolean;
  snapPoint?: DrawerSnapPoint | null;
  snapPoints?: DrawerSnapPoint[];
  snapToSequentialPoints?: boolean;
  swipeDirection?: DrawerSwipeDirection;
  triggerId?: string | null;
};

const DrawerRoot = <Payload = unknown>(props: DrawerProps<Payload>) => {
  const mergedProps = mergeProps(
    {
      defaultOpen: false,
      disablePointerDismissal: false,
      modal: true as DrawerModal,
      showSwipeHandle: false,
      snapToSequentialPoints: false,
      swipeDirection: "down" as DrawerSwipeDirection,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps, [
    "actionsRef",
    "children",
    "defaultOpen",
    "defaultSnapPoint",
    "defaultTriggerId",
    "disablePointerDismissal",
    "finalFocusEl",
    "handle",
    "modal",
    "onOpenChange",
    "onOpenChangeComplete",
    "onSnapPointChange",
    "open",
    "showSwipeHandle",
    "snapPoint",
    "snapPoints",
    "snapToSequentialPoints",
    "swipeDirection",
    "triggerId",
  ]);
  const parent = useContext(DrawerRootContext);
  const popupId = `drawer-popup-${createUniqueId()}`;
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(
    local.handle?.isOpen ?? local.defaultOpen ?? false,
  );
  const [uncontrolledTriggerId, setUncontrolledTriggerId] = createSignal<string | null>(
    local.handle?.activeTriggerId ?? local.defaultTriggerId ?? null,
  );
  const [payload, setPayload] = createSignal<Payload | undefined>(local.handle?.payload);
  const [uncontrolledSnapPoint, setUncontrolledSnapPoint] = createSignal<DrawerSnapPoint | null>(
    local.defaultSnapPoint ?? local.snapPoints?.[0] ?? null,
  );
  const [drawerSize, setDrawerSize] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(
    typeof document === "undefined" ? 0 : document.documentElement.clientHeight,
  );
  const [forceUnmount, setForceUnmount] = createSignal(false);
  const [preventUnmount, setPreventUnmount] = createSignal(false);
  const [swipeProgress, setSwipeProgress] = createSignal(0);
  const [swipeStrength, setSwipeStrength] = createSignal(1);
  const [swiping, setSwiping] = createSignal(false);
  const [lastReason, setLastReason] = createSignal<DrawerChangeReason>("none");
  const [lastInteractionType, setLastInteractionType] =
    createSignal<DrawerInteractionType>("keyboard");
  const [initialFocus, setInitialFocus] = createSignal<Accessor<DrawerFocusTarget | undefined>>(
    () => undefined,
  );
  const [finalFocus, setFinalFocus] = createSignal<Accessor<DrawerFocusTarget | undefined>>(
    () => undefined,
  );
  const [nestedDrawers, setNestedDrawers] = createSignal(new Map<symbol, NestedDrawerState>());
  const open = () => local.open ?? uncontrolledOpen();
  const activeTriggerId = () => local.triggerId ?? uncontrolledTriggerId();
  const direction = () => local.swipeDirection ?? "down";
  const snapPoint = () => local.snapPoint ?? uncontrolledSnapPoint();
  const defaultSnapPoint = () => local.defaultSnapPoint ?? local.snapPoints?.[0] ?? null;
  const normalize = (point: DrawerSnapPoint) =>
    normalizeSnapPoint(point, viewportHeight(), drawerSize());
  const frontmostHeight = () => {
    const nested = Array.from(nestedDrawers().values()).filter(
      (state) => state.open && state.frontmostHeight > 0,
    );
    return nested.at(-1)?.frontmostHeight ?? drawerSize();
  };
  let pendingChange: DrawerHandleChange<Payload> | undefined;
  let preventPrimitiveInitialFocus = false;
  let returnFocusTarget: HTMLElement | undefined;

  const registerNested = (token: symbol, state?: NestedDrawerState) => {
    setNestedDrawers((current) => {
      const next = new Map(current);
      if (state) next.set(token, state);
      else next.delete(token);
      return next;
    });
  };

  const recordChange = (
    reason: DrawerChangeReason,
    event?: Event,
    trigger?: Element,
    nextPayload?: unknown,
    triggerId?: string | null,
  ) => {
    const change: DrawerHandleChange<Payload> = {
      event,
      open: !open(),
      payload: nextPayload as Payload | undefined,
      reason,
      trigger,
      triggerId,
    };
    pendingChange = change;
    setLastReason(reason);
    setLastInteractionType(interactionTypeFor(event));
    if (reason !== "swipe") {
      queueMicrotask(() => {
        if (pendingChange === change) pendingChange = undefined;
      });
    }
  };

  const applySnapPointChange = (
    nextSnapPoint: DrawerSnapPoint | null,
    change: Pick<DrawerHandleChange<Payload>, "event" | "reason" | "trigger">,
  ) => {
    const details = createSnapPointChangeDetails(change.reason, change.event, change.trigger);
    local.onSnapPointChange?.(nextSnapPoint, details);
    if (!details.isCanceled && local.snapPoint === undefined)
      setUncontrolledSnapPoint(nextSnapPoint);
    return details;
  };

  const applyOpenChange = (
    nextOpen: boolean,
    change = pendingChange ?? { open: nextOpen, reason: "none" as const },
  ) => {
    pendingChange = undefined;
    if (nextOpen === open()) return;

    const details = createChangeDetails(change.reason, change.event, change.trigger);
    local.onOpenChange?.(nextOpen, details);
    if (change.reason === "escape-key" && change.event instanceof KeyboardEvent) {
      if (!details.isCanceled) change.event.preventDefault();
      if (!details.isPropagationAllowed) change.event.stopPropagation();
    }
    if (details.isCanceled) {
      local.handle?.sync(open(), activeTriggerId(), payload(), popupId);
      return;
    }

    if (!nextOpen && local.snapPoints?.length) applySnapPointChange(defaultSnapPoint(), change);

    setPreventUnmount(!nextOpen && details.shouldPreventUnmount);
    if (nextOpen) setForceUnmount(false);
    if (nextOpen) {
      setPayload(() => change.payload);
      if (local.triggerId === undefined) setUncontrolledTriggerId(change.triggerId ?? null);
    }
    if (local.open === undefined) setUncontrolledOpen(nextOpen);

    if (nextOpen) {
      returnFocusTarget =
        typeof HTMLElement === "undefined"
          ? undefined
          : change.trigger instanceof HTMLElement
            ? change.trigger
            : document.activeElement instanceof HTMLElement
              ? document.activeElement
              : undefined;
      const option = initialFocus()();
      const target = typeof option === "function" ? option(lastInteractionType()) : option;
      preventPrimitiveInitialFocus = option !== undefined && target !== true;
      const element = focusElementFrom(target);
      if (element) queueMicrotask(() => element.focus());
    } else {
      const option = finalFocus()();
      const target =
        typeof option === "function"
          ? option(lastInteractionType())
          : option === undefined || option === true
            ? returnFocusTarget
            : option;
      const element = focusElementFrom(target);
      if (element) queueMicrotask(() => element.focus());
    }
  };

  const actions: DrawerActions = {
    close: () => {
      const event = new Event("base-ui");
      setLastInteractionType("keyboard");
      setLastReason("imperative-action");
      applyOpenChange(false, { event, open: false, reason: "imperative-action" });
    },
    unmount: () => setForceUnmount(true),
  };

  createEffect(() => {
    const ref = local.actionsRef;
    if (typeof ref === "function") ref(actions);
    else if (ref) ref.current = actions;
    onCleanup(() => {
      if (typeof ref === "function") ref(null);
      else if (ref?.current === actions) ref.current = null;
    });
  });

  createEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => setViewportHeight(document.documentElement.clientHeight);
    window.addEventListener("resize", measure);
    onCleanup(() => window.removeEventListener("resize", measure));
  });

  createEffect(() => {
    const handle = local.handle;
    if (!handle) return;
    const unregister = handle.registerRoot((change) => {
      setLastReason(change.reason);
      setLastInteractionType(interactionTypeFor(change.event));
      applyOpenChange(change.open, change);
      handle.sync(open(), activeTriggerId(), payload(), popupId);
    });
    onCleanup(unregister);
  });

  createEffect(() => {
    local.handle?.sync(open(), activeTriggerId(), payload(), popupId);
  });

  const nestedToken = Symbol("drawer");
  createEffect(() => {
    parent?.registerNested(nestedToken, {
      frontmostHeight: frontmostHeight(),
      open: open(),
      swiping: swiping(),
    });
  });
  onCleanup(() => parent?.registerNested(nestedToken));

  const resolveFocusTarget = (target: DrawerFocusTarget | undefined) => {
    if (typeof target === "function") return target(lastInteractionType());
    return focusElementFrom(target);
  };

  const handleFocus = (kind: "initial" | "final", event: Event) => {
    if (kind === "initial" && preventPrimitiveInitialFocus) {
      event.preventDefault();
      return;
    }
    const target = (kind === "initial" ? initialFocus() : finalFocus())();
    if (target === undefined || target === true) return;
    if (target === false) {
      event.preventDefault();
      return;
    }

    const resolved = resolveFocusTarget(target);
    if (resolved === true) return;
    event.preventDefault();
    if (typeof HTMLElement !== "undefined" && resolved instanceof HTMLElement)
      queueMicrotask(() => resolved.focus());
  };

  const normalizedSnapPoints = () => local.snapPoints?.map(normalize) ?? [0, 1];
  const normalizedSnapPoint = () => {
    const current = snapPoint();
    return current == null ? 0 : normalize(current);
  };
  const originalSnapPoint = (normalized: number | `${number}px`): DrawerSnapPoint | null =>
    local.snapPoints?.find((point) => Object.is(normalize(point), normalized)) ??
    (normalized === 0 ? null : normalized);

  const context: DrawerRootContextValue = {
    activeTriggerId,
    direction,
    drawerSize,
    forceMount: () => preventUnmount(),
    frontmostHeight,
    hasSnapPoints: () => (local.snapPoints?.length ?? 0) > 0,
    isNested: () => parent != null,
    lastReason,
    modal: () => local.modal ?? true,
    nestedCount: () => Array.from(nestedDrawers().values()).filter((state) => state.open).length,
    nestedSwiping: () =>
      Array.from(nestedDrawers().values()).some((state) => state.open && state.swiping),
    normalizeSnapPoint: normalize,
    open,
    popupId: () => popupId,
    recordChange,
    registerNested,
    setDrawerSize,
    setFocusTargets: (initial, final) => {
      setInitialFocus(() => initial);
      setFinalFocus(() => final);
    },
    setSwipeProgress,
    setSwipeStrength,
    setSwiping,
    showSwipeHandle: () => local.showSwipeHandle ?? false,
    snapPoints: () => local.snapPoints,
    swipeProgress,
    swipeStrength,
  };

  const resolvedChildren = () => {
    const children = local.children;
    return typeof children === "function" ? children({ payload: payload() }) : children;
  };

  return (
    <DrawerRootContext.Provider value={context}>
      <CorvuRoot
        {...others}
        open={open()}
        initialOpen={local.handle?.isOpen ?? local.defaultOpen}
        onOpenChange={applyOpenChange}
        onContentPresentChange={local.onOpenChangeComplete}
        activeSnapPoint={open() ? normalizedSnapPoint() : 0}
        defaultSnapPoint={normalize(defaultSnapPoint() ?? 1)}
        onActiveSnapPointChange={(nextPoint) => {
          if (nextPoint === 0) return;
          const original = originalSnapPoint(nextPoint);
          const change = pendingChange ?? { open: open(), reason: "none" as const };
          if (change.reason === "none" && Object.is(original, defaultSnapPoint())) return;
          applySnapPointChange(original, change);
          queueMicrotask(() => {
            if (pendingChange === change) pendingChange = undefined;
          });
        }}
        snapPoints={normalizedSnapPoints()}
        allowSkippingSnapPoints={!local.snapToSequentialPoints}
        side={sideFor(direction())}
        modal={local.modal === true}
        trapFocus={local.modal !== false}
        noOutsidePointerEvents={local.modal === true}
        preventScroll={local.modal === true}
        closeOnOutsideFocus={!local.disablePointerDismissal}
        closeOnOutsidePointer={!local.disablePointerDismissal}
        onEscapeKeyDown={(event) => recordChange("escape-key", event)}
        onOutsideFocus={(event) => recordChange("focus-out", event)}
        onOutsidePointer={(event) => recordChange("outside-press", event)}
        initialFocusEl={focusElementFrom(initialFocus()())}
        finalFocusEl={focusElementFrom(finalFocus()()) ?? local.finalFocusEl}
        restoreFocus={finalFocus()() !== false}
        onInitialFocus={(event) => handleFocus("initial", event)}
        onFinalFocus={(event) => handleFocus("final", event)}
      >
        <Show when={!forceUnmount()}>{resolvedChildren()}</Show>
      </CorvuRoot>
    </DrawerRootContext.Provider>
  );
};

const Drawer = Object.assign(DrawerRoot, { createHandle: createDrawerHandle });

type DrawerTriggerProps<Payload = unknown, T extends ValidComponent = "button"> = {
  as?: T;
  disabled?: boolean;
  handle?: DrawerHandle<Payload>;
  id?: string;
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  payload?: Payload;
  ref?: (element: HTMLElement) => void;
} & Omit<ComponentProps<T>, "as" | "disabled" | "id" | "onClick" | "ref">;

const DrawerTrigger = <Payload = unknown, T extends ValidComponent = "button">(
  props: DrawerTriggerProps<Payload, T>,
) => {
  const root = useContext(DrawerRootContext);
  const generatedId = `drawer-trigger-${createUniqueId()}`;
  const [element, setElement] = createSignal<HTMLElement>();
  const [revision, setRevision] = createSignal(0);
  const [local, others] = splitProps(props as DrawerTriggerProps<Payload, T>, [
    "as",
    "disabled",
    "handle",
    "id",
    "onClick",
    "payload",
    "ref",
  ]);
  const triggerId = () => local.id ?? generatedId;
  const opened = () => {
    revision();
    return local.handle?.isOpenedBy(triggerId()) ?? false;
  };

  createEffect(() => {
    const handle = local.handle;
    if (!handle) return;
    const unsubscribe = handle.subscribe(() => setRevision((current) => current + 1));
    onCleanup(unsubscribe);
  });

  createEffect(() => {
    const handle = local.handle;
    const trigger = element();
    if (!handle || !trigger) return;
    const unregister = handle.registerTrigger(triggerId(), trigger, () => local.payload);
    onCleanup(unregister);
  });

  if (local.handle) {
    return (
      <Dynamic
        component={local.as ?? "button"}
        ref={(trigger: HTMLElement) => {
          setElement(trigger);
          if (typeof local.ref === "function")
            (local.ref as (element: HTMLElement) => void)(trigger);
        }}
        id={triggerId()}
        type="button"
        disabled={local.disabled}
        aria-controls={local.handle.popupId}
        aria-expanded={opened()}
        aria-haspopup="dialog"
        data-slot="drawer-trigger"
        data-open={opened() ? "" : undefined}
        data-closed={!opened() ? "" : undefined}
        onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
          local.handle?.toggle(triggerId(), local.payload, event, event.currentTarget);
          callEventHandler(
            local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
            event,
          );
        }}
        {...others}
      />
    );
  }

  if (!root) throw new Error("DrawerTrigger must be used within Drawer or provided a handle");
  const corvuProps = {
    ...others,
    as: local.as,
    "data-slot": "drawer-trigger",
    disabled: local.disabled,
    id: triggerId(),
    onClick: (event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
      root.recordChange("trigger-press", event, event.currentTarget, local.payload, triggerId());
      callEventHandler(
        local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
        event,
      );
    },
    ref: local.ref,
  } as unknown as DynamicProps<T, CorvuTriggerProps<T>>;

  return <CorvuTrigger {...corvuProps} />;
};

type DrawerCloseProps<T extends ValidComponent = "button"> = DynamicProps<T, CorvuCloseProps<T>>;

const DrawerClose = <T extends ValidComponent = "button">(props: DrawerCloseProps<T>) => {
  const root = useDrawerRootContext();
  const [local, others] = splitProps(props as DrawerCloseProps, ["onClick"]);

  return (
    <CorvuClose
      data-slot="drawer-close"
      onClick={(event) => {
        root.recordChange("close-press", event, event.currentTarget);
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
      }}
      {...others}
    />
  );
};

type DrawerPortalProps = ComponentProps<"div"> & {
  container?: Node;
  contextId?: string;
  keepMounted?: boolean;
};

const DrawerPortal = (props: DrawerPortalProps) => {
  const root = useDrawerRootContext();
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "container",
    "contextId",
    "keepMounted",
  ]);

  return (
    <CorvuPortal
      forceMount={local.keepMounted || root.forceMount()}
      mount={local.container as HTMLElement | undefined}
      contextId={local.contextId}
    >
      <div data-slot="drawer-portal" class={local.class} {...others}>
        {local.children}
      </div>
    </CorvuPortal>
  );
};

type DrawerOverlayProps<T extends ValidComponent = "div"> = DynamicProps<T, CorvuOverlayProps<T>> &
  Pick<ComponentProps<T>, "class" | "style"> & {
    forceRender?: boolean;
  };

const DrawerOverlay = <T extends ValidComponent = "div">(props: DrawerOverlayProps<T>) => {
  const root = useDrawerRootContext();
  const drawer = useCorvuDrawerContext();
  const [local, others] = splitProps(props as DrawerOverlayProps, [
    "class",
    "forceRender",
    "style",
  ]);
  const overlayStyle = () => {
    const variables = {
      "--drawer-swipe-progress": String(root.swipeProgress()),
      "--drawer-swipe-strength": String(root.swipeStrength()),
    } as JSX.CSSProperties;
    if (typeof local.style === "string") {
      return `--drawer-swipe-progress:${variables["--drawer-swipe-progress"]};--drawer-swipe-strength:${variables["--drawer-swipe-strength"]};${local.style}`;
    }
    return { ...variables, ...local.style };
  };

  return (
    <Show when={!root.isNested() || local.forceRender}>
      <CorvuOverlay
        data-slot="drawer-overlay"
        data-open={root.open() ? "" : undefined}
        data-closed={!root.open() ? "" : undefined}
        data-snap-points={root.hasSnapPoints() ? "" : undefined}
        data-starting-style={drawer.transitionState() === "opening" ? "" : undefined}
        data-ending-style={drawer.transitionState() === "closing" ? "" : undefined}
        data-swiping={drawer.isDragging() ? "" : undefined}
        class={cn(
          "z-drawer-overlay fixed inset-0 z-50 min-h-dvh opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none data-ending-style:pointer-events-none data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-snap-points:[--drawer-overlay-min-opacity:0.5] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute",
          local.class,
        )}
        style={overlayStyle()}
        {...others}
      />
    </Show>
  );
};

type DrawerSwipeHandleProps = ComponentProps<"div">;

const DrawerSwipeHandle = (props: DrawerSwipeHandleProps) => {
  const root = useDrawerRootContext();
  const [local, others] = splitProps(props, ["class", "onPointerDown", "onTouchStart"]);

  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      class={cn(
        "z-drawer-swipe-handle relative z-10 flex shrink-0 cursor-grab transition-opacity duration-200 group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-[swipe-direction=left]/drawer-popup:order-last group-data-[swipe-direction=up]/drawer-popup:order-last active:cursor-grabbing",
        local.class,
      )}
      onPointerDown={(event) => {
        root.recordChange("swipe", event);
        callEventHandler(local.onPointerDown, event);
      }}
      onTouchStart={(event) => {
        root.recordChange("swipe", event);
        callEventHandler(local.onTouchStart, event);
      }}
      {...others}
    />
  );
};

type DrawerContentProps<T extends ValidComponent = "div"> = DynamicProps<T, CorvuContentProps<T>> &
  Pick<ComponentProps<T>, "class" | "children" | "style"> & {
    finalFocus?: DrawerFocusTarget;
    initialFocus?: DrawerFocusTarget;
  };

const DrawerContent = <T extends ValidComponent = "div">(props: DrawerContentProps<T>) => {
  const root = useDrawerRootContext();
  const drawer = useCorvuDrawerContext();
  const [local, others] = splitProps(props as DrawerContentProps, [
    "children",
    "class",
    "finalFocus",
    "id",
    "initialFocus",
    "onPointerDown",
    "onTouchStart",
    "onTransitionEnd",
    "ref",
    "style",
  ]);
  const axis = () => (root.direction() === "down" || root.direction() === "up" ? "y" : "x");
  const [lastSwipeProgress, setLastSwipeProgress] = createSignal(0);

  const restingOffset = () =>
    Math.max(0, snapPointOffset(drawer.activeSnapPoint(), root.drawerSize()));
  const swipeMovement = () => drawer.translate() - restingOffset();
  const currentSwipeProgress = () => {
    const distanceToClosed = Math.max(1, root.drawerSize() - restingOffset());
    return Math.min(1, Math.max(0, Math.abs(swipeMovement()) / distanceToClosed));
  };

  root.setFocusTargets(
    () => local.initialFocus,
    () => local.finalFocus,
  );
  createEffect(() => {
    const dragging = drawer.isDragging();
    const progress = currentSwipeProgress();
    root.setSwiping(dragging);
    if (dragging) {
      setLastSwipeProgress(progress);
      root.setSwipeProgress(progress);
      root.setSwipeStrength(Math.max(0.05, 1 - progress));
    } else if (drawer.transitionState() === "closing" && root.lastReason() === "swipe") {
      root.setSwipeProgress(1);
      root.setSwipeStrength(Math.max(0.05, 1 - lastSwipeProgress()));
    } else {
      root.setSwipeProgress(0);
      root.setSwipeStrength(1);
    }
  });
  onCleanup(() => {
    root.setSwipeProgress(0);
    root.setSwipeStrength(1);
    root.setSwiping(false);
  });

  const setPopup = (element: HTMLDivElement) => {
    if (typeof local.ref === "function") local.ref(element);

    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const size = axis() === "y" ? bounds.height : bounds.width;
      if (size > 1) root.setDrawerSize(size);
    };
    queueMicrotask(measure);
    requestAnimationFrame(measure);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(element);

    const pointerDown = (event: PointerEvent) => {
      root.recordChange("swipe", event);
      callEventHandler(
        local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
        event as PointerEvent & { currentTarget: HTMLElement; target: Element },
      );
    };
    const touchStart = (event: TouchEvent) => {
      root.recordChange("swipe", event);
      callEventHandler(
        local.onTouchStart as JSX.EventHandlerUnion<HTMLElement, TouchEvent> | undefined,
        event as TouchEvent & { currentTarget: HTMLElement; target: Element },
      );
    };
    const transitionEnd = (event: TransitionEvent) =>
      callEventHandler(
        local.onTransitionEnd as JSX.EventHandlerUnion<HTMLElement, TransitionEvent> | undefined,
        event as TransitionEvent & { currentTarget: HTMLElement; target: Element },
      );

    element.addEventListener("pointerdown", pointerDown, true);
    element.addEventListener("touchstart", touchStart, true);
    element.addEventListener("transitionend", transitionEnd);
    onCleanup(() => {
      element.removeEventListener("pointerdown", pointerDown, true);
      element.removeEventListener("touchstart", touchStart, true);
      element.removeEventListener("transitionend", transitionEnd);
      resizeObserver?.disconnect();
    });
  };

  const popupStyle = () => {
    const direction = root.direction();
    const sign = direction === "up" || direction === "left" ? -1 : 1;
    const snapOffset = sign * restingOffset();
    const movement = sign * swipeMovement();
    const drawerHeight = root.drawerSize();
    const frontmostHeight = root.frontmostHeight();
    const variables = {
      "--drawer-frontmost-height": frontmostHeight > 0 ? `${frontmostHeight}px` : undefined,
      "--drawer-height": drawerHeight > 0 ? `${drawerHeight}px` : undefined,
      "--drawer-snap-point-offset": `${snapOffset}px`,
      "--drawer-swipe-progress": String(root.swipeProgress()),
      "--drawer-swipe-movement-x":
        direction === "left" || direction === "right" ? `${movement}px` : "0px",
      "--drawer-swipe-movement-y":
        direction === "up" || direction === "down" ? `${movement}px` : "0px",
      "--drawer-swipe-strength": String(root.swipeStrength()),
      "--nested-drawers": String(root.nestedCount()),
      transform: root.open()
        ? "translate3d(var(--translate-x,0px),var(--translate-y,0px),0) scale(var(--stack-scale))"
        : "var(--closed-transform)",
    } as JSX.CSSProperties;
    if (typeof local.style === "string") {
      return `${Object.entries(variables)
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => `${name}:${value}`)
        .join(";")};${local.style}`;
    }
    return { ...variables, ...local.style };
  };

  const expanded = () => {
    const points = root.snapPoints();
    if (!points?.length) return true;
    return Object.is(drawer.activeSnapPoint(), root.normalizeSnapPoint(points.at(-1) ?? 1));
  };

  return (
    <DrawerPortal>
      <Show when={root.modal() === true}>
        <DrawerOverlay />
      </Show>
      <div
        data-slot="drawer-viewport"
        data-modal={String(root.modal())}
        data-open={root.open() ? "" : undefined}
        data-closed={!root.open() ? "" : undefined}
        data-starting-style={drawer.transitionState() === "opening" ? "" : undefined}
        data-ending-style={drawer.transitionState() === "closing" ? "" : undefined}
        data-nested={root.isNested() ? "" : undefined}
        class="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
      >
        <CorvuContent
          ref={setPopup}
          id={local.id ?? root.popupId()}
          data-slot="drawer-popup"
          data-open={root.open() ? "" : undefined}
          data-closed={!root.open() ? "" : undefined}
          data-swipe-axis={axis()}
          data-swipe-direction={root.direction()}
          data-snap-points={root.hasSnapPoints() ? "" : undefined}
          data-starting-style={drawer.transitionState() === "opening" ? "" : undefined}
          data-ending-style={drawer.transitionState() === "closing" ? "" : undefined}
          data-expanded={expanded() ? "" : undefined}
          data-nested={root.isNested() ? "" : undefined}
          data-nested-drawer-open={root.nestedCount() > 0 ? "" : undefined}
          data-nested-drawer-swiping={root.nestedSwiping() ? "" : undefined}
          data-swipe-dismiss={
            drawer.transitionState() === "closing" && root.lastReason() === "swipe" ? "" : undefined
          }
          data-swiping={drawer.isDragging() ? "" : undefined}
          class={cn(
            "z-drawer-popup group/drawer-popup pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform outline-none select-none [interpolate-size:allow-keywords]",
            "data-nested-drawer-open:overflow-hidden data-nested-drawer-open:brightness-95",
            "after:pointer-events-none after:absolute after:bg-(--drawer-bleed-background,var(--color-popover)) data-[swipe-axis=x]:after:inset-y-0 data-[swipe-axis=x]:after:w-(--bleed) data-[swipe-axis=y]:after:inset-x-0 data-[swipe-axis=y]:after:h-(--bleed) data-[swipe-direction=down]:after:top-full data-[swipe-direction=left]:after:right-full data-[swipe-direction=right]:after:left-full data-[swipe-direction=up]:after:bottom-full",
            "[--drawer-content-height:var(--drawer-height,auto)] data-[swipe-axis=x]:[--drawer-content-width:75%] data-[swipe-axis=y]:data-snap-points:[--drawer-content-height:100dvh] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)] data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]",
            "[--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05]",
            "data-ending-style:transform-(--closed-transform) data-ending-style:opacity-[0.9999] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-nested-drawer-swiping:duration-0 data-ending-style:data-nested-drawer-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-(--closed-transform) data-swiping:duration-0 data-ending-style:data-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
            "data-[swipe-axis=y]:inset-x-0 data-[swipe-axis=y]:data-nested-drawer-open:h-(--stack-height)",
            "data-[swipe-axis=x]:inset-y-0 data-[swipe-axis=x]:flex-row",
            "data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:origin-bottom data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]",
            "data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:origin-top data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]",
            "data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:origin-left data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]",
            "data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:origin-right data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]",
            local.class,
          )}
          style={popupStyle()}
          {...others}
        >
          <Show when={root.showSwipeHandle()}>
            <DrawerSwipeHandle />
          </Show>
          <div
            data-slot="drawer-content"
            class="z-drawer-content-base flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-swiping/drawer-popup:select-none"
          >
            {local.children}
          </div>
        </CorvuContent>
      </div>
    </DrawerPortal>
  );
};

type DrawerHeaderProps = ComponentProps<"div">;

const DrawerHeader = (props: DrawerHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="drawer-header"
      class={cn(
        "z-drawer-header-base flex shrink-0 flex-col group-data-[swipe-axis=y]/drawer-popup:text-center",
        local.class,
      )}
      {...others}
    />
  );
};

type DrawerFooterProps = ComponentProps<"div">;

const DrawerFooter = (props: DrawerFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="drawer-footer"
      class={cn("z-drawer-footer-base mt-auto flex shrink-0 flex-col", local.class)}
      {...others}
    />
  );
};

type DrawerTitleProps<T extends ValidComponent = "h2"> = DynamicProps<T, CorvuLabelProps<T>> &
  Pick<ComponentProps<T>, "class">;

const DrawerTitle = <T extends ValidComponent = "h2">(props: DrawerTitleProps<T>) => {
  const [local, others] = splitProps(props as DrawerTitleProps, ["class"]);
  return (
    <CorvuLabel
      data-slot="drawer-title"
      class={cn("z-drawer-title z-font-heading", local.class)}
      {...others}
    />
  );
};

type DrawerDescriptionProps<T extends ValidComponent = "p"> = DynamicProps<
  T,
  CorvuDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DrawerDescription = <T extends ValidComponent = "p">(props: DrawerDescriptionProps<T>) => {
  const [local, others] = splitProps(props as DrawerDescriptionProps, ["class"]);
  return (
    <CorvuDescription
      data-slot="drawer-description"
      class={cn("z-drawer-description text-balance", local.class)}
      {...others}
    />
  );
};

export {
  createDrawerHandle,
  Drawer,
  type DrawerActions,
  type DrawerChangeDetails,
  DrawerClose,
  type DrawerCloseProps,
  DrawerContent,
  type DrawerContentProps,
  DrawerDescription,
  type DrawerDescriptionProps,
  DrawerFooter,
  type DrawerFooterProps,
  type DrawerHandle,
  DrawerHeader,
  type DrawerHeaderProps,
  type DrawerModal,
  DrawerOverlay,
  type DrawerOverlayProps,
  DrawerPortal,
  type DrawerPortalProps,
  type DrawerProps,
  type DrawerSnapPoint,
  type DrawerSnapPointChangeDetails,
  type DrawerSwipeDirection,
  DrawerSwipeHandle,
  type DrawerSwipeHandleProps,
  DrawerTitle,
  type DrawerTitleProps,
  DrawerTrigger,
  type DrawerTriggerProps,
};
