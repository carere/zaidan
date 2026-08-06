import { For } from "solid-js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
];
const vegetables = [
  { label: "Carrot", value: "carrot" },
  { label: "Broccoli", value: "broccoli" },
  { label: "Spinach", value: "spinach" },
];
const items = [{ label: "Select a fruit", value: null }, ...fruits, ...vegetables];

export default function SelectGroups() {
  return (
    <Select items={items}>
      <SelectTrigger aria-label="Food" class="w-full max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <For each={fruits}>
            {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
          </For>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <For each={vegetables}>
            {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
          </For>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
