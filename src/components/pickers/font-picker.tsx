import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { LockButton } from "@/components/lock-button";
import { DEFAULT_CONFIG, FONTS } from "@/lib/config";
import type { Font } from "@/lib/types";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function FontPicker() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const getLabel = (font: Font) => FONTS.find((f) => f.value === font)?.label;
  const getFontFamily = (font: Font) => FONTS.find((f) => f.value === font)?.fontFamily;

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Font</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(location().search.font ?? DEFAULT_CONFIG.font)}
            </div>
          </div>
          <div
            class="font-medium text-foreground text-sm"
            style={{ "font-family": getFontFamily(location().search.font ?? DEFAULT_CONFIG.font) }}
          >
            Aa
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-[calc(100svw-var(--spacing)*4)] md:w-64">
          <DropdownMenuRadioGroup
            value={location().search.font ?? DEFAULT_CONFIG.font}
            onChange={(value) =>
              navigate({ to: ".", search: (prev) => ({ ...prev, font: value as Font }) })
            }
          >
            <For each={FONTS.map((f) => f.value)}>
              {(font, index) => (
                <>
                  <DropdownMenuRadioItem value={font}>
                    <div class="flex flex-col justify-start gap-2 pointer-coarse:gap-1">
                      <span class="font-medium text-muted-foreground text-xs">
                        {getLabel(font)}
                      </span>
                      <span
                        class="font-extralight text-sm"
                        style={{ "font-family": getFontFamily(font) }}
                      >
                        Designers love packing quirky glyphs into test phrases.
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                  <Show when={index() < FONTS.length - 1}>
                    <DropdownMenuSeparator />
                  </Show>
                </>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton param="font" class="absolute top-1/2 right-10 -translate-y-1/2" />
    </div>
  );
}
