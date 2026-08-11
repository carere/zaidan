import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, mergeProps, splitProps, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

const markerVariants = cva("z-marker group/marker relative flex w-full items-center", {
  variants: {
    variant: {
      default: "z-marker-variant-default",
      separator: "z-marker-variant-separator",
      border: "z-marker-variant-border",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type MarkerProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ComponentProps<T>> &
  VariantProps<typeof markerVariants>;

const Marker = <T extends ValidComponent = "div">(rawProps: MarkerProps<T>) => {
  const props = mergeProps({ as: "div" as T, variant: "default" as const }, rawProps);
  const [local, others] = splitProps(props as MarkerProps, ["as", "class", "variant"]);

  return (
    <Dynamic
      component={local.as}
      data-slot="marker"
      data-variant={local.variant}
      class={cn(markerVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  );
};

type MarkerIconProps = ComponentProps<"span">;

const MarkerIcon = (props: MarkerIconProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class={cn("z-marker-icon shrink-0", local.class)}
      {...others}
    />
  );
};

type MarkerContentProps = ComponentProps<"span">;

const MarkerContent = (props: MarkerContentProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      data-slot="marker-content"
      class={cn("z-marker-content min-w-0 wrap-break-word", local.class)}
      {...others}
    />
  );
};

export { Marker, MarkerContent, MarkerIcon, markerVariants };
