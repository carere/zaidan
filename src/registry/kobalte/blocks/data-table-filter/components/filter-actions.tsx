import { FilterXIcon } from "lucide-solid";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import type { DataTableFilterActions } from "../core/types";
import { type Locale, t } from "../lib/i18n";

interface FilterActionsProps {
  hasFilters: boolean;
  actions?: DataTableFilterActions;
  locale?: Locale;
}

export function FilterActions(props: FilterActionsProps) {
  return (
    <Button
      class={cn("!px-2 h-7", !props.hasFilters && "hidden")}
      variant="destructive"
      onClick={() => props.actions?.removeAllFilters()}
    >
      <FilterXIcon />
      <span class="hidden md:block">{t("clear", props.locale ?? "en")}</span>
    </Button>
  );
}
