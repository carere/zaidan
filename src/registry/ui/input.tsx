import { type ComponentProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

const Input = (props: InputProps) => {
  const [local, others] = splitProps(props, ["class", "type"]);
  return (
    <input
      type={local.type}
      data-slot="input"
      class={cn(
        "cn-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

export { Input, type InputProps };
