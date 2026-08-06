import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type ToggleGroupItemProps as ToggleGroupItemPrimitiveProps,
  ToggleGroup as ToggleGroupPrimitive,
  type ToggleGroupRootProps as ToggleGroupRootPrimitiveProps,
} from "@kobalte/core/toggle-group";
import type { VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
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
import {
  Toggle,
  type ToggleChangeDetails,
  type ToggleProps,
  toggleVariants,
} from "@/registry/kobalte/ui/toggle";

type ToggleGroupChangeDetails = ToggleChangeDetails;

function createChangeDetails(event: Event): ToggleGroupChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
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
    reason: "none",
    trigger: undefined,
  };
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

type PendingPrimitiveChange = {
  event: Event;
  onPressedChange: ((pressed: boolean, details: ToggleChangeDetails) => void) | undefined;
  value: string;
};

type ToggleGroupContextValue = {
  disabled: () => boolean;
  recordPrimitiveChange: (change: PendingPrimitiveChange) => void;
  requestClickChange: (change: PendingPrimitiveChange) => void;
  size: () => VariantProps<typeof toggleVariants>["size"];
  spacing: () => number;
  variant: () => VariantProps<typeof toggleVariants>["variant"];
};

const ToggleGroupContext = createContext<ToggleGroupContextValue>();

type ToggleGroupProps<T extends ValidComponent = "div", Value extends string = string> = Omit<
  PolymorphicProps<T, ToggleGroupRootPrimitiveProps<T>>,
  "defaultValue" | "disabled" | "multiple" | "onChange" | "orientation" | "value"
> &
  Pick<ComponentProps<T>, "class" | "children"> &
  VariantProps<typeof toggleVariants> & {
    defaultValue?: readonly Value[];
    disabled?: boolean;
    loopFocus?: boolean;
    multiple?: boolean;
    onValueChange?: (value: Value[], details: ToggleGroupChangeDetails) => void;
    orientation?: "horizontal" | "vertical";
    spacing?: number;
    value?: readonly Value[];
  };

const ToggleGroup = <T extends ValidComponent = "div", Value extends string = string>(
  rawProps: ToggleGroupProps<T, Value>,
) => {
  const props = mergeProps(
    {
      disabled: false,
      loopFocus: true,
      multiple: false,
      orientation: "horizontal",
      spacing: 2,
    } as const,
    rawProps,
  );
  const [local, others] = splitProps(props as ToggleGroupProps<T, Value>, [
    "children",
    "class",
    "defaultValue",
    "disabled",
    "loopFocus",
    "multiple",
    "onValueChange",
    "orientation",
    "ref",
    "size",
    "spacing",
    "style",
    "value",
    "variant",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<Value[]>([
    ...(local.defaultValue ?? []),
  ]);
  const selectedValues = (): readonly Value[] => local.value ?? uncontrolledValue();
  let element: HTMLElement | undefined;
  let pendingPrimitiveChange: PendingPrimitiveChange | undefined;
  let suppressPrimitiveChange = false;

  const requestValueChange = (change: PendingPrimitiveChange) => {
    const currentValue = selectedValues();
    const pressed = currentValue.includes(change.value as Value);
    const nextPressed = !pressed;
    const details = createChangeDetails(change.event);

    change.onPressedChange?.(nextPressed, details);
    if (details.isCanceled) return;

    const nextValue = local.multiple
      ? nextPressed
        ? [...currentValue, change.value as Value]
        : currentValue.filter((value) => value !== change.value)
      : nextPressed
        ? [change.value as Value]
        : [];

    local.onValueChange?.([...nextValue], details);
    if (details.isCanceled || local.value !== undefined) return;

    setUncontrolledValue([...nextValue]);
  };

  const recordPrimitiveChange = (change: PendingPrimitiveChange) => {
    pendingPrimitiveChange = change;
    queueMicrotask(() => {
      if (pendingPrimitiveChange === change) pendingPrimitiveChange = undefined;
    });
  };

  const requestClickChange = (change: PendingPrimitiveChange) => {
    pendingPrimitiveChange = undefined;
    suppressPrimitiveChange = true;
    queueMicrotask(() => {
      suppressPrimitiveChange = false;
    });
    requestValueChange(change);
  };

  const handlePrimitiveChange = () => {
    if (suppressPrimitiveChange) {
      suppressPrimitiveChange = false;
      pendingPrimitiveChange = undefined;
      return;
    }

    const change = pendingPrimitiveChange;
    pendingPrimitiveChange = undefined;
    if (!change) return;

    if (
      typeof PointerEvent !== "undefined" &&
      change.event instanceof PointerEvent &&
      change.event.type === "pointerdown" &&
      change.event.pointerType === "mouse"
    ) {
      return;
    }

    requestValueChange(change);
  };

  const handleKeyDownCapture = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      local.disabled ||
      local.loopFocus !== false ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !element
    ) {
      return;
    }

    const forwardKey = local.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const backwardKey = local.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    if (event.key !== forwardKey && event.key !== backwardKey) return;

    const items = [
      ...element.querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]'),
    ].filter((item) => !item.matches("[disabled], [data-disabled]"));
    const currentItem =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-slot="toggle-group-item"]')
        : null;
    const currentIndex = currentItem ? items.indexOf(currentItem) : -1;
    if (currentIndex < 0) return;

    const isRtl =
      local.orientation === "horizontal" && getComputedStyle(element).direction === "rtl";
    const movesForward = isRtl ? event.key === backwardKey : event.key === forwardKey;
    const atBoundary = movesForward ? currentIndex === items.length - 1 : currentIndex === 0;
    if (!atBoundary) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  onMount(() => {
    element?.addEventListener("keydown", handleKeyDownCapture, { capture: true });
    onCleanup(() =>
      element?.removeEventListener("keydown", handleKeyDownCapture, { capture: true }),
    );
  });

  const context: ToggleGroupContextValue = {
    disabled: () => local.disabled ?? false,
    recordPrimitiveChange,
    requestClickChange,
    size: () => local.size,
    spacing: () => local.spacing ?? 2,
    variant: () => local.variant,
  };
  const style = () => {
    if (typeof local.style === "string") return `--gap:${local.spacing};${local.style}`;

    return {
      "--gap": local.spacing,
      ...local.style,
    } as JSX.CSSProperties;
  };

  return (
    <ToggleGroupPrimitive
      ref={(nextElement: HTMLElement) => {
        element = nextElement;
        setElementRef(local.ref, nextElement);
      }}
      multiple
      value={[...selectedValues()]}
      onChange={handlePrimitiveChange}
      disabled={local.disabled}
      orientation={local.orientation}
      aria-disabled={local.disabled || undefined}
      data-disabled={local.disabled ? "" : undefined}
      data-multiple={local.multiple ? "" : undefined}
      data-orientation={local.orientation}
      data-size={local.size}
      data-slot="toggle-group"
      data-spacing={local.spacing}
      data-variant={local.variant}
      style={style()}
      class={cn(
        "group/toggle-group z-toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        local.class,
      )}
      {...others}
    >
      <ToggleGroupContext.Provider value={context}>{local.children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
};

type ToggleGroupItemProps<
  T extends ValidComponent = "button",
  Value extends string = string,
> = Omit<
  PolymorphicProps<T, ToggleGroupItemPrimitiveProps<T>>,
  "defaultPressed" | "disabled" | "onChange" | "pressed" | "value"
> &
  VariantProps<typeof toggleVariants> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    defaultPressed?: boolean;
    disabled?: boolean;
    nativeButton?: boolean;
    onPressedChange?: (pressed: boolean, details: ToggleChangeDetails) => void;
    pressed?: boolean;
    value?: Value;
  };

