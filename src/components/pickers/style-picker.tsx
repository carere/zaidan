import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { match } from "ts-pattern";
import { Lyra } from "@/components/icons/lyra";
import { Maia } from "@/components/icons/maia";
import { Mira } from "@/components/icons/mira";
import { Nova } from "@/components/icons/nova";
import { Vega } from "@/components/icons/vega";
import { LockButton } from "@/components/lock-button";
import { DEFAULT_CONFIG, STYLES } from "@/lib/config";
import type { Style } from "@/lib/types";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function StylePicker() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const getLabel = (style: Style) => STYLES.find((s) => s.name === style)?.label;
  const getDescription = (style: Style) => STYLES.find((s) => s.name === style)?.description;

  const getIcon = (style: Style) =>
    match(style)
      .with("vega", () => <Vega class="size-4" />)
      .with("nova", () => <Nova class="size-4" />)
      .with("lyra", () => <Lyra class="size-4" />)
      .with("maia", () => <Maia class="size-4" />)
      .with("mira", () => <Mira class="size-4" />)
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Style</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(location().search.style ?? DEFAULT_CONFIG.style)}
            </div>
          </div>
          {getIcon(location().search.style ?? DEFAULT_CONFIG.style)}
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-[calc(100svw-var(--spacing)*4)] md:w-64">
          <DropdownMenuRadioGroup
            value={location().search.style ?? DEFAULT_CONFIG.style}
            onChange={(value) =>
              navigate({ to: ".", search: (prev) => ({ ...prev, style: value as Style }) })
            }
          >
            <For each={STYLES.map((s) => s.name)}>
              {(style, index) => (
                <>
                  <DropdownMenuRadioItem value={style}>
                    <div class="flex items-start gap-2">
                      {getIcon(style)}
                      <div class="flex flex-col justify-start pointer-coarse:gap-1">
                        <span>{getLabel(style)}</span>
                        <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                          {getDescription(style)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuRadioItem>
                  <Show when={index() < STYLES.length - 1}>
                    <DropdownMenuSeparator />
                  </Show>
                </>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton param="style" class="absolute top-1/2 right-10 -translate-y-1/2" />
    </div>
  );
}
