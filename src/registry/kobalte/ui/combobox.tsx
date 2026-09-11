import type {
  ComboboxContentProps as ComboboxPrimitiveContentProps,
  ComboboxControlProps as ComboboxPrimitiveControlProps,
  ComboboxInputProps as ComboboxPrimitiveInputProps,
  ComboboxItemProps as ComboboxPrimitiveItemProps,
  ComboboxSectionProps as ComboboxPrimitiveSectionProps,
  ComboboxTriggerProps as ComboboxPrimitiveTriggerProps,
  ComboboxRootProps,
} from "@kobalte/core/combobox";
import * as ComboboxPrimitive from "@kobalte/core/combobox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, ChevronsUpDown, X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { createContext, For, mergeProps, Show, splitProps, useContext } from "solid-js";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";

// ============================================================================
// Combobox Root
// ============================================================================

const ComboboxLabelContext = createContext<(option: unknown) => string>(String);

type ComboboxProps<O, OptGroup = never, T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxRootProps<O, OptGroup, T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const Combobox = <O, OptGroup = never, T extends ValidComponent = "div">(
  props: ComboboxProps<O, OptGroup, T>,
) => {
  const mergedProps = mergeProps(
    {
      sameWidth: true,
      gutter: 8,
      placement: "bottom",
      defaultFilter: "contains",
      triggerMode: "input",
    } as ComboboxProps<O>,
    props,
  );
  const getOptionLabel = (option: unknown) => {
    const accessor = props.optionTextValue ?? props.optionLabel;
    return String(
      typeof accessor === "function"
        ? accessor(option as Exclude<O, null>)
        : accessor == null
          ? option
          : (option as Exclude<O, null>)[accessor],
    );
  };
  return (
    <ComboboxLabelContext.Provider value={getOptionLabel}>
      <ComboboxPrimitive.Root {...mergedProps} />
    </ComboboxLabelContext.Provider>
  );
};

// ============================================================================
// Combobox Control
// ============================================================================

type ComboboxControlProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitiveControlProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const ComboboxControl = <T extends ValidComponent = "div">(props: ComboboxControlProps<T>) => {
  const [local, others] = splitProps(props as ComboboxControlProps, ["class"]);
  return (
    <ComboboxPrimitive.Control
      class={cn("z-combobox-control", local.class)}
      data-slot="combobox-control"
      {...others}
    />
  );
};

// ============================================================================
// Combobox Input
// ============================================================================

type ComboboxInputProps<T extends ValidComponent = "input"> = PolymorphicProps<
  T,
  ComboboxPrimitiveInputProps<T>
> &
  Pick<ComponentProps<"input">, "class" | "placeholder" | "disabled" | "id" | "name"> & {
    showTrigger?: boolean;
    showClear?: boolean;
    children?: JSX.Element;
  };

