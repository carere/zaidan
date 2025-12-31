import { useColorMode } from "@kobalte/core";
import { Moon, Sun } from "lucide-solid";
import { Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/ui/button";

export function ModeSwitcher(props: ButtonProps) {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      class={cn("size-8", local.class)}
      title="Toggle color mode"
      onClick={() => toggleColorMode()}
      {...others}
    >
      <span class="sr-only">Toggle color mode</span>
      <Show when={colorMode() === "dark"} fallback={<Moon />}>
        <Sun />
      </Show>
    </Button>
  );
}
