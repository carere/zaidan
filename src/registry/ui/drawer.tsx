import type { DynamicProps, RootChildrenProps } from "corvu/drawer";
import Drawer from "corvu/drawer";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const DrawerRoot: Component<Drawer.RootProps> = (props) => {
  return <Drawer data-slot="drawer" {...props} />;
};

type DrawerTriggerProps<T extends ValidComponent = "button"> = DynamicProps<T, Drawer.TriggerProps>;

const DrawerTrigger = <T extends ValidComponent = "button">(props: DrawerTriggerProps<T>) => {
  return <Drawer.Trigger data-slot="drawer-trigger" {...props} />;
};

type DrawerCloseProps<T extends ValidComponent = "button"> = DynamicProps<T, Drawer.CloseProps>;

const DrawerClose = <T extends ValidComponent = "button">(props: DrawerCloseProps<T>) => {
  return <Drawer.Close data-slot="drawer-close" {...props} />;
};

const DrawerPortal: Component<Drawer.PortalProps> = (props) => {
  return <Drawer.Portal data-slot="drawer-portal" {...props} />;
};

type DrawerOverlayProps<T extends ValidComponent = "div"> = DynamicProps<T, Drawer.OverlayProps> &
  Pick<ComponentProps<T>, "class">;

const DrawerOverlay = <T extends ValidComponent = "div">(props: DrawerOverlayProps<T>) => {
  const [local, others] = splitProps(props as DrawerOverlayProps, ["class"]);
  return (
    <Drawer.Overlay
      data-slot="drawer-overlay"
      class={cn("cn-drawer-overlay fixed inset-0 z-50", local.class)}
      {...others}
    />
  );
};

type DrawerContentProps<T extends ValidComponent = "div"> = DynamicProps<T, Drawer.ContentProps> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showHandle?: boolean;
  };

const DrawerContent = <T extends ValidComponent = "div">(props: DrawerContentProps<T>) => {
  const [local, others] = splitProps(props as DrawerContentProps, [
    "class",
    "children",
    "showHandle",
  ]);
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <Drawer.Content
        data-slot="drawer-content"
        class={cn("cn-drawer-content group/drawer-content fixed z-50", local.class)}
        {...others}
      >
        <Show when={local.showHandle !== false}>
          {(_) => (
            <Drawer.Context>
              {(context: RootChildrenProps) => (
                <Show when={context.side === "bottom" || context.side === "top"}>
                  <div
                    data-slot="drawer-handle"
                    class="cn-drawer-handle mx-auto shrink-0 bg-muted"
                  />
                </Show>
              )}
            </Drawer.Context>
          )}
        </Show>
        {local.children}
      </Drawer.Content>
    </DrawerPortal>
  );
};

type DrawerHeaderProps = ComponentProps<"div">;

const DrawerHeader = (props: DrawerHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="drawer-header"
      class={cn("cn-drawer-header flex flex-col", local.class)}
      {...others}
    />
  );
};

type DrawerFooterProps = ComponentProps<"div">;

const DrawerFooter = (props: DrawerFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="drawer-footer"
      class={cn("cn-drawer-footer mt-auto flex flex-col", local.class)}
      {...others}
    />
  );
};

type DrawerLabelProps<T extends ValidComponent = "h2"> = DynamicProps<T, Drawer.LabelProps> &
  Pick<ComponentProps<T>, "class">;

const DrawerLabel = <T extends ValidComponent = "h2">(props: DrawerLabelProps<T>) => {
  const [local, others] = splitProps(props as DrawerLabelProps, ["class"]);
  return (
    <Drawer.Label data-slot="drawer-title" class={cn("cn-drawer-title", local.class)} {...others} />
  );
};

type DrawerDescriptionProps<T extends ValidComponent = "p"> = DynamicProps<
  T,
  Drawer.DescriptionProps
> &
  Pick<ComponentProps<T>, "class">;

const DrawerDescription = <T extends ValidComponent = "p">(props: DrawerDescriptionProps<T>) => {
  const [local, others] = splitProps(props as DrawerDescriptionProps, ["class"]);
  return (
    <Drawer.Description
      data-slot="drawer-description"
      class={cn("cn-drawer-description", local.class)}
      {...others}
    />
  );
};

export {
  DrawerRoot as Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerLabel as DrawerTitle,
  DrawerDescription,
};
