import { For } from "solid-js";
import { Field, FieldError, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
];

export default function SelectInvalid() {
  return (
    <Field data-invalid class="w-full max-w-48">
      <FieldLabel for="invalid-fruit">Fruit</FieldLabel>
      <Select items={items}>
        <SelectTrigger id="invalid-fruit" aria-invalid>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <For each={items}>
              {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
            </For>
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>Please select a fruit.</FieldError>
    </Field>
  );
}
