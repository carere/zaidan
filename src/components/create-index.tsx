import { For, Show } from "solid-js";
import { PreviewShowcase } from "@/components/create-showcases/preview";
import { Preview02Showcase } from "@/components/create-showcases/preview-02";
import type { CreateShowcase } from "@/lib/create-previews";
import type { DesignSystemConfig } from "@/lib/types";
import { Button } from "@/registry/kobalte/ui/button";

const SHOWCASE_OPTIONS: { label: string; value: CreateShowcase }[] = [
  { label: "01", value: "preview-02" },
  { label: "02", value: "preview" },
];

export function CreateIndex(props: {
  config: DesignSystemConfig;
  onShowcaseChange: (showcase: CreateShowcase) => void;
  showcase: CreateShowcase;
}) {
  return (
    <div class="relative">
      <Show when={props.showcase === "preview"} fallback={<Preview02Showcase />}>
        <PreviewShowcase config={props.config} />
      </Show>
      <fieldset class="dark fixed right-3 bottom-3 z-20 flex items-center gap-1 rounded-xl bg-card/90 p-1 shadow-xl backdrop-blur-xl">
        <legend class="sr-only">Showcase preview</legend>
        <For each={SHOWCASE_OPTIONS}>
          {(item) => (
            <Button
              variant="ghost"
              size="sm"
              data-active={props.showcase === item.value}
              aria-pressed={props.showcase === item.value}
              class="h-7 min-w-8 cursor-pointer rounded-lg px-2.5 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
              onClick={() => props.onShowcaseChange(item.value)}
            >
              {item.label}
            </Button>
          )}
        </For>
      </fieldset>
    </div>
  );
}
