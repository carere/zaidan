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

export { Avatar, AvatarImage, AvatarFallback };
