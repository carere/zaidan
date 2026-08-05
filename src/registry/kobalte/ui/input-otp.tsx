/** biome-ignore-all lint/a11y/useAriaPropsForRole: structural separators do not require aria-valuenow */

import OtpField, {
  type DynamicProps,
  type InputProps as OtpFieldInputProps,
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
const DEFAULT_NOSCRIPT_CSS_FALLBACK = `
[data-corvu-otp-field-input] {
  --nojs-bg: white !important;
  --nojs-fg: black !important;
  background-color: var(--nojs-bg) !important;
  color: var(--nojs-fg) !important;
  caret-color: var(--nojs-fg) !important;
  letter-spacing: .25em !important;
  text-align: center !important;
  border: 1px solid var(--nojs-fg) !important;
  border-radius: 4px !important;
  width: 100% !important;
}
@media (prefers-color-scheme: dark) {
  [data-corvu-otp-field-input] {
    --nojs-bg: black !important;
    --nojs-fg: white !important;
  }
}
`;

type InputOTPBaseProps = Omit<
  DynamicProps<"input", OtpFieldInputProps>,
  "as" | "children" | "contextId" | "defaultValue" | "maxLength" | "onChange" | "value"
> & {
  containerClass?: string;
  defaultValue?: string;
  maxLength: number;
  onChange?: (value: string) => unknown;
  onComplete?: (value: string) => unknown;
  pasteTransformer?: (pasted: string) => string;
  pushPasswordManagerStrategy?: "increase-width" | "none";
  textAlign?: "center" | "left" | "right";
  value?: string;
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
    "children",
    "defaultValue",
    "disabled",
    "maxLength",
    "noScriptCSSFallback",
    "onChange",
    "onComplete",
    "onPaste",
    "value",
    "pasteTransformer",
    "pattern",
    "placeholder",
    "pushPasswordManagerStrategy",
    "ref",
    "render",
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
    const shouldSkipPasswordManagerDetection = () =>
      local.pushPasswordManagerStrategy === "none" ||
      badgeDetectionFinished ||
      hasPasswordManagerBadge();
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
      if (shouldSkipPasswordManagerDetection() || !rootRef || !inputRef) {
        return;
      }

      const bounds = rootRef.getBoundingClientRect();
      const badgeX = bounds.left + rootRef.offsetWidth - PASSWORD_MANAGER_BADGE_OFFSET;
      const badgeY = bounds.top + rootRef.offsetHeight / 2;
      const elementAtBadgePosition = document.elementFromPoint?.(badgeX, badgeY);
      const hasKnownBadge = document.querySelector(PASSWORD_MANAGER_BADGE_SELECTORS) !== null;

      if (hasKnownBadge || elementAtBadgePosition !== rootRef) {
        badgeDetectionFinished = true;
        clearBadgeDetectionTimers();
        setHasPasswordManagerBadge(true);
      }
    };
    const startPasswordManagerBadgeDetection = () => {
      if (shouldSkipPasswordManagerDetection()) {
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
    createEffect(() => {
      if (local.pushPasswordManagerStrategy === "none" || document.activeElement !== inputRef) {
        clearBadgeDetectionTimers();
        return;
      }

      startPasswordManagerBadgeDetection();
    });
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

  const handleValueChange = (nextValue: string) => {
    if (local.value === undefined) setUncontrolledValue(nextValue);
    local.onChange?.(nextValue);
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
      }font-size:var(--root-height);letter-spacing:-.5em;text-align:${textAlign}`;
    }
    return {
      ...local.style,
      "font-size": "var(--root-height)",
      "letter-spacing": "-.5em",
      "text-align": textAlign,
    };
  };

  return (
    <OtpField
      class={cn("z-input-otp flex items-center has-disabled:opacity-50", local.containerClass)}
      maxLength={local.maxLength}
      onValueChange={handleValueChange}
      ref={(element) => (rootRef = element)}
      shiftPWManagers={
        hasPasswordManagerBadge() &&
        hasPasswordManagerSpace() &&
        local.pushPasswordManagerStrategy !== "none"
      }
      style={{ cursor: local.disabled ? "default" : "text" }}
      value={currentValue()}
    >
      <InputOTPContent
        disabled={local.disabled}
        placeholder={local.placeholder}
        render={local.render}
      >
        {local.children}
      </InputOTPContent>
      <OtpField.Input
        data-slot="input-otp"
        aria-placeholder={local.placeholder}
        class={cn("z-input-otp-input disabled:cursor-not-allowed", local.class)}
        disabled={local.disabled}
        maxLength={local.maxLength}
        noScriptCSSFallback={
          local.noScriptCSSFallback === undefined
            ? DEFAULT_NOSCRIPT_CSS_FALLBACK
            : local.noScriptCSSFallback
        }
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
    </OtpField>
  );
};

type InputOTPContentProps = {
  children?: JSX.Element;
  disabled?: boolean;
  placeholder?: string;
  render?: (props: InputOTPRenderProps) => JSX.Element;
};

const InputOTPContent = (props: InputOTPContentProps) => {
  const [local] = splitProps(props, ["children", "disabled", "placeholder", "render"]);
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
        placeholderChar: value[0] === undefined ? (local.placeholder?.[index] ?? null) : null,
      };
    });

    return {
      isFocused: context.isFocused(),
      isHovering: !local.disabled && context.isHovered(),
      slots,
    };
  });

  return (
    <Show fallback={local.children} keyed when={local.render ? renderProps() : undefined}>
      {(state) => local.render?.(state)}
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
