import {
  Content,
  Item,
  Menu,
  type NavigationMenuContentProps as NavigationMenuContentPrimitiveProps,
  type NavigationMenuItemProps as NavigationMenuItemPrimitiveProps,
  type NavigationMenuMenuProps,
  type NavigationMenuRootProps,
  type NavigationMenuTriggerProps as NavigationMenuTriggerPrimitiveProps,
  type NavigationMenuViewportProps as NavigationMenuViewportPrimitiveProps,
  Portal,
  Root,
  Trigger,
  Viewport,
} from "@kobalte/core/navigation-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type NavigationMenuProps<T extends ValidComponent = "ul"> = PolymorphicProps<
  T,
  NavigationMenuRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const NavigationMenu = <T extends ValidComponent = "ul">(props: NavigationMenuProps<T>) => {
  const [local, others] = splitProps(props as NavigationMenuProps, ["class", "children"]);
  return (
    <Root
      data-slot="navigation-menu"
      class={cn(
        "cn-navigation-menu group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        local.class,
      )}
      {...others}
    >
      {local.children}
      <NavigationMenuViewport />
    </Root>
  );
};

type NavigationMenuListProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  NavigationMenuMenuProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const NavigationMenuList = <T extends ValidComponent = "li">(props: NavigationMenuListProps<T>) => {
  const [local, others] = splitProps(props as NavigationMenuListProps, ["class"]);
  return (
    <Menu
      data-slot="navigation-menu-list"
      class={cn(
        "cn-navigation-menu-list group flex flex-1 list-none items-center justify-center",
        local.class,
      )}
      {...others}
    />
  );
};

type NavigationMenuItemProps<T extends ValidComponent = "a"> = PolymorphicProps<
  T,
  NavigationMenuItemPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const NavigationMenuItem = <T extends ValidComponent = "a">(props: NavigationMenuItemProps<T>) => {
  const [local, others] = splitProps(props as NavigationMenuItemProps, ["class"]);
  return (
    <Item
      data-slot="navigation-menu-item"
      class={cn("cn-navigation-menu-item relative", local.class)}
      {...others}
    />
  );
};

const navigationMenuTriggerStyle = cva(
  "cn-navigation-menu-trigger group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center outline-none disabled:pointer-events-none",
);

type NavigationMenuTriggerProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  NavigationMenuTriggerPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const NavigationMenuTrigger = <T extends ValidComponent = "div">(
  props: NavigationMenuTriggerProps<T>,
) => {
  const [local, others] = splitProps(props as NavigationMenuTriggerProps, ["class", "children"]);
  return (
    <Trigger
      data-slot="navigation-menu-trigger"
      class={cn(navigationMenuTriggerStyle(), "group", local.class)}
      {...others}
    >
      {local.children} <ChevronDown class="cn-navigation-menu-trigger-icon" aria-hidden="true" />
    </Trigger>
  );
};

type NavigationMenuContentProps<T extends ValidComponent = "ul"> = PolymorphicProps<
  T,
  NavigationMenuContentPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const NavigationMenuContent = <T extends ValidComponent = "ul">(
  props: NavigationMenuContentProps<T>,
) => {
  const [local, others] = splitProps(props as NavigationMenuContentProps, ["class"]);
  return (
    <Portal>
      <Content
        data-slot="navigation-menu-content"
        class={cn(
          "cn-navigation-menu-content h-full w-auto **:data-[slot=navigation-menu-link]:focus:outline-none **:data-[slot=navigation-menu-link]:focus:ring-0",
          local.class,
        )}
        {...others}
      />
    </Portal>
  );
};

type NavigationMenuViewportProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  NavigationMenuViewportPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const NavigationMenuViewport = <T extends ValidComponent = "li">(
  props: NavigationMenuViewportProps<T>,
) => {
  const mergedProps = mergeProps(
    {
      gutter: 8,
    } as NavigationMenuViewportProps<T>,
    props,
  );
  const [local, others] = splitProps(mergedProps as NavigationMenuViewportProps, ["class"]);
  return (
    <Viewport
      data-slot="navigation-menu-viewport"
      class={cn(
        "cn-navigation-menu-viewport isolate z-50 h-[var(--kb-navigation-menu-viewport-height)] w-[var(--kb-navigation-menu-viewport-width)] max-w-[var(--kb-popper-available-width)] origin-[var(--kb-menu-content-transform-origin)] data-[instant]:transition-none",
        local.class,
      )}
      {...others}
    />
  );
};

type NavigationMenuLinkProps = ComponentProps<"a"> & {
  class?: string;
  children?: JSX.Element;
};

const NavigationMenuLink = (props: NavigationMenuLinkProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <a
      data-slot="navigation-menu-link"
      class={cn("cn-navigation-menu-link", local.class)}
      {...others}
    />
  );
};

type NavigationMenuIndicatorProps = ComponentProps<"div"> & {
  class?: string;
};

const NavigationMenuIndicator = (props: NavigationMenuIndicatorProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="navigation-menu-indicator"
      class={cn(
        "cn-navigation-menu-indicator top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        local.class,
      )}
      {...others}
    >
      <div class="cn-navigation-menu-indicator-arrow relative top-[60%] h-2 w-2 rotate-45" />
    </div>
  );
};

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuViewport,
};
