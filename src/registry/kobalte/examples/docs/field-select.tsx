import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const items = [
  { label: "Engineering", value: "engineering" },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
  { label: "Sales", value: "sales" },
  { label: "Customer Support", value: "support" },
  { label: "Human Resources", value: "hr" },
  { label: "Finance", value: "finance" },
  { label: "Operations", value: "operations" },
];

export default function FieldSelect() {
  return (
    <Field class="w-full max-w-xs">
      <FieldLabel for="field-department">Department</FieldLabel>
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        placeholder="Choose department"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger id="field-department">
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
      <FieldDescription>Select your department or area of work.</FieldDescription>
    </Field>
  );
}
