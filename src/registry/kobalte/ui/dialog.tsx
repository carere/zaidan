import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";

const Dialog: Component<DialogPrimitive.DialogRootProps> = (props) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

type DialogTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogTriggerProps<T>
>;

const DialogTrigger = <T extends ValidComponent = "button">(props: DialogTriggerProps<T>) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

const DialogPortal = (props: DialogPrimitive.DialogPortalProps) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

type DialogCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogCloseButtonProps<T>
>;

const DialogClose = <T extends ValidComponent = "button">(props: DialogCloseProps<T>) => {
  return <DialogPrimitive.CloseButton data-slot="dialog-close" {...props} />;
};

type DialogOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogOverlayProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogOverlay = <T extends ValidComponent = "div">(props: DialogOverlayProps<T>) => {
  const [local, others] = splitProps(props as DialogOverlayProps, ["class"]);
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      class={cn("cn-dialog-overlay fixed inset-0 isolate z-50", local.class)}
      {...others}
    />
  );
};

type DialogContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
  };

const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const mergedProps = mergeProps({ showCloseButton: true } as DialogContentProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "children", "showCloseButton"]);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        class={cn(
          "cn-dialog-content fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
          local.class,
        )}
        {...others}
      >
        {local.children}
        <Show when={local.showCloseButton}>
          <DialogPrimitive.CloseButton
            as={Button}
            variant="ghost"
            size="icon-sm"
            data-slot="dialog-close"
            class="cn-dialog-close"
          >
            <X />
            <span class="sr-only">Close</span>
          </DialogPrimitive.CloseButton>
        </Show>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

type DialogHeaderProps = ComponentProps<"div">;

const DialogHeader = (props: DialogHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="dialog-header"
      class={cn("cn-dialog-header flex flex-col", local.class)}
      {...others}
    />
  );
};

type DialogFooterProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComponentProps<"div">
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
  };

const DialogFooter = <T extends ValidComponent = "div">(props: DialogFooterProps<T>) => {
  const mergedProps = mergeProps({ showCloseButton: false } as DialogFooterProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "children", "showCloseButton"]);
  return (
    <div
      data-slot="dialog-footer"
      class={cn(
        "cn-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <Show when={local.showCloseButton}>
        <DialogPrimitive.CloseButton as={Button} variant="outline">
          Close
        </DialogPrimitive.CloseButton>
      </Show>
    </div>
  );
};

type DialogTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogTitleProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogTitle = <T extends ValidComponent = "h2">(props: DialogTitleProps<T>) => {
  const [local, others] = splitProps(props as DialogTitleProps, ["class"]);
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      class={cn("cn-dialog-title", local.class)}
      {...others}
    />
  );
};

type DialogDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogDescription = <T extends ValidComponent = "p">(props: DialogDescriptionProps<T>) => {
  const [local, others] = splitProps(props as DialogDescriptionProps, ["class"]);
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      class={cn("cn-dialog-description", local.class)}
      {...others}
    />
  );
};

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
