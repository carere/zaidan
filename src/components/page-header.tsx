import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function PageHeader(props: ComponentProps<"section">) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <section class={cn("border-grid", local.class)} {...others}>
      <div class="container-wrapper">
        <div class="container flex flex-col items-center gap-2 px-6 py-8 text-center md:py-16 lg:py-20 xl:gap-4">
          {local.children}
        </div>
      </div>
    </section>
  );
}

export function PageHeaderHeading(props: ComponentProps<"h1">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <h1
      class={cn(
        "max-w-3xl text-balance font-heading font-semibold text-3xl tracking-tight text-primary lg:leading-[1.1] xl:text-5xl xl:tracking-tighter",
        local.class,
      )}
      {...others}
    />
  );
}

export function PageHeaderDescription(props: ComponentProps<"p">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <p
      class={cn("max-w-4xl text-balance text-base text-foreground sm:text-lg", local.class)}
      {...others}
    />
  );
}

export function PageActions(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "flex w-full items-center justify-center gap-2 pt-2 **:data-[slot=button]:shadow-none",
        local.class,
      )}
      {...others}
    />
  );
}
