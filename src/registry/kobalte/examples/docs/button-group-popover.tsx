import { Bot, ChevronDown } from "lucide-solid";

import { Button, buttonVariants } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/kobalte/ui/popover";
import { Textarea } from "@/registry/kobalte/ui/textarea";

export default function ButtonGroupPopover() {
  return (
    <ButtonGroup>
      <Button variant="outline">
        <Bot />
        Copilot
      </Button>
      <Popover placement="bottom-end">
        <PopoverTrigger
          class={buttonVariants({ variant: "outline", size: "icon" })}
          aria-label="Open Popover"
        >
          <ChevronDown />
        </PopoverTrigger>
        <PopoverContent class="rounded-xl text-sm">
          <PopoverHeader>
            <PopoverTitle>Start a new task with Copilot</PopoverTitle>
            <PopoverDescription>Describe your task in natural language.</PopoverDescription>
          </PopoverHeader>
          <Field>
            <FieldLabel for="button-group-task" class="sr-only">
              Task Description
            </FieldLabel>
            <Textarea id="button-group-task" placeholder="I need to..." class="resize-none" />
            <FieldDescription>Copilot will open a pull request for review.</FieldDescription>
          </Field>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
