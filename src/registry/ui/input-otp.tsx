import type { RootProps as OtpFieldRootProps } from "@corvu/otp-field";
import OtpField from "@corvu/otp-field";
import { Minus } from "lucide-solid";
import { type ComponentProps, Show, splitProps, type ValidComponent } from "solid-js";

import { cn } from "@/lib/utils";

type InputOTPProps<T extends ValidComponent = "div"> = OtpFieldRootProps<T> & {
  class?: string;
  containerClass?: string;
};

const InputOTP = <T extends ValidComponent = "div">(props: InputOTPProps<T>) => {
  const [local, others] = splitProps(props as InputOTPProps, ["class", "containerClass"]);

  return (
    <OtpField
      data-slot="input-otp"
      class={cn("cn-input-otp flex items-center has-disabled:opacity-50", local.containerClass)}
      {...others}
    >
      <OtpField.Input
        data-slot="input-otp-input"
        class={cn("cn-input-otp-input disabled:cursor-not-allowed", local.class)}
        spellcheck={false}
      />
      {others.children}
    </OtpField>
  );
};

type InputOTPGroupProps = ComponentProps<"div">;

const InputOTPGroup = (props: InputOTPGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="input-otp-group"
      class={cn("cn-input-otp-group flex items-center", local.class)}
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
  const showCaret = () => isActive() && context.isInserting();

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive()}
      class={cn(
        "cn-input-otp-slot relative flex items-center justify-center data-[active=true]:z-10",
        local.class,
      )}
      {...others}
    >
      {char()}
      <Show when={showCaret()}>
        <div class="cn-input-otp-caret pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="cn-input-otp-caret-line h-4 w-px animate-caret-blink bg-foreground" />
        </div>
      </Show>
    </div>
  );
};

type InputOTPSeparatorProps = ComponentProps<"div">;

const InputOTPSeparator = (props: InputOTPSeparatorProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="input-otp-separator"
      class={cn("cn-input-otp-separator flex items-center", local.class)}
      aria-hidden="true"
      {...others}
    >
      <Minus />
    </div>
  );
};

export {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
  type InputOTPProps,
  type InputOTPGroupProps,
  type InputOTPSlotProps,
  type InputOTPSeparatorProps,
};
