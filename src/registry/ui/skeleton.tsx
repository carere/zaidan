import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SkeletonPrimitive from "@kobalte/core/skeleton";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SkeletonProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SkeletonPrimitive.SkeletonRootProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const Skeleton = <T extends ValidComponent = "div">(props: SkeletonProps<T>) => {
  const [local, others] = splitProps(props as SkeletonProps, ["class"]);
  return (
    <SkeletonPrimitive.Root
      class={cn("cn-skeleton animate-pulse", local.class)}
      data-slot="skeleton"
      {...others}
    />
  );
};

export { Skeleton };
