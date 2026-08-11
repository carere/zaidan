import { Field, FieldError, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const items = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
];

export default function SelectInvalid() {
  return (
    <Field data-invalid class="w-full max-w-48">
      <FieldLabel for="invalid-fruit">Fruit</FieldLabel>
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a fruit"
        validationState="invalid"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger id="invalid-fruit" aria-invalid>
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
      <FieldError>Please select a fruit.</FieldError>
    </Field>
  );
}
