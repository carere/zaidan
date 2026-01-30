import {
  type BreadcrumbsLinkProps as BreadcrumbsLinkPrimitiveProps,
  type BreadcrumbsRootProps,
  type BreadcrumbsSeparatorProps as BreadcrumbsSeparatorPrimitiveProps,
  Link,
  Root,
  Separator,
} from "@kobalte/core/breadcrumbs";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { ChevronRight, Ellipsis } from "lucide-solid";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type BreadcrumbProps<T extends ValidComponent = "nav"> = PolymorphicProps<
  T,
  BreadcrumbsRootProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const Breadcrumb = <T extends ValidComponent = "nav">(props: BreadcrumbProps<T>) => {
  const [local, others] = splitProps(props as BreadcrumbProps, ["class"]);
  return (
    <Root
      aria-label="breadcrumb"
      class={cn("cn-breadcrumb", local.class)}
      data-slot="breadcrumb"
      {...others}
    />
  );
};

type BreadcrumbListProps = ComponentProps<"ol">;

const BreadcrumbList = (props: BreadcrumbListProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ol
      class={cn("cn-breadcrumb-list wrap-break-word flex flex-wrap items-center", local.class)}
      data-slot="breadcrumb-list"
      {...others}
    />
  );
};

type BreadcrumbItemProps = ComponentProps<"li">;

const BreadcrumbItem = (props: BreadcrumbItemProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <li
      class={cn("cn-breadcrumb-item inline-flex items-center", local.class)}
      data-slot="breadcrumb-item"
      {...others}
    />
  );
};

type BreadcrumbLinkProps<T extends ValidComponent = "a"> = PolymorphicProps<
  T,
  BreadcrumbsLinkPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const BreadcrumbLink = <T extends ValidComponent = "a">(props: BreadcrumbLinkProps<T>) => {
  const [local, others] = splitProps(props as BreadcrumbLinkProps, ["class"]);
  return (
    <Link class={cn("cn-breadcrumb-link", local.class)} data-slot="breadcrumb-link" {...others} />
  );
};

type BreadcrumbPageProps = ComponentProps<"span">;

const BreadcrumbPage = (props: BreadcrumbPageProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: <exception for breadcrumb>
    // biome-ignore lint/a11y/useSemanticElements: <exception for breadcrumb>
    <span
      aria-current="page"
      aria-disabled="true"
      class={cn("cn-breadcrumb-page", local.class)}
      data-slot="breadcrumb-page"
      role="link"
      {...others}
    />
  );
};

type BreadcrumbSeparatorProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  BreadcrumbsSeparatorPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const BreadcrumbSeparator = <T extends ValidComponent = "span">(
  props: BreadcrumbSeparatorProps<T>,
) => {
  const [local, others] = splitProps(props as BreadcrumbSeparatorProps, ["class", "children"]);
  return (
    <Separator
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class={cn("cn-breadcrumb-separator", local.class)}
      {...others}
    >
      {local.children ?? <ChevronRight />}
    </Separator>
  );
};

type BreadcrumbEllipsisProps = ComponentProps<"span">;

const BreadcrumbEllipsis = (props: BreadcrumbEllipsisProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      class={cn("cn-breadcrumb-ellipsis flex items-center justify-center", local.class)}
      {...others}
    >
      <Ellipsis />
      <span class="sr-only">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
