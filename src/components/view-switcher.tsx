import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { BookOpen, Eye } from "lucide-solid";
import { createMemo, Show } from "solid-js";
import { Button } from "@/registry/ui/button";

interface ViewSwitcherProps {
  class?: string;
}

export function ViewSwitcher(props: ViewSwitcherProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });

  location();

  const isDocsPage = createMemo(() => location().pathname.endsWith("/docs"));

  return (
    <Button
      onClick={() =>
        navigate({
          to: isDocsPage() ? "/ui/{-$slug}" : "/ui/$slug/docs",
          params: { slug: params().slug },
        })
      }
      variant="ghost"
      size="icon"
      class={props.class}
    >
      <span class="sr-only">Toggle between preview and docs</span>
      <Show when={isDocsPage()} fallback={<BookOpen />}>
        <Eye />
      </Show>
    </Button>
  );
}
