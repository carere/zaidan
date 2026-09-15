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
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
];

export default function SelectDemo() {
  return (
    <Select
      options={items}
      optionValue="value"
      optionTextValue="label"
      placeholder="Select a fruit"
      itemComponent={(props) => (
        <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
      )}
    >
      <SelectTrigger aria-label="Fruit" class="w-full max-w-48">
        <SelectValue<(typeof items)[number]>>{(state) => state.selectedOption().label}</SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  );
}
