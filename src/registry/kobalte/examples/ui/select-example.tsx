import { ChartBar, ChartLine, ChartPie } from "lucide-solid";
import { For, Show } from "solid-js";

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

type LabeledItem = {
  disabled?: boolean;
  label: string;
  value: string;
};

const fruitItems: LabeledItem[] = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes", disabled: true },
  { label: "Pineapple", value: "pineapple" },
];

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

function LabeledSelectItems(props: { items: LabeledItem[] }) {
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

export default function SelectExample() {
  return (
    <ExampleWrapper>
      <SelectBasic />
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
      <Select<string> items={fruitItems}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectItems items={fruitItems} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectWithIcons() {
  const items = chartItems.map((value) => ({ label: getChartLabel(value), value }));

  return (
    <Example title="With Icons">
      <div class="flex flex-col gap-4">
        <For each={["sm", "default"] as const}>
          {(size) => (
            <Select<(typeof chartItems)[number]> items={items}>
              <SelectTrigger size={size}>
                <SelectValue
                  placeholder={
                    <>
                      <ChartLine />
                      Chart Type
                    </>
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <For each={chartItems}>
                  {(item) => <SelectItem value={item}>{getChartLabel(item)}</SelectItem>}
                </For>
              </SelectContent>
            </Select>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectWithGroups() {
  const foods = [
    {
      label: "Fruits",
      items: [
        { label: "Apple", value: "apple" },
        { label: "Banana", value: "banana" },
        { label: "Blueberry", value: "blueberry" },
      ],
    },
    {
      label: "Vegetables",
      items: [
        { label: "Carrot", value: "carrot" },
        { label: "Broccoli", value: "broccoli" },
        { label: "Spinach", value: "spinach" },
      ],
    },
  ];

  return (
    <Example title="With Groups & Labels">
      <Select<string> items={foods}>
        <SelectTrigger>
          <SelectValue placeholder="Select a food" />
        </SelectTrigger>
        <SelectContent>
          <For each={foods}>
            {(group, index) => (
              <>
                <Show when={index() > 0}>
                  <SelectSeparator />
                </Show>
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  <LabeledSelectItems items={group.items} />
                </SelectGroup>
              </>
            )}
          </For>
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

  return (
    <Example title="Large List">
      <Select<string> items={items}>
        <SelectTrigger>
          <SelectValue placeholder="Select an item" />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectItems items={items} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectMultiple() {
  const items = [
    ...fruitItems.filter((item) => !item.disabled),
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
          <LabeledSelectItems items={items} />
        </SelectContent>
      </Select>
    </Example>
  );
}

function SelectSizes() {
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
            <Select<string> items={fruitItems}>
              <SelectTrigger size={example.size}>
                <SelectValue placeholder={example.label} />
              </SelectTrigger>
              <SelectContent>
                <LabeledSelectItems items={fruitItems} />
              </SelectContent>
            </Select>
          )}
        </For>
      </div>
    </Example>
  );
}

function SelectWithButton() {
  return (
    <Example title="With Button">
      <div class="flex flex-col gap-4">
        <For each={["sm", "default"] as const}>
          {(size) => (
            <div class="flex items-center gap-2">
              <Select<string> items={fruitItems}>
                <SelectTrigger size={size}>
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <LabeledSelectItems items={fruitItems} />
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
      <Select<string> items={fruitItems}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger>
          <LabeledSelectItems items={fruitItems} />
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
        <Select<string> items={fruitItems}>
          <SelectTrigger id="select-fruit">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectItems items={fruitItems} />
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
        <Select<string> items={fruitItems}>
          <SelectTrigger aria-invalid="true">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectItems items={fruitItems} />
          </SelectContent>
        </Select>
        <Field data-invalid>
          <FieldLabel for="select-fruit-invalid">Favorite Fruit</FieldLabel>
          <Select<string> items={fruitItems}>
            <SelectTrigger id="select-fruit-invalid" aria-invalid="true">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <LabeledSelectItems items={fruitItems} />
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
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  return (
    <Example title="Inline with Input & NativeSelect">
      <div class="flex items-center gap-2">
        <Input placeholder="Search..." class="flex-1" />
        <Select<string> items={items}>
          <SelectTrigger class="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <LabeledSelectItems items={items} />
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
      <Select<string> items={fruitItems} disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <LabeledSelectItems items={fruitItems} />
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
          <For each={plans}>
            {(plan) => (
              <SelectItem value={plan} label={plan.name}>
                <SelectPlanItem plan={plan} />
              </SelectItem>
            )}
          </For>
        </SelectContent>
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
          <Select<string> items={fruitItems}>
            <SelectTrigger>
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <LabeledSelectItems items={fruitItems} />
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