const ComboboxInput = <T extends ValidComponent = "input">(rawProps: ComboboxInputProps<T>) => {
  const context = ComboboxPrimitive.useComboboxContext();
  const getOptionLabel = useContext(ComboboxLabelContext);
  const isDisabled = () => context.isDisabled() || local.disabled;
  const props = mergeProps({ showTrigger: true, showClear: false }, rawProps);
  const [local, others] = splitProps(props as ComboboxInputProps, [
    "class",
    "showTrigger",
    "showClear",
    "children",
    "disabled",
  ]);

  return (
    <ComboboxPrimitive.Control
      as={InputGroup}
      class={cn(
        "z-combobox-input w-auto",
        context.isMultiple() && "h-auto! min-h-9 flex-wrap gap-1 p-1",
        local.class,
      )}
      data-slot="combobox-control"
    >
      {(state) => (
        <>
          {local.children}
          <Show when={context.isMultiple()}>
            <For each={state.selectedOptions()}>
              {(option) => (
                <span
                  data-slot="combobox-chip"
                  class="inline-flex max-w-full items-center gap-1 rounded-sm bg-secondary py-0.5 pl-2 pr-0.5 text-sm text-secondary-foreground"
                >
                  <span class="truncate">{getOptionLabel(option)}</span>
                  <InputGroupButton
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${getOptionLabel(option)}`}
                    disabled={isDisabled()}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (isDisabled()) return;
                      state.remove(option);
                      context.inputRef()?.focus();
                    }}
                  >
                    <X class="pointer-events-none size-3" aria-hidden="true" />
                  </InputGroupButton>
                </span>
              )}
            </For>
          </Show>
          <ComboboxPrimitive.Input
            as={InputGroupInput}
            disabled={isDisabled()}
            class={context.isMultiple() ? "min-w-24 flex-1 basis-24" : undefined}
            data-slot="combobox-input"
            {...others}
          />
          <InputGroupAddon align="inline-end">
            <Show when={local.showTrigger}>
              <ComboboxPrimitive.Trigger
                as={InputGroupButton}
                size="icon-xs"
                variant="ghost"
                data-slot="combobox-trigger"
                class="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
                disabled={isDisabled()}
              >
                <ComboboxPrimitive.Icon
                  as={ChevronsUpDown}
                  class="pointer-events-none z-combobox-trigger-icon"
                />
              </ComboboxPrimitive.Trigger>
            </Show>
            <Show when={local.showClear && state.selectedOptions().length > 0}>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                data-slot="combobox-clear"
                class="z-combobox-clear"
                disabled={isDisabled()}
                aria-label="Clear selection"
                onClick={() => {
                  if (!isDisabled()) state.clear();
                }}
              >
                <X class="pointer-events-none z-combobox-clear-icon" />
              </InputGroupButton>
            </Show>
          </InputGroupAddon>
        </>
      )}
    </ComboboxPrimitive.Control>
  );
};

// ============================================================================
// Combobox Trigger (for popup-style combobox)
// ============================================================================

type ComboboxTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ComboboxPrimitiveTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    size?: "sm" | "default";
  };

const ComboboxTrigger = <T extends ValidComponent = "button">(
  rawProps: ComboboxTriggerProps<T>,
) => {
  const props = mergeProps({ size: "default" }, rawProps);
  const [local, others] = splitProps(props as ComboboxTriggerProps, ["class", "children", "size"]);

  return (
    <ComboboxPrimitive.Control>
      <ComboboxPrimitive.Trigger
        class={cn(
          "z-combobox-trigger z-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=combobox-value]:line-clamp-1 *:data-[slot=combobox-value]:flex *:data-[slot=combobox-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
          local.class,
        )}
        data-size={local.size}
        data-slot="combobox-trigger"
        {...others}
      >
        {local.children}
        <ComboboxPrimitive.Icon
          as={ChevronsUpDown}
          class="pointer-events-none z-combobox-trigger-icon"
        />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.Control>
  );
};

// ============================================================================
// Combobox Content
// ============================================================================

type ComboboxContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitiveContentProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ComboboxContent = <T extends ValidComponent = "div">(props: ComboboxContentProps<T>) => {
  const [local, others] = splitProps(props as ComboboxContentProps, ["class"]);
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Content
        class={cn(
          "relative isolate z-50 z-combobox-content z-menu-target max-h-(--kb-popper-available-height) min-w-32 origin-(--kb-combobox-content-transform-origin) overflow-y-auto overflow-x-hidden",
          local.class,
        )}
        data-slot="combobox-content"
        {...others}
      >
        <ComboboxPrimitive.Listbox class="z-combobox-listbox m-0 p-1" />
      </ComboboxPrimitive.Content>
    </ComboboxPrimitive.Portal>
  );
};

// ============================================================================
// Combobox Section (Group)
// ============================================================================

type ComboboxSectionProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  ComboboxPrimitiveSectionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ComboboxSection = <T extends ValidComponent = "li">(props: ComboboxSectionProps<T>) => {
  const [local, others] = splitProps(props as ComboboxSectionProps, ["class"]);
  return (
    <ComboboxPrimitive.Section
      class={cn("z-combobox-section", local.class)}
      data-slot="combobox-section"
      {...others}
    />
  );
};

// ============================================================================
// Combobox Section Label
// ============================================================================

type ComboboxSectionLabelProps = ComponentProps<"span"> & {
  class?: string;
};

const ComboboxSectionLabel = (props: ComboboxSectionLabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("z-combobox-section-label z-select-label", local.class)}
      data-slot="combobox-section-label"
      {...others}
    />
  );
};

// ============================================================================
// Combobox Item
// ============================================================================

type ComboboxItemProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  ComboboxPrimitiveItemProps<T>
> &
  Pick<ComponentProps<T>, "class"> & {
    children?: JSX.Element;
  };

const ComboboxItem = <T extends ValidComponent = "li">(props: ComboboxItemProps<T>) => {
  const [local, others] = splitProps(props as ComboboxItemProps, ["class", "children"]);
  return (
    <ComboboxPrimitive.Item
      class={cn(
        "relative z-combobox-item z-select-item flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="combobox-item"
      {...others}
    >
      <ComboboxPrimitive.ItemLabel class="z-combobox-item-label z-select-item-text shrink-0 whitespace-nowrap">
        {local.children}
      </ComboboxPrimitive.ItemLabel>
      <ComboboxPrimitive.ItemIndicator
        as="span"
        class="z-combobox-item-indicator z-select-item-indicator"
      >
        <Check class="pointer-events-none z-combobox-item-indicator-icon z-select-item-indicator-icon" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
};

// ============================================================================
// Combobox Empty
// ============================================================================

type ComboboxEmptyProps = ComponentProps<"div"> & {
  class?: string;
};

const ComboboxEmpty = (props: ComboboxEmptyProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("z-combobox-empty py-6 text-center text-sm", local.class)}
      data-slot="combobox-empty"
      {...others}
    />
  );
};

// ============================================================================
// Combobox Separator
// ============================================================================

type ComboboxSeparatorProps<T extends ValidComponent = "hr"> = ComponentProps<T> & {
  class?: string;
};

const ComboboxSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, ComboboxSeparatorProps<T>>,
) => {
  const [local, others] = splitProps(props as ComboboxSeparatorProps, ["class"]);
  return (
    <hr
      class={cn("pointer-events-none z-combobox-separator z-select-separator", local.class)}
      data-slot="combobox-separator"
      {...others}
    />
  );
};

export {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxSection,
  ComboboxSectionLabel,
  ComboboxSeparator,
  ComboboxTrigger,
};
