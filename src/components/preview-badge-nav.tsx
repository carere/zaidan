import { Link } from "@tanstack/solid-router";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/ui/badge";

type PreviewBadgeNavProps = ComponentProps<"div"> & {
  slug: string;
};

export function PreviewBadgeNav(props: PreviewBadgeNavProps) {
  const [local, others] = splitProps(props, ["slug", "class"]);

  return (
    <div class={cn("flex", local.class)} {...others}>
      <Badge
        as={Link}
        to="/ui/{-$slug}"
        //@ts-expect-error Problem with kobalte typing polymorphic props
        params={{ slug: local.slug }}
        variant="secondary"
        class="rounded-r-none border-r-0 no-underline data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm"
      >
        Preview
      </Badge>
      <Badge
        as={Link}
        to="/ui/$slug/docs"
        //@ts-expect-error Problem with kobalte typing polymorphic props
        params={{ slug: local.slug }}
        variant="secondary"
        class="rounded-l-none no-underline data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm"
      >
        Docs
      </Badge>
    </div>
  );
}
