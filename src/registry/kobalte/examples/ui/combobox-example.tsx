import { ChevronDown, Globe } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/registry/kobalte/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

export default function ComboboxExample() {
  return (
    <ExampleWrapper>
      <ComboboxBasic />
      <ComboboxDisabled />
      <ComboboxInvalid />
      <ComboboxWithClear />
      <ComboboxWithGroups />
      <ComboboxWithGroupsAndSeparator />
      <ComboboxLargeList />
      <ComboboxWithIconAddon />
      <ComboboxWithForm />
      <ComboboxMultiple />
      <ComboboxMultipleDisabled />
      <ComboboxMultipleInvalid />
      <ComboboxWithCustomItems />
      <ComboboxWithField />
      <ComboboxInDialog />
      <ComboboxWithOtherInputs />
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
        placeholder="Select a framework..."
        disabled
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
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
      <div class="flex flex-col gap-4">
        <Combobox
          options={frameworks}
          placeholder="Select a framework..."
          validationState="invalid"
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
          )}
        >
          <ComboboxInput placeholder="Select a framework..." aria-invalid="true" />
          <ComboboxContent>
            <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
        <Field data-invalid>
          <FieldLabel for="combobox-framework-invalid">Framework</FieldLabel>
          <Combobox
            options={frameworks}
            placeholder="Select a framework..."
            validationState="invalid"
            itemComponent={(props) => (
              <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
            )}
          >
            <ComboboxInput
              id="combobox-framework-invalid"
              placeholder="Select a framework..."
              aria-invalid="true"
            />
            <ComboboxContent>
              <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
          <FieldDescription>Please select a valid framework.</FieldDescription>
          <FieldError errors={[{ message: "This field is required." }]} />
        </Field>
      </div>
    </Example>
  );
}

