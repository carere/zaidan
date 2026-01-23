import { createSignal, For, Show } from "solid-js";
import { match } from "ts-pattern";
import type { Font } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const fonts = ["inter", "noto-sans", "nunito-sans", "figtree"] satisfies Font[];

export default function FontPicker() {
  const [selectedFont, selectFont] = createSignal<Font>("inter");
  const isMobile = useIsMobile();

  const getLabel = (font: Font) =>
    match(font)
      .with("inter", () => "Inter")
      .with("noto-sans", () => "Noto Sans")
      .with("nunito-sans", () => "Nunito Sans")
      .with("figtree", () => "Figtree")
      .exhaustive();

  const getFontFamily = (font: Font) =>
    match(font)
      .with("inter", () => "Inter, sans-serif")
      .with("noto-sans", () => "Noto Sans, sans-serif")
      .with("nunito-sans", () => "Nunito Sans, sans-serif")
      .with("figtree", () => "Figtree, sans-serif")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={4} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Font</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedFont())}</div>
          </div>
          <div
            class="font-medium text-foreground text-sm"
            style={{ "font-family": getFontFamily(selectedFont()) }}
          >
            Aa
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="md:w-64">
          <DropdownMenuRadioGroup value={selectedFont()} onChange={selectFont}>
            <For each={fonts}>
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
                  <Show when={index() < fonts.length - 1}>
                    <DropdownMenuSeparator />
                  </Show>
                </>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
