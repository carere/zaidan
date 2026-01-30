import { Moon, Sun } from "lucide-solid";
import { onCleanup, onMount, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { useColorMode } from "@/registry/kobalte/hooks/use-color-mode";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

export function ModeSwitcher(props: ButtonProps) {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);
  const { colorMode, toggleColorMode } = useColorMode();

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        toggleColorMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

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
      <Show when={colorMode() === "light"} fallback={<Moon />}>
        <Sun />
      </Show>
    </Button>
  );
}
