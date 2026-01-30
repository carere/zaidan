import { useNavigate, useSearch } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { match } from "ts-pattern";
import { BaseUI } from "@/components/icons/base-ui";
import { Kobalte } from "@/components/icons/kobalte";
import { DEFAULT_CONFIG, PRIMITIVES } from "@/lib/config";
import type { Primitive } from "@/lib/types";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function ComponentLibraryPicker() {
  const search = useSearch({ strict: false });
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const getLabel = (base: Primitive) => PRIMITIVES.find((p) => p.name === base)?.label;

  const getIcon = (base: Primitive) =>
    match(base)
      .with("kobalte", () => <Kobalte class="size-4 fill-foreground" />)
      .with("base", () => <BaseUI class="size-4 fill-foreground" />)
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Component Library</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(search().primitive ?? DEFAULT_CONFIG.primitive)}
            </div>
          </div>
          {getIcon(search().primitive ?? DEFAULT_CONFIG.primitive)}
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-[calc(100svw-var(--spacing)*4)] md:w-64">
          <DropdownMenuRadioGroup
            value={search().primitive ?? DEFAULT_CONFIG.primitive}
            onChange={(value) =>
              navigate({ to: ".", search: { ...search(), primitive: value as Primitive } })
            }
          >
            <For each={PRIMITIVES.map((p) => p.name)}>
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
