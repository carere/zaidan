import { For } from "solid-js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
];

export default function SelectDemo() {
  return (
    <Select items={items}>
      <SelectTrigger aria-label="Fruit" class="w-full max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <For each={items}>
            {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
          </For>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
