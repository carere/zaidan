import { Link, useLocation } from "@tanstack/solid-router";
import { For } from "solid-js";
import { chartTypeLabel, chartTypes } from "@/lib/charts";
import { cn } from "@/lib/utils";

export function ChartsNav() {
  const location = useLocation();

  return (
    <nav aria-label="Chart categories" class="overflow-x-auto">
      <div class="mx-auto flex w-max min-w-full items-center justify-center px-4">
        <For each={chartTypes}>
          {(type) => {
            const active = () => location().pathname === `/charts/${type}`;

            return (
              <Link
                to="/charts/$type"
                params={{ type }}
                aria-current={active() ? "page" : undefined}
                data-active={active()}
                class={cn(
                  "flex h-11 shrink-0 items-center justify-center border-b-2 border-transparent px-4 text-center font-medium text-muted-foreground text-sm transition-colors hover:text-primary data-[active=true]:border-primary data-[active=true]:text-primary",
                )}
              >
                {chartTypeLabel(type)}
              </Link>
            );
          }}
        </For>
      </div>
    </nav>
  );
}
