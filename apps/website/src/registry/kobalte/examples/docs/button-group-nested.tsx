import { AudioLines, Plus } from "lucide-solid";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function ButtonGroupNested() {
  return (
    <ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Add">
          <Plus />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput placeholder="Send a message..." />
          <Tooltip>
            <TooltipTrigger as={InputGroupAddon} align="inline-end">
              <AudioLines />
            </TooltipTrigger>
            <TooltipContent>Voice Mode</TooltipContent>
          </Tooltip>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  );
}
