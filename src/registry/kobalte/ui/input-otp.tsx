/** biome-ignore-all lint/a11y/useAriaPropsForRole: structural separators do not require aria-valuenow */

import OtpField, {
  type DynamicProps,
  type InputProps as OtpFieldInputProps,
  type RootCorvuProps as OtpFieldRootProps,
} from "@corvu/otp-field";
import { Minus } from "lucide-solid";
import {
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  onCleanup,
  onMount,
  Show,
  splitProps,
  untrack,
} from "solid-js";

import { cn } from "@/lib/utils";

const PASSWORD_MANAGER_BADGE_SPACE = 40;
const PASSWORD_MANAGER_BADGE_OFFSET = 18;
const PASSWORD_MANAGER_BADGE_SELECTORS = [
  "[data-lastpass-icon-root]",
  "com-1password-button",
  "[data-dashlanecreated]",
  '[style$="2147483647 !important;"]',
].join(",");

type InputOTPBaseProps = Omit<OtpFieldRootProps, "contextId"> &
  Omit<
    DynamicProps<"input", OtpFieldInputProps>,
    "children" | "contextId" | "defaultValue" | "maxLength" | "onChange" | "value"
  > & {
    containerClass?: string;
    containerClassName?: string;
    defaultValue?: string;
    onChange?: (value: string) => unknown;
    pasteTransformer?: (pasted: string) => string;
    pushPasswordManagerStrategy?: "increase-width" | "none";
    textAlign?: "center" | "left" | "right";
  };

type InputOTPProps = InputOTPBaseProps &
  (
    | {
        children?: never;
        render: (props: InputOTPRenderProps) => JSX.Element;
      }
    | {
        children: JSX.Element;
        render?: never;
      }
  );

type InputOTPSlotState = {
  char: string | null;
  hasFakeCaret: boolean;
  isActive: boolean;
  placeholderChar: string | null;
};

type InputOTPRenderProps = {
  isFocused: boolean;
  isHovering: boolean;
  slots: InputOTPSlotState[];
};

