import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type KbdProps<T extends ValidComponent = "kbd"> = PolymorphicProps<
  T,
  Pick<ComponentProps<T>, "class">
>;

const Kbd = <T extends ValidComponent = "kbd">(props: KbdProps<T>) => {
  const [local, others] = splitProps(props as KbdProps, ["class"]);

  return (
    <kbd
      class={cn(
        "cn-kbd pointer-events-none inline-flex select-none items-center justify-center",
        local.class,
      )}
      data-slot="kbd"
      {...others}
    />
  );
};

type KbdGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  Pick<ComponentProps<T>, "class">
>;

const KbdGroup = <T extends ValidComponent = "div">(props: KbdGroupProps<T>) => {
  const [local, others] = splitProps(props as KbdGroupProps, ["class"]);

  return (
    <div
      class={cn("cn-kbd-group inline-flex items-center", local.class)}
      data-slot="kbd-group"
      {...others}
    />
  );
};

export { Kbd, KbdGroup };
