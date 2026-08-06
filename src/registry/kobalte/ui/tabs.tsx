import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  Content,
  List,
  Root,
  type TabsContentProps as TabsContentPrimitiveProps,
  type TabsListProps as TabsListPrimitiveProps,
  type TabsRootProps as TabsRootPrimitiveProps,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
  Trigger,
} from "@kobalte/core/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type Accessor,
  type ComponentProps,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";

import { cn } from "@/lib/utils";

type TabsActivationDirection = "down" | "left" | "none" | "right" | "up";
type TabsChangeReason = "disabled" | "initial" | "missing" | "none";

type TabsChangeDetails = {
  activationDirection: TabsActivationDirection;
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: TabsChangeReason;
  trigger: Element | undefined;
};

type RegisteredTab = {
  disabled: Accessor<boolean>;
  element: Accessor<HTMLElement | undefined>;
  id: Accessor<string>;
  value: Accessor<unknown>;
};

type TabsContextValue = {
  activateFocusedTab: (value: unknown, disabled: boolean, event: FocusEvent) => void;
  activationDirection: Accessor<TabsActivationDirection>;
  commitPointerActivation: (value: unknown, event: MouseEvent) => void;
  keyForValue: (value: unknown) => string;
  mountedPanelIdForValue: (value: unknown) => string | undefined;
  orientation: Accessor<"horizontal" | "vertical">;
  panelIdForValue: (value: unknown) => string;
  recordTriggerEvent: (event: Event) => void;
  registerPanel: (value: unknown, id: string) => () => void;
  registerTab: (tab: RegisteredTab) => () => void;
  recordTabFocus: (value: unknown) => void;
  registeredTabIdForValue: (value: unknown) => string | undefined;
  scheduleReconciliation: () => void;
  selectedValue: Accessor<unknown>;
  setActivateOnFocus: (activateOnFocus: boolean) => void;
  tabIndexForValue: (value: unknown) => number;
  triggerIdForValue: (value: unknown) => string;
};

const TabsContext = createContext<TabsContextValue>();

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs parts must be used within Tabs");
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

function createChangeDetails(
  reason: TabsChangeReason,
  event: Event,
  activationDirection: TabsActivationDirection,
): TabsChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    activationDirection,
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
    trigger: undefined,
  };
}

type TabsProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  PolymorphicProps<T, TabsRootPrimitiveProps<T>>,
  "activationMode" | "defaultValue" | "disabled" | "onChange" | "orientation" | "value"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    defaultValue?: Value | null;
    /** @deprecated Use onValueChange to match the pinned shadcn API. */
    onChange?: (value: Value | null) => void;
    onValueChange?: (value: Value | null, details: TabsChangeDetails) => void;
    orientation?: "horizontal" | "vertical";
    value?: Value | null;
  };

