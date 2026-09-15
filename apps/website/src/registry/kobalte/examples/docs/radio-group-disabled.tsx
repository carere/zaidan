import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function RadioGroupDisabled() {
  return (
    <RadioGroup defaultValue="option2" class="w-fit">
      <Field orientation="horizontal" data-disabled>
        <RadioGroupItem value="option1" id="radio-group-disabled-1" disabled />
        <FieldLabel for="radio-group-disabled-1" class="font-normal">
          Disabled
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="option2" id="radio-group-disabled-2" />
        <FieldLabel for="radio-group-disabled-2" class="font-normal">
          Option 2
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="option3" id="radio-group-disabled-3" />
        <FieldLabel for="radio-group-disabled-3" class="font-normal">
          Option 3
        </FieldLabel>
      </Field>
    </RadioGroup>
  );
}
