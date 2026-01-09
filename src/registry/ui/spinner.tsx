import { Loader2 } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SpinnerProps = ComponentProps<"svg"> & {
  class?: string | undefined;
};

const Spinner = (props: SpinnerProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      class={cn("cn-spinner size-4 animate-spin", local.class)}
      data-slot="spinner"
      {...others}
    />
  );
};

export { Spinner };
