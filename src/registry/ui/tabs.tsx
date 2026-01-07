import type { PolymorphicProps } from "@kobalte/core";
import {
  Content,
  List,
  Root,
  type TabsContentProps as TabsContentPrimitiveProps,
  type TabsListProps as TabsListPrimitiveProps,
  type TabsRootProps,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
  Trigger,
} from "@kobalte/core/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, mergeProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

type TabsProps<T extends ValidComponent = "div"> = PolymorphicProps<T, TabsRootProps<T>> &
  Pick<ComponentProps<T>, "class" | "children">;

const Tabs = <T extends ValidComponent = "div">(props: TabsProps<T>) => {
  const mergedProps = mergeProps({ orientation: "horizontal" }, props);
  const [local, others] = splitProps(mergedProps, ["class", "orientation"]);
  return (
    <Root
      data-slot="tabs"
      data-orientation={local.orientation}
      orientation={local.orientation}
      class={cn("cn-tabs group/tabs flex data-[orientation=horizontal]:flex-col", local.class)}
      {...others}
    />
  );
};

const tabsListVariants = cva(
  "cn-tabs-list group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "cn-tabs-list-variant-default bg-muted",
        line: "cn-tabs-list-variant-line gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TabsListProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TabsListPrimitiveProps<T>
> &
  VariantProps<typeof tabsListVariants> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsList = <T extends ValidComponent = "div">(props: TabsListProps<T>) => {
  const [local, others] = splitProps(props as TabsListProps, ["variant", "class"]);
  return (
    <List
      class={cn(tabsListVariants({ variant: local.variant }), local.class)}
      data-slot="tabs-list"
      data-variant={local.variant}
      {...others}
    />
  );
};

type TabTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  TabsTriggerPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsTrigger = <T extends ValidComponent = "button">(props: TabTriggerProps<T>) => {
  const [local, others] = splitProps(props as TabTriggerProps, ["class"]);
  return (
    <Trigger
      data-slot="tabs-trigger"
      class={cn(
        "cn-tabs-trigger relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-selected:bg-transparent dark:group-data-[variant=line]/tabs-list:data-selected:border-transparent dark:group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "data-selected:bg-background data-selected:text-foreground dark:data-selected:border-input dark:data-selected:bg-input/30 dark:data-selected:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-selected:after:opacity-100",
        local.class,
      )}
      {...others}
    />
  );
};

type TabsContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TabsContentPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsContent = <T extends ValidComponent = "div">(props: TabsContentProps<T>) => {
  const [local, others] = splitProps(props as TabsContentProps, ["class"]);
  return (
    <Content
      data-slot="tabs-content"
      class={cn("cn-tabs-content flex-1 outline-none", local.class)}
      {...others}
    />
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
