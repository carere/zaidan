import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";

export default function CheckboxInvalid() {
  return (
    <FieldGroup class="mx-auto w-56">
      <Field orientation="horizontal" data-invalid>
        <Checkbox id="terms-checkbox-invalid" name="terms-checkbox-invalid" aria-invalid />
        <FieldLabel for="terms-checkbox-invalid">Accept terms and conditions</FieldLabel>
      </Field>
    </FieldGroup>
  );
}
