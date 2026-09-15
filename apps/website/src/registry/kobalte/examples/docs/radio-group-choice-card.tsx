import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/registry/kobalte/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function RadioGroupChoiceCard() {
  return (
    <RadioGroup defaultValue="plus" class="max-w-sm">
      <FieldLabel for="radio-group-plan-plus">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Plus</FieldTitle>
            <FieldDescription>For individuals and small teams.</FieldDescription>
          </FieldContent>
          <RadioGroupItem value="plus" id="radio-group-plan-plus" />
        </Field>
      </FieldLabel>
      <FieldLabel for="radio-group-plan-pro">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Pro</FieldTitle>
            <FieldDescription>For growing businesses.</FieldDescription>
          </FieldContent>
          <RadioGroupItem value="pro" id="radio-group-plan-pro" />
        </Field>
      </FieldLabel>
      <FieldLabel for="radio-group-plan-enterprise">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enterprise</FieldTitle>
            <FieldDescription>For large teams and enterprises.</FieldDescription>
          </FieldContent>
          <RadioGroupItem value="enterprise" id="radio-group-plan-enterprise" />
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}
