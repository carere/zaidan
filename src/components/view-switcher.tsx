import { BookOpen, Eye } from "lucide-solid";
import { Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { useView } from "@/lib/view-context";
import { Button, type ButtonProps } from "@/registry/ui/button";

export function ViewSwitcher(props: ButtonProps) {
  const [local, others] = splitProps(props as ButtonProps, ["class"]);
  const { view, toggleView } = useView();

  return (
    <Button
      variant="ghost"
      size="icon"
      class={cn("size-8", local.class)}
      title={`Switch to ${view() === "preview" ? "docs" : "preview"}`}
      onClick={() => toggleView()}
      {...others}
    >
      <span class="sr-only">Toggle between preview and docs</span>
      <Show when={view() === "preview"} fallback={<Eye />}>
        <BookOpen />
      </Show>
    </Button>
  );
}
