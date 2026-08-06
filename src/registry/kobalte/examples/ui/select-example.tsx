import { ChartBar, ChartLine, ChartPie } from "lucide-solid";
import { For } from "solid-js";

import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/registry/kobalte/ui/item";
import { NativeSelect, NativeSelectOption } from "@/registry/kobalte/ui/native-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

type LabeledItem<Value = string> = {
  disabled?: boolean;
  label: string;
  value: Value;
};

const fruitItems = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
] satisfies LabeledItem[];

const fruitItemsWithPlaceholder = [
  { label: "Select a fruit", value: null },
  ...fruitItems,
] satisfies LabeledItem<string | null>[];

const fruitItemsWithDisabledGrapes = fruitItemsWithPlaceholder.map((item) =>
  item.value === "grapes" ? { ...item, disabled: true } : item,
);

const chartItems = ["line", "bar", "pie"] as const;

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

function LabeledSelectItems<Value>(props: { items: LabeledItem<Value>[] }) {
  return (
    <For each={props.items}>
      {(item) => (
        <SelectItem value={item.value} disabled={item.disabled}>
          {item.label}
        </SelectItem>
      )}
    </For>
  );
}

function LabeledSelectGroup<Value>(props: { items: LabeledItem<Value>[] }) {
  return (
    <SelectGroup>
      <LabeledSelectItems items={props.items} />
    </SelectGroup>
  );
}

function getChartLabel(item: (typeof chartItems)[number]) {
  if (item === "line") {
    return (
      <>
        <ChartLine />
        Line
      </>
    );
  }
  if (item === "bar") {
    return (
      <>
        <ChartBar />
        Bar
      </>
    );
  }
  return (
    <>
      <ChartPie />
      Pie
    </>
  );
}

function ChartTypeLabel() {
  return (
    <>
      <ChartLine />
      Chart Type
    </>
  );
}

export default function SelectExample() {
  return (
    <ExampleWrapper>
      <SelectBasic />
      <SelectSides />
      <SelectWithIcons />
      <SelectWithGroups />
      <SelectLargeList />
      <SelectMultiple />
      <SelectSizes />
      <SelectPlan />
      <SelectWithButton />
      <SelectItemAligned />
      <SelectWithField />
      <SelectInvalid />
      <SelectInline />
      <SelectDisabled />
      <SelectInDialog />
    </ExampleWrapper>
  );
}

