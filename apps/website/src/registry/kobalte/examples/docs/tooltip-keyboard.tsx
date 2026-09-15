import { SaveIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import { Kbd } from "@/registry/kobalte/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function TooltipKeyboard() {
  return (
    <Tooltip>
      <TooltipTrigger as={Button} variant="outline" size="icon-sm" aria-label="Save changes">
        <SaveIcon />
      </TooltipTrigger>
      <TooltipContent>
        Save Changes <Kbd>S</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
