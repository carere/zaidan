<<<<<<< HEAD
/** biome-ignore-all lint/a11y/noLabelWithoutControl: <component file - for/htmlFor handled by consumer> */
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type LabelProps = ComponentProps<"label">;

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <label
=======
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type LabelProps = ComponentProps<"label"> & {
  class?: string | undefined;
};

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Label receives `for` attribute at usage time via props spread
    <label
      data-slot="label"
>>>>>>> b604095 (feat(ui): sync field component from shadcn)
      class={cn(
        "cn-label flex select-none items-center peer-disabled:cursor-not-allowed group-data-[disabled=true]:pointer-events-none",
        local.class,
      )}
<<<<<<< HEAD
      data-slot="label"
=======
>>>>>>> b604095 (feat(ui): sync field component from shadcn)
      {...others}
    />
  );
};

export { Label };
