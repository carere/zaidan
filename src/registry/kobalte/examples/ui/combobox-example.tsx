import { ChevronDown, Globe } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";
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
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
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
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";

const toastManager = createToastManager();

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

const continentNames = {
  A: "Asia",
  E: "Europe",
  F: "Africa",
  N: "North America",
  O: "Oceania",
  S: "South America",
} as const;

const countries = `||Select country|
af|afghanistan|Afghanistan|A
al|albania|Albania|E
dz|algeria|Algeria|F
ad|andorra|Andorra|E
ao|angola|Angola|F
ar|argentina|Argentina|S
am|armenia|Armenia|A
au|australia|Australia|O
at|austria|Austria|E
az|azerbaijan|Azerbaijan|A
bs|bahamas|Bahamas|N
bh|bahrain|Bahrain|A
bd|bangladesh|Bangladesh|A
bb|barbados|Barbados|N
by|belarus|Belarus|E
be|belgium|Belgium|E
bz|belize|Belize|N
bj|benin|Benin|F
bt|bhutan|Bhutan|A
bo|bolivia|Bolivia|S
ba|bosnia-and-herzegovina|Bosnia and Herzegovina|E
bw|botswana|Botswana|F
br|brazil|Brazil|S
bn|brunei|Brunei|A
bg|bulgaria|Bulgaria|E
bf|burkina-faso|Burkina Faso|F
bi|burundi|Burundi|F
kh|cambodia|Cambodia|A
cm|cameroon|Cameroon|F
ca|canada|Canada|N
cv|cape-verde|Cape Verde|F
cf|central-african-republic|Central African Republic|F
td|chad|Chad|F
cl|chile|Chile|S
cn|china|China|A
co|colombia|Colombia|S
km|comoros|Comoros|F
cg|congo|Congo|F
cr|costa-rica|Costa Rica|N
hr|croatia|Croatia|E
cu|cuba|Cuba|N
cy|cyprus|Cyprus|A
cz|czech-republic|Czech Republic|E
dk|denmark|Denmark|E
dj|djibouti|Djibouti|F
dm|dominica|Dominica|N
do|dominican-republic|Dominican Republic|N
ec|ecuador|Ecuador|S
eg|egypt|Egypt|F
sv|el-salvador|El Salvador|N
gq|equatorial-guinea|Equatorial Guinea|F
er|eritrea|Eritrea|F
ee|estonia|Estonia|E
et|ethiopia|Ethiopia|F
fj|fiji|Fiji|O
fi|finland|Finland|E
fr|france|France|E
ga|gabon|Gabon|F
gm|gambia|Gambia|F
ge|georgia|Georgia|A
de|germany|Germany|E
gh|ghana|Ghana|F
gr|greece|Greece|E
gd|grenada|Grenada|N
gt|guatemala|Guatemala|N
gn|guinea|Guinea|F
gw|guinea-bissau|Guinea-Bissau|F
gy|guyana|Guyana|S
ht|haiti|Haiti|N
hn|honduras|Honduras|N
hu|hungary|Hungary|E
is|iceland|Iceland|E
in|india|India|A
id|indonesia|Indonesia|A
ir|iran|Iran|A
iq|iraq|Iraq|A
ie|ireland|Ireland|E
il|israel|Israel|A
it|italy|Italy|E
jm|jamaica|Jamaica|N
jp|japan|Japan|A
jo|jordan|Jordan|A
kz|kazakhstan|Kazakhstan|A
ke|kenya|Kenya|F
kw|kuwait|Kuwait|A
kg|kyrgyzstan|Kyrgyzstan|A
la|laos|Laos|A
lv|latvia|Latvia|E
lb|lebanon|Lebanon|A
ls|lesotho|Lesotho|F
lr|liberia|Liberia|F
ly|libya|Libya|F
li|liechtenstein|Liechtenstein|E
lt|lithuania|Lithuania|E
lu|luxembourg|Luxembourg|E
mg|madagascar|Madagascar|F
mw|malawi|Malawi|F
my|malaysia|Malaysia|A
mv|maldives|Maldives|A
ml|mali|Mali|F
mt|malta|Malta|E
mh|marshall-islands|Marshall Islands|O
mr|mauritania|Mauritania|F
mu|mauritius|Mauritius|F
mx|mexico|Mexico|N
fm|micronesia|Micronesia|O
md|moldova|Moldova|E
mc|monaco|Monaco|E
mn|mongolia|Mongolia|A
me|montenegro|Montenegro|E
ma|morocco|Morocco|F
mz|mozambique|Mozambique|F
mm|myanmar|Myanmar|A
na|namibia|Namibia|F
nr|nauru|Nauru|O
np|nepal|Nepal|A
nl|netherlands|Netherlands|E
nz|new-zealand|New Zealand|O
ni|nicaragua|Nicaragua|N
ne|niger|Niger|F
ng|nigeria|Nigeria|F
kp|north-korea|North Korea|A
mk|north-macedonia|North Macedonia|E
no|norway|Norway|E
om|oman|Oman|A
pk|pakistan|Pakistan|A
pw|palau|Palau|O
ps|palestine|Palestine|A
pa|panama|Panama|N
pg|papua-new-guinea|Papua New Guinea|O
py|paraguay|Paraguay|S
pe|peru|Peru|S
ph|philippines|Philippines|A
pl|poland|Poland|E
pt|portugal|Portugal|E
qa|qatar|Qatar|A
ro|romania|Romania|E
ru|russia|Russia|E
rw|rwanda|Rwanda|F
ws|samoa|Samoa|O
sm|san-marino|San Marino|E
sa|saudi-arabia|Saudi Arabia|A
sn|senegal|Senegal|F
rs|serbia|Serbia|E
sc|seychelles|Seychelles|F
sl|sierra-leone|Sierra Leone|F
sg|singapore|Singapore|A
sk|slovakia|Slovakia|E
si|slovenia|Slovenia|E
sb|solomon-islands|Solomon Islands|O
so|somalia|Somalia|F
za|south-africa|South Africa|F
kr|south-korea|South Korea|A
ss|south-sudan|South Sudan|F
es|spain|Spain|E
lk|sri-lanka|Sri Lanka|A
sd|sudan|Sudan|F
sr|suriname|Suriname|S
se|sweden|Sweden|E
ch|switzerland|Switzerland|E
sy|syria|Syria|A
tw|taiwan|Taiwan|A
tj|tajikistan|Tajikistan|A
tz|tanzania|Tanzania|F
th|thailand|Thailand|A
tl|timor-leste|Timor-Leste|A
tg|togo|Togo|F
to|tonga|Tonga|O
tt|trinidad-and-tobago|Trinidad and Tobago|N
tn|tunisia|Tunisia|F
tr|turkey|Turkey|A
tm|turkmenistan|Turkmenistan|A
tv|tuvalu|Tuvalu|O
ug|uganda|Uganda|F
ua|ukraine|Ukraine|E
ae|united-arab-emirates|United Arab Emirates|A
gb|united-kingdom|United Kingdom|E
us|united-states|United States|N
uy|uruguay|Uruguay|S
uz|uzbekistan|Uzbekistan|A
vu|vanuatu|Vanuatu|O
va|vatican-city|Vatican City|E
ve|venezuela|Venezuela|S
vn|vietnam|Vietnam|A
ye|yemen|Yemen|A
zm|zambia|Zambia|F
zw|zimbabwe|Zimbabwe|F`
  .split("\n")
  .map((row) => {
    const [code, value, label, continent] = row.split("|");

    return {
      code,
      value,
      label,
      continent: continent ? continentNames[continent as keyof typeof continentNames] : "",
    };
  });

