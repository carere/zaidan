import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/ui/hover-card";

export default function HoverCardExample() {
  return (
    <ExampleWrapper>
      <HoverCardSides />
      <HoverCardWithAvatar />
    </ExampleWrapper>
  );
}

const HOVER_CARD_SIDES = ["top", "right", "bottom", "left"] as const;

function HoverCardSides() {
  return (
    <Example title="Sides">
      <div class="flex flex-wrap items-center justify-center gap-4">
        <For each={HOVER_CARD_SIDES}>
          {(side) => (
            <HoverCard openDelay={100} closeDelay={100} placement={side}>
              <HoverCardTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </HoverCardTrigger>
              <HoverCardContent>
                <div class="flex flex-col gap-2">
                  <h4 class="font-medium">Hover Card</h4>
                  <p>This hover card appears on the {side} side of the trigger.</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </For>
      </div>
    </Example>
  );
}

function HoverCardWithAvatar() {
  return (
    <Example title="With Avatar">
      <div class="flex items-center justify-center">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger
            as="a"
            href="https://github.com/solidjs"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary underline underline-offset-4"
          >
            @solidjs
          </HoverCardTrigger>
          <HoverCardContent class="w-80">
            <div class="flex justify-between space-x-4">
              <Avatar>
                <AvatarImage src="https://avatars.githubusercontent.com/u/79226042" />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div class="space-y-1">
                <h4 class="font-semibold text-sm">@solidjs</h4>
                <p class="text-sm">
                  Simple and performant reactivity for building user interfaces.
                </p>
                <div class="flex items-center pt-2">
                  <span class="text-muted-foreground text-xs">Joined December 2020</span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </Example>
  );
}
