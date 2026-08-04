import * as AccordionPrimitive from "@kobalte/core/accordion";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { ChevronDown, ChevronUp } from "lucide-solid";
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

import { cn } from "@/lib/utils";

type AccordionChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: "none" | "trigger-press";
  trigger: Element | undefined;
};

function createChangeDetails(
  reason: AccordionChangeDetails["reason"],
  event?: Event,
  trigger?: Element,
): AccordionChangeDetails {
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

type AccordionProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  PolymorphicProps<T, AccordionPrimitive.AccordionRootProps<T>>,
  "collapsible" | "defaultValue" | "disabled" | "onChange" | "shouldFocusWrap" | "value"
> & {
  class?: string;
  defaultValue?: Value[];
  disabled?: boolean;
  hiddenUntilFound?: boolean;
  keepMounted?: boolean;
  /** @deprecated Roving focus is not part of the pinned Base UI accordion contract. */
  loopFocus?: boolean;
  multiple?: boolean;
  onValueChange?: (value: Value[], details: AccordionChangeDetails) => void;
  /** @deprecated Roving focus is not part of the pinned Base UI accordion contract. */
  orientation?: "horizontal" | "vertical";
  value?: Value[];
};

type AccordionRootContextValue = {
  disabled: Accessor<boolean>;
  hiddenUntilFound: Accessor<boolean>;
  keepMounted: Accessor<boolean>;
  keyForValue: (value: unknown) => string;
  recordTriggerEvent: (event: Event) => void;
  registerItem: (
    key: string,
    onOpenChange: (open: boolean, details: AccordionChangeDetails) => void,
  ) => () => void;
  requestItemChange: (
    key: string,
    open: boolean,
    reason: AccordionChangeDetails["reason"],
    event?: Event,
  ) => void;
  valueForKey: (key: string) => unknown;
  values: Accessor<unknown[]>;
};

const AccordionRootContext = createContext<AccordionRootContextValue>();

function useAccordionRootContext() {
  const context = useContext(AccordionRootContext);
  if (!context) throw new Error("Accordion parts must be used within Accordion");
  return context;
}

const Accordion = <T extends ValidComponent = "div", Value = unknown>(
  props: AccordionProps<T, Value>,
) => {
  const [local, others] = splitProps(props as AccordionProps, [
    "class",
    "defaultValue",
    "disabled",
    "hiddenUntilFound",
    "keepMounted",
    "loopFocus",
    "multiple",
    "onValueChange",
    "orientation",
    "value",
  ]);
  const [uncontrolledValues, setUncontrolledValues] = createSignal<unknown[]>(
    local.defaultValue ?? [],
  );
  const values = () => local.value ?? uncontrolledValues();
  const valueToKey = new Map<unknown, string>();
  const keyToValue = new Map<string, unknown>();
  const itemHandlers = new Map<string, (open: boolean, details: AccordionChangeDetails) => void>();
  let pendingTriggerEvent: Event | undefined;

  const keyForValue = (value: unknown) => {
    const existingKey = valueToKey.get(value);
    if (existingKey) return existingKey;

    const key = `accordion-value-${valueToKey.size + 1}`;
    valueToKey.set(value, key);
    keyToValue.set(key, value);
    return key;
  };

  const currentKeys = () => values().map(keyForValue);

  const applyKeyChange = (
    keys: string[],
    reason: AccordionChangeDetails["reason"],
    event?: Event,
  ) => {
    const previousKeys = currentKeys();
    const changedKey =
      keys.find((key) => !previousKeys.includes(key)) ??
      previousKeys.find((key) => !keys.includes(key));
    if (!changedKey) return;

    const open = keys.includes(changedKey);
    const trigger =
      reason === "trigger-press" && event?.currentTarget instanceof Element
        ? event.currentTarget
        : undefined;
    const details = createChangeDetails(reason, event, trigger);
    itemHandlers.get(changedKey)?.(open, details);
    if (details.isCanceled) return;

    const nextValues = keys.map((key) => keyToValue.get(key));
    local.onValueChange?.(nextValues, details);
    if (details.isCanceled || local.value !== undefined) return;

    setUncontrolledValues(nextValues);
  };

  const context: AccordionRootContextValue = {
    disabled: () => local.disabled ?? false,
    hiddenUntilFound: () => local.hiddenUntilFound ?? false,
    keepMounted: () => local.keepMounted ?? false,
    keyForValue,
    recordTriggerEvent: (event) => {
      pendingTriggerEvent = event;
    },
    registerItem: (key, onOpenChange) => {
      itemHandlers.set(key, onOpenChange);
      return () => {
        if (itemHandlers.get(key) === onOpenChange) itemHandlers.delete(key);
      };
    },
    requestItemChange: (key, open, reason, event) => {
      const keys = currentKeys();
      const nextKeys = open
        ? local.multiple
          ? keys.includes(key)
            ? keys
            : [...keys, key]
          : [key]
        : keys.filter((currentKey) => currentKey !== key);
      applyKeyChange(nextKeys, reason, event);
    },
    valueForKey: (key) => keyToValue.get(key),
    values,
  };

  const handleChange = (keys: string[]) => {
    const event = pendingTriggerEvent;
    pendingTriggerEvent = undefined;
    applyKeyChange(keys, "trigger-press", event);
  };

  return (
    <AccordionRootContext.Provider value={context}>
      <AccordionPrimitive.Root
        class={cn("z-accordion flex w-full flex-col", local.class)}
        collapsible
        data-slot="accordion"
        multiple={local.multiple}
        onChange={handleChange}
        shouldFocusWrap={false}
        value={currentKeys()}
        {...others}
      />
    </AccordionRootContext.Provider>
  );
};

type AccordionItemProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  PolymorphicProps<T, AccordionPrimitive.AccordionItemProps<T>>,
  "disabled" | "forceMount" | "value"
> & {
  class?: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean, details: AccordionChangeDetails) => void;
  value?: Value;
};

