import { Link } from "@tanstack/solid-router";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";

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
        activeOptions={{ exact: true }}
        class="rounded-r-none border-r-0 data-[status=active]:bg-secondary/50 data-[status=active]:text-secondary-foreground"
      >
        Preview
      </Badge>
      <Badge
        as={Link}
        to="/ui/$slug/docs"
        //@ts-expect-error Problem with kobalte typing polymorphic props
        params={{ slug: local.slug }}
        variant="secondary"
        activeOptions={{ exact: true }}
        class="rounded-l-none data-[status=active]:bg-secondary/50 data-[status=active]:text-secondary-foreground"
      >
        Docs
      </Badge>
    </div>
  );
}
