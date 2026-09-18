import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";

export default function FieldFieldset() {
  return (
    <FieldSet class="w-full max-w-sm">
      <FieldLegend>Address Information</FieldLegend>
      <FieldDescription>We need your address to deliver your order.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel for="field-street">Street Address</FieldLabel>
          <Input id="field-street" type="text" placeholder="123 Main St" />
        </Field>
        <div class="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel for="field-city">City</FieldLabel>
            <Input id="field-city" type="text" placeholder="New York" />
          </Field>
          <Field>
            <FieldLabel for="field-postal-code">Postal Code</FieldLabel>
            <Input id="field-postal-code" type="text" placeholder="90502" />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}
