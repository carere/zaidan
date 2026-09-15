import { Field, FieldContent, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import { Switch } from "@/registry/kobalte/ui/switch";

export default function SwitchInvalid() {
  return (
    <Field orientation="horizontal" class="max-w-sm" data-invalid>
      <FieldContent>
        <FieldLabel for="switch-terms">Accept terms and conditions</FieldLabel>
        <FieldDescription>You must accept the terms and conditions to continue.</FieldDescription>
      </FieldContent>
      <Switch id="switch-terms" aria-invalid />
    </Field>
  );
}
