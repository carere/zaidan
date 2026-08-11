import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function TooltipSides() {
  return (
    <div class="flex flex-wrap gap-2">
      <For each={["left", "top", "bottom", "right"] as const}>
        {(side) => (
          <Tooltip>
            <TooltipTrigger as={Button} variant="outline" class="w-fit capitalize">
              {side}
            </TooltipTrigger>
            <TooltipContent side={side}>
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
        )}
      </For>
    </div>
  );
}
