import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { Switch } from "@/registry/kobalte/ui/switch";

export default function FieldSwitch() {
  return (
    <Field orientation="horizontal" class="w-fit">
      <FieldLabel for="field-two-factor">Multi-factor authentication</FieldLabel>
      <Switch id="field-two-factor" />
    </Field>
  );
}