const Tabs = <T extends ValidComponent = "div", Value = unknown>(props: TabsProps<T, Value>) => {
  const mergedProps = mergeProps({ orientation: "horizontal" as const }, props);
  const [local, others] = splitProps(mergedProps as TabsProps, [
    "children",
    "class",
    "defaultValue",
    "onChange",
    "onValueChange",
    "orientation",
    "value",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<unknown>(
    local.defaultValue === undefined ? 0 : local.defaultValue,
  );
  const [activateOnFocus, setActivateOnFocus] = createSignal(false);
  const [activationDirection, setActivationDirection] =
    createSignal<TabsActivationDirection>("none");
  const baseId = `tabs-${createUniqueId()}`;
  const emptySelectionKey = `${baseId}-empty`;
  const valueToKey = new Map<unknown, string>();
  const keyToValue = new Map<string, unknown>();
  const mountedPanels = new Map<string, { count: number; id: string }>();
  const [mountedPanelVersion, setMountedPanelVersion] = createSignal(0);
  const [registeredTabVersion, setRegisteredTabVersion] = createSignal(0);
  const [highlightedValue, setHighlightedValue] = createSignal<unknown>();
  const tabs = new Set<RegisteredTab>();
  let pendingTriggerEvent: Event | undefined;
  let selectionResolved = local.defaultValue !== undefined || local.value !== undefined;
  let honorDisabledDefault = local.defaultValue !== undefined;
  let didRegisterTabs = false;
  let lastKnownTabElement: HTMLElement | undefined;
  let reconciliationQueued = false;
  let disposed = false;

  const selectedValue = () => (local.value !== undefined ? local.value : uncontrolledValue());
  const keyForValue = (value: unknown) => {
    const existingKey = valueToKey.get(value);
    if (existingKey) return existingKey;

    const key = `${baseId}-value-${valueToKey.size + 1}`;
    valueToKey.set(value, key);
    keyToValue.set(key, value);
    return key;
  };
  const primitiveValue = () => {
    const value = selectedValue();
    return value == null ? emptySelectionKey : keyForValue(value);
  };
  const orderedTabs = () =>
    [...tabs].sort((first, second) => {
      const firstElement = first.element();
      const secondElement = second.element();
      if (!firstElement || !secondElement || firstElement === secondElement) return 0;

      const position = firstElement.compareDocumentPosition(secondElement);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  const tabForValue = (value: unknown) => orderedTabs().find((tab) => tab.value() === value);
  const computeActivationDirection = (oldValue: unknown, newValue: unknown) => {
    if (oldValue == null || newValue == null) return "none";

    const ordered = orderedTabs();
    const oldElement = ordered.find((tab) => tab.value() === oldValue)?.element();
    const newElement = ordered.find((tab) => tab.value() === newValue)?.element();

    if (oldElement && newElement) {
      const oldRect = oldElement.getBoundingClientRect();
      const newRect = newElement.getBoundingClientRect();
      if (local.orientation === "vertical") {
        if (newRect.top < oldRect.top) return "up";
        if (newRect.top > oldRect.top) return "down";
      } else {
        if (newRect.left < oldRect.left) return "left";
        if (newRect.left > oldRect.left) return "right";
      }
      return "none";
    }

    if (oldElement !== newElement && typeof oldValue === "number" && typeof newValue === "number") {
      if (local.orientation === "vertical") return newValue > oldValue ? "down" : "up";
      return newValue > oldValue ? "right" : "left";
    }
    if (oldElement !== newElement && typeof oldValue === "string" && typeof newValue === "string") {
      if (local.orientation === "vertical") return newValue > oldValue ? "down" : "up";
      return newValue > oldValue ? "right" : "left";
    }

    return "none";
  };

  const requestValueChange = (
    nextValue: unknown,
    reason: TabsChangeReason,
    event = new Event("base-ui"),
  ) => {
    const automatic = reason !== "none";
    const nextActivationDirection = automatic
      ? "none"
      : computeActivationDirection(selectedValue(), nextValue);
    const details = createChangeDetails(reason, event, nextActivationDirection);
    if (automatic) {
      if (local.value === undefined) setUncontrolledValue(nextValue);
      setActivationDirection("none");
    }
    local.onValueChange?.(nextValue, details);
    if (!automatic && details.isCanceled) return;

    if (!automatic && local.value === undefined) {
      setActivationDirection(details.activationDirection);
    }
    const nextTab = tabForValue(nextValue);
    if (nextTab && !nextTab.disabled()) setHighlightedValue(nextValue);
    local.onChange?.(nextValue);
    if (!automatic && local.value === undefined) setUncontrolledValue(nextValue);
  };
  const reconcileSelection = () => {
    reconciliationQueued = false;
    if (disposed) return;

    const currentValue = selectedValue();
    const ordered = orderedTabs();
    if (ordered.length === 0) {
      if (
        local.value === undefined &&
        currentValue != null &&
        didRegisterTabs &&
        selectionResolved &&
        !lastKnownTabElement?.isConnected
      ) {
        requestValueChange(null, "missing");
      }
      return;
    }
    lastKnownTabElement = ordered[0]?.element();

    const highlightedTab = ordered.find((tab) => tab.value() === highlightedValue());
    if (!highlightedTab) {
      const selectedTab = ordered.find((tab) => tab.value() === currentValue);
      setHighlightedValue(
        selectedTab && !selectedTab.disabled() ? currentValue : ordered[0]?.value(),
      );
    }

    if (local.value !== undefined || currentValue == null) return;

    const selectedTab = ordered.find((tab) => tab.value() === currentValue);
    if (selectedTab && honorDisabledDefault && currentValue === local.defaultValue) {
      if (selectedTab.disabled()) return;
      honorDisabledDefault = false;
    }
    if (!selectionResolved) {
      const initialValue =
        selectedTab && !selectedTab.disabled()
          ? currentValue
          : (ordered.find((tab) => !tab.disabled())?.value() ?? null);
      requestValueChange(initialValue, "initial");
      selectionResolved = true;
      return;
    }
    if (selectedTab && !selectedTab.disabled()) return;

    const fallback = ordered.find((tab) => !tab.disabled());
    if (selectedTab?.disabled()) requestValueChange(fallback?.value() ?? null, "disabled");
    else if (selectionResolved) requestValueChange(fallback?.value() ?? null, "missing");
  };
  const scheduleReconciliation = () => {
    if (typeof window === "undefined" || reconciliationQueued) return;
    reconciliationQueued = true;
    queueMicrotask(reconcileSelection);
  };
  const recordTriggerEvent = (event: Event) => {
    if (
      event.type === "focus" &&
      typeof KeyboardEvent !== "undefined" &&
      pendingTriggerEvent instanceof KeyboardEvent
    ) {
      return;
    }

    pendingTriggerEvent = event;
    queueMicrotask(() => {
      if (pendingTriggerEvent === event) pendingTriggerEvent = undefined;
    });
  };
  const handlePrimitiveChange = (key: string) => {
    if (!keyToValue.has(key)) return;
    if (selectedValue() === null && !pendingTriggerEvent) return;
    if (local.value !== undefined && !pendingTriggerEvent) return;

    const proposedValue = keyToValue.get(key);
    const proposedTab = orderedTabs().find((tab) => tab.value() === proposedValue);
    if (proposedValue === selectedValue()) {
      pendingTriggerEvent = undefined;
      return;
    }
    if (pendingTriggerEvent && proposedTab?.disabled()) {
      pendingTriggerEvent = undefined;
      return;
    }
    if (
      typeof PointerEvent !== "undefined" &&
      pendingTriggerEvent instanceof PointerEvent &&
      pendingTriggerEvent.type === "pointerdown" &&
      pendingTriggerEvent.pointerType === "mouse"
    ) {
      if (!activateOnFocus()) pendingTriggerEvent = undefined;
      return;
    }
    if (
      typeof MouseEvent !== "undefined" &&
      pendingTriggerEvent instanceof MouseEvent &&
      pendingTriggerEvent.type === "click" &&
      pendingTriggerEvent.button !== 0
    ) {
      pendingTriggerEvent = undefined;
      return;
    }
    const reason: TabsChangeReason = pendingTriggerEvent
      ? "none"
      : selectionResolved
        ? "missing"
        : local.defaultValue === undefined
          ? "initial"
          : "missing";
    const nextValue =
      !pendingTriggerEvent && proposedTab?.disabled()
        ? (orderedTabs()
            .find((tab) => !tab.disabled())
            ?.value() ?? null)
        : proposedValue;
    requestValueChange(nextValue, reason, pendingTriggerEvent);
    selectionResolved = true;
    pendingTriggerEvent = undefined;
  };

  const context: TabsContextValue = {
    activateFocusedTab: (value, disabled, event) => {
      if (
        !activateOnFocus() ||
        disabled ||
        value === selectedValue() ||
        (typeof KeyboardEvent !== "undefined" && pendingTriggerEvent instanceof KeyboardEvent)
      ) {
        return;
      }
      requestValueChange(value, "none", event);
      selectionResolved = true;
    },
    activationDirection,
    commitPointerActivation: (value, event) => {
      const tab = tabForValue(value);
      if (!tab || tab.disabled()) return;

      if (value !== selectedValue()) requestValueChange(value, "none", event);
      pendingTriggerEvent = undefined;
    },
    keyForValue,
    mountedPanelIdForValue: (value) => {
      mountedPanelVersion();
      const key = keyForValue(value);
      return mountedPanels.get(key)?.id;
    },
    orientation: () => local.orientation ?? "horizontal",
    panelIdForValue: (value) => `${keyForValue(value)}-content`,
    recordTriggerEvent,
    registerPanel: (value, id) => {
      const key = keyForValue(value);
      const mountedPanel = mountedPanels.get(key);
      mountedPanels.set(key, {
        count: (mountedPanel?.count ?? 0) + 1,
        id,
      });
      setMountedPanelVersion((version) => version + 1);
      return () => {
        const current = mountedPanels.get(key);
        if (!current || current.count <= 1) mountedPanels.delete(key);
        else mountedPanels.set(key, { ...current, count: current.count - 1 });
        setMountedPanelVersion((version) => version + 1);
      };
    },
    registerTab: (tab) => {
      tabs.add(tab);
      setRegisteredTabVersion((version) => version + 1);
      didRegisterTabs = true;
      scheduleReconciliation();
      return () => {
        tabs.delete(tab);
        setRegisteredTabVersion((version) => version + 1);
        scheduleReconciliation();
      };
    },
    recordTabFocus: setHighlightedValue,
    registeredTabIdForValue: (value) => {
      registeredTabVersion();
      return [...tabs].find((tab) => tab.value() === value)?.id();
    },
    scheduleReconciliation,
    selectedValue,
    setActivateOnFocus,
    tabIndexForValue: (value) => (highlightedValue() === value ? 0 : -1),
    triggerIdForValue: (value) => `${keyForValue(value)}-trigger`,
  };
  let previousControlledValue = local.value;
  createEffect(() => {
    const nextControlledValue = local.value;
    if (nextControlledValue !== undefined && nextControlledValue !== previousControlledValue) {
      setActivationDirection(
        computeActivationDirection(previousControlledValue, nextControlledValue),
      );
      const focusIsInTabs = [...tabs].some(
        (tab) => tab.element() === globalThis.document?.activeElement,
      );
      const nextTab = tabForValue(nextControlledValue);
      if (!focusIsInTabs && nextTab && !nextTab.disabled()) {
        setHighlightedValue(nextControlledValue);
      }
    }
    previousControlledValue = nextControlledValue;
  });
  onCleanup(() => {
    disposed = true;
  });

  return (
    <TabsContext.Provider value={context}>
      <Root
        data-slot="tabs"
        data-orientation={local.orientation}
        data-activation-direction={activationDirection()}
        orientation={local.orientation}
        activationMode={activateOnFocus() ? "automatic" : "manual"}
        value={primitiveValue()}
        onChange={handlePrimitiveChange}
        class={cn("group/tabs z-tabs flex data-[orientation=horizontal]:flex-col", local.class)}
        {...others}
      >
        {local.children}
      </Root>
    </TabsContext.Provider>
  );
};

const tabsListVariants = cva(
  "group/tabs-list z-tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "z-tabs-list-variant-default bg-muted",
        line: "z-tabs-list-variant-line gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TabsListProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TabsListPrimitiveProps<T>
> &
  VariantProps<typeof tabsListVariants> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    activateOnFocus?: boolean;
    loopFocus?: boolean;
  };

const TabsList = <T extends ValidComponent = "div">(props: TabsListProps<T>) => {
  const context = useTabsContext();
  const mergedProps = mergeProps(
    { activateOnFocus: false, loopFocus: true, variant: "default" as const },
    props,
  );
  const [local, others] = splitProps(mergedProps as TabsListProps, [
    "activateOnFocus",
    "class",
    "loopFocus",
    "ref",
    "variant",
  ]);
  let element: HTMLElement | undefined;

  createEffect(() => context.setActivateOnFocus(local.activateOnFocus ?? false));
  onCleanup(() => context.setActivateOnFocus(false));

  const onKeyDownCapture = (event: KeyboardEvent) => {
    if (event.defaultPrevented || local.loopFocus !== false || !element) return;

    const orientation = context.orientation();
    const forwardKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const backwardKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    if (event.key !== forwardKey && event.key !== backwardKey) return;

    const tabsInList = [...element.querySelectorAll<HTMLElement>("[role=tab]")];
    const currentTab =
      event.target instanceof Element ? event.target.closest<HTMLElement>("[role=tab]") : null;
    const currentIndex = currentTab ? tabsInList.indexOf(currentTab) : -1;
    if (currentIndex < 0) return;

    const isRtl = getComputedStyle(element).direction === "rtl";
    const movesForward =
      orientation === "horizontal" && isRtl ? event.key === backwardKey : event.key === forwardKey;
    const atBoundary = movesForward ? currentIndex === tabsInList.length - 1 : currentIndex === 0;
    if (!atBoundary) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };
  onMount(() => {
    element?.addEventListener("keydown", onKeyDownCapture, { capture: true });
    onCleanup(() => element?.removeEventListener("keydown", onKeyDownCapture, { capture: true }));
  });

  return (
    <List
      ref={(nextElement: HTMLElement) => {
        element = nextElement;
        setElementRef(local.ref, nextElement);
      }}
      class={cn(tabsListVariants({ variant: local.variant }), local.class)}
      data-slot="tabs-list"
      data-variant={local.variant}
      data-activation-direction={context.activationDirection()}
      {...others}
    />
  );
};

type TabsTriggerProps<T extends ValidComponent = "button", Value = unknown> = Omit<
  PolymorphicProps<T, TabsTriggerPrimitiveProps<T>>,
  "value"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    value: Value;
  };

const TabsTrigger = <T extends ValidComponent = "button", Value = unknown>(
  props: TabsTriggerProps<T, Value>,
) => {
  const context = useTabsContext();
  const [local, others] = splitProps(props as TabsTriggerProps, [
    "class",
    "disabled",
    "id",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onPointerDown",
    "ref",
    "value",
  ]);
  let element: HTMLElement | undefined;
  const id = () => local.id ?? context.triggerIdForValue(local.value);

  const unregister = context.registerTab({
    disabled: () => local.disabled ?? false,
    element: () => element,
    id,
    value: () => local.value,
  });
  onCleanup(unregister);
  createEffect(
    on(
      () => [local.disabled, local.value] as const,
      () => context.scheduleReconciliation(),
      { defer: true },
    ),
  );

  const withTriggerEvent = <EventType extends Event>(
    handler: Accessor<JSX.EventHandlerUnion<HTMLButtonElement, EventType> | undefined>,
  ): JSX.EventHandler<HTMLButtonElement, EventType> => {
    return (event) => {
      context.recordTriggerEvent(event);
      callEventHandler(handler(), event);
    };
  };
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    context.recordTriggerEvent(event);
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined,
      event,
    );
    context.commitPointerActivation(local.value, event);
  };
  const onFocus: JSX.EventHandler<HTMLButtonElement, FocusEvent> = (event) => {
    context.recordTriggerEvent(event);
    context.recordTabFocus(local.value);
    context.activateFocusedTab(local.value, local.disabled ?? false, event);
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent> | undefined,
      event,
    );
  };
  const onKeyDown = withTriggerEvent(
    () => local.onKeyDown as JSX.EventHandlerUnion<HTMLButtonElement, KeyboardEvent> | undefined,
  );
  const onPointerDown = withTriggerEvent(
    () => local.onPointerDown as JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> | undefined,
  );

  return (
    <Trigger
      ref={(nextElement: HTMLElement) => {
        element = nextElement;
        setElementRef(local.ref, nextElement);
      }}
      id={id()}
      value={context.keyForValue(local.value)}
      disabled={false}
      tabIndex={context.tabIndexForValue(local.value)}
      data-slot="tabs-trigger"
      data-disabled={local.disabled ? "" : undefined}
      data-activation-direction={context.activationDirection()}
      aria-disabled={local.disabled || undefined}
      aria-controls={context.mountedPanelIdForValue(local.value)}
      class={cn(
        "z-tabs-trigger relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-selected:bg-transparent dark:group-data-[variant=line]/tabs-list:data-selected:border-transparent dark:group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "data-selected:bg-background data-selected:text-foreground dark:data-selected:border-input dark:data-selected:bg-input/30 dark:data-selected:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-selected:after:opacity-100",
        local.class,
      )}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      {...others}
    />
  );
};

type TabsContentProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  PolymorphicProps<T, TabsContentPrimitiveProps<T>>,
  "forceMount" | "value"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    /** @deprecated Use keepMounted to match the pinned shadcn API. */
    forceMount?: boolean;
    keepMounted?: boolean;
    value: Value;
  };

const TabsContent = <T extends ValidComponent = "div", Value = unknown>(
  props: TabsContentProps<T, Value>,
) => {
  const context = useTabsContext();
  const [local, others] = splitProps(props as TabsContentProps, [
    "class",
    "forceMount",
    "id",
    "keepMounted",
    "value",
  ]);
  const isSelected = () => context.selectedValue() === local.value;
  const shouldKeepMounted = () => local.keepMounted ?? local.forceMount ?? false;
  const id = () => local.id ?? context.panelIdForValue(local.value);
  createEffect(() => {
    if (!isSelected() && !shouldKeepMounted()) return;
    const unregister = context.registerPanel(local.value, id());
    onCleanup(unregister);
  });

  return (
    <Content
      id={id()}
      value={context.keyForValue(local.value)}
      forceMount={shouldKeepMounted()}
      data-slot="tabs-content"
      data-hidden={!isSelected() ? "" : undefined}
      data-activation-direction={context.activationDirection()}
      aria-labelledby={context.registeredTabIdForValue(local.value)}
      hidden={!isSelected()}
      inert={!isSelected() ? true : undefined}
      tabIndex={isSelected() ? 0 : -1}
      class={cn("z-tabs-content flex-1 outline-none", local.class)}
      {...others}
    />
  );
};

export {
  Tabs,
  type TabsActivationDirection,
  type TabsChangeDetails,
  type TabsChangeReason,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListVariants,
};
