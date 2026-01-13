import { Globe } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxSection,
  ComboboxSectionLabel,
  ComboboxSeparator,
  ComboboxTrigger,
} from "@/registry/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/registry/ui/field";
import { InputGroupAddon } from "@/registry/ui/input-group";

export default function ComboboxExample() {
  return (
    <ExampleWrapper>
      <ComboboxBasic />
      <ComboboxDisabled />
      <ComboboxInvalid />
      <ComboboxWithClear />
      <ComboboxWithGroups />
      <ComboboxLargeList />
      <ComboboxWithIconAddon />
      <ComboboxPopupStyle />
      <ComboboxMultiple />
      <ComboboxWithField />
      <ComboboxInDialog />
    </ExampleWrapper>
  );
}

const frameworks = [
  { label: "Next.js", value: "nextjs" },
  { label: "SvelteKit", value: "sveltekit" },
  { label: "Nuxt.js", value: "nuxtjs" },
  { label: "Remix", value: "remix" },
  { label: "Astro", value: "astro" },
];

function ComboboxBasic() {
  return (
    <Example title="Basic">
      <Combobox
        options={frameworks}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a framework..."
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select a framework..." />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxDisabled() {
  return (
    <Example title="Disabled">
      <Combobox
        options={frameworks}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a framework..."
        disabled
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select a framework..." disabled />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxInvalid() {
  return (
    <Example title="Invalid">
      <Combobox
        options={frameworks}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a framework..."
        validationState="invalid"
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select a framework..." aria-invalid="true" />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithClear() {
  return (
    <Example title="With Clear Button">
      <Combobox
        options={frameworks}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a framework..."
        defaultValue={frameworks[0]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select a framework..." showClear />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

type TimezoneOption = string;

type TimezoneGroup = {
  label: string;
  options: TimezoneOption[];
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
      "(GMT-3) Sao Paulo",
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

function ComboboxWithGroups() {
  return (
    <Example title="With Groups">
      <Combobox<TimezoneOption, TimezoneGroup>
        options={timezones}
        optionValue={(opt) => opt}
        optionTextValue={(opt) => opt}
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
        <ComboboxInput placeholder="Select a timezone..." />
        <ComboboxContent>
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

const largeList = Array.from({ length: 100 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: `item-${i + 1}`,
}));

function ComboboxLargeList() {
  return (
    <Example title="Large List (100 items)">
      <Combobox
        options={largeList}
        optionValue="value"
        optionTextValue="label"
        placeholder="Search from 100 items..."
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Search from 100 items..." />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithIconAddon() {
  return (
    <Example title="With Icon Addon">
      <Combobox<TimezoneOption, TimezoneGroup>
        options={timezones}
        optionValue={(opt) => opt}
        optionTextValue={(opt) => opt}
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
            <Globe class="size-4" />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent class="w-60">
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

const countries = [
  { code: "us", label: "United States", continent: "North America" },
  { code: "ca", label: "Canada", continent: "North America" },
  { code: "gb", label: "United Kingdom", continent: "Europe" },
  { code: "de", label: "Germany", continent: "Europe" },
  { code: "fr", label: "France", continent: "Europe" },
  { code: "jp", label: "Japan", continent: "Asia" },
  { code: "au", label: "Australia", continent: "Oceania" },
  { code: "br", label: "Brazil", continent: "South America" },
];

function ComboboxPopupStyle() {
  return (
    <Example title="Popup Style (Button Trigger)">
      <Combobox
        options={countries}
        optionValue="code"
        optionTextValue="label"
        placeholder="Select a country..."
        defaultValue={countries[0]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxTrigger class="w-64 justify-between font-normal" as={Button} variant="outline">
          <span data-slot="combobox-value">
            {/* Value will be shown via placeholder or selected value */}
            Select a country...
          </span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput showTrigger={false} placeholder="Search countries..." />
          <ComboboxEmpty>No countries found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxMultiple() {
  return (
    <Example title="Multiple Selection">
      <Combobox<(typeof frameworks)[number]>
        options={frameworks}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select frameworks..."
        multiple
        defaultValue={[frameworks[0]]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select frameworks..." />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithField() {
  return (
    <Example title="With Field">
      <Field>
        <FieldLabel for="combobox-framework">Favorite Framework</FieldLabel>
        <Combobox
          options={frameworks}
          optionValue="value"
          optionTextValue="label"
          placeholder="Select a framework..."
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
          )}
        >
          <ComboboxInput id="combobox-framework" placeholder="Select a framework..." />
          <ComboboxContent>
            <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
        <FieldDescription>Choose your favorite JavaScript framework.</FieldDescription>
      </Field>
    </Example>
  );
}

function ComboboxInDialog() {
  const [open, setOpen] = createSignal(false);

  return (
    <Example title="In Dialog">
      <Dialog open={open()} onOpenChange={setOpen}>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Framework</DialogTitle>
            <DialogDescription>
              Choose your preferred framework from the list below.
            </DialogDescription>
          </DialogHeader>
          <Combobox
            options={frameworks}
            optionValue="value"
            optionTextValue="label"
            placeholder="Select a framework..."
            itemComponent={(props) => (
              <ComboboxItem item={props.item}>{props.item.rawValue.label}</ComboboxItem>
            )}
          >
            <ComboboxInput placeholder="Select a framework..." />
            <ComboboxContent>
              <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
