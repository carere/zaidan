import { Dice5 } from "lucide-solid";
import { Button } from "@/registry/ui/button";
import { Kbd } from "@/registry/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

export function RandomButton() {
  return (
    <Tooltip placement="left">
      <TooltipTrigger
        as={Button}
        variant="ghost"
        size="sm"
        class="h-[calc(--spacing(13.5))] w-[140px] touch-manipulation select-none justify-between rounded-xl border border-foreground/10 bg-muted/50 focus-visible:border-transparent focus-visible:ring-1 sm:rounded-lg md:w-full md:rounded-lg md:border-transparent md:bg-transparent md:pr-3.5! md:pl-2! md:hover:bg-muted"
      >
        <div class="flex flex-col justify-start text-left">
          <div class="text-muted-foreground text-xs">Shuffle</div>
          <div class="font-medium text-foreground text-sm">Try Random</div>
        </div>
        <Dice5 class="size-5 md:hidden" />
        <Kbd class="hidden bg-foreground/10 text-foreground md:flex">R</Kbd>
      </TooltipTrigger>
      <TooltipContent>Use browser back/forward to navigate history</TooltipContent>
    </Tooltip>
  );
}
