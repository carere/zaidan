import { type BadgeRootProps, Root } from "@kobalte/core/badge";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import { splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "cn-badge group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "cn-badge-variant-default",
        secondary: "cn-badge-variant-secondary",
        destructive: "cn-badge-variant-destructive",
        outline: "cn-badge-variant-outline",
        ghost: "cn-badge-variant-ghost",
        link: "cn-badge-variant-link",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps<T extends ValidComponent = "span"> = PolymorphicProps<T, BadgeRootProps<T>> &
  VariantProps<typeof badgeVariants>;

const Badge = <T extends ValidComponent = "span">(props: BadgeProps<T>) => {
  const [local, others] = splitProps(props as BadgeProps, ["class", "variant"]);
  return (
    <Root
      class={cn(badgeVariants({ variant: local.variant }), local.class)}
      data-slot="badge"
      data-variant={local.variant}
      {...others}
    />
  );
};

export { Badge, badgeVariants };
