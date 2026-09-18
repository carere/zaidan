import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import { Textarea } from "@/registry/kobalte/ui/textarea";

export default function TextareaInvalid() {
  return (
    <Field data-invalid>
      <FieldLabel for="textarea-invalid">Message</FieldLabel>
      <Textarea id="textarea-invalid" placeholder="Type your message here." aria-invalid />
      <FieldDescription>Please enter a valid message.</FieldDescription>
    </Field>
  );
}
