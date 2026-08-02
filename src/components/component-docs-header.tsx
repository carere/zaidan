import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Corvu } from "@/components/icons/corvu";
import { Kobalte } from "@/components/icons/kobalte";

export type ComponentFoundation = "corvu" | "kobalte";

const FOUNDATIONS = {
  corvu: {
    label: "Corvu",
    icon: Corvu,
  },
  kobalte: {
    label: "Kobalte",
    icon: Kobalte,
  },
} as const;

export function ComponentDocsHeader(props: {
  title: string;
  description: string;
  foundation?: ComponentFoundation;
}) {
  const foundation = () => (props.foundation ? FOUNDATIONS[props.foundation] : undefined);

  return (
    <div data-not-typeset class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="scroll-m-24 font-heading font-semibold text-3xl tracking-tight">
          {props.title}
        </h1>
        <p class="text-[1.05rem] leading-[1.5] text-muted-foreground sm:text-balance sm:text-base md:max-w-[80%]">
          {props.description}
        </p>
      </div>

      <Show when={foundation()}>
        {(item) => (
          <div class="inline-flex w-full items-center gap-6">
            <span class="relative inline-flex items-center justify-center pt-1 pb-0.5 font-medium text-base text-foreground after:absolute after:inset-x-0 after:bottom-[-4px] after:h-0.5 after:bg-foreground">
              {item().label}
            </span>
            <div class="ml-auto size-4 shrink-0 text-muted-foreground opacity-80 [&_svg]:size-4">
              <Dynamic component={item().icon} />
            </div>
          </div>
        )}
      </Show>
      <Show when={!foundation()}>
        <div aria-hidden="true" class="h-[30px]" />
      </Show>
    </div>
  );
}
