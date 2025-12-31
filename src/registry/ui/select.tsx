import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import { Check, ChevronDown, ChevronUp } from "lucide-solid";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const Select = <Option, OptGroup = never, T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectPrimitive.SelectRootProps<Option, OptGroup, T>>,
) => {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
};

type SelectGroupProps<T extends ValidComponent = "div"> = SelectPrimitive.SelectSectionProps<T> & {
  class?: string | undefined;
};

const SelectGroup = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectGroupProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectGroupProps, ["class"]);
  return (
    <SelectPrimitive.Section
      class={cn("cn-select-group", local.class)}
      data-slot="select-group"
      {...others}
    />
  );
};

type SelectValueProps<Option, T extends ValidComponent = "span"> = SelectPrimitive.SelectValueProps<
  Option,
  T
> & {
  class?: string | undefined;
};

const SelectValue = <Option, T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SelectValueProps<Option, T>>,
) => {
  const [local, others] = splitProps(props as SelectValueProps<Option, T>, ["class"]);
  return (
    <SelectPrimitive.Value
      class={cn("cn-select-value", local.class)}
      data-slot="select-value"
      {...others}
    />
  );
};

const SelectHiddenSelect: Component<SelectPrimitive.SelectHiddenSelectProps> = (props) => {
  return <SelectPrimitive.HiddenSelect data-slot="select-hidden-select" {...props} />;
};

type SelectTriggerProps<T extends ValidComponent = "button"> =
  SelectPrimitive.SelectTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
    size?: "sm" | "default";
  };

const SelectTrigger = <T extends ValidComponent = "button">(
  rawProps: PolymorphicProps<T, SelectTriggerProps<T>>,
) => {
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
      <SelectPrimitive.Icon
        as="svg"
        class="cn-select-trigger-icon pointer-events-none size-4 opacity-50"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 9l4 -4l4 4" />
        <path d="M16 15l-4 4l-4 -4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};

type SelectContentProps<T extends ValidComponent = "div"> =
  SelectPrimitive.SelectContentProps<T> & { class?: string | undefined };

const SelectContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectContentProps<T>>,
) => {
  const [local, others] = splitProps(props as SelectContentProps, ["class"]);
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        class={cn(
          "cn-select-content cn-menu-target relative isolate z-50 max-h-(--kb-popper-available-height) min-w-32 origin-(--kb-select-content-transform-origin) overflow-x-hidden overflow-y-auto",
          local.class,
        )}
        data-slot="select-content"
        {...others}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Listbox class="m-0 p-1" />
        <SelectScrollDownButton />
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
        "cn-select-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
  SelectHiddenSelect,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
