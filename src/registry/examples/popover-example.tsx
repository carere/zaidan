import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Input } from "@/registry/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/ui/popover";

export default function PopoverExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <PopoverDemo />
      <PopoverWithForm />
      <PopoverPlacements />
    </ExampleWrapper>
  );
}

function PopoverDemo() {
  return (
    <Example title="Default">
      <div class="flex items-center justify-center">
        <Popover>
          <PopoverTrigger as={Button} variant="outline">
            Open popover
          </PopoverTrigger>
          <PopoverContent class="w-80">
            <PopoverHeader>
              <PopoverTitle>Dimensions</PopoverTitle>
              <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
            </PopoverHeader>
            <div class="grid gap-2 pt-4">
              <div class="grid grid-cols-3 items-center gap-4">
                <label for="width" class="text-sm">
                  Width
                </label>
                <Input id="width" value="100%" class="col-span-2 h-8" />
              </div>
              <div class="grid grid-cols-3 items-center gap-4">
                <label for="height" class="text-sm">
                  Height
                </label>
                <Input id="height" value="25px" class="col-span-2 h-8" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  );
}

function PopoverWithForm() {
  return (
    <Example title="With Form">
      <div class="flex items-center justify-center">
        <Popover>
          <PopoverTrigger as={Button} variant="outline">
            Update settings
          </PopoverTrigger>
          <PopoverContent class="w-80">
            <PopoverHeader>
              <PopoverTitle>Settings</PopoverTitle>
              <PopoverDescription>Configure your preferences below.</PopoverDescription>
            </PopoverHeader>
            <div class="grid gap-4 pt-4">
              <div class="grid gap-2">
                <label for="name" class="font-medium text-sm">
                  Name
                </label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              <div class="grid gap-2">
                <label for="email" class="font-medium text-sm">
                  Email
                </label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <Button size="sm">Save changes</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  );
}

function PopoverPlacements() {
  return (
    <Example title="Placements">
      <div class="flex flex-wrap items-center justify-center gap-4">
        <Popover>
          <PopoverTrigger as={Button} variant="outline">
            Top
          </PopoverTrigger>
          <PopoverContent placement="top">
            <PopoverHeader>
              <PopoverTitle>Top Placement</PopoverTitle>
              <PopoverDescription>This popover appears above the trigger.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger as={Button} variant="outline">
            Right
          </PopoverTrigger>
          <PopoverContent placement="right">
            <PopoverHeader>
              <PopoverTitle>Right Placement</PopoverTitle>
              <PopoverDescription>This popover appears to the right.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger as={Button} variant="outline">
            Left
          </PopoverTrigger>
          <PopoverContent placement="left">
            <PopoverHeader>
              <PopoverTitle>Left Placement</PopoverTitle>
              <PopoverDescription>This popover appears to the left.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  );
}
