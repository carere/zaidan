import { CopyIcon, FileCodeIcon } from "lucide-solid";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/kobalte/ui/input-group";

export default function InputGroupBlockStart() {
  return (
    <FieldGroup class="max-w-sm">
      <Field>
        <FieldLabel for="block-start-input">Input</FieldLabel>
        <InputGroup class="h-auto">
          <InputGroupInput id="block-start-input" placeholder="Enter your name" />
          <InputGroupAddon align="block-start">
            <InputGroupText>Full Name</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>Header positioned above the input.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel for="block-start-textarea">Textarea</FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id="block-start-textarea"
            placeholder="console.log('Hello, world!');"
            class="font-mono text-sm"
          />
          <InputGroupAddon align="block-start">
            <FileCodeIcon class="text-muted-foreground" />
            <InputGroupText class="font-mono">script.js</InputGroupText>
            <InputGroupButton size="icon-xs" class="ml-auto" aria-label="Copy">
              <CopyIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>Header positioned above the textarea.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}
