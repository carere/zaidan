import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function RadioGroupInvalid() {
  return (
    <FieldSet class="w-full max-w-xs">
      <FieldLegend variant="label">Notification Preferences</FieldLegend>
      <FieldDescription>Choose how you want to receive notifications.</FieldDescription>
      <RadioGroup defaultValue="email">
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem value="email" id="radio-group-invalid-email" aria-invalid />
          <FieldLabel for="radio-group-invalid-email" class="font-normal">
            Email only
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem value="sms" id="radio-group-invalid-sms" aria-invalid />
          <FieldLabel for="radio-group-invalid-sms" class="font-normal">
            SMS only
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem value="both" id="radio-group-invalid-both" aria-invalid />
          <FieldLabel for="radio-group-invalid-both" class="font-normal">
            Both Email & SMS
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  );
}
