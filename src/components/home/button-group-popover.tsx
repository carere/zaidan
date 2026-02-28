import { BotIcon, ChevronDownIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { Separator } from "@/registry/kobalte/ui/separator";
import { Textarea } from "@/registry/kobalte/ui/textarea";

export default function ButtonGroupPopover() {
  return (
    <ButtonGroup>
      <Button variant="outline" size="sm">
        <BotIcon /> Copilot
      </Button>
      <Popover placement="bottom-end">
        <PopoverTrigger as={Button} variant="outline" size="icon-sm" aria-label="Open Popover">
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverContent class="gap-0 rounded-xl p-0 text-sm">
          <div class="px-4 py-3">
            <div class="font-medium text-sm">Agent Tasks</div>
          </div>
          <Separator />
          <div class="p-4 text-sm *:[p:not(:last-child)]:mb-2">
            <Textarea
              placeholder="Describe your task in natural language."
              class="mb-4 resize-none"
            />
            <p class="font-medium">Start a new task with Copilot</p>
            <p class="text-muted-foreground">
              Describe your task in natural language. Copilot will work in the background and open a
              pull request for your review.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
