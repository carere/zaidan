import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Field, FieldLabel } from "@/registry/kobalte/ui/field";

export default function FieldCheckbox() {
  return (
    <FieldLabel for="checkbox-demo">
      <Field orientation="horizontal">
        <Checkbox id="checkbox-demo" defaultChecked />
        <FieldLabel for="checkbox-demo" class="line-clamp-1">
          I agree to the terms and conditions
        </FieldLabel>
      </Field>
    </FieldLabel>
  );
}
