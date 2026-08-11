import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
} from "@/registry/kobalte/ui/combobox";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/registry/kobalte/ui/item";

const countries = [
  { code: "ar", value: "argentina", label: "Argentina", continent: "South America" },
  { code: "au", value: "australia", label: "Australia", continent: "Oceania" },
  { code: "br", value: "brazil", label: "Brazil", continent: "South America" },
  { code: "ca", value: "canada", label: "Canada", continent: "North America" },
  { code: "cn", value: "china", label: "China", continent: "Asia" },
  { code: "co", value: "colombia", label: "Colombia", continent: "South America" },
  { code: "eg", value: "egypt", label: "Egypt", continent: "Africa" },
  { code: "fr", value: "france", label: "France", continent: "Europe" },
  { code: "de", value: "germany", label: "Germany", continent: "Europe" },
  { code: "it", value: "italy", label: "Italy", continent: "Europe" },
  { code: "jp", value: "japan", label: "Japan", continent: "Asia" },
  { code: "ke", value: "kenya", label: "Kenya", continent: "Africa" },
  { code: "mx", value: "mexico", label: "Mexico", continent: "North America" },
  { code: "nz", value: "new-zealand", label: "New Zealand", continent: "Oceania" },
  { code: "ng", value: "nigeria", label: "Nigeria", continent: "Africa" },
  { code: "za", value: "south-africa", label: "South Africa", continent: "Africa" },
  { code: "kr", value: "south-korea", label: "South Korea", continent: "Asia" },
  { code: "gb", value: "united-kingdom", label: "United Kingdom", continent: "Europe" },
  { code: "us", value: "united-states", label: "United States", continent: "North America" },
];

export default function ComboboxCustom() {
  return (
    <Combobox<(typeof countries)[number]>
      options={countries}
      optionValue="value"
      optionTextValue="label"
      placeholder="Search countries..."
      itemComponent={(props) => (
        <ComboboxItem item={props.item}>
          <Item size="xs" class="p-0">
            <ItemContent>
              <ItemTitle class="whitespace-nowrap">{props.item.rawValue.label}</ItemTitle>
              <ItemDescription>
                {props.item.rawValue.continent} ({props.item.rawValue.code})
              </ItemDescription>
            </ItemContent>
          </Item>
        </ComboboxItem>
      )}
    >
      <ComboboxInput placeholder="Search countries..." />
      <ComboboxContent>
        <ComboboxEmpty>No countries found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
