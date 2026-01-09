import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import {
  Root,
  Section,
  type SelectContentProps as SelectPrimitiveContentProps,
  type SelectTriggerProps as SelectPrimitiveTriggerProps,
  type SelectValueProps as SelectPrimitiveValueProps,
  type SelectRootProps,
  type SelectSectionProps,
  Value,
} from "@kobalte/core/select";
import { Check, ChevronDown, ChevronUp } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type SelectProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SelectRootProps<T>> &
  Pick<ComponentProps<T>, "class">;

const Select = <T extends ValidComponent = "div">(props: SelectProps<T>) => {
  const mergedProps = mergeProps(
    {
      sameWidth: true,
      gutter: 8,
      placement: "bottom",
      overlap: true,
    } as SelectProps<T>,
    props,
  );
  return <Root {...mergedProps} />;
};

type SelectGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SelectSectionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SelectGroup = <T extends ValidComponent = "div">(props: SelectGroupProps<T>) => {
  const [local, others] = splitProps(props as SelectGroupProps, ["class"]);
  return (
    <Section class={cn("cn-select-group", local.class)} data-slot="select-group" {...others} />
  );
};

type SelectValueProps<Option, T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  SelectPrimitiveValueProps<Option, T>
> &
  Pick<ComponentProps<T>, "class">;

const SelectValue = <Option, T extends ValidComponent = "span">(
  props: SelectValueProps<Option, T>,
) => {
  const [local, others] = splitProps(props as SelectValueProps<Option>, ["class"]);
  return <Value class={cn("cn-select-value", local.class)} data-slot="select-value" {...others} />;
};

type SelectTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SelectPrimitiveTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    size?: "sm" | "default";
  };

const SelectTrigger = <T extends ValidComponent = "button">(rawProps: SelectTriggerProps<T>) => {
  const props = mergeProps({ size: "default" }, rawProps);
  const [local, others] = splitProps(props as SelectTriggerProps, ["class", "children", "size"]);

  return (
    <SelectPrimitive.Trigger
      class={cn(
        "cn-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-size={local.size}
      data-slot="select-trigger"
      {...others}
    >
      {local.children}
      <SelectPrimitive.Icon as={ChevronDown} />
    </SelectPrimitive.Trigger>
  );
};

type SelectContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SelectPrimitiveContentProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {};

const SelectContent = <T extends ValidComponent = "div">(props: SelectContentProps<T>) => {
  const [local, others] = splitProps(props as SelectContentProps, ["class"]);
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        class={cn(
          "cn-select-content relative isolate z-50 max-h-(--kb-popper-available-height) min-w-32 origin-(--kb-select-content-transform-origin) overflow-y-auto overflow-x-hidden",
          local.class,
        )}
        data-slot="select-content"
        {...others}
      >
        <SelectPrimitive.Listbox class="m-0 p-1" />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

type SelectLabelProps<T extends ValidComponent = "span"> = SelectPrimitive.SelectLabelProps<T> & {
  class?: string | undefined;
};

const SelectLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SelectLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectLabelProps, ["class"]);
  return (
    <SelectPrimitive.Label
      class={cn("cn-select-label", local.class)}
      data-slot="select-label"
      {...others}
    />
  );
};

type SelectItemProps<T extends ValidComponent = "li"> = SelectPrimitive.SelectItemProps<T> & {
  class?: string | undefined;
  children?: JSX.Element;
};

const SelectItem = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, SelectItemProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectItemProps, ["class", "children"]);
  return (
    <SelectPrimitive.Item
      class={cn(
        "cn-select-item relative flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="select-item"
      {...others}
    >
      <SelectPrimitive.ItemLabel class="cn-select-item-text shrink-0 whitespace-nowrap">
        {local.children}
      </SelectPrimitive.ItemLabel>
      <SelectPrimitive.ItemIndicator class="cn-select-item-indicator">
        <Check />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
};

type SelectSeparatorProps<T extends ValidComponent = "hr"> = ComponentProps<T> & {
  class?: string | undefined;
};

const SelectSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, SelectSeparatorProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectSeparatorProps, ["class"]);
  return (
    <hr
      class={cn("cn-select-separator pointer-events-none", local.class)}
      data-slot="select-separator"
      {...others}
    />
  );
};

type SelectScrollUpButtonProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

const SelectScrollUpButton = (rawProps: SelectScrollUpButtonProps) => {
  const [local, others] = splitProps(rawProps, ["class"]);
  return (
    <div
      class={cn("cn-select-scroll-up-button top-0 w-full", local.class)}
      data-slot="select-scroll-up-button"
      {...others}
    >
      <ChevronUp />
    </div>
  );
};

type SelectScrollDownButtonProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

const SelectScrollDownButton = (rawProps: SelectScrollDownButtonProps) => {
  const [local, others] = splitProps(rawProps, ["class"]);
  return (
    <div
      class={cn("cn-select-scroll-down-button bottom-0 w-full", local.class)}
      data-slot="select-scroll-down-button"
      {...others}
    >
      <ChevronDown />
    </div>
  );
};

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
