import { Loader2Icon } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SpinnerProps = ComponentProps<"svg">;

const Spinner = (props: SpinnerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      class={cn("size-4 animate-spin", local.class)}
      {...others}
    />
  );
};

export { Spinner };
