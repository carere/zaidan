import { GlobeIcon } from "lucide-solid";
import { Show } from "solid-js";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxSection,
  ComboboxSectionLabel,
  ComboboxSeparator,
} from "@/registry/kobalte/ui/combobox";
import { InputGroupAddon } from "@/registry/kobalte/ui/input-group";

type TimezoneGroup = {
  label: string;
  options: string[];
};

const timezones: TimezoneGroup[] = [
  {
    label: "Americas",
    options: [
      "(GMT-5) New York",
      "(GMT-8) Los Angeles",
      "(GMT-6) Chicago",
      "(GMT-5) Toronto",
      "(GMT-8) Vancouver",
      "(GMT-3) São Paulo",
    ],
  },
  {
    label: "Europe",
    options: [
      "(GMT+0) London",
      "(GMT+1) Paris",
      "(GMT+1) Berlin",
      "(GMT+1) Rome",
      "(GMT+1) Madrid",
      "(GMT+1) Amsterdam",
    ],
  },
  {
    label: "Asia/Pacific",
    options: [
      "(GMT+9) Tokyo",
      "(GMT+8) Shanghai",
      "(GMT+8) Singapore",
      "(GMT+4) Dubai",
      "(GMT+11) Sydney",
      "(GMT+9) Seoul",
    ],
  },
];

export default function ComboboxInputGroup() {
  return (
    <Combobox<string, TimezoneGroup>
      options={timezones}
      optionValue={(option) => option}
      optionTextValue={(option) => option}
      optionGroupChildren="options"
      placeholder="Select a timezone..."
      itemComponent={(props) => (
        <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
      )}
      sectionComponent={(props) => (
        <>
          <Show when={props.section.index !== 0}>
            <ComboboxSeparator />
          </Show>
          <ComboboxSection>
            <ComboboxSectionLabel>{props.section.rawValue.label}</ComboboxSectionLabel>
          </ComboboxSection>
        </>
      )}
    >
      <ComboboxInput placeholder="Select a timezone...">
        <InputGroupAddon>
          <GlobeIcon class="size-4" />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent class="w-60">
        <ComboboxEmpty>No timezones found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
