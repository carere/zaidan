import * as ComboboxPrimitive from "@kobalte/core/combobox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronDown } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type ComboboxProps<Option, T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitive.ComboboxRootProps<Option, T>
> &
  Pick<ComponentProps<T>, "class">;

const Combobox = <Option, T extends ValidComponent = "div">(props: ComboboxProps<Option, T>) => {
  const mergedProps = mergeProps(
    {
      sameWidth: true,
      gutter: 6,
      placement: "bottom-start",
    } as ComboboxProps<Option, T>,
    props,
  );
  return <ComboboxPrimitive.Root {...mergedProps} />;
};

type ComboboxControlProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitive.ComboboxControlProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ComboboxControl = <T extends ValidComponent = "div">(props: ComboboxControlProps<T>) => {
  const [local, others] = splitProps(props as ComboboxControlProps, ["class"]);
  return (
    <ComboboxPrimitive.Control
      class={cn("cn-combobox-control", local.class)}
      data-slot="combobox-control"
      {...others}
    />
  );
};

type ComboboxInputProps<T extends ValidComponent = "input"> = PolymorphicProps<
  T,
  ComboboxPrimitive.ComboboxInputProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ComboboxInput = <T extends ValidComponent = "input">(props: ComboboxInputProps<T>) => {
  const [local, others] = splitProps(props as ComboboxInputProps, ["class"]);
  return (
    <ComboboxPrimitive.Input
      class={cn(
        "cn-combobox-input w-full min-w-0 outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      data-slot="combobox-input"
      {...others}
    />
  );
};

type ComboboxTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ComboboxPrimitive.ComboboxTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const ComboboxTrigger = <T extends ValidComponent = "button">(props: ComboboxTriggerProps<T>) => {
  const [local, others] = splitProps(props as ComboboxTriggerProps, ["class", "children"]);
  return (
    <ComboboxPrimitive.Trigger
      class={cn("cn-combobox-trigger", local.class)}
      data-slot="combobox-trigger"
      {...others}
    >
      <Show
        when={local.children}
        fallback={
          <ComboboxPrimitive.Icon
            as={ChevronDown}
            class="cn-combobox-trigger-icon pointer-events-none"
          />
        }
      >
        {local.children}
      </Show>
    </ComboboxPrimitive.Trigger>
  );
};

type ComboboxContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitive.ComboboxContentProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ComboboxContent = <T extends ValidComponent = "div">(props: ComboboxContentProps<T>) => {
  const [local, others] = splitProps(props as ComboboxContentProps, ["class"]);
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Content
        class={cn(
          "cn-combobox-content relative isolate z-50 max-h-(--kb-popper-available-height) min-w-32 origin-(--kb-combobox-content-transform-origin) overflow-y-auto overflow-x-hidden",
          local.class,
        )}
        data-slot="combobox-content"
        {...others}
      >
        <ComboboxPrimitive.Listbox class="cn-combobox-list m-0 p-1" data-slot="combobox-list" />
      </ComboboxPrimitive.Content>
    </ComboboxPrimitive.Portal>
  );
};

type ComboboxItemProps<T extends ValidComponent = "li"> = ComboboxPrimitive.ComboboxItemProps<T> & {
  class?: string | undefined;
  children?: JSX.Element;
};

const ComboboxItem = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, ComboboxItemProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxItemProps, ["class", "children"]);
  return (
    <ComboboxPrimitive.Item
      class={cn(
        "cn-combobox-item relative flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="combobox-item"
      {...others}
    >
      <ComboboxPrimitive.ItemLabel class="cn-combobox-item-label shrink-0 whitespace-nowrap">
        {local.children}
      </ComboboxPrimitive.ItemLabel>
      <ComboboxPrimitive.ItemIndicator class="cn-combobox-item-indicator">
        <Check />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
};

type ComboboxSectionProps<T extends ValidComponent = "li"> =
  ComboboxPrimitive.ComboboxSectionProps<T> & {
    class?: string | undefined;
  };

const ComboboxSection = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, ComboboxSectionProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxSectionProps, ["class"]);
  return (
    <ComboboxPrimitive.Section
      class={cn("cn-combobox-section", local.class)}
      data-slot="combobox-section"
      {...others}
    />
  );
};

type ComboboxLabelProps<T extends ValidComponent = "span"> =
  ComboboxPrimitive.ComboboxLabelProps<T> & {
    class?: string | undefined;
  };

const ComboboxLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, ComboboxLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxLabelProps, ["class"]);
  return (
    <ComboboxPrimitive.Label
      class={cn("cn-combobox-label", local.class)}
      data-slot="combobox-label"
      {...others}
    />
  );
};

type ComboboxDescriptionProps<T extends ValidComponent = "div"> =
  ComboboxPrimitive.ComboboxDescriptionProps<T> & {
    class?: string | undefined;
  };

const ComboboxDescription = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ComboboxDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxDescriptionProps, ["class"]);
  return (
    <ComboboxPrimitive.Description
      class={cn("cn-combobox-description", local.class)}
      data-slot="combobox-description"
      {...others}
    />
  );
};

type ComboboxErrorMessageProps<T extends ValidComponent = "div"> =
  ComboboxPrimitive.ComboboxErrorMessageProps<T> & {
    class?: string | undefined;
  };

const ComboboxErrorMessage = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ComboboxErrorMessageProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxErrorMessageProps, ["class"]);
  return (
    <ComboboxPrimitive.ErrorMessage
      class={cn("cn-combobox-error-message", local.class)}
      data-slot="combobox-error-message"
      {...others}
    />
  );
};

type ComboboxHiddenSelectProps = ComponentProps<"select"> & {
  class?: string | undefined;
};

const ComboboxHiddenSelect = (props: ComboboxHiddenSelectProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ComboboxPrimitive.HiddenSelect
      class={cn("cn-combobox-hidden-select", local.class)}
      data-slot="combobox-hidden-select"
      {...others}
    />
  );
};

export {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxDescription,
  ComboboxErrorMessage,
  ComboboxHiddenSelect,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxSection,
  ComboboxTrigger,
};
