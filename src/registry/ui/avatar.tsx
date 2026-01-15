import * as ImagePrimitive from "@kobalte/core/image";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AvatarRootProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageRootProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const Avatar = <T extends ValidComponent = "span">(props: AvatarRootProps<T>) => {
  const [local, others] = splitProps(props as AvatarRootProps, ["class"]);
  return (
    <ImagePrimitive.Root
      class={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", local.class)}
      data-slot="avatar"
      {...others}
    />
  );
};

type AvatarImageProps<T extends ValidComponent = "img"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageImgProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const AvatarImage = <T extends ValidComponent = "img">(props: AvatarImageProps<T>) => {
  const [local, others] = splitProps(props as AvatarImageProps, ["class"]);
  return (
    <ImagePrimitive.Img
      class={cn("aspect-square size-full", local.class)}
      data-slot="avatar-image"
      {...others}
    />
  );
};

type AvatarFallbackProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ImagePrimitive.ImageFallbackProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const AvatarFallback = <T extends ValidComponent = "span">(props: AvatarFallbackProps<T>) => {
  const [local, others] = splitProps(props as AvatarFallbackProps, ["class"]);
  return (
    <ImagePrimitive.Fallback
      class={cn("flex size-full items-center justify-center rounded-full bg-muted", local.class)}
      data-slot="avatar-fallback"
      {...others}
    />
  );
};

type AvatarBadgeProps = ComponentProps<"span">;

function AvatarBadge(props: AvatarBadgeProps) {
  const [local, others] = splitProps(props as AvatarBadgeProps, ["class"]);
  return (
    <span
      data-slot="avatar-badge"
      class={cn(
        "cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex select-none items-center justify-center rounded-full bg-blend-color ring-2",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        local.class,
      )}
      {...others}
    />
  );
}

type AvatarGroupProps = ComponentProps<"div">;

function AvatarGroup(props: AvatarGroupProps) {
  const [local, others] = splitProps(props as AvatarGroupProps, ["class"]);
  return (
    <div
      data-slot="avatar-group"
      class={cn(
        "cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        local.class,
      )}
      {...others}
    />
  );
}

type AvatarGroupCountProps = ComponentProps<"div">;

function AvatarGroupCount(props: AvatarGroupCountProps) {
  const [local, others] = splitProps(props as AvatarGroupCountProps, ["class"]);
  return (
    <div
      data-slot="avatar-group-count"
      class={cn(
        "cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background",
        "",
        local.class,
      )}
      {...others}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
