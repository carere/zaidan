import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/kobalte/ui/popover";

export default function PopoverExample() {
  return (
    <ExampleWrapper>
      <PopoverBasic />
      <PopoverSides />
      <PopoverWithForm />
      <PopoverAlignments />
      <PopoverInDialog />
    </ExampleWrapper>
  );
}

function PopoverBasic() {
  return (
    <Example title="Basic">
      <Popover>
        <PopoverTrigger as={Button} variant="outline" class="w-fit">
          Open Popover
        </PopoverTrigger>
        <PopoverContent align="start">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </Example>
  );
}

function PopoverSides() {
  return (
    <Example title="Sides">
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap gap-2">
          <For each={["inline-start", "left", "top"] as const}>
            {(side) => (
              <Popover>
                <PopoverTrigger as={Button} variant="outline" class="w-fit capitalize">
                  {side.replace("-", " ")}
                </PopoverTrigger>
                <PopoverContent side={side} class="w-40">
                  <p>Popover on {side.replace("-", " ")}</p>
                </PopoverContent>
              </Popover>
            )}
          </For>
        </div>
        <div class="flex flex-wrap gap-2">
          <For each={["bottom", "right", "inline-end"] as const}>
            {(side) => (
              <Popover>
                <PopoverTrigger as={Button} variant="outline" class="w-fit capitalize">
                  {side.replace("-", " ")}
                </PopoverTrigger>
                <PopoverContent side={side} class="w-40">
                  <p>Popover on {side.replace("-", " ")}</p>
                </PopoverContent>
              </Popover>
            )}
          </For>
        </div>
      </div>
    </Example>
  );
}

function PopoverWithForm() {
  return (
    <Example title="With Form">
      <Popover>
        <PopoverTrigger as={Button} variant="outline">
          Open Popover
        </PopoverTrigger>
        <PopoverContent class="w-64" align="start">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
          </PopoverHeader>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="width" class="w-1/2">
                Width
              </FieldLabel>
              <Input id="width" defaultValue="100%" />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="height" class="w-1/2">
                Height
              </FieldLabel>
              <Input id="height" defaultValue="25px" />
            </Field>
          </FieldGroup>
        </PopoverContent>
      </Popover>
    </Example>
  );
}

function PopoverAlignments() {
  return (
    <Example title="Alignments">
      <div class="flex gap-6">
        <Popover>
          <PopoverTrigger as={Button} variant="outline" size="sm">
            Start
          </PopoverTrigger>
          <PopoverContent align="start" class="w-40">
            Aligned to start
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger as={Button} variant="outline" size="sm">
            Center
          </PopoverTrigger>
          <PopoverContent align="center" class="w-40">
            Aligned to center
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger as={Button} variant="outline" size="sm">
            End
          </PopoverTrigger>
          <PopoverContent align="end" class="w-40">
            Aligned to end
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  );
}

function PopoverInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Popover Example</DialogTitle>
            <DialogDescription>Click the button below to see the popover.</DialogDescription>
          </DialogHeader>
          <Popover>
            <PopoverTrigger as={Button} variant="outline" class="w-fit">
              Open Popover
            </PopoverTrigger>
            <PopoverContent align="start">
              <PopoverHeader>
                <PopoverTitle>Popover in Dialog</PopoverTitle>
                <PopoverDescription>
                  This popover appears inside a dialog. Click the button to open it.
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
