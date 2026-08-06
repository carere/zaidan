import { For } from "solid-js";

import { Field, FieldDescription, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
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
      <Select<string> items={items}>
        <SelectTrigger id="field-department">
          <SelectValue placeholder="Choose department" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <For each={items}>
              {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
            </For>
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>Select your department or area of work.</FieldDescription>
    </Field>
  );
}
