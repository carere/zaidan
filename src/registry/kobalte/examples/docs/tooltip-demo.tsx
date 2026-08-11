import { Button } from "@/registry/kobalte/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function TooltipDemo() {
  return (
    <Tooltip>
      <TooltipTrigger as={Button} variant="outline">
        Hover
      </TooltipTrigger>
      <TooltipContent>
        <p>Add to library</p>
      </TooltipContent>
    </Tooltip>
  );
}
