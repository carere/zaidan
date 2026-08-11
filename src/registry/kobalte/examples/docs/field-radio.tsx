import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function FieldRadio() {
  return (
    <FieldSet class="w-full max-w-xs">
      <FieldLegend variant="label">Subscription Plan</FieldLegend>
      <FieldDescription>Yearly and lifetime plans offer significant savings.</FieldDescription>
      <RadioGroup defaultValue="monthly">
        <Field orientation="horizontal">
          <RadioGroupItem value="monthly" id="field-plan-monthly" />
          <FieldLabel for="field-plan-monthly" class="font-normal">
            Monthly ($9.99/month)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="yearly" id="field-plan-yearly" />
          <FieldLabel for="field-plan-yearly" class="font-normal">
            Yearly ($99.99/year)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="lifetime" id="field-plan-lifetime" />
          <FieldLabel for="field-plan-lifetime" class="font-normal">
            Lifetime ($299.99)
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  );
}
