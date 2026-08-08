import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/kobalte/ui/hover-card";

const HOVER_CARD_SIDES = ["left", "top", "bottom", "right"] as const;

export default function HoverCardSides() {
  return (
    <div class="flex flex-wrap justify-center gap-2">
      <For each={HOVER_CARD_SIDES}>
        {(side) => (
          <HoverCard>
            <HoverCardTrigger
              as={Button}
              variant="outline"
              class="capitalize"
              delay={100}
              closeDelay={100}
            >
              {side}
            </HoverCardTrigger>
            <HoverCardContent side={side}>
              <div class="flex flex-col gap-1">
                <h4 class="font-medium">Hover Card</h4>
                <p>This hover card appears on the {side} side of the trigger.</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </For>
    </div>
  );
}
