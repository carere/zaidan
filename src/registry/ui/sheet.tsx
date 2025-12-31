import * as SheetPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const Sheet: Component<SheetPrimitive.DialogRootProps> = (props) => {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

const SheetTrigger = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SheetPrimitive.DialogTriggerProps<T>>,
) => {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

const SheetClose = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SheetPrimitive.DialogCloseButtonProps<T>>,
) => {
  return <SheetPrimitive.CloseButton data-slot="sheet-close" {...props} />;
};

const SheetPortal: Component<SheetPrimitive.DialogPortalProps> = (props) => {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
};

type SheetOverlayProps<T extends ValidComponent = "div"> = SheetPrimitive.DialogOverlayProps<T> & {
  class?: string | undefined;
};

const SheetOverlay = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SheetOverlayProps<T>>,
) => {
  const [local, others] = splitProps(props as SheetOverlayProps, ["class"]);
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      class={cn("cn-sheet-overlay fixed inset-0 z-50", local.class)}
      {...others}
    />
  );
};

type SheetContentProps<T extends ValidComponent = "div"> = SheetPrimitive.DialogContentProps<T> & {
  class?: string | undefined;
  children?: JSX.Element;
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};

const SheetContent = <T extends ValidComponent = "div">(
  rawProps: PolymorphicProps<T, SheetContentProps<T>>,
) => {
  const props = mergeProps({ side: "right" as const, showCloseButton: true }, rawProps);
  const [local, others] = splitProps(props as SheetContentProps, [
    "class",
    "children",
    "side",
    "showCloseButton",
  ]);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={local.side}
        class={cn("cn-sheet-content", local.class)}
        {...others}
      >
        {local.children}
        <Show when={local.showCloseButton}>
          <SheetPrimitive.CloseButton data-slot="sheet-close" class="cn-sheet-close">
            <X />
            <span class="sr-only">Close</span>
          </SheetPrimitive.CloseButton>
        </Show>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
};

type SheetHeaderProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

const SheetHeader: Component<SheetHeaderProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-header"
      class={cn("cn-sheet-header flex flex-col", local.class)}
      {...others}
    />
  );
};

type SheetFooterProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

const SheetFooter: Component<SheetFooterProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-footer"
      class={cn("cn-sheet-footer mt-auto flex flex-col", local.class)}
      {...others}
    />
  );
};

type SheetTitleProps<T extends ValidComponent = "h2"> = SheetPrimitive.DialogTitleProps<T> & {
  class?: string | undefined;
};

const SheetTitle = <T extends ValidComponent = "h2">(
  props: PolymorphicProps<T, SheetTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as SheetTitleProps, ["class"]);
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      class={cn("cn-sheet-title", local.class)}
      {...others}
    />
  );
};

type SheetDescriptionProps<T extends ValidComponent = "p"> =
  SheetPrimitive.DialogDescriptionProps<T> & { class?: string | undefined };

const SheetDescription = <T extends ValidComponent = "p">(
  props: PolymorphicProps<T, SheetDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as SheetDescriptionProps, ["class"]);
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      class={cn("cn-sheet-description", local.class)}
      {...others}
    />
  );
};

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