const timezones = [
  {
    value: "Americas",
    items: [
      "(GMT-5) New York",
      "(GMT-8) Los Angeles",
      "(GMT-6) Chicago",
      "(GMT-5) Toronto",
      "(GMT-8) Vancouver",
      "(GMT-3) São Paulo",
    ],
  },
  {
    value: "Europe",
    items: [
      "(GMT+0) London",
      "(GMT+1) Paris",
      "(GMT+1) Berlin",
      "(GMT+1) Rome",
      "(GMT+1) Madrid",
      "(GMT+1) Amsterdam",
    ],
  },
  {
    value: "Asia/Pacific",
    items: [
      "(GMT+9) Tokyo",
      "(GMT+8) Shanghai",
      "(GMT+8) Singapore",
      "(GMT+4) Dubai",
      "(GMT+11) Sydney",
      "(GMT+9) Seoul",
    ],
  },
];

const disabledFrameworks = ["Nuxt.js", "Remix"];
const largeListItems = Array.from({ length: 100 }, (_, index) => `Item ${index + 1}`);
const selectItems = [
  { label: "Select a framework", value: null },
  { label: "React", value: "react" },
  { label: "Vue", value: "vue" },
  { label: "Angular", value: "angular" },
  { label: "Svelte", value: "svelte" },
  { label: "Solid", value: "solid" },
  { label: "Preact", value: "preact" },
  { label: "Next.js", value: "next.js" },
];

