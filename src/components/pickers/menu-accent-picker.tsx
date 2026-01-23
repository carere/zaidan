import { PaintBucket } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { match } from "ts-pattern";
import type { MenuAccent } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const menuAccents = ["subtle", "bold"] satisfies MenuAccent[];

export default function MenuAccentPicker() {
  const [selectedMenuAccent, selectMenuAccent] = createSignal<MenuAccent>("subtle");
  const isMobile = useIsMobile();

  const getLabel = (menuAccent: MenuAccent) =>
    match(menuAccent)
      .with("subtle", () => "Subtle")
      .with("bold", () => "Bold")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={isMobile() ? 8 : 0} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Menu Accent</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedMenuAccent())}</div>
          </div>
          <PaintBucket class="size-4 text-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-36">
          <DropdownMenuRadioGroup value={selectedMenuAccent()} onChange={selectMenuAccent}>
            <For each={menuAccents}>
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
