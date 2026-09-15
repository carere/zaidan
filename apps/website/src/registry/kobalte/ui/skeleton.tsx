import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

const Skeleton = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div data-slot="skeleton" class={cn("z-skeleton animate-pulse", local.class)} {...others} />
  );
};

export { Skeleton };
