import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AspectRatioProps = ComponentProps<"div"> & {
  ratio: number;
  class?: string | undefined;
};

const AspectRatio = (props: AspectRatioProps) => {
  const [local, others] = splitProps(props, ["class", "ratio"]);

  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": local.ratio,
        } as JSX.CSSProperties
      }
      class={cn("relative aspect-(--ratio) overflow-hidden", local.class)}
      {...others}
    />
  );
};

export { AspectRatio };
export type { AspectRatioProps };
