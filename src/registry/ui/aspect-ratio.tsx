import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AspectRatioProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  Pick<ComponentProps<T>, "class" | "children">
> & {
  ratio: number;
};

const AspectRatio = <T extends ValidComponent = "div">(props: AspectRatioProps<T>) => {
  const [local, others] = splitProps(props as AspectRatioProps, ["class", "ratio"]);

  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": local.ratio,
        } as JSX.CSSProperties
      }
      class={cn("relative aspect-(--ratio)", local.class)}
      {...others}
    />
  );
};

export { AspectRatio };
export type { AspectRatioProps };