function ComboboxWithClear() {
  return (
    <Example title="With Clear Button">
      <Combobox
        options={frameworks}
        placeholder="Select a framework..."
        defaultValue={frameworks[0]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
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
          <ComboboxSection>
            <ComboboxSectionLabel>{props.section.rawValue.label}</ComboboxSectionLabel>
          </ComboboxSection>
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

function ComboboxWithGroupsAndSeparator() {
  return (
    <Example title="With Groups and Separator">
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

function ComboboxWithForm() {
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const framework = formData.get("framework") as string;
    toast(`You selected ${framework} as your framework.`);
  };

  return (
    <Example title="Form with Combobox">
      <Card class="w-full max-w-sm" size="sm">
        <CardContent>
          <form id="form-with-combobox" class="w-full" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel for="framework">Framework</FieldLabel>
                <Combobox
                  options={frameworks}
                  placeholder="Select a framework..."
                  itemComponent={(props) => (
                    <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
                  )}
                >
                  <ComboboxInput
                    id="framework"
                    name="framework"
                    placeholder="Select a framework..."
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" form="form-with-combobox">
            Submit
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function ComboboxMultiple() {
  return (
    <Example title="Multiple Selection">
      <Combobox<(typeof frameworks)[number]>
        options={frameworks}
        placeholder="Select frameworks..."
        multiple
        defaultValue={[frameworks[0]]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
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

function ComboboxMultipleDisabled() {
  return (
    <Example title="Multiple Selection Disabled">
      <Combobox<(typeof frameworks)[number]>
        options={frameworks}
        placeholder="Select frameworks..."
        multiple
        disabled
        defaultValue={[frameworks[0], frameworks[1]]}
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
        )}
      >
        <ComboboxInput placeholder="Select frameworks..." disabled />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxMultipleInvalid() {
  return (
    <Example title="Multiple Selection Invalid">
      <div class="flex flex-col gap-4">
        <Combobox<(typeof frameworks)[number]>
          options={frameworks}
          placeholder="Select frameworks..."
          multiple
          validationState="invalid"
          defaultValue={[frameworks[0], frameworks[1]]}
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
          )}
        >
          <ComboboxInput placeholder="Select frameworks..." aria-invalid="true" />
          <ComboboxContent>
            <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
        <Field data-invalid>
          <FieldLabel for="combobox-multiple-invalid">Frameworks</FieldLabel>
          <Combobox<(typeof frameworks)[number]>
            options={frameworks}
            placeholder="Select frameworks..."
            multiple
            validationState="invalid"
            defaultValue={[frameworks[0], frameworks[1], frameworks[2]]}
            itemComponent={(props) => (
              <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
            )}
          >
            <ComboboxInput
              id="combobox-multiple-invalid"
              placeholder="Select frameworks..."
              aria-invalid="true"
            />
            <ComboboxContent>
              <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
          <FieldDescription>Please select at least one framework.</FieldDescription>
          <FieldError errors={[{ message: "This field is required." }]} />
        </Field>
      </div>
    </Example>
  );
}

const countries = [
  { code: "af", value: "afghanistan", label: "Afghanistan", continent: "Asia" },
  { code: "al", value: "albania", label: "Albania", continent: "Europe" },
  { code: "dz", value: "algeria", label: "Algeria", continent: "Africa" },
  { code: "ad", value: "andorra", label: "Andorra", continent: "Europe" },
  { code: "ao", value: "angola", label: "Angola", continent: "Africa" },
  { code: "ar", value: "argentina", label: "Argentina", continent: "South America" },
  { code: "am", value: "armenia", label: "Armenia", continent: "Asia" },
  { code: "au", value: "australia", label: "Australia", continent: "Oceania" },
  { code: "at", value: "austria", label: "Austria", continent: "Europe" },
  { code: "az", value: "azerbaijan", label: "Azerbaijan", continent: "Asia" },
  { code: "bs", value: "bahamas", label: "Bahamas", continent: "North America" },
  { code: "bh", value: "bahrain", label: "Bahrain", continent: "Asia" },
  { code: "bd", value: "bangladesh", label: "Bangladesh", continent: "Asia" },
  { code: "bb", value: "barbados", label: "Barbados", continent: "North America" },
  { code: "by", value: "belarus", label: "Belarus", continent: "Europe" },
  { code: "be", value: "belgium", label: "Belgium", continent: "Europe" },
  { code: "br", value: "brazil", label: "Brazil", continent: "South America" },
  { code: "ca", value: "canada", label: "Canada", continent: "North America" },
  { code: "cn", value: "china", label: "China", continent: "Asia" },
  { code: "fr", value: "france", label: "France", continent: "Europe" },
  { code: "de", value: "germany", label: "Germany", continent: "Europe" },
  { code: "in", value: "india", label: "India", continent: "Asia" },
  { code: "jp", value: "japan", label: "Japan", continent: "Asia" },
  { code: "mx", value: "mexico", label: "Mexico", continent: "North America" },
  { code: "gb", value: "united-kingdom", label: "United Kingdom", continent: "Europe" },
  { code: "us", value: "united-states", label: "United States", continent: "North America" },
];

function ComboboxWithCustomItems() {
  return (
    <Example title="With Custom Item Rendering">
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
          placeholder="Select a framework..."
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
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
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Framework</DialogTitle>
            <DialogDescription>
              Choose your preferred framework from the list below.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel for="framework-dialog" class="sr-only">
              Framework
            </FieldLabel>
            <Combobox
              options={frameworks}
              placeholder="Select a framework..."
              itemComponent={(props) => (
                <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
              )}
            >
              <ComboboxInput id="framework-dialog" placeholder="Select a framework..." />
              <ComboboxContent>
                <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                toast("Framework selected.");
                setOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

const selectItems = [
  { label: "Select a framework", value: "" },
  { label: "React", value: "react" },
  { label: "Vue", value: "vue" },
  { label: "Angular", value: "angular" },
  { label: "Svelte", value: "svelte" },
  { label: "Solid", value: "solid" },
  { label: "Preact", value: "preact" },
  { label: "Next.js", value: "next.js" },
];

function ComboboxWithOtherInputs() {
  return (
    <Example title="With Other Inputs">
      <Combobox
        options={frameworks}
        placeholder="Select a framework..."
        itemComponent={(props) => (
          <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
        )}
      >
        <ComboboxInput class="w-52" placeholder="Select a framework..." />
        <ComboboxContent>
          <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <Select<(typeof selectItems)[number]>
        options={selectItems}
        optionValue="value"
        optionTextValue="label"
        defaultValue={selectItems[0]}
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger class="w-52">
          <SelectValue<(typeof selectItems)[number]>>
            {(state) => state.selectedOption()?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup />
        </SelectContent>
      </Select>
      <Button variant="outline" class="w-52 justify-between font-normal text-muted-foreground">
        Select a framework
        <ChevronDown class="size-4" />
      </Button>
      <Input placeholder="Select a framework" class="w-52" />
      <InputGroup class="w-52">
        <InputGroupInput placeholder="Select a framework" />
        <InputGroupAddon align="inline-end">
          <ChevronDown class="size-4" />
        </InputGroupAddon>
      </InputGroup>
    </Example>
  );
}
