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
  value: Accessor<unknown>;
};

type TabsContextValue = {
  activationDirection: Accessor<TabsActivationDirection>;
  keyForValue: (value: unknown) => string;
  orientation: Accessor<"horizontal" | "vertical">;
  recordTriggerEvent: (event: Event) => void;
  registerTab: (tab: RegisteredTab) => () => void;
  scheduleReconciliation: () => void;
  selectedValue: Accessor<unknown>;
  setActivateOnFocus: (activateOnFocus: boolean) => void;
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

function activationDirectionForEvent(
  event: Event,
  orientation: "horizontal" | "vertical",
): TabsActivationDirection {
  if (typeof KeyboardEvent === "undefined" || !(event instanceof KeyboardEvent)) return "none";

  if (orientation === "horizontal") {
    if (event.key === "ArrowLeft") return "left";
    if (event.key === "ArrowRight") return "right";
  } else {
    if (event.key === "ArrowDown") return "down";
    if (event.key === "ArrowUp") return "up";
  }

  return "none";
}

function createChangeDetails(
  reason: TabsChangeReason,
  event: Event,
  orientation: "horizontal" | "vertical",
): TabsChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    activationDirection: activationDirectionForEvent(event, orientation),
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      if (reason === "none") canceled = true;
    },
    event,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
    trigger: event.currentTarget instanceof Element ? event.currentTarget : undefined,
  };
}

type TabsProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  PolymorphicProps<T, TabsRootPrimitiveProps<T>>,
  "activationMode" | "defaultValue" | "onChange" | "orientation" | "value"
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
    "disabled",
    "onChange",
    "onValueChange",
    "orientation",
    "value",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<unknown>(local.defaultValue);
  const [activateOnFocus, setActivateOnFocus] = createSignal(false);
  const [activationDirection, setActivationDirection] =
    createSignal<TabsActivationDirection>("none");
  const emptySelectionKey = `tabs-empty-${createUniqueId()}`;
  const valueToKey = new Map<unknown, string>();
  const keyToValue = new Map<string, unknown>();
  const tabs = new Set<RegisteredTab>();
  let pendingTriggerEvent: Event | undefined;
  let selectionResolved = local.defaultValue !== undefined || local.value !== undefined;
  let reconciliationQueued = false;

  const selectedValue = () => (local.value !== undefined ? local.value : uncontrolledValue());
  const keyForValue = (value: unknown) => {
    const existingKey = valueToKey.get(value);
    if (existingKey) return existingKey;

    const key = `tabs-value-${valueToKey.size + 1}`;
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

  const requestValueChange = (
    nextValue: unknown,
    reason: TabsChangeReason,
    event = new Event("base-ui"),
  ) => {
    const details = createChangeDetails(reason, event, local.orientation ?? "horizontal");
    local.onValueChange?.(nextValue, details);
    if (details.isCanceled) return;

    setActivationDirection(details.activationDirection);
    local.onChange?.(nextValue);
    if (local.value === undefined) setUncontrolledValue(nextValue);
  };
  const reconcileSelection = () => {
    reconciliationQueued = false;
    if (local.value !== undefined) return;

    const currentValue = selectedValue();
    if (currentValue == null) return;

    const ordered = orderedTabs();
    if (ordered.length === 0) return;

    const selectedTab = ordered.find((tab) => tab.value() === currentValue);
    if (selectedTab && !selectedTab.disabled()) return;

    const fallback = ordered.find((tab) => !tab.disabled());
    if (selectedTab?.disabled()) requestValueChange(fallback?.value() ?? null, "disabled");
    else if (selectionResolved) requestValueChange(fallback?.value() ?? null, "missing");
  };
  const scheduleReconciliation = () => {
    if (reconciliationQueued) return;
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

    const reason: TabsChangeReason = pendingTriggerEvent
      ? "none"
      : selectionResolved
        ? "missing"
        : local.defaultValue === undefined
          ? "initial"
          : "missing";
    requestValueChange(keyToValue.get(key), reason, pendingTriggerEvent);
    selectionResolved = true;
    pendingTriggerEvent = undefined;
  };

  const context: TabsContextValue = {
    activationDirection,
    keyForValue,
    orientation: () => local.orientation ?? "horizontal",
    recordTriggerEvent,
    registerTab: (tab) => {
      tabs.add(tab);
      scheduleReconciliation();
      return () => {
        tabs.delete(tab);
        scheduleReconciliation();
      };
    },
    scheduleReconciliation,
    selectedValue,
    setActivateOnFocus,
  };

  return (
    <TabsContext.Provider value={context}>
      <Root
        data-slot="tabs"
        data-orientation={local.orientation}
        data-activation-direction={activationDirection()}
        orientation={local.orientation}
        activationMode={activateOnFocus() ? "automatic" : "manual"}
        disabled={local.disabled}
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

    const enabledTabs = [...element.querySelectorAll<HTMLElement>("[role=tab]")].filter(
      (tab) => !tab.hasAttribute("data-disabled"),
    );
    const currentTab =
      event.target instanceof Element ? event.target.closest<HTMLElement>("[role=tab]") : null;
    const currentIndex = currentTab ? enabledTabs.indexOf(currentTab) : -1;
    if (currentIndex < 0) return;

    const isRtl = getComputedStyle(element).direction === "rtl";
    const movesForward =
      orientation === "horizontal" && isRtl ? event.key === backwardKey : event.key === forwardKey;
    const atBoundary = movesForward ? currentIndex === enabledTabs.length - 1 : currentIndex === 0;
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
    "onClick",
    "onFocus",
    "onKeyDown",
    "onPointerDown",
    "ref",
    "value",
  ]);
  let element: HTMLElement | undefined;

  onMount(() => {
    const unregister = context.registerTab({
      disabled: () => local.disabled ?? false,
      element: () => element,
      value: () => local.value,
    });
    onCleanup(unregister);
  });
  createEffect(() => {
    local.disabled;
    context.scheduleReconciliation();
  });

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    context.recordTriggerEvent(event);
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined,
      event,
    );
  };
  const onFocus: JSX.EventHandler<HTMLButtonElement, FocusEvent> = (event) => {
    context.recordTriggerEvent(event);
    callEventHandler(
      local.onFocus as JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent> | undefined,
      event,
    );
  };
  const onKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    context.recordTriggerEvent(event);
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLButtonElement, KeyboardEvent> | undefined,
      event,
    );
  };
  const onPointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    context.recordTriggerEvent(event);
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent> | undefined,
      event,
    );
  };

  return (
    <Trigger
      ref={(nextElement: HTMLElement) => {
        element = nextElement;
        setElementRef(local.ref, nextElement);
      }}
      value={context.keyForValue(local.value)}
      disabled={local.disabled}
      data-slot="tabs-trigger"
      data-activation-direction={context.activationDirection()}
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
  const mergedProps = mergeProps({ keepMounted: false }, props);
  const [local, others] = splitProps(mergedProps as TabsContentProps, [
    "class",
    "forceMount",
    "keepMounted",
    "value",
  ]);
  const isSelected = () => context.selectedValue() === local.value;

  return (
    <Content
      value={context.keyForValue(local.value)}
      forceMount={local.keepMounted || local.forceMount}
      data-slot="tabs-content"
      data-hidden={!isSelected() ? "" : undefined}
      data-activation-direction={context.activationDirection()}
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