const ToggleGroupItem = <T extends ValidComponent = "button", Value extends string = string>(
  rawProps: ToggleGroupItemProps<T, Value>,
) => {
  const props = mergeProps(
    {
      defaultPressed: false,
      disabled: false,
      nativeButton: true,
      size: "default",
      variant: "default",
    } as const,
    rawProps,
  );
  const [local, others] = splitProps(props as ToggleGroupItemProps<T, Value>, [
    "as",
    "children",
    "class",
    "defaultPressed",
    "disabled",
    "form",
    "nativeButton",
    "onClick",
    "onKeyDown",
    "onPointerDown",
    "onPressedChange",
    "pressed",
    "role",
    "size",
    "type",
    "value",
    "variant",
  ]);
  const context = useContext(ToggleGroupContext);
  const fallbackValue = `toggle-group-item-${createUniqueId()}`;
  const value = () => local.value ?? (fallbackValue as Value);

  if (!context) {
    return (
      <Toggle
        {...(rawProps as ToggleProps<T>)}
        value={value()}
        data-size={local.size}
        data-slot="toggle-group-item"
        data-spacing={2}
        data-variant={local.variant}
        class={cn(
          "z-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </Toggle>
    );
  }

  const disabled = () => context.disabled() || (local.disabled ?? false);
  const pendingChange = (event: Event): PendingPrimitiveChange => ({
    event,
    onPressedChange: local.onPressedChange,
    value: value(),
  });

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (disabled()) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    context.requestClickChange(pendingChange(event));
  };

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (disabled()) {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      context.recordPrimitiveChange(pendingChange(event));
    }
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
  };

  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (disabled()) {
      event.preventDefault();
      return;
    }
    context.recordPrimitiveChange(pendingChange(event));
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
  };

  return (
    <ToggleGroupPrimitive.Item
      as={local.as ?? (local.nativeButton === false ? "div" : undefined)}
      value={value()}
      disabled={disabled()}
      aria-disabled={disabled()}
      role={local.nativeButton === false ? (local.role ?? "button") : local.role}
      data-size={context.size() || local.size}
      data-slot="toggle-group-item"
      data-spacing={context.spacing()}
      data-variant={context.variant() || local.variant}
      class={cn(
        toggleVariants({
          variant: context.variant() || local.variant,
          size: context.size() || local.size,
          class:
            "z-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        }),
        local.class,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      {...others}
    >
      {local.children}
    </ToggleGroupPrimitive.Item>
  );
};

export {
  ToggleGroup,
  type ToggleGroupChangeDetails,
  ToggleGroupItem,
  type ToggleGroupItemProps,
  type ToggleGroupProps,
};
