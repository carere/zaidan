import type { PolymorphicProps } from "@kobalte/core";
import { ToggleButton, type ToggleButtonRootProps } from "@kobalte/core/toggle-button";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "group/toggle z-toggle inline-flex items-center justify-center whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "z-toggle-variant-default",
        outline: "z-toggle-variant-outline",
      },
      size: {
        default: "z-toggle-size-default",
        sm: "z-toggle-size-sm",
        lg: "z-toggle-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ToggleButtonRootProps<T>
> &
  VariantProps<typeof toggleVariants> &
  Pick<ComponentProps<T>, "class">;

const Toggle = <T extends ValidComponent = "button">(props: ToggleProps<T>) => {
  const [local, others] = splitProps(props as ToggleProps, ["variant", "size", "class"]);
  return (
    <ToggleButton
      data-slot="toggle"
      class={cn(toggleVariants({ variant: local.variant, size: local.size }), local.class)}
      {...others}
    />
  );
};

export { Toggle, type ToggleProps, toggleVariants };
