import { GalleryHorizontalIcon } from "lucide-solid";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

export function SiteConfig(props: ButtonProps) {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);

  return (
    <Button
      variant="ghost"
      size="icon"
      class={cn("size-8", local.class)}
      title="Toggle layout"
      {...others}
    >
      <span class="sr-only">Toggle layout</span>
      <GalleryHorizontalIcon />
    </Button>
  );
}