export default function ComboboxExample() {
  return (
    <>
      <Toaster toastManager={toastManager} />
      <ExampleWrapper>
        <ComboboxBasic />
        <ComboboxDisabled />
        <ComboboxSides />
        <ComboboxInvalid />
        <ComboboxWithClear />
        <ComboboxAutoHighlight />
        <ComboboxWithGroups />
        <ComboboxWithGroupsAndSeparator />
        <ComboboxLargeList />
        <ComboboxInputAddon />
        <ComboboxInPopup />
        <ComboboxWithForm />
        <ComboboxMultiple />
        <ComboboxMultipleDisabled />
        <ComboboxMultipleInvalid />
        <ComboboxMultipleNoRemove />
        <ComboboxWithCustomItems />
        <ComboboxInDialog />
        <ComboboxWithOtherInputs />
        <ComboboxDisabledItems />
      </ExampleWrapper>
    </>
  );
}

function FrameworkList(props: { disabledItems?: readonly string[] }) {
  return (
    <ComboboxList>
      {(item: string) => (
        <ComboboxItem value={item} disabled={props.disabledItems?.includes(item)}>
          {item}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

function ComboboxBasic() {
  return (
    <Example title="Basic">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxSides() {
  const sides = ["inline-start", "left", "top", "bottom", "right", "inline-end"] as const;

  return (
    <Example title="Sides" containerClass="col-span-2">
      <div class="flex flex-wrap justify-center gap-2">
        <For each={sides}>
          {(side) => (
            <Combobox items={frameworks}>
              <ComboboxInput
                placeholder={side.replace("-", " ")}
                class="w-32 **:data-[slot=input-group-control]:capitalize"
              />
              <ComboboxContent side={side}>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <FrameworkList />
              </ComboboxContent>
            </Combobox>
          )}
        </For>
      </div>
    </Example>
  );
}

function ComboboxDisabled() {
  return (
    <Example title="Disabled">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework" disabled />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxDisabledItems() {
  return (
    <Example title="Disabled Items">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList disabledItems={disabledFrameworks} />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxInvalid() {
  return (
    <Example title="Invalid">
      <div class="flex flex-col gap-4">
        <Combobox items={frameworks}>
          <ComboboxInput placeholder="Select a framework" aria-invalid="true" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <FrameworkList />
          </ComboboxContent>
        </Combobox>
        <Field data-invalid="true">
          <FieldLabel for="combobox-framework-invalid">Framework</FieldLabel>
          <Combobox items={frameworks}>
            <ComboboxInput
              id="combobox-framework-invalid"
              placeholder="Select a framework"
              aria-invalid="true"
            />
            <ComboboxContent>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <FrameworkList />
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
      <Combobox items={frameworks} defaultValue={frameworks[0]}>
        <ComboboxInput placeholder="Select a framework" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithGroups() {
  return (
    <Example title="With Groups">
      <Combobox items={timezones}>
        <ComboboxInput placeholder="Select a timezone" />
        <ComboboxContent>
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof timezones)[number]) => (
              <ComboboxGroup items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: string) => <ComboboxItem value={item}>{item}</ComboboxItem>}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithGroupsAndSeparator() {
  return (
    <Example title="With Groups and Separator">
      <Combobox items={timezones}>
        <ComboboxInput placeholder="Select a timezone" />
        <ComboboxContent>
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof timezones)[number]) => (
              <ComboboxGroup items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: string) => <ComboboxItem value={item}>{item}</ComboboxItem>}
                </ComboboxCollection>
                <ComboboxSeparator />
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxWithForm() {
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const framework = new FormData(event.currentTarget as HTMLFormElement).get("framework");
    toastManager.add({ title: `You selected ${framework} as your framework.` });
  };

  return (
    <Example title="Form with Combobox">
      <Card class="w-full max-w-sm" size="sm">
        <CardContent>
          <form id="form-with-combobox" class="w-full" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel for="framework">Framework</FieldLabel>
                <Combobox items={frameworks}>
                  <ComboboxInput
                    id="framework"
                    name="framework"
                    placeholder="Select a framework"
                    required
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                    <FrameworkList />
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

function ComboboxLargeList() {
  return (
    <Example title="Large List (100 items)">
      <Combobox items={largeListItems}>
        <ComboboxInput placeholder="Search from 100 items" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxAutoHighlight() {
  return (
    <Example title="With Auto Highlight">
      <Combobox items={frameworks} autoHighlight>
        <ComboboxInput placeholder="Select a framework" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxInputAddon() {
  return (
    <Example title="With Icon Addon">
      <Combobox items={timezones}>
        <ComboboxInput placeholder="Select a timezone">
          <InputGroupAddon>
            <Globe />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent alignOffset={-28} class="w-60">
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof timezones)[number]) => (
              <ComboboxGroup items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: string) => <ComboboxItem value={item}>{item}</ComboboxItem>}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxInPopup() {
  return (
    <Example title="Combobox in Popup">
      <Combobox items={countries} defaultValue={countries[0]}>
        <ComboboxTrigger as={Button} variant="outline" class="w-64 justify-between font-normal">
          <ComboboxValue />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput showTrigger={false} placeholder="Search" />
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(item: (typeof countries)[number]) => (
              <ComboboxItem value={item}>{item.label}</ComboboxItem>
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
    <Example title="Combobox Multiple">
      <Combobox<string, true>
        multiple
        autoHighlight
        items={frameworks}
        defaultValue={[frameworks[0]]}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values) => (
              <>
                <For each={values as string[]}>
                  {(value) => <ComboboxChip>{value}</ComboboxChip>}
                </For>
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxMultipleDisabled() {
  const anchor = useComboboxAnchor();

  return (
    <Example title="Combobox Multiple Disabled">
      <Combobox<string, true>
        multiple
        autoHighlight
        items={frameworks}
        defaultValue={[frameworks[0], frameworks[1]]}
        disabled
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values) => (
              <>
                <For each={values as string[]}>
                  {(value) => <ComboboxChip>{value}</ComboboxChip>}
                </For>
                <ComboboxChipsInput disabled />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
    </Example>
  );
}

function ComboboxMultipleInvalid() {
  const standaloneInvalidAnchor = useComboboxAnchor();
  const fieldInvalidAnchor = useComboboxAnchor();

  return (
    <Example title="Combobox Multiple Invalid">
      <div class="flex flex-col gap-4">
        <Combobox<string, true>
          multiple
          autoHighlight
          items={frameworks}
          defaultValue={[frameworks[0], frameworks[1]]}
        >
          <ComboboxChips ref={standaloneInvalidAnchor}>
            <ComboboxValue>
              {(values) => (
                <>
                  <For each={values as string[]}>
                    {(value) => <ComboboxChip>{value}</ComboboxChip>}
                  </For>
                  <ComboboxChipsInput aria-invalid="true" />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={standaloneInvalidAnchor}>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <FrameworkList />
          </ComboboxContent>
        </Combobox>
        <Field data-invalid="true">
          <FieldLabel for="combobox-multiple-invalid">Frameworks</FieldLabel>
          <Combobox<string, true>
            multiple
            autoHighlight
            items={frameworks}
            defaultValue={[frameworks[0], frameworks[1], frameworks[2]]}
          >
            <ComboboxChips ref={fieldInvalidAnchor}>
              <ComboboxValue>
                {(values) => (
                  <>
                    <For each={values as string[]}>
                      {(value) => <ComboboxChip>{value}</ComboboxChip>}
                    </For>
                    <ComboboxChipsInput id="combobox-multiple-invalid" aria-invalid="true" />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={fieldInvalidAnchor}>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <FrameworkList />
            </ComboboxContent>
          </Combobox>
          <FieldDescription>Please select at least one framework.</FieldDescription>
          <FieldError errors={[{ message: "This field is required." }]} />
        </Field>
      </div>
    </Example>
  );
}

function ComboboxMultipleNoRemove() {
  const anchor = useComboboxAnchor();

  return (
    <Example title="Combobox Multiple (No Remove)">
      <Combobox<string, true>
        multiple
        autoHighlight
        items={frameworks}
        defaultValue={[frameworks[0], frameworks[1]]}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values) => (
              <>
                <For each={values as string[]}>
                  {(value) => <ComboboxChip showRemove={false}>{value}</ComboboxChip>}
                </For>
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
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
        items={countries.filter((country) => country.code !== "")}
        itemToStringLabel={(country) => country.label}
        itemToStringValue={(country) => country.label}
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

function ComboboxInDialog() {
  const [open, setOpen] = createSignal(false);

  return (
    <Example title="Combobox in Dialog">
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
            <Combobox items={frameworks}>
              <ComboboxInput id="framework-dialog" placeholder="Select a framework" />
              <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <FrameworkList />
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
                toastManager.add({ title: "Framework selected." });
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

function ComboboxWithOtherInputs() {
  return (
    <Example title="With Other Inputs">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework" class="w-52" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <FrameworkList />
        </ComboboxContent>
      </Combobox>
      <Select items={selectItems}>
        <SelectTrigger class="w-52" aria-label="Select a framework">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <For each={selectItems}>
              {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
            </For>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button variant="outline" class="w-52 justify-between font-normal text-muted-foreground">
        Select a framework
        <ChevronDown />
      </Button>
      <Input placeholder="Select a framework" class="w-52" />
      <InputGroup class="w-52">
        <InputGroupInput placeholder="Select a framework" />
        <InputGroupAddon align="inline-end">
          <ChevronDown />
        </InputGroupAddon>
      </InputGroup>
    </Example>
  );
}
