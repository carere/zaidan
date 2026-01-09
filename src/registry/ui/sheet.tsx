import * as SheetPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const Sheet: Component<SheetPrimitive.DialogRootProps> = (props) => {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

type SheetTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogTriggerProps<T>
>;

const SheetTrigger = <T extends ValidComponent = "button">(props: SheetTriggerProps<T>) => {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

type SheetCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogCloseButtonProps<T>
>;

const SheetClose = <T extends ValidComponent = "button">(props: SheetCloseProps<T>) => {
  return <SheetPrimitive.CloseButton data-slot="sheet-close" {...props} />;
};

const SheetPortal = (props: SheetPrimitive.DialogPortalProps) => {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
};

type SheetOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogOverlayProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetOverlay = <T extends ValidComponent = "div">(props: SheetOverlayProps<T>) => {
  const [local, others] = splitProps(props as SheetOverlayProps, ["class"]);
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      class={cn("cn-sheet-overlay fixed inset-0 z-50", local.class)}
      {...others}
    />
  );
};

type SheetContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    side?: "top" | "right" | "bottom" | "left";
    showCloseButton?: boolean;
  };

const SheetContent = <T extends ValidComponent = "div">(props: SheetContentProps<T>) => {
  const mergedProps = mergeProps(
    { side: "right", showCloseButton: true } as SheetContentProps,
    props,
  );
  const [local, others] = splitProps(mergedProps, ["class", "children", "side", "showCloseButton"]);
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
          <SheetPrimitive.CloseButton
            as={Button}
            variant="ghost"
            size="icon-sm"
            data-slot="sheet-close"
            class="cn-sheet-close"
          >
            <X />
            <span class="sr-only">Close</span>
          </SheetPrimitive.CloseButton>
        </Show>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
};

type SheetHeaderProps = ComponentProps<"div">;

const SheetHeader = (props: SheetHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-header"
      class={cn("cn-sheet-header flex flex-col", local.class)}
      {...others}
    />
  );
};

type SheetFooterProps = ComponentProps<"div">;

const SheetFooter = (props: SheetFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-footer"
      class={cn("cn-sheet-footer mt-auto flex flex-col", local.class)}
      {...others}
    />
  );
};

type SheetTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogTitleProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetTitle = <T extends ValidComponent = "h2">(props: SheetTitleProps<T>) => {
  const [local, others] = splitProps(props as SheetTitleProps, ["class"]);
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      class={cn("cn-sheet-title", local.class)}
      {...others}
    />
  );
};

type SheetDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetDescription = <T extends ValidComponent = "p">(props: SheetDescriptionProps<T>) => {
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
