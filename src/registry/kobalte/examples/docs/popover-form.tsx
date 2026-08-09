import { Button } from "@/registry/kobalte/ui/button";
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

export default function PopoverForm() {
  return (
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
            <FieldLabel for="popover-form-width" class="w-1/2">
              Width
            </FieldLabel>
            <Input id="popover-form-width" defaultValue="100%" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="popover-form-height" class="w-1/2">
              Height
            </FieldLabel>
            <Input id="popover-form-height" defaultValue="25px" />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
