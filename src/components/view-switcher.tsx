import { Link, useLocation } from "@tanstack/solid-router";
import { BookOpen, Eye } from "lucide-solid";
import { createMemo, Show } from "solid-js";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/registry/ui/button";

interface ViewSwitcherProps {
  class?: string;
}

export function ViewSwitcher(props: ViewSwitcherProps) {
  const location = useLocation();

  const isDocsPage = createMemo(() => location().pathname.endsWith("/docs"));

  const linkHref = createMemo(() => {
    const pathname = location().pathname;
    if (isDocsPage()) {
      // Remove /docs suffix to go to preview
      return pathname.replace(/\/docs$/, "");
    }
    // Add /docs suffix to go to docs
    return `${pathname}/docs`;
  });

  return (
    <Link
      to={linkHref()}
      class={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8", props.class)}
      title={`Switch to ${isDocsPage() ? "preview" : "docs"}`}
    >
      <span class="sr-only">Toggle between preview and docs</span>
      <Show when={isDocsPage()} fallback={<BookOpen />}>
        <Eye />
      </Show>
    </Link>
  );
}
