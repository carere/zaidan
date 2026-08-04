import { type ComponentProps, createUniqueId, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

const Input = (props: InputProps) => {
  const [local, others] = splitProps(props, ["class", "disabled", "id", "type"]);
  const generatedId = `input-${createUniqueId()}`;

  return (
    <input
      data-slot="input"
      data-disabled={local.disabled ? "" : undefined}
      disabled={local.disabled}
      id={local.id ?? generatedId}
      type={local.type}
      class={cn(
        "z-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

export { Input, type InputProps };