type AccordionItemContextValue = {
  disabled: Accessor<boolean>;
  forceMount: Accessor<boolean>;
  hiddenUntilFound: Accessor<boolean>;
  keepMounted: Accessor<boolean>;
  open: Accessor<boolean>;
  openFromBeforeMatch: (event: Event) => void;
  setPanelForceMount: (forceMount: boolean) => void;
};

const AccordionItemContext = createContext<AccordionItemContextValue>();

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) throw new Error("AccordionTrigger and AccordionContent require AccordionItem");
  return context;
}

const AccordionItem = <T extends ValidComponent = "div", Value = unknown>(
  props: AccordionItemProps<T, Value>,
) => {
  const root = useAccordionRootContext();
  const fallbackValue = `accordion-item-${createUniqueId()}`;
  const [local, others] = splitProps(props as AccordionItemProps, [
    "class",
    "disabled",
    "onOpenChange",
    "value",
  ]);
  const itemValue = () => local.value ?? fallbackValue;
  const itemKey = () => root.keyForValue(itemValue());
  const open = () => root.values().some((value) => Object.is(value, itemValue()));
  const [panelForceMount, setPanelForceMount] = createSignal(false);
  const context: AccordionItemContextValue = {
    disabled: () => root.disabled() || (local.disabled ?? false),
    forceMount: () => root.hiddenUntilFound() || root.keepMounted() || panelForceMount(),
    hiddenUntilFound: root.hiddenUntilFound,
    keepMounted: root.keepMounted,
    open,
    openFromBeforeMatch: (event) => root.requestItemChange(itemKey(), true, "none", event),
    setPanelForceMount,
  };

  createEffect(() => {
    const unregister = root.registerItem(itemKey(), (isOpen, details) =>
      local.onOpenChange?.(isOpen, details),
    );
    onCleanup(unregister);
  });

  return (
    <AccordionItemContext.Provider value={context}>
      <AccordionPrimitive.Item
        class={cn("z-accordion-item", local.class)}
        data-slot="accordion-item"
        disabled={context.disabled()}
        forceMount={context.forceMount()}
        value={itemKey()}
        {...others}
      />
    </AccordionItemContext.Provider>
  );
};

type AccordionTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    disabled?: boolean;
    nativeButton?: boolean;
  };

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

