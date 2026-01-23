import { createSignal, For, Show } from "solid-js";
import { match } from "ts-pattern";
import { BaseUI } from "@/components/icons/base-ui";
import { Kobalte } from "@/components/icons/kobalte";
import type { Primitive } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import { Badge } from "@/registry/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const bases = ["kobalte", "base"] satisfies Primitive[];

export default function ComponentLibraryPicker() {
  const [selectedBase, selectBase] = createSignal<Primitive>("kobalte");
  const isMobile = useIsMobile();

  const getLabel = (base: Primitive) =>
    match(base)
      .with("kobalte", () => "Kobalte")
      .with("base", () => "Base UI")
      .exhaustive();

  const getIcon = (base: Primitive) =>
    match(base)
      .with("kobalte", () => <Kobalte class="size-4 fill-foreground" />)
      .with("base", () => <BaseUI class="size-4 fill-foreground" />)
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={isMobile() ? 8 : 0} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Component Library</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedBase())}</div>
          </div>
          {getIcon(selectedBase())}
        </DropdownMenuTrigger>
        <DropdownMenuContent class="min-w-48">
          <DropdownMenuRadioGroup value={selectedBase()} onChange={selectBase}>
            <For each={bases}>
              {(key) => (
                <DropdownMenuRadioItem value={key} disabled={key === "base"}>
                  <div class="flex items-center gap-2">
                    {getIcon(key)}
                    <span class="text-sm">{getLabel(key)}</span>
                    <Show when={key === "base"}>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </Show>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
