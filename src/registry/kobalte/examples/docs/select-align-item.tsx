import { createSignal, For } from "solid-js";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/registry/kobalte/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Switch } from "@/registry/kobalte/ui/switch";

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
];

export default function SelectAlignItem() {
  const [alignItemWithTrigger, setAlignItemWithTrigger] = createSignal(true);

  return (
    <FieldGroup class="w-full max-w-xs">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel for="align-item">Align Item</FieldLabel>
          <FieldDescription>Toggle to align the item with the trigger.</FieldDescription>
        </FieldContent>
        <Switch
          aria-label="Align item with trigger"
          id="align-item"
          checked={alignItemWithTrigger()}
          onCheckedChange={setAlignItemWithTrigger}
        />
      </Field>
      <Field>
        <Select items={items} defaultValue="banana">
          <SelectTrigger aria-label="Fruit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={alignItemWithTrigger()}>
            <SelectGroup>
              <For each={items}>
                {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
              </For>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