// Kobalte's polymorphic type cannot express switching its default button to a focusable
// non-native button only while disabled. Keep the public wrapper typed and narrow the cast here.
const FocusableTriggerPrimitive = AccordionPrimitive.Trigger as unknown as (
  props: Record<string, unknown>,
) => JSX.Element;

const AccordionTrigger = <T extends ValidComponent = "button">(props: AccordionTriggerProps<T>) => {
  const root = useAccordionRootContext();
  const item = useAccordionItemContext();
  const [local, others] = splitProps(props as AccordionTriggerProps<T>, [
    "class",
    "children",
    "disabled",
    "nativeButton",
    "onClick",
    "onKeyDown",
    "tabIndex",
  ]);
  const disabled = () => item.disabled() || (local.disabled ?? false);
  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    root.recordTriggerEvent(event);
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (["Enter", " "].includes(event.key)) root.recordTriggerEvent(event);
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );

    // Kobalte 0.13 still implements the APG's retired roving-focus behavior.
    // Stop only those events before they reach its root handler; Base UI 1.6 does not move focus.
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) event.stopPropagation();
  };
  const blockDisabledInteraction = (event: Event) => {
    if (!disabled() || (event instanceof KeyboardEvent && !["Enter", " "].includes(event.key))) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  return (
    <AccordionPrimitive.Header class="flex">
      <FocusableTriggerPrimitive
        as={disabled() || local.nativeButton === false ? "div" : "button"}
        class={cn(
          "group/accordion-trigger relative z-accordion-trigger flex flex-1 items-start justify-between border border-transparent outline-none transition-all aria-disabled:pointer-events-none aria-disabled:opacity-50",
          local.class,
        )}
        data-slot="accordion-trigger"
        disabled={disabled()}
        on:click={{ capture: true, handleEvent: blockDisabledInteraction }}
        on:keydown={{ capture: true, handleEvent: blockDisabledInteraction }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={
          disabled() || local.nativeButton === false ? (local.tabIndex ?? 0) : local.tabIndex
        }
        {...others}
      >
        {local.children}
        <ChevronDown
          class="pointer-events-none z-accordion-trigger-icon shrink-0 group-aria-expanded/accordion-trigger:hidden"
          data-slot="accordion-trigger-icon"
        />
        <ChevronUp
          class="pointer-events-none z-accordion-trigger-icon hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
          data-slot="accordion-trigger-icon"
        />
      </FocusableTriggerPrimitive>
    </AccordionPrimitive.Header>
  );
};

type AccordionContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    hiddenUntilFound?: boolean;
    keepMounted?: boolean;
  };

const AccordionContent = <T extends ValidComponent = "div">(props: AccordionContentProps<T>) => {
  const item = useAccordionItemContext();
  const [local, others] = splitProps(props as AccordionContentProps, [
    "class",
    "children",
    "hiddenUntilFound",
    "keepMounted",
    "on:beforematch",
  ]);
  const hiddenUntilFound = () => local.hiddenUntilFound ?? item.hiddenUntilFound();
  const keepMounted = () => hiddenUntilFound() || (local.keepMounted ?? item.keepMounted());
  const hiddenAttribute = () =>
    item.open() ? undefined : hiddenUntilFound() ? "until-found" : keepMounted() ? "" : undefined;

  createEffect(() => item.setPanelForceMount(keepMounted()));

  const handleBeforeMatch: JSX.EventHandler<HTMLElement, Event> = (event) => {
    const userHandler = local["on:beforematch"] as
      | JSX.EventHandlerWithOptionsUnion<HTMLElement, Event>
      | undefined;
    if (typeof userHandler === "function") userHandler(event);
    else userHandler?.handleEvent(event);
    if (!event.defaultPrevented) item.openFromBeforeMatch(event);
  };

  return (
    <AccordionPrimitive.Content
      class="z-accordion-content overflow-hidden"
      data-slot="accordion-content"
      attr:hidden={hiddenAttribute()}
      on:beforematch={handleBeforeMatch}
      {...others}
    >
      <div
        class={cn(
          "z-accordion-content-inner h-(--kb-accordion-content-height) [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          local.class,
        )}
        data-slot="accordion-content-inner"
      >
        {local.children}
      </div>
    </AccordionPrimitive.Content>
  );
};

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
