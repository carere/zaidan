import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SwitchPrimitive from "@kobalte/core/switch";
import { type ComponentProps, mergeProps, splitProps, type ValidComponent } from "solid-js";

import { cn } from "@/lib/utils";

type SwitchProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SwitchPrimitive.SwitchRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    size?: "sm" | "default";
  };

const Switch = <T extends ValidComponent = "div">(props: SwitchProps<T>) => {
  const mergedProps = mergeProps({ size: "default" as const }, props);
  const [local, others] = splitProps(mergedProps as SwitchProps, ["class", "size"]);
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={local.size}
      class={cn(
        "cn-switch peer group/switch relative inline-flex items-center outline-none transition-all data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SwitchPrimitive.Input data-slot="switch-input" class="peer sr-only" />
      <SwitchPrimitive.Control
        data-slot="switch-control"
        class="cn-switch-control relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors data-[disabled]:cursor-not-allowed"
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          class="cn-switch-thumb pointer-events-none block rounded-full ring-0 transition-transform"
        />
      </SwitchPrimitive.Control>
    </SwitchPrimitive.Root>
  );
};

export { Switch };
