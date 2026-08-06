import { EyeOffIcon } from "lucide-solid";
import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";

export default function InputGroupInlineEnd() {
  return (
    <Field class="max-w-sm">
      <FieldLabel for="inline-end-input">Input</FieldLabel>
      <InputGroup>
        <InputGroupInput id="inline-end-input" type="password" placeholder="Enter password" />
        <InputGroupAddon align="inline-end">
          <EyeOffIcon />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>Icon positioned at the end.</FieldDescription>
    </Field>
  );
}
