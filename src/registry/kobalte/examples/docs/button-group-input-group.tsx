import { AudioLines, Plus } from "lucide-solid";
import { createSignal } from "solid-js";

import { Button, buttonVariants } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function ButtonGroupInputGroup() {
  const [voiceEnabled, setVoiceEnabled] = createSignal(false);

  return (
    <ButtonGroup class="[--radius:9999rem]">
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Add">
          <Plus />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput
            placeholder={voiceEnabled() ? "Record and send audio..." : "Send a message..."}
            disabled={voiceEnabled()}
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setVoiceEnabled((enabled) => !enabled)}
                data-active={voiceEnabled()}
                class={`${buttonVariants({ variant: "ghost", size: "icon-xs" })} data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 dark:data-[active=true]:bg-orange-800 dark:data-[active=true]:text-orange-100`}
                aria-pressed={voiceEnabled()}
                aria-label="Toggle voice mode"
              >
                <AudioLines />
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  );
}
