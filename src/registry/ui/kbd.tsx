import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type KbdProps<T extends ValidComponent = "kbd"> = PolymorphicProps<T, ComponentProps<T>>;

const Kbd = <T extends ValidComponent = "kbd">(rawProps: KbdProps<T>) => {
  const [local, others] = splitProps(rawProps as KbdProps, ["class"]);

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

type KbdGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ComponentProps<T>>;

const KbdGroup = <T extends ValidComponent = "div">(rawProps: KbdGroupProps<T>) => {
  const [local, others] = splitProps(rawProps as KbdGroupProps, ["class"]);

  return (
    <kbd
      class={cn("cn-kbd-group inline-flex items-center", local.class)}
      data-slot="kbd-group"
      {...others}
    />
  );
};

export { Kbd, KbdGroup };
