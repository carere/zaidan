import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemHeader,
  ItemSeparator,
  ItemTitle,
} from "@/registry/kobalte/ui/item";
import { Kbd } from "@/registry/kobalte/ui/kbd";

const shortcuts = [
  { label: "Search", keys: ["⌘", "K"] },
  { label: "Quick Actions", keys: ["⌘", "J"] },
  { label: "New File", keys: ["⌘", "N"] },
  { label: "Save", keys: ["⌘", "S"] },
  { label: "Toggle Sidebar", keys: ["⌘", "B"] },
] as const;

export function Shortcuts() {
  return (
    <Card>
      <CardContent>
        <div class="flex flex-col gap-3">
          <div class="text-sm font-medium">Shortcuts</div>
          <ItemGroup role="group" class="gap-2 text-muted-foreground" data-size="xs">
            <For each={shortcuts}>
              {({ label, keys }, index) => (
                <>
                  <Show when={index() > 0}>
                    <ItemSeparator />
                  </Show>
                  <Item variant="default" size="xs" class="border-0 px-0 py-0">
                    <ItemHeader>
                      <ItemTitle class="font-normal">{label}</ItemTitle>
                      <ItemActions>
                        <div class="flex gap-1">
                          <For each={keys}>{(key) => <Kbd>{key}</Kbd>}</For>
                        </div>
                      </ItemActions>
                    </ItemHeader>
                  </Item>
                </>
              )}
            </For>
          </ItemGroup>
        </div>
      </CardContent>
    </Card>
  );
}

import { For, Show } from "solid-js";
