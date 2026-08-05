import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type KbdProps = ComponentProps<"kbd">;

const Kbd = (props: KbdProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <kbd
      class={cn(
        "z-kbd pointer-events-none inline-flex items-center justify-center select-none",
        local.class,
      )}
      data-slot="kbd"
      {...others}
    />
  );
};

type KbdGroupProps = ComponentProps<"div">;

const KbdGroup = (props: KbdGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  // shadcn 4.16.1 exposes div props even though KbdGroup renders a kbd element.
  const kbdProps = others as ComponentProps<"kbd">;

  return (
    <kbd
      class={cn("z-kbd-group inline-flex items-center", local.class)}
      data-slot="kbd-group"
      {...kbdProps}
    />
  );
};

export { Kbd, KbdGroup };