const InputOTP = (props: InputOTPProps) => {
  const [local, inputProps] = splitProps(props as InputOTPProps, [
    "class",
    "containerClass",
    "containerClassName",
    "children",
    "defaultValue",
    "disabled",
    "maxLength",
    "onChange",
    "onComplete",
    "onPaste",
    "value",
    "onValueChange",
    "pasteTransformer",
    "pattern",
    "placeholder",
    "pushPasswordManagerStrategy",
    "ref",
    "render",
    "shiftPWManagers",
    "style",
    "textAlign",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal(local.defaultValue ?? "");
  const [hasPasswordManagerBadge, setHasPasswordManagerBadge] = createSignal(false);
  const [hasPasswordManagerSpace, setHasPasswordManagerSpace] = createSignal(false);
  const currentValue = () => local.value ?? uncontrolledValue();
  let rootRef: HTMLElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  let previousValue = untrack(currentValue);

  onMount(() => {
    let badgeDetectionFinished = false;
    let badgeDetectionTimers: number[] = [];
    let badgeDetectionFinishTimer: number | undefined;

    const clearBadgeDetectionTimers = () => {
      for (const timer of badgeDetectionTimers) window.clearTimeout(timer);
      badgeDetectionTimers = [];
      if (badgeDetectionFinishTimer !== undefined) {
        window.clearTimeout(badgeDetectionFinishTimer);
        badgeDetectionFinishTimer = undefined;
      }
    };
    const updateRootHeight = () => {
      if (rootRef && inputRef) {
        rootRef.style.setProperty("--root-height", `${inputRef.clientHeight}px`);
      }
    };
    const rootHeightObserver = new ResizeObserver(updateRootHeight);
    const updatePasswordManagerSpace = () => {
      const availableSpace = rootRef
        ? window.innerWidth - rootRef.getBoundingClientRect().right
        : 0;
      setHasPasswordManagerSpace(availableSpace >= PASSWORD_MANAGER_BADGE_SPACE);
    };
    const detectPasswordManagerBadge = () => {
      if (
        local.pushPasswordManagerStrategy === "none" ||
        local.shiftPWManagers === false ||
        badgeDetectionFinished ||
        hasPasswordManagerBadge() ||
        !rootRef ||
        !inputRef
      ) {
        return;
      }

      const bounds = rootRef.getBoundingClientRect();
      const badgeX = bounds.left + rootRef.offsetWidth - PASSWORD_MANAGER_BADGE_OFFSET;
      const badgeY = bounds.top + rootRef.offsetHeight / 2;
      const elementAtBadgePosition = document.elementFromPoint?.(badgeX, badgeY);
      const hasKnownBadge = document.querySelector(PASSWORD_MANAGER_BADGE_SELECTORS) !== null;

      if (hasKnownBadge || (elementAtBadgePosition && !rootRef.contains(elementAtBadgePosition))) {
        badgeDetectionFinished = true;
        clearBadgeDetectionTimers();
        setHasPasswordManagerBadge(true);
      }
    };
    const startPasswordManagerBadgeDetection = () => {
      if (
        local.pushPasswordManagerStrategy === "none" ||
        local.shiftPWManagers === false ||
        badgeDetectionFinished ||
        hasPasswordManagerBadge()
      ) {
        return;
      }

      clearBadgeDetectionTimers();
      badgeDetectionTimers = [0, 2000, 5000].map((delay) =>
        window.setTimeout(detectPasswordManagerBadge, delay),
      );
      badgeDetectionFinishTimer = window.setTimeout(() => {
        badgeDetectionFinished = true;
        badgeDetectionFinishTimer = undefined;
      }, 6000);
    };
    const spaceTimer = window.setInterval(updatePasswordManagerSpace, 1000);

    updateRootHeight();
    if (inputRef) rootHeightObserver.observe(inputRef);
    updatePasswordManagerSpace();
    window.addEventListener("resize", updatePasswordManagerSpace);
    rootRef?.addEventListener("focusin", startPasswordManagerBadgeDetection);
    rootRef?.addEventListener("focusout", clearBadgeDetectionTimers);
    if (document.activeElement === inputRef) startPasswordManagerBadgeDetection();
    onCleanup(() => {
      window.removeEventListener("resize", updatePasswordManagerSpace);
      rootRef?.removeEventListener("focusin", startPasswordManagerBadgeDetection);
      rootRef?.removeEventListener("focusout", clearBadgeDetectionTimers);
      clearBadgeDetectionTimers();
      rootHeightObserver.disconnect();
      window.clearInterval(spaceTimer);
    });
  });

  createEffect(
    on(
      currentValue,
      (nextValue) => {
        if (previousValue.length < local.maxLength && nextValue.length === local.maxLength) {
          local.onComplete?.(nextValue);
        }
        previousValue = nextValue;
      },
      { defer: true },
    ),
  );

  const onValueChange = (nextValue: string) => {
    if (local.value === undefined) setUncontrolledValue(nextValue);
    local.onChange?.(nextValue);
    local.onValueChange?.(nextValue);
  };

  const onPaste: JSX.EventHandler<HTMLInputElement, ClipboardEvent> = (event) => {
    if (local.pasteTransformer) {
      const pastedValue = local.pasteTransformer(event.clipboardData?.getData("text/plain") ?? "");
      const selectionStart = event.currentTarget.selectionStart ?? currentValue().length;
      const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
      const nextValue = `${currentValue().slice(0, selectionStart)}${pastedValue}${currentValue().slice(
        selectionEnd,
      )}`;

      event.preventDefault();
      event.currentTarget.value = nextValue;
      event.currentTarget.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: pastedValue,
          inputType: "insertFromPaste",
        }),
      );
      const nextSelectionEnd = event.currentTarget.value.length;
      event.currentTarget.setSelectionRange(
        Math.min(nextSelectionEnd, local.maxLength - 1),
        nextSelectionEnd,
      );
    }

    if (typeof local.onPaste === "function") {
      local.onPaste(event);
    } else {
      local.onPaste?.[0](local.onPaste[1], event);
    }
  };

  const inputStyle = (): string | JSX.CSSProperties => {
    const textAlign = local.textAlign ?? "left";
    if (typeof local.style === "string") {
      return `${local.style}${
        local.style.trimEnd().endsWith(";") ? "" : ";"
      }font-size:var(--root-height);text-align:${textAlign}`;
    }
    return {
      ...local.style,
      "font-size": "var(--root-height)",
      "text-align": textAlign,
    };
  };

  return (
    <OtpField
      class={cn(
        "z-input-otp flex items-center has-disabled:opacity-50",
        local.containerClass,
        local.containerClassName,
      )}
      maxLength={local.maxLength}
      onValueChange={onValueChange}
      ref={(element) => (rootRef = element)}
      shiftPWManagers={
        hasPasswordManagerBadge() &&
        hasPasswordManagerSpace() &&
        (local.pushPasswordManagerStrategy === undefined
          ? (local.shiftPWManagers ?? true)
          : local.pushPasswordManagerStrategy === "increase-width")
      }
      style={{ cursor: local.disabled ? "default" : "text" }}
      value={currentValue()}
    >
      <OtpField.Input
        data-slot="input-otp"
        aria-placeholder={local.placeholder}
        class={cn("z-input-otp-input disabled:cursor-not-allowed", local.class)}
        disabled={local.disabled}
        maxLength={local.maxLength}
        onPaste={onPaste}
        pattern={local.pattern ?? null}
        ref={(element) => {
          inputRef = element;
          if (local.defaultValue !== undefined) element.defaultValue = local.defaultValue;
          if (typeof local.ref === "function") local.ref(element);
        }}
        style={inputStyle()}
        {...inputProps}
      />
      <InputOTPContent placeholder={local.placeholder} render={local.render}>
        {local.children}
      </InputOTPContent>
    </OtpField>
  );
};

