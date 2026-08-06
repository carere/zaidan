import { CheckIcon } from "lucide-solid";
import { Bubble, BubbleContent, BubbleReactions } from "@/registry/kobalte/ui/bubble";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function BubbleTooltip() {
  return (
    <div class="flex w-full max-w-sm flex-col gap-4 py-12">
      <Bubble variant="secondary">
        <BubbleContent>Did you remove the stale route?</BubbleContent>
      </Bubble>
      <Bubble align="end">
        <BubbleContent>Yes, removed it from the registry.</BubbleContent>
        <BubbleReactions>
          <Tooltip>
            <TooltipTrigger
              aria-label="Message read details"
              class="group/button z-button z-button-variant-ghost z-button-size-icon-xs inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap border border-transparent text-sm font-medium outline-none transition-all"
            >
              <CheckIcon />
            </TooltipTrigger>
            <TooltipContent>Read on Jan 5, 2026 at 4:32 PM</TooltipContent>
          </Tooltip>
        </BubbleReactions>
      </Bubble>
    </div>
  );
}
