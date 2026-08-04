import * as CollapsiblePrimitive from "@kobalte/core/collapsible";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";

type CollapsibleChangeReason = "none" | "trigger-press";

type CollapsibleTriggerPressEvent = MouseEvent | PointerEvent | TouchEvent | KeyboardEvent;

type CollapsibleChangeEvent<Reason extends CollapsibleChangeReason> = Reason extends "trigger-press"
  ? CollapsibleTriggerPressEvent
  : Event;

type CollapsibleChangeDetails<Reason extends CollapsibleChangeReason = CollapsibleChangeReason> =
  Reason extends CollapsibleChangeReason
    ? {
        allowPropagation: () => void;
        cancel: () => void;
        event: CollapsibleChangeEvent<Reason>;
        readonly isCanceled: boolean;
        readonly isPropagationAllowed: boolean;
        reason: Reason;
        trigger: Element | undefined;
      }
    : never;

function createChangeDetails<Reason extends CollapsibleChangeReason>(
  reason: Reason,
  event?: CollapsibleChangeEvent<Reason>,
  trigger?: Element,
): CollapsibleChangeDetails<Reason> {
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
  } as CollapsibleChangeDetails<Reason>;
}

type CollapsibleProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, CollapsiblePrimitive.CollapsibleRootProps<T>>,
  "defaultOpen" | "forceMount" | "onOpenChange" | "open"
> & {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: CollapsibleChangeDetails) => void;
  open?: boolean;
};

type CollapsibleContextValue = {
  disabled: Accessor<boolean>;
  open: Accessor<boolean>;
  recordTriggerEvent: (event: CollapsibleTriggerPressEvent, trigger: Element) => void;
  requestOpenChange: <Reason extends CollapsibleChangeReason>(
    open: boolean,
    reason: Reason,
    event?: CollapsibleChangeEvent<Reason>,
    trigger?: Element,
  ) => void;
  setPanelForceMount: (forceMount: boolean) => void;
};

const CollapsibleContext = createContext<CollapsibleContextValue>();

function useCollapsibleContext() {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error("CollapsibleTrigger and CollapsibleContent require Collapsible");
  return context;
}

const Collapsible = <T extends ValidComponent = "div">(props: CollapsibleProps<T>) => {
  const [local, others] = splitProps(props as CollapsibleProps, [
    "defaultOpen",
    "disabled",
    "onOpenChange",
    "open",
  ]);
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const [panelForceMount, setPanelForceMount] = createSignal(false);
  const open = () => local.open ?? uncontrolledOpen();
  let pendingEvent: CollapsibleTriggerPressEvent | undefined;
  let pendingTrigger: Element | undefined;

  const requestOpenChange = <Reason extends CollapsibleChangeReason>(
    nextOpen: boolean,
    reason: Reason,
    event?: CollapsibleChangeEvent<Reason>,
    trigger?: Element,
  ) => {
    const details = createChangeDetails(reason, event, trigger);
    local.onOpenChange?.(nextOpen, details);
    if (details.isCanceled || local.open !== undefined) return;
    setUncontrolledOpen(nextOpen);
  };

  const context: CollapsibleContextValue = {
    disabled: () => local.disabled ?? false,
    open,
    recordTriggerEvent: (event, trigger) => {
      pendingEvent = event;
      pendingTrigger = trigger;
    },
    requestOpenChange,
    setPanelForceMount,
  };

  const handleOpenChange = (nextOpen: boolean) => {
    requestOpenChange(nextOpen, "trigger-press", pendingEvent, pendingTrigger);
    pendingEvent = undefined;
    pendingTrigger = undefined;
  };

  return (
    <CollapsibleContext.Provider value={context}>
      <CollapsiblePrimitive.Root
        data-disabled={local.disabled ? "" : undefined}
        data-slot="collapsible"
        forceMount={panelForceMount()}
        onOpenChange={handleOpenChange}
        open={open()}
        {...others}
      />
    </CollapsibleContext.Provider>
  );
};

type CollapsibleTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  CollapsiblePrimitive.CollapsibleTriggerProps<T>
> & {
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

const CollapsibleTrigger = <T extends ValidComponent = "button">(
  props: CollapsibleTriggerProps<T>,
) => {
  const context = useCollapsibleContext();
  const [local, others] = splitProps(props as CollapsibleTriggerProps, [
    "as",
    "disabled",
    "nativeButton",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "tabIndex",
  ]);
  const disabled = () => local.disabled ?? context.disabled();
  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    context.recordTriggerEvent(event, event.currentTarget);
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || disabled()) return;
    if (event.key === "Enter") {
      event.preventDefault();
      context.requestOpenChange(!context.open(), "trigger-press", event, event.currentTarget);
    } else if (event.key === " ") {
      event.preventDefault();
    }
  };
  const handleKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || disabled() || event.key !== " ") return;
    event.preventDefault();
    context.requestOpenChange(!context.open(), "trigger-press", event, event.currentTarget);
  };
  const blockDisabledInteraction = (event: Event) => {
    if (!disabled()) return;
    const isTabKeyDown =
      event.type === "keydown" && event instanceof KeyboardEvent && event.key === "Tab";
    const preventsDefault =
      event.type === "click" || event.type === "pointerdown" || event.type === "keydown";
    if (preventsDefault && !isTabKeyDown) event.preventDefault();
    event.stopImmediatePropagation();
  };

  return (
    <CollapsiblePrimitive.Trigger
      aria-disabled={disabled() || undefined}
      as={local.as ?? (local.nativeButton === false ? "div" : undefined)}
      data-disabled={disabled() ? "" : undefined}
      data-slot="collapsible-trigger"
      on:click={{ capture: true, handleEvent: blockDisabledInteraction }}
      on:keydown={{ capture: true, handleEvent: blockDisabledInteraction }}
      on:keyup={{ capture: true, handleEvent: blockDisabledInteraction }}
      on:mousedown={{ capture: true, handleEvent: blockDisabledInteraction }}
      on:pointerdown={{ capture: true, handleEvent: blockDisabledInteraction }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={disabled() ? (local.tabIndex ?? 0) : local.tabIndex}
      {...others}
    />
  );
};

type CollapsibleContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  CollapsiblePrimitive.CollapsibleContentProps<T>
> & {
  hiddenUntilFound?: boolean;
  keepMounted?: boolean;
};

const CollapsibleContent = <T extends ValidComponent = "div">(
  props: CollapsibleContentProps<T>,
) => {
  const context = useCollapsibleContext();
  const [local, others] = splitProps(props as CollapsibleContentProps, [
    "hiddenUntilFound",
    "keepMounted",
    "on:beforematch",
  ]);
  const keepMounted = () => local.hiddenUntilFound || local.keepMounted || false;
  const hiddenAttribute = () =>
    context.open()
      ? undefined
      : local.hiddenUntilFound
        ? "until-found"
        : keepMounted()
          ? ""
          : undefined;

  createEffect(() => {
    context.setPanelForceMount(keepMounted());
    onCleanup(() => context.setPanelForceMount(false));
  });

  const handleBeforeMatch: JSX.EventHandler<HTMLElement, Event> = (event) => {
    const userHandler = local["on:beforematch"] as
      | JSX.EventHandlerWithOptionsUnion<HTMLElement, Event>
      | undefined;
    if (typeof userHandler === "function") userHandler(event);
    else userHandler?.handleEvent(event);
    if (!event.defaultPrevented) context.requestOpenChange(true, "none", event);
  };

  return (
    <CollapsiblePrimitive.Content
      data-disabled={context.disabled() ? "" : undefined}
      data-slot="collapsible-content"
      attr:hidden={hiddenAttribute()}
      on:beforematch={handleBeforeMatch}
      {...others}
    />
  );
};

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