function SelectBasic() {
  return (
    <Example title="Basic">
      <Select<string | null> items={fruitItemsWithPlaceholder}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectGroup items={fruitItemsWithPlaceholder} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectSides() {
  const items = [
    { label: "Select", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ] satisfies LabeledItem<string | null>[];
  const sides = ["inline-start", "left", "top", "bottom", "right", "inline-end"] as const;

  return (
    <Example title="Sides" containerClass="col-span-2">
      <div class="flex flex-wrap justify-center gap-2">
        <For each={sides}>
          {(side) => (
            <Select<string | null> items={items}>
              <SelectTrigger class="w-28 capitalize">
                <SelectValue placeholder={side.replace("-", " ")} />
              </SelectTrigger>
              <SelectContent side={side} alignItemWithTrigger={false}>
                <LabeledSelectGroup items={items} />
              </SelectContent>
            </Select>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectWithIcons() {
  const items = [
    { label: <ChartTypeLabel />, value: null },
    ...chartItems.map((value) => ({ label: getChartLabel(value), value })),
  ];

  return (
    <Example title="With Icons">
      <div class="flex flex-col gap-4">
        <For each={["sm", "default"] as const}>
          {(size) => (
            <Select<string | null> items={items}>
              <SelectTrigger size={size}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>
                    <ChartTypeLabel />
                  </SelectItem>
                  <For each={chartItems}>
                    {(item) => <SelectItem value={item}>{getChartLabel(item)}</SelectItem>}
                  </For>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectWithGroups() {
  const fruits = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ] satisfies LabeledItem[];
  const vegetables = [
    { label: "Carrot", value: "carrot" },
    { label: "Broccoli", value: "broccoli" },
    { label: "Spinach", value: "spinach" },
  ] satisfies LabeledItem[];
  const allItems = [
    { label: "Select a fruit", value: null },
    ...fruits,
    ...vegetables,
  ] satisfies LabeledItem<string | null>[];

  return (
    <Example title="With Groups & Labels">
      <Select<string | null> items={allItems}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <LabeledSelectItems items={fruits} />
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            <LabeledSelectItems items={vegetables} />
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectLargeList() {
  const items = Array.from({ length: 100 }, (_, index) => ({
    label: `Item ${index}`,
    value: `item-${index}`,
  }));
  const itemsWithPlaceholder = [
    { label: "Select an item", value: null },
    ...items,
  ] satisfies LabeledItem<string | null>[];

  return (
    <Example title="Large List">
      <Select<string | null> items={itemsWithPlaceholder}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectGroup items={itemsWithPlaceholder} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectMultiple() {
  const items = [
    ...fruitItems,
    { label: "Strawberry", value: "strawberry" },
    { label: "Watermelon", value: "watermelon" },
  ];

  return (
    <Example title="Multiple Selection">
      <Select<string, true> items={items} multiple defaultValue={[]}>
        <SelectTrigger class="w-72">
          <SelectValue<string[]> placeholder="Select fruits">
            {(values) =>
              values.length === 1
                ? items.find((item) => item.value === values[0])?.label
                : `${values.length} fruits selected`
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectGroup items={items} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectSizes() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ] satisfies LabeledItem<string | null>[];

  return (
    <Example title="Sizes">
      <div class="flex flex-col gap-4">
        <For
          each={
            [
              { label: "Small", size: "sm" },
              { label: "Default", size: "default" },
            ] as const
          }
        >
          {(example) => (
            <Select<string | null> items={items}>
              <SelectTrigger size={example.size}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <LabeledSelectGroup items={items} />
              </SelectContent>
            </Select>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectWithButton() {
  const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
  ] satisfies LabeledItem<string | null>[];

  return (
    <Example title="With Button">
      <div class="flex flex-col gap-4">
        <For each={["sm", "default"] as const}>
          {(size) => (
            <div class="flex items-center gap-2">
              <Select<string | null> items={items}>
                <SelectTrigger size={size}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <LabeledSelectGroup items={items} />
                </SelectContent>
              </Select>
              <Button variant="outline" size={size === "sm" ? "sm" : "default"}>
                Submit
              </Button>
            </div>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectItemAligned() {
  return (
    <Example title="Item Aligned">
      <Select<string | null> items={fruitItemsWithDisabledGrapes}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger>
          <LabeledSelectGroup items={fruitItemsWithDisabledGrapes} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectWithField() {
  return (
    <Example title="With Field">
      <Field>
        <FieldLabel for="select-fruit">Favorite Fruit</FieldLabel>
        <Select<string | null> items={fruitItemsWithPlaceholder}>
          <SelectTrigger id="select-fruit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectGroup items={fruitItemsWithPlaceholder} />
          </SelectContent>
        </Select>
        <FieldDescription>Choose your favorite fruit from the list.</FieldDescription>
      </Field>
    </Example>
  );
}

function SelectInvalid() {
  return (
    <Example title="Invalid">
      <div class="flex flex-col gap-4">
        <Select<string | null> items={fruitItemsWithPlaceholder}>
          <SelectTrigger aria-invalid="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectGroup items={fruitItemsWithPlaceholder} />
          </SelectContent>
        </Select>
        <Field data-invalid>
          <FieldLabel for="select-fruit-invalid">Favorite Fruit</FieldLabel>
          <Select<string | null> items={fruitItemsWithPlaceholder}>
            <SelectTrigger id="select-fruit-invalid" aria-invalid="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <LabeledSelectGroup items={fruitItemsWithPlaceholder} />
            </SelectContent>
          </Select>
          <FieldError errors={[{ message: "Please select a valid fruit." }]} />
        </Field>
      </div>
    </Example>
  );
}

function SelectInline() {
  const items = [
    { label: "Filter", value: null },
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ] satisfies LabeledItem<string | null>[];

  return (
    <Example title="Inline with Input & NativeSelect">
      <div class="flex items-center gap-2">
        <Input placeholder="Search..." class="flex-1" />
        <Select<string | null> items={items}>
          <SelectTrigger class="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectGroup items={items} />
          </SelectContent>
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
  return (
    <Example title="Disabled">
      <Select<string | null> items={fruitItemsWithDisabledGrapes} disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectGroup items={fruitItemsWithDisabledGrapes} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectPlan() {
  const items = plans.map((plan) => ({ label: plan.name, value: plan }));

  return (
    <Example title="Subscription Plan">
      <Select<(typeof plans)[number]>
        items={items}
        defaultValue={plans[0]}
        itemToStringValue={(plan) => plan.name}
      >
        <SelectTrigger class="h-auto! w-72">
          <SelectValue<(typeof plans)[number]>>
            {(plan) => <SelectPlanItem plan={plan} />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <For each={plans}>
              {(plan) => (
                <SelectItem value={plan} label={plan.name}>
                  <SelectPlanItem plan={plan} />
                </SelectItem>
              )}
            </For>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectPlanItem(props: { plan: (typeof plans)[number] }) {
  return (
    <Item size="xs" class="w-full p-0">
      <ItemContent class="gap-0 normal-case">
        <ItemTitle class="font-sans">{props.plan.name}</ItemTitle>
        <ItemDescription class="text-xs font-normal tracking-normal">
          {props.plan.description}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function SelectInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Example</DialogTitle>
            <DialogDescription>Use the select below to choose a fruit.</DialogDescription>
          </DialogHeader>
          <Select<string | null> items={fruitItemsWithPlaceholder}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <LabeledSelectGroup items={fruitItemsWithPlaceholder} />
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
