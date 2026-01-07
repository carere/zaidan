import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

function ExampleWrapper(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div class="w-full bg-background">
      <div
        data-slot="example-wrapper"
        class={cn(
          "mx-auto grid min-h-screen w-full min-w-0 max-w-5xl content-center items-start gap-8 p-4 pt-2 sm:gap-12 sm:p-6 md:grid-cols-2 md:gap-8 lg:p-12 2xl:max-w-6xl",
          local.class,
        )}
        {...others}
      />
    </div>
  );
}

function Example(
  props: ComponentProps<"div"> & {
    title: string;
    containerClass?: string;
  },
) {
  const [local, others] = splitProps(props, ["class", "containerClass", "children", "title"]);
  return (
    <div
      data-slot="example"
      class={cn(
        "mx-auto flex w-full min-w-0 max-w-lg flex-col gap-1 self-stretch lg:max-w-none",
        local.containerClass,
      )}
      {...others}
    >
      <div class="px-1.5 py-2 font-medium text-muted-foreground text-xs">{local.title}</div>
      <div
        data-slot="example-content"
        class={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-6 border border-dashed bg-background p-4 text-foreground sm:p-6 *:[div:not([class*='w-'])]:w-full",
          local.class,
        )}
      >
        {local.children}
      </div>
    </div>
  );
}

export { ExampleWrapper, Example };