type InputOTPContentProps = {
  children?: JSX.Element;
  placeholder?: string;
  render?: (props: InputOTPRenderProps) => JSX.Element;
};

const InputOTPContent = (props: InputOTPContentProps) => {
  const context = OtpField.useContext();
  const renderProps = createMemo<InputOTPRenderProps>(() => {
    const value = context.value();
    const activeSlots = context.activeSlots();
    const slots = Array.from({ length: context.maxLength() }, (_, index) => {
      const char = value[index] ?? null;
      const isActive = activeSlots.includes(index);

      return {
        char,
        hasFakeCaret: isActive && char === null,
        isActive,
        placeholderChar: value[0] === undefined ? (props.placeholder?.[index] ?? null) : null,
      };
    });

    return {
      isFocused: context.isFocused(),
      isHovering: context.isHovered(),
      slots,
    };
  });

  return (
    <Show fallback={props.children} keyed when={props.render ? renderProps() : undefined}>
      {(state) => props.render?.(state)}
    </Show>
  );
};

type InputOTPGroupProps = ComponentProps<"div">;

const InputOTPGroup = (props: InputOTPGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="input-otp-group"
      class={cn("z-input-otp-group flex items-center", local.class)}
      {...others}
    />
  );
};

type InputOTPSlotProps = ComponentProps<"div"> & {
  index: number;
};

const InputOTPSlot = (props: InputOTPSlotProps) => {
  const [local, others] = splitProps(props, ["index", "class"]);
  const context = OtpField.useContext();

  const char = () => context.value()[local.index];
  const isActive = () => context.activeSlots().includes(local.index);
  const showCaret = () => isActive() && char() === undefined;

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive()}
      class={cn(
        "relative z-input-otp-slot flex items-center justify-center data-[active=true]:z-10",
        local.class,
      )}
      {...others}
    >
      {char()}
      <Show when={showCaret()}>
        <div class="pointer-events-none absolute inset-0 z-input-otp-caret flex items-center justify-center">
          <div class="z-input-otp-caret-line" />
        </div>
      </Show>
    </div>
  );
};

type InputOTPSeparatorProps = ComponentProps<"div">;

const InputOTPSeparator = (props: InputOTPSeparatorProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: the pinned separator is structural, not adjustable
    // biome-ignore lint/a11y/useSemanticElements: the pinned div wraps the separator icon
    <div
      data-slot="input-otp-separator"
      class={cn("z-input-otp-separator flex items-center", local.class)}
      role="separator"
      {...others}
    >
      <Minus />
    </div>
  );
};

export {
  InputOTP,
  InputOTPGroup,
  type InputOTPGroupProps,
  type InputOTPProps,
  InputOTPSeparator,
  type InputOTPSeparatorProps,
  InputOTPSlot,
  type InputOTPSlotProps,
};
