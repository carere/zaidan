/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */

import { Info, Save } from "lucide-solid";
import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Kbd } from "@/registry/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

export default function TooltipExample() {
  return (
    <ExampleWrapper>
      <TooltipBasic />
      <TooltipSides />
      <TooltipWithIcon />
      <TooltipLongContent />
      <TooltipDisabled />
      <TooltipWithKeyboard />
      <TooltipOnLink />
      <TooltipFormatted />
    </ExampleWrapper>
  );
}

function TooltipBasic() {
  return (
    <Example title="Basic">
      <Tooltip>
        <TooltipTrigger as={Button} variant="outline" class="w-fit">
          Show Tooltip
        </TooltipTrigger>
        <TooltipContent>
          <p>Add to library</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipSides() {
  return (
    <Example title="Sides">
      <div class="flex flex-wrap gap-2">
        <For each={["top", "right", "bottom", "left"] as const}>
          {(side) => (
            <Tooltip placement={side}>
              <TooltipTrigger as={Button} variant="outline" class="w-fit capitalize">
                {side}
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to library</p>
              </TooltipContent>
            </Tooltip>
          )}
        </For>
      </div>
    </Example>
  );
}

function TooltipWithIcon() {
  return (
    <Example title="With Icon">
      <Tooltip>
        <TooltipTrigger as={Button} variant="ghost" size="icon">
          <Info />
          <span class="sr-only">Info</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Additional information</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipLongContent() {
  return (
    <Example title="Long Content">
      <Tooltip>
        <TooltipTrigger as={Button} variant="outline" class="w-fit">
          Show Tooltip
        </TooltipTrigger>
        <TooltipContent>
          To learn more about how this works, check out the docs. If you have any questions, please
          reach out to us.
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipDisabled() {
  return (
    <Example title="Disabled">
      <Tooltip>
        <TooltipTrigger as="span" class="inline-block w-fit">
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This feature is currently unavailable</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipWithKeyboard() {
  return (
    <Example title="With Keyboard Shortcut">
      <Tooltip>
        <TooltipTrigger as={Button} variant="outline" size="icon-sm">
          <Save />
        </TooltipTrigger>
        <TooltipContent class="pr-1.5">
          <div class="flex items-center gap-2">
            Save Changes <Kbd>S</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipOnLink() {
  return (
    <Example title="On Link">
      <Tooltip>
        <TooltipTrigger
          as="a"
          href="#"
          class="w-fit text-primary text-sm underline-offset-4 hover:underline"
          onClick={(e: MouseEvent) => e.preventDefault()}
        >
          Learn more
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to read the documentation</p>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function TooltipFormatted() {
  return (
    <Example title="Formatted Content">
      <Tooltip>
        <TooltipTrigger as={Button} variant="outline" class="w-fit">
          Status
        </TooltipTrigger>
        <TooltipContent>
          <div class="flex flex-col gap-1">
            <p class="font-semibold">Active</p>
            <p class="text-xs opacity-80">Last updated 2 hours ago</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}
