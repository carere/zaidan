import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as TooltipPrimitive from "@kobalte/core/tooltip";
import type { JSX, ValidComponent } from "solid-js";
import { type Component, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

const TooltipTrigger = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, TooltipPrimitive.TooltipTriggerProps<T>>,
) => <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;

const Tooltip: Component<TooltipPrimitive.TooltipRootProps> = (props) => {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
};

type TooltipContentProps<T extends ValidComponent = "div"> =
  TooltipPrimitive.TooltipContentProps<T> & { class?: string | undefined; children?: JSX.Element };

const TooltipContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, TooltipContentProps<T>>,
) => {
  const [local, others] = splitProps(props as TooltipContentProps, ["class", "children"]);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        class={cn(
          "cn-tooltip-content z-50 w-fit max-w-xs origin-(--kb-popover-content-transform-origin) bg-foreground text-background",
          local.class,
        )}
        data-slot="tooltip-content"
        {...others}
      >
        <TooltipPrimitive.Arrow class="cn-tooltip-arrow z-50 bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=right]:top-1/2! data-[side=left]:-right-1 data-[side=top]:-bottom-2.5 data-[side=right]:-left-1 data-[side=left]:-translate-y-1/2 data-[side=right]:-translate-y-1/2" />
        {local.children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent };
