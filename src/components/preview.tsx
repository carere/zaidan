import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/ui/badge";

export function Preview(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("relative -mx-1 flex flex-1 flex-col justify-center sm:mx-0", local.class)}
      {...others}
    >
      <div class="ring-foreground/15 3xl:max-h-[1200px] 3xl:max-w-[1800px] relative z-0 mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-2xl ring-1">
        <div class="bg-muted dark:bg-muted/30 absolute inset-0 rounded-2xl" />
        <div class="z-10 size-full flex-1" title="Preview" />
        <Badge class="absolute right-2 bottom-2 isolate z-10">Preview</Badge>
      </div>
    </div>
  );
}
