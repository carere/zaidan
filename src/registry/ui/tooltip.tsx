import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const Tooltip = (props: TooltipPrimitive.TooltipRootProps) => {
  const mergedProps = mergeProps(
    {
      openDelay: 0,
      placement: "top",
      gutter: 4,
    } as TooltipPrimitive.TooltipRootProps,
    props,
  );
  return <TooltipPrimitive.Root data-slot="tooltip" {...mergedProps} />;
};

const TooltipTrigger = (props: TooltipPrimitive.TooltipTriggerProps) => (
  <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
);

type TooltipContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TooltipPrimitive.TooltipContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TooltipContent = <T extends ValidComponent = "div">(props: TooltipContentProps<T>) => {
  const [local, others] = splitProps(props as TooltipContentProps, ["class", "children"]);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        class={cn(
          "cn-tooltip-content z-50 w-fit max-w-xs origin-(--kb-popover-content-transform-origin) bg-foreground text-background",
          local.class,
        )}
        {...others}
      >
        {local.children}
        <TooltipPrimitive.Arrow class="cn-tooltip-arrow z-50 bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=right]:top-1/2! data-[side=left]:-right-1 data-[side=top]:-bottom-2.5 data-[side=right]:-left-1 data-[side=left]:-translate-y-1/2 data-[side=right]:-translate-y-1/2" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent };
