import { useColorMode } from "@kobalte/core";
import { Moon, Sun } from "lucide-solid";
import { createEffect, onCleanup, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/ui/button";

export const DARK_MODE_FORWARD_TYPE = "dark-mode-forward";

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

export function DarkModeScript() {
  createEffect(() => {
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
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: DARK_MODE_FORWARD_TYPE, key: e.key }, "*");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  return null;
}
