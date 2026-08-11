import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { Textarea } from "@/registry/kobalte/ui/textarea";

export default function FieldTextarea() {
  return (
    <FieldSet class="w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel for="field-feedback">Feedback</FieldLabel>
          <Textarea id="field-feedback" placeholder="Your feedback helps us improve..." rows={4} />
          <FieldDescription>Share your thoughts about our service.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
