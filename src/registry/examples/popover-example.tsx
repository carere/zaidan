import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/registry/ui/field";
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
    <ExampleWrapper>
      <PopoverBasic />
      <PopoverWithForm />
      <PopoverAlignments />
      <PopoverInDialog />
    </ExampleWrapper>
  );
}

function PopoverBasic() {
  return (
    <Example title="Basic">
      <Popover placement="bottom-start">
        <PopoverTrigger as={Button} variant="outline" class="w-fit">
          Open Popover
        </PopoverTrigger>
        <PopoverContent class="w-64">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
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
        <PopoverContent class="w-64">
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
          </PopoverHeader>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="width" class="w-1/2">
                Width
              </FieldLabel>
              <Input id="width" value="100%" />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="height" class="w-1/2">
                Height
              </FieldLabel>
              <Input id="height" value="25px" />
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
        <Popover placement="bottom-start">
          <PopoverTrigger as={Button} variant="outline" size="sm">
            Start
          </PopoverTrigger>
          <PopoverContent class="w-40">Aligned to start</PopoverContent>
        </Popover>
        <Popover placement="bottom">
          <PopoverTrigger as={Button} variant="outline" size="sm">
            Center
          </PopoverTrigger>
          <PopoverContent class="w-40">Aligned to center</PopoverContent>
        </Popover>
        <Popover placement="bottom-end">
          <PopoverTrigger as={Button} variant="outline" size="sm">
            End
          </PopoverTrigger>
          <PopoverContent class="w-40">Aligned to end</PopoverContent>
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
          <Popover placement="bottom-start">
            <PopoverTrigger as={Button} variant="outline" class="w-fit">
              Open Popover
            </PopoverTrigger>
            <PopoverContent>
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
