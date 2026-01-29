import { useLocation, useNavigate } from "@tanstack/solid-router";
import { PaintBucket } from "lucide-solid";
import { For } from "solid-js";
import { DEFAULT_CONFIG, MENU_ACCENTS } from "@/lib/config";
import type { MenuAccent } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

export default function MenuAccentPicker() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  const getLabel = (menuAccent: MenuAccent) =>
    MENU_ACCENTS.find((m) => m.name === menuAccent)?.label;

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Menu Accent</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(location().search.menuAccent ?? DEFAULT_CONFIG.menuAccent)}
            </div>
          </div>
          <PaintBucket class="size-4 text-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-[calc(100svw-var(--spacing)*4)] md:w-36">
          <DropdownMenuRadioGroup
            value={location().search.menuAccent ?? DEFAULT_CONFIG.menuAccent}
            onChange={(value) =>
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, menuAccent: value as MenuAccent }),
              })
            }
          >
            <For each={MENU_ACCENTS.map((m) => m.name)}>
              {(menuAccent) => (
                <DropdownMenuRadioItem value={menuAccent}>
                  <span class="text-sm">{getLabel(menuAccent)}</span>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
