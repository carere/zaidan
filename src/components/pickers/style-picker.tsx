import { createSignal, For, Show } from "solid-js";
import { match } from "ts-pattern";
import { Lyra } from "@/components/icons/lyra";
import { Maia } from "@/components/icons/maia";
import { Mira } from "@/components/icons/mira";
import { Nova } from "@/components/icons/nova";
import { Vega } from "@/components/icons/vega";
import type { Style } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const styles = ["vega", "nova", "lyra", "maia", "mira"] satisfies Style[];

export default function StylePicker() {
  const [selectedStyle, selectStyle] = createSignal<Style>("vega");
  const isMobile = useIsMobile();

  const getLabel = (style: Style) =>
    match(style)
      .with("vega", () => "Vega")
      .with("nova", () => "Nova")
      .with("lyra", () => "Lyra")
      .with("maia", () => "Maia")
      .with("mira", () => "Mira")
      .exhaustive();

  const getIcon = (style: Style) =>
    match(style)
      .with("vega", () => <Vega class="size-4" />)
      .with("nova", () => <Nova class="size-4" />)
      .with("lyra", () => <Lyra class="size-4" />)
      .with("maia", () => <Maia class="size-4" />)
      .with("mira", () => <Mira class="size-4" />)
      .exhaustive();

  const getDescription = (style: Style) =>
    match(style)
      .with("vega", () => "The classic shadcn/ui look. Clean, neutral, and familiar.")
      .with("nova", () => "Reduced padding and margins for compact layouts.")
      .with("lyra", () => "Boxy and sharp. Pairs well with mono fonts.")
      .with("maia", () => "Soft and rounded, with generous spacing.")
      .with("mira", () => "Compact. Made for dense interfaces.")
      .exhaustive();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Style</div>
            <div class="font-medium text-foreground text-sm">{getLabel(selectedStyle())}</div>
          </div>
          {getIcon(selectedStyle())}
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-[calc(100svw-var(--spacing)*4)] md:w-64">
          <DropdownMenuRadioGroup value={selectedStyle()} onChange={selectStyle}>
            <For each={["vega", "nova", "lyra", "maia", "mira"] satisfies Style[]}>
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
                  <Show when={index() < styles.length - 1}>
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
