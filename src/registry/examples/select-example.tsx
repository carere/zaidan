import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Input } from "@/registry/ui/input";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/registry/ui/item";
import { NativeSelect, NativeSelectOption } from "@/registry/ui/native-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";

export default function SelectExample() {
  return (
    <ExampleWrapper>
      <SelectBasic />
      <SelectWithGroups />
      <SelectLargeList />
      <SelectSizes />
      <SelectWithButton />
      <SelectItemAligned />
      <SelectPlan />
      <SelectInvalid />
      <SelectInline />
      <SelectDisabled />
    </ExampleWrapper>
  );
}

function SelectBasic() {
  const items = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ];
  return (
    <Example title="Basic">
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a fruit"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

function SelectWithGroups() {
  const fruits = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ];
  const vegetables = [
    { label: "Carrot", value: "carrot" },
    { label: "Broccoli", value: "broccoli" },
    { label: "Spinach", value: "spinach" },
  ];

  return (
    <Example title="With Groups & Labels">
      <Select<(typeof fruits)[number]>
        options={[...fruits, ...vegetables]}
        optionValue="value"
        optionTextValue="label"
        optionGroupChildren="items"
        placeholder="Select a food"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
        sectionComponent={(props) => (
          <SelectGroup>
            <SelectLabel>{props.section.rawValue.label}</SelectLabel>
            <For each={props.section.options}>
              {(item) => <SelectItem item={item}>{item.rawValue.label}</SelectItem>}
            </For>
          </SelectGroup>
        )}
      >
        <SelectTrigger>
          <SelectValue<(typeof fruits)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <For each={fruits}>{(item) => <SelectItem item={item}>{item.label}</SelectItem>}</For>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            <For each={vegetables}>
              {(item) => <SelectItem item={item}>{item.label}</SelectItem>}
            </For>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectLargeList() {
  const items = Array.from({ length: 100 }).map((_, i) => ({
    label: `Item ${i}`,
    value: `item-${i}`,
  }));
  return (
    <Example title="Large List">
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select an item"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

function SelectSizes() {
  const items = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ];
  return (
    <Example title="Sizes">
      <div class="flex flex-col gap-4">
        <Select
          options={items}
          optionValue="value"
          optionTextValue="label"
          placeholder="Small"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger size="sm">
            <SelectValue<(typeof items)[number]>>
              {(state) => state.selectedOption().label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Select
          options={items}
          optionValue="value"
          optionTextValue="label"
          placeholder="Default"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger size="default">
            <SelectValue<(typeof items)[number]>>
              {(state) => state.selectedOption().label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    </Example>
  );
}

function SelectWithButton() {
  const items = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ];
  return (
    <Example title="With Button">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Select
            options={items}
            optionValue="value"
            optionTextValue="label"
            placeholder="Select a fruit"
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
            )}
          >
            <SelectTrigger size="sm">
              <SelectValue<(typeof items)[number]>>
                {(state) => state.selectedOption().label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
          <Button variant="outline" size="sm">
            Submit
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Select
            options={items}
            optionValue="value"
            optionTextValue="label"
            placeholder="Select a fruit"
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
            )}
          >
            <SelectTrigger>
              <SelectValue<(typeof items)[number]>>
                {(state) => state.selectedOption().label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
          <Button variant="outline">Submit</Button>
        </div>
      </div>
    </Example>
  );
}

function SelectItemAligned() {
  const items = [
    { label: "Apple", value: "apple", disabled: false },
    { label: "Banana", value: "banana", disabled: false },
    { label: "Blueberry", value: "blueberry", disabled: false },
    { label: "Grapes", value: "grapes", disabled: true },
    { label: "Pineapple", value: "pineapple", disabled: false },
  ];
  return (
    <Example title="Item Aligned">
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        optionDisabled="disabled"
        placeholder="Select a fruit"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

function SelectInvalid() {
  const items = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
  ];
  return (
    <Example title="Invalid">
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select a fruit"
        validationState="invalid"
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger aria-invalid="true">
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

function SelectInline() {
  const items = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];
  return (
    <Example title="Inline with Input & NativeSelect">
      <div class="flex items-center gap-2">
        <Input placeholder="Search..." class="flex-1" />
        <Select
          options={items}
          optionValue="value"
          optionTextValue="label"
          placeholder="Filter"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger class="w-[140px]">
            <SelectValue<(typeof items)[number]>>
              {(state) => state.selectedOption().label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
        <NativeSelect class="w-[140px]">
          <NativeSelectOption value="">Sort by</NativeSelectOption>
          <NativeSelectOption value="name">Name</NativeSelectOption>
          <NativeSelectOption value="date">Date</NativeSelectOption>
          <NativeSelectOption value="status">Status</NativeSelectOption>
        </NativeSelect>
      </div>
    </Example>
  );
}

function SelectDisabled() {
  const items = [
    { label: "Apple", value: "apple", disabled: false },
    { label: "Banana", value: "banana", disabled: false },
    { label: "Blueberry", value: "blueberry", disabled: false },
    { label: "Grapes", value: "grapes", disabled: true },
    { label: "Pineapple", value: "pineapple", disabled: false },
  ];
  return (
    <Example title="Disabled">
      <Select
        options={items}
        optionValue="value"
        optionTextValue="label"
        optionDisabled="disabled"
        placeholder="Select a fruit"
        disabled
        itemComponent={(props) => (
          <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger>
          <SelectValue<(typeof items)[number]>>
            {(state) => state.selectedOption().label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

const plans = [
  {
    name: "Starter",
    description: "Perfect for individuals getting started.",
  },
  {
    name: "Professional",
    description: "Ideal for growing teams and businesses.",
  },
  {
    name: "Enterprise",
    description: "Advanced features for large organizations.",
  },
];

function SelectPlan() {
  return (
    <Example title="Subscription Plan">
      <Select
        options={plans}
        optionValue="name"
        optionTextValue="name"
        defaultValue={plans[0]}
        itemComponent={(props) => (
          <SelectItem item={props.item}>
            <SelectPlanItem plan={props.item.rawValue} />
          </SelectItem>
        )}
      >
        <SelectTrigger class="h-auto! w-72">
          <SelectValue<(typeof plans)[number]>>
            {(state) => <SelectPlanItem plan={state.selectedOption()} />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Example>
  );
}

function SelectPlanItem(props: { plan: (typeof plans)[number] }) {
  return (
    <Item size="xs" class="w-full p-0">
      <ItemContent class="gap-0">
        <ItemTitle>{props.plan.name}</ItemTitle>
        <ItemDescription class="text-xs">{props.plan.description}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
