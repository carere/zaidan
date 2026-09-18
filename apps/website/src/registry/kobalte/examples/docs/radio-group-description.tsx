import { Field, FieldContent, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function RadioGroupDescription() {
  return (
    <RadioGroup defaultValue="comfortable" class="w-fit">
      <Field orientation="horizontal">
        <RadioGroupItem value="default" id="radio-group-description-default" />
        <FieldContent>
          <FieldLabel for="radio-group-description-default">Default</FieldLabel>
          <FieldDescription>Standard spacing for most use cases.</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="comfortable" id="radio-group-description-comfortable" />
        <FieldContent>
          <FieldLabel for="radio-group-description-comfortable">Comfortable</FieldLabel>
          <FieldDescription>More space between elements.</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="compact" id="radio-group-description-compact" />
        <FieldContent>
          <FieldLabel for="radio-group-description-compact">Compact</FieldLabel>
          <FieldDescription>Minimal spacing for dense layouts.</FieldDescription>
        </FieldContent>
      </Field>
    </RadioGroup>
  );
}
