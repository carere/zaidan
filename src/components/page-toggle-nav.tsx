import { useLocation, useNavigate } from "@tanstack/solid-router";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

type PageToggleNavProps = ComponentProps<"div"> & {
  slug: string;
};

export function PageToggleNav(props: PageToggleNavProps) {
  const [local, others] = splitProps(props, ["slug", "class"]);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive current page from pathname
  const currentPage = () => (location().pathname.endsWith("/docs") ? "docs" : "preview");

  const handleValueChange = (value: string | null) => {
    if (value === "docs") {
      navigate({ to: "/ui/$slug/docs", params: { slug: local.slug } });
    } else if (value === "preview") {
      navigate({ to: "/ui/{-$slug}", params: { slug: local.slug } });
    }
  };

  return (
    <ToggleGroup
      data-slot="page-toggle-nav"
      multiple={false}
      value={currentPage()}
      onChange={handleValueChange}
      variant="outline"
      size="sm"
      class={cn("", local.class)}
      aria-label="Toggle between preview and docs"
      {...others}
    >
      <ToggleGroupItem value="preview" aria-label="View preview">
        Preview
      </ToggleGroupItem>
      <ToggleGroupItem value="docs" aria-label="View documentation">
        Docs
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
