import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { ToggleButton, type ToggleButtonRootProps } from "@kobalte/core/toggle-button";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createSignal,
  type JSX,
  mergeProps,
  splitProps,
  type ValidComponent,
} from "solid-js";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "group/toggle z-toggle inline-flex items-center justify-center whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "z-toggle-variant-default",
        outline: "z-toggle-variant-outline",
      },
      size: {
        default: "z-toggle-size-default",
        sm: "z-toggle-size-sm",
        lg: "z-toggle-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: "none";
  trigger: Element | undefined;
};

function createChangeDetails(event: Event): ToggleChangeDetails {
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

type ToggleProps<T extends ValidComponent = "button"> = Omit<
  PolymorphicProps<T, ToggleButtonRootProps<T>>,
  "defaultPressed" | "disabled" | "onChange" | "pressed" | "value"
> &
  VariantProps<typeof toggleVariants> &
  Pick<ComponentProps<T>, "class"> & {
    defaultPressed?: boolean;
    disabled?: boolean;
    nativeButton?: boolean;
    onPressedChange?: (pressed: boolean, details: ToggleChangeDetails) => void;
    pressed?: boolean;
    value?: string;
  };

const Toggle = <T extends ValidComponent = "button">(rawProps: ToggleProps<T>) => {
  const props = mergeProps(
    {
      defaultPressed: false,
      disabled: false,
      nativeButton: true,
    } as const,
    rawProps,
  );
  const [local, others] = splitProps(props as ToggleProps, [
    "as",
    "class",
    "defaultPressed",
    "disabled",
    "form",
    "nativeButton",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "onMouseDown",
    "onPointerDown",
    "onPressedChange",
    "pressed",
    "role",
    "size",
    "tabIndex",
    "type",
    "value",
    "variant",
  ]);
  const [uncontrolledPressed, setUncontrolledPressed] = createSignal(local.defaultPressed ?? false);
  const pressed = () => local.pressed ?? uncontrolledPressed();
  const nativeButton = () => local.nativeButton ?? true;

  const requestPressedChange = (event: Event) => {
    const nextPressed = !pressed();
    const details = createChangeDetails(event);
    local.onPressedChange?.(nextPressed, details);
    if (details.isCanceled) return;

    if (local.pressed === undefined) setUncontrolledPressed(nextPressed);
  };

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    requestPressedChange(event);
  };

  const handleKeyboardActivation = (
    event: KeyboardEvent & { currentTarget: HTMLElement; target: Element },
  ) => {
    callEventHandler(
      local.onClick as unknown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    requestPressedChange(event);
  };

  const handleMouseDown: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(
      local.onMouseDown as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
  };

  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
  };

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (nativeButton()) return;
    if (event.target !== event.currentTarget) return;
    if (event.currentTarget.tagName === "A" && (event.currentTarget as HTMLAnchorElement).href)
      return;

    if (event.key === "Enter") {
      event.preventDefault();
      handleKeyboardActivation(event);
    } else if (event.key === " ") {
      event.preventDefault();
    }
  };

  const handleKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(
      local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (nativeButton() || event.key !== " ") return;
    if (event.target !== event.currentTarget) return;
    if (event.currentTarget.tagName === "A" && (event.currentTarget as HTMLAnchorElement).href)
      return;

    handleKeyboardActivation(event);
  };

  return (
    <ToggleButton
      as={local.as ?? (local.nativeButton === false ? "div" : undefined)}
      data-slot="toggle"
      class={cn(toggleVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={local.disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      pressed={pressed()}
      role={nativeButton() ? local.role : (local.role ?? "button")}
      tabIndex={nativeButton() ? local.tabIndex : (local.tabIndex ?? (local.disabled ? -1 : 0))}
      type={nativeButton() ? "button" : undefined}
      {...others}
    />
  );
};

export { Toggle, type ToggleChangeDetails, type ToggleProps, toggleVariants };
