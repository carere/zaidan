import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";

export default function FieldInput() {
  return (
    <FieldSet class="w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel for="field-username">Username</FieldLabel>
          <Input id="field-username" type="text" placeholder="Max Leiter" />
          <FieldDescription>Choose a unique username for your account.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="field-password">Password</FieldLabel>
          <FieldDescription>Must be at least 8 characters long.</FieldDescription>
          <Input id="field-password" type="password" placeholder="••••••••" />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
