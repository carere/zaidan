import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as RadioGroupPrimitive from "@kobalte/core/radio-group";
import { Circle } from "lucide-solid";
import { type ComponentProps, splitProps, type ValidComponent } from "solid-js";

import { cn } from "@/lib/utils";

type RadioGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  RadioGroupPrimitive.RadioGroupRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const RadioGroup = <T extends ValidComponent = "div">(props: RadioGroupProps<T>) => {
  const [local, others] = splitProps(props as RadioGroupProps, ["class"]);
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      class={cn("cn-radio-group w-full", local.class)}
      {...others}
    />
  );
};

type RadioGroupItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  RadioGroupPrimitive.RadioGroupItemProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const RadioGroupItem = <T extends ValidComponent = "div">(props: RadioGroupItemProps<T>) => {
  const [local, others] = splitProps(props as RadioGroupItemProps, ["class"]);
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      class={cn(
        "cn-radio-group-item group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        local.class,
      )}
      {...others}
    >
      <RadioGroupPrimitive.ItemInput data-slot="radio-group-item-input" class="peer sr-only" />
      <RadioGroupPrimitive.ItemControl data-slot="radio-group-item-control" class="sr-only" />
      <RadioGroupPrimitive.ItemIndicator
        data-slot="radio-group-indicator"
        class="cn-radio-group-indicator"
      >
        <Circle class="cn-radio-group-indicator-icon" />
      </RadioGroupPrimitive.ItemIndicator>
    </RadioGroupPrimitive.Item>
  );
};

export { RadioGroup, RadioGroupItem };
