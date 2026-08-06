import { Button } from "@/registry/kobalte/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/registry/kobalte/ui/combobox";

const countries = [
  { code: "", value: "", continent: "", label: "Select country" },
  { code: "ar", value: "argentina", label: "Argentina" },
  { code: "au", value: "australia", label: "Australia" },
  { code: "br", value: "brazil", label: "Brazil" },
  { code: "ca", value: "canada", label: "Canada" },
  { code: "cn", value: "china", label: "China" },
  { code: "co", value: "colombia", label: "Colombia" },
  { code: "eg", value: "egypt", label: "Egypt" },
  { code: "fr", value: "france", label: "France" },
  { code: "de", value: "germany", label: "Germany" },
  { code: "it", value: "italy", label: "Italy" },
  { code: "jp", value: "japan", label: "Japan" },
  { code: "ke", value: "kenya", label: "Kenya" },
  { code: "mx", value: "mexico", label: "Mexico" },
  { code: "nz", value: "new-zealand", label: "New Zealand" },
  { code: "ng", value: "nigeria", label: "Nigeria" },
  { code: "za", value: "south-africa", label: "South Africa" },
  { code: "kr", value: "south-korea", label: "South Korea" },
  { code: "gb", value: "united-kingdom", label: "United Kingdom" },
  { code: "us", value: "united-states", label: "United States" },
];

export default function ComboboxPopup() {
  return (
    <Combobox
      items={countries}
      defaultValue={countries[0]}
      itemToStringLabel={(country) => country.label}
      itemToStringValue={(country) => country.value}
    >
      <ComboboxTrigger as={Button} variant="outline" class="w-64 justify-between font-normal">
        <ComboboxValue placeholder="Select country" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder="Search" />
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(country: (typeof countries)[number]) => (
            <ComboboxItem value={country}>{country.label}</ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
