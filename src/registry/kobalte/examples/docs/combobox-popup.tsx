import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxTrigger,
} from "@/registry/kobalte/ui/combobox";

const countries = [
  { code: "ar", value: "argentina", label: "Argentina" },
  { code: "au", value: "australia", label: "Australia" },
  { code: "br", value: "brazil", label: "Brazil" },
  { code: "ca", value: "canada", label: "Canada" },
  { code: "cn", value: "china", label: "China" },
  { code: "fr", value: "france", label: "France" },
  { code: "de", value: "germany", label: "Germany" },
  { code: "jp", value: "japan", label: "Japan" },
  { code: "gb", value: "united-kingdom", label: "United Kingdom" },
  { code: "us", value: "united-states", label: "United States" },
];

export default function ComboboxPopup() {
  const [value, setValue] = createSignal<(typeof countries)[number] | null>(null);

  return (
    <Combobox<(typeof countries)[number]>
      options={countries}
      value={value()}
      onChange={setValue}
      optionValue="value"
      optionTextValue="label"
      placeholder="Select country"
      itemComponent={(props) => (
        <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
      )}
    >
      <ComboboxTrigger as={Button} variant="outline" class="w-64 justify-between font-normal">
        {value()?.label ?? "Select country"}
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxEmpty>No countries found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
