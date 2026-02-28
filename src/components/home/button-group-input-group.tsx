import { AudioLinesIcon, PlusIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function ButtonGroupInputGroup() {
  const [voiceEnabled, setVoiceEnabled] = createSignal(false);
  return (
    <ButtonGroup class="[--radius:9999rem]">
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Add">
          <PlusIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup class="flex-1">
        <InputGroup>
          <InputGroupInput
            placeholder={voiceEnabled() ? "Record and send audio..." : "Send a message..."}
            disabled={voiceEnabled()}
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                as={InputGroupButton}
                onClick={() => setVoiceEnabled(!voiceEnabled())}
                data-active={voiceEnabled()}
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                aria-pressed={voiceEnabled()}
                size="icon-xs"
                aria-label="Voice Mode"
              >
                <AudioLinesIcon />
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  );
}
