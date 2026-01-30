import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-solid";
import type { Component, ComponentProps, JSX } from "solid-js";
import { Toaster as Sonner } from "solid-sonner";
import { useColorMode } from "@/registry/kobalte/hooks/use-color-mode";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster: Component<ToasterProps> = (props) => {
  const { colorMode } = useColorMode();
  return (
    <Sonner
      theme={colorMode()}
      class="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheck class="size-4" />,
        info: <Info class="size-4" />,
        warning: <TriangleAlert class="size-4" />,
        error: <OctagonX class="size-4" />,
        loading: <LoaderCircle class="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as JSX.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
