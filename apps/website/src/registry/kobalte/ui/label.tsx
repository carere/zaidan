/** biome-ignore-all lint/a11y/noLabelWithoutControl: <component file - for/htmlFor handled by consumer> */
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type LabelProps = ComponentProps<"label">;

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <label
      class={cn(
        "z-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        local.class,
      )}
      data-slot="label"
      {...others}
    />
  );
};

export { Label };
