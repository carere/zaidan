import * as AccordionPrimitive from "@kobalte/core/accordion";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { ChevronDownIcon } from "lucide-solid";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AccordionProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const Accordion = <T extends ValidComponent = "div">(props: AccordionProps<T>) => {
  const [local, others] = splitProps(props as AccordionProps, ["class"]);
  return <AccordionPrimitive.Root data-slot="accordion" class={cn(local.class)} {...others} />;
};

type AccordionItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionItemProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const AccordionItem = <T extends ValidComponent = "div">(props: AccordionItemProps<T>) => {
  const [local, others] = splitProps(props as AccordionItemProps, ["class"]);
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      class={cn("border-b last:border-b-0", local.class)}
      {...others}
    />
  );
};

type AccordionTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const AccordionTrigger = <T extends ValidComponent = "button">(props: AccordionTriggerProps<T>) => {
  const [local, others] = splitProps(props as AccordionTriggerProps, ["class", "children"]);
  return (
    <AccordionPrimitive.Header class="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        class={cn(
          "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left font-medium text-sm outline-none transition-all hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-expanded]>svg]:rotate-180",
          local.class,
        )}
        {...others}
      >
        {local.children}
        <ChevronDownIcon class="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

type AccordionContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  AccordionPrimitive.AccordionContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const AccordionContent = <T extends ValidComponent = "div">(props: AccordionContentProps<T>) => {
  const [local, others] = splitProps(props as AccordionContentProps, ["class", "children"]);
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      class="overflow-hidden text-sm data-closed:animate-accordion-up data-expanded:animate-accordion-down"
      {...others}
    >
      <div class={cn("pt-0 pb-4", local.class)}>{local.children}</div>
    </AccordionPrimitive.Content>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
