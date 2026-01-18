import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/ui/hover-card";

export default function HoverCardExample() {
  return (
    <ExampleWrapper>
      <HoverCardSides />
      <HoverCardInDialog />
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
                <div class="flex flex-col gap-1.5">
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

function HoverCardInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hover Card Example</DialogTitle>
            <DialogDescription>
              Hover over the button below to see the hover card.
            </DialogDescription>
          </DialogHeader>
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger as={Button} variant="outline" class="w-fit">
              Hover me
            </HoverCardTrigger>
            <HoverCardContent>
              <div class="flex flex-col gap-1.5">
                <h4 class="font-medium">Hover Card</h4>
                <p>This hover card appears inside a dialog. Hover over the button to see it.</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
