import { Link, useLocation, useSearch } from "@tanstack/solid-router";
import { splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";
import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
} from "@/registry/kobalte/ui/toggle-group";

type PageToggleNavProps<T extends ValidComponent = "div"> = ToggleGroupProps<T> & {
  slug: string;
};

export function PageToggleNav<T extends ValidComponent = "div">(props: PageToggleNavProps<T>) {
  const [local, others] = splitProps(props, ["slug", "class"]);
  const location = useLocation();
  const search = useSearch({ strict: false });

  return (
    <ToggleGroup
      data-slot="page-toggle-nav"
      multiple={false}
      value={location().pathname.endsWith("/docs") ? "docs" : "preview"}
      variant="outline"
      size="sm"
      class={cn("bg-background", local.class)}
      aria-label="Toggle between preview and docs"
      {...others}
    >
      <ToggleGroupItem
        as={Link}
        to="/ui/{-$slug}"
        //@ts-expect-error <Problem with kobalte typing polymorphic props>
        params={{ slug: local.slug }}
        //@ts-expect-error <Problem with kobalte typing polymorphic props>
        search={search()}
        value="preview"
        aria-label="View preview"
      >
        Preview
      </ToggleGroupItem>
      <ToggleGroupItem
        as={Link}
        to="/ui/$slug/docs"
        //@ts-expect-error <Problem with kobalte typing polymorphic props>
        params={{ slug: local.slug }}
        //@ts-expect-error <Problem with kobalte typing polymorphic props>
        search={search()}
        value="docs"
        aria-label="View documentation"
      >
        Docs
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
