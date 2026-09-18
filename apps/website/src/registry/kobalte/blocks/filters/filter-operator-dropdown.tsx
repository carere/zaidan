import { Check } from "lucide-solid";
import { For } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { useFilterContext } from "./context";
import { getOperatorsForField } from "./i18n";
import type { FilterOperatorDropdownProps } from "./types";

const FilterOperatorDropdown = <T = unknown>(props: FilterOperatorDropdownProps<T>) => {
  const context = useFilterContext();
  const operators = () => getOperatorsForField(props.field, props.values, context.i18n);

  // Find the operator label, with fallback to formatted operator name
  const operatorLabel = () =>
    operators().find((operator) => operator.value === props.operator)?.label ||
    context.i18n.helpers.formatOperator(props.operator);

  return (
    <DropdownMenu placement="bottom-start">
      <DropdownMenuTrigger
        as={Button}
        variant="outline"
        size={context.size}
        class="text-muted-foreground hover:text-foreground"
      >
        {operatorLabel()}
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-fit min-w-fit">
        <For each={operators()}>
          {(operator) => (
            <DropdownMenuItem
              onSelect={() => props.onChange(operator.value)}
              class="flex items-center justify-between data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              <span>{operator.label}</span>
              <Check
                class={cn(
                  "ms-auto text-primary",
                  operator.value === props.operator ? "opacity-100" : "opacity-0",
                )}
              />
            </DropdownMenuItem>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { FilterOperatorDropdown };
