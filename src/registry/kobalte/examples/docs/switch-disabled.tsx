import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { Switch } from "@/registry/kobalte/ui/switch";

export default function SwitchDisabled() {
  return (
    <Field orientation="horizontal" data-disabled class="w-fit">
      <Switch id="switch-disabled-unchecked" disabled />
      <FieldLabel for="switch-disabled-unchecked">Disabled</FieldLabel>
    </Field>
  );
}
