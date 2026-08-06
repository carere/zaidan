import { For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxValue,
  useComboboxAnchor,
} from "@/registry/kobalte/ui/combobox";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/registry/kobalte/ui/item";

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

const timezones = [
  {
    value: "Americas",
    items: ["(GMT-5) New York", "(GMT-8) Los Angeles", "(GMT-6) Chicago", "(GMT-5) Toronto"],
  },
  {
    value: "Europe",
    items: ["(GMT+0) London", "(GMT+1) Paris", "(GMT+1) Berlin", "(GMT+1) Rome"],
  },
  {
    value: "Asia/Pacific",
    items: ["(GMT+9) Tokyo", "(GMT+8) Shanghai", "(GMT+8) Singapore", "(GMT+11) Sydney"],
  },
];

const countries = [
  { code: "af", value: "afghanistan", label: "Afghanistan", continent: "Asia" },
  { code: "al", value: "albania", label: "Albania", continent: "Europe" },
  { code: "dz", value: "algeria", label: "Algeria", continent: "Africa" },
  { code: "ar", value: "argentina", label: "Argentina", continent: "South America" },
  { code: "au", value: "australia", label: "Australia", continent: "Oceania" },
  { code: "br", value: "brazil", label: "Brazil", continent: "South America" },
  { code: "ca", value: "canada", label: "Canada", continent: "North America" },
  { code: "fr", value: "france", label: "France", continent: "Europe" },
  { code: "jp", value: "japan", label: "Japan", continent: "Asia" },
  { code: "us", value: "united-states", label: "United States", continent: "North America" },
];

export default function ComboboxExample() {
  return (
    <ExampleWrapper>
      <ComboboxBasic />
      <ComboboxDisabled />
      <ComboboxWithGroups />
      <ComboboxMultiple />
      <ComboboxWithCustomItems />
    </ExampleWrapper>
  );
}

function FrameworkList() {
  return (
    <ComboboxList>
      {(framework: string) => <ComboboxItem value={framework}>{framework}</ComboboxItem>}
    </ComboboxList>
  );
}

function ComboboxBasic() {
  return (
    <Example title="Basic">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework..." showClear />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxDisabled() {
  return (
    <Example title="Disabled">
      <Combobox items={frameworks} disabled>
        <ComboboxInput placeholder="Select a framework..." disabled />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithGroups() {
  return (
    <Example title="With Groups">
      <Combobox<string> items={timezones}>
        <ComboboxInput placeholder="Select a timezone..." />
        <ComboboxContent>
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof timezones)[number], index) => (
              <>
                <Show when={index > 0}>
                  <ComboboxSeparator />
                </Show>
                <ComboboxGroup items={group.items}>
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  <ComboboxCollection>
                    {(timezone: string) => <ComboboxItem value={timezone}>{timezone}</ComboboxItem>}
                  </ComboboxCollection>
                </ComboboxGroup>
              </>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxMultiple() {
  const anchor = useComboboxAnchor();

  return (
    <Example title="Multiple Selection">
      <Combobox<string, true> items={frameworks} multiple defaultValue={[frameworks[0]]}>
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values) => (
              <>
                <For each={values as string[]}>
                  {(framework) => <ComboboxChip>{framework}</ComboboxChip>}
                </For>
                <ComboboxChipsInput placeholder="Select frameworks..." />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithCustomItems() {
  return (
    <Example title="With Custom Item Rendering">
      <Combobox
        items={countries}
        itemToStringLabel={(country) => country.label}
        itemToStringValue={(country) => country.value}
      >
        <ComboboxInput placeholder="Search countries..." />
        <ComboboxContent>
          <ComboboxEmpty>No countries found.</ComboboxEmpty>
          <ComboboxList>
            {(country: (typeof countries)[number]) => (
              <ComboboxItem value={country}>
                <Item size="xs" class="p-0">
                  <ItemContent>
                    <ItemTitle class="whitespace-nowrap">{country.label}</ItemTitle>
                    <ItemDescription>
                      {country.continent} ({country.code})
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}
