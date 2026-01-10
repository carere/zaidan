import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxSection,
  ComboboxTrigger,
} from "@/registry/ui/combobox";

export default function ComboboxExample() {
  return (
    <ExampleWrapper>
      <ComboboxBasic />
      <ComboboxDisabled />
      <ComboboxWithSections />
      <ComboboxControlled />
    </ExampleWrapper>
  );
}

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

function ComboboxBasic() {
  return (
    <Example title="Basic">
      <Combobox
        options={frameworks}
        placeholder="Select a framework..."
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
        )}
      >
        <ComboboxControl>
          <ComboboxInput />
          <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent />
      </Combobox>
    </Example>
  );
}

function ComboboxDisabled() {
  return (
    <Example title="Disabled">
      <Combobox
        options={frameworks}
        placeholder="Select a framework..."
        disabled
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
        )}
      >
        <ComboboxControl>
          <ComboboxInput />
          <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent />
      </Combobox>
    </Example>
  );
}

type Timezone = {
  label: string;
  options: string[];
};

const timezones: Timezone[] = [
  {
    label: "Americas",
    options: ["(GMT-5) New York", "(GMT-8) Los Angeles", "(GMT-6) Chicago", "(GMT-5) Toronto"],
  },
  {
    label: "Europe",
    options: ["(GMT+0) London", "(GMT+1) Paris", "(GMT+1) Berlin", "(GMT+1) Rome"],
  },
  {
    label: "Asia/Pacific",
    options: ["(GMT+9) Tokyo", "(GMT+8) Shanghai", "(GMT+8) Singapore", "(GMT+11) Sydney"],
  },
];

function ComboboxWithSections() {
  return (
    <Example title="With Sections">
      <Combobox<Timezone, string>
        options={timezones}
        optionValue="options"
        optionTextValue="label"
        optionLabel="label"
        optionGroupChildren="options"
        placeholder="Select a timezone..."
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
        )}
        sectionComponent={(props) => (
          <ComboboxSection>{props.section.rawValue.label}</ComboboxSection>
        )}
      >
        <ComboboxControl>
          <ComboboxInput />
          <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent />
      </Combobox>
    </Example>
  );
}

function ComboboxControlled() {
  const [value, setValue] = createSignal<string | undefined>("Next.js");

  return (
    <Example title="Controlled">
      <div class="flex flex-col gap-4">
        <Combobox
          options={frameworks}
          placeholder="Select a framework..."
          value={value()}
          onChange={setValue}
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
          )}
        >
          <ComboboxControl>
            <ComboboxInput />
            <ComboboxTrigger />
          </ComboboxControl>
          <ComboboxContent />
        </Combobox>
        <p class="text-muted-foreground text-sm">Selected: {value() ?? "None"}</p>
      </div>
    </Example>
  );
}
