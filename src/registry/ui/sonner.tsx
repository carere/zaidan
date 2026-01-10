import { useColorMode } from "@kobalte/core";
import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { Toaster as Sonner } from "solid-sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => {
  const { colorMode } = useColorMode();
  const [local, others] = splitProps(props, ["theme"]);

  return (
    <Sonner
      theme={(local.theme ?? colorMode()) as ToasterProps["theme"]}
      class="toaster group"
      data-slot="sonner-toaster"
      icons={{
        success: <CircleCheck class="size-4" />,
        info: <Info class="size-4" />,
        warning: <TriangleAlert class="size-4" />,
        error: <OctagonX class="size-4" />,
        loading: <Loader2 class="size-4 animate-spin" />,
      }}
      style={{
        "--normal-bg": "var(--color-popover)",
        "--normal-text": "var(--color-popover-foreground)",
        "--normal-border": "var(--color-border)",
        "--border-radius": "var(--radius)",
      }}
      {...others}
    />
  );
};

export { Toaster };
