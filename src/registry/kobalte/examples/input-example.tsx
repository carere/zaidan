import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { NativeSelect, NativeSelectOption } from "@/registry/kobalte/ui/native-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

export default function InputExample() {
  return (
    <ExampleWrapper>
      <InputBasic />
      <InputInvalid />
      <InputWithLabel />
      <InputWithDescription />
      <InputDisabled />
      <InputTypes />
      <InputWithSelect />
      <InputWithButton />
      <InputWithNativeSelect />
      <InputForm />
    </ExampleWrapper>
  );
}

function InputBasic() {
  return (
    <Example title="Basic">
      <Input type="email" placeholder="Email" />
    </Example>
  );
}

function InputInvalid() {
  return (
    <Example title="Invalid">
      <Input type="text" placeholder="Error" aria-invalid="true" />
    </Example>
  );
}

function InputWithLabel() {
  return (
    <Example title="With Label">
      <Field>
        <FieldLabel for="input-demo-email">Email</FieldLabel>
        <Input id="input-demo-email" type="email" placeholder="name@example.com" />
      </Field>
    </Example>
  );
}

function InputWithDescription() {
  return (
    <Example title="With Description">
      <Field>
        <FieldLabel for="input-demo-username">Username</FieldLabel>
        <Input id="input-demo-username" type="text" placeholder="Enter your username" />
        <FieldDescription>Choose a unique username for your account.</FieldDescription>
      </Field>
    </Example>
  );
}

function InputDisabled() {
  return (
    <Example title="Disabled">
      <Field>
        <FieldLabel for="input-demo-disabled">Email</FieldLabel>
        <Input id="input-demo-disabled" type="email" placeholder="Email" disabled />
      </Field>
    </Example>
  );
}

function InputTypes() {
  return (
    <Example title="Input Types">
      <div class="flex w-full flex-col gap-6">
        <Field>
          <FieldLabel for="input-demo-password">Password</FieldLabel>
          <Input id="input-demo-password" type="password" placeholder="Password" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-tel">Phone</FieldLabel>
          <Input id="input-demo-tel" type="tel" placeholder="+1 (555) 123-4567" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-url">URL</FieldLabel>
          <Input id="input-demo-url" type="url" placeholder="https://example.com" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-search">Search</FieldLabel>
          <Input id="input-demo-search" type="search" placeholder="Search" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-number">Number</FieldLabel>
          <Input id="input-demo-number" type="number" placeholder="123" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-date">Date</FieldLabel>
          <Input id="input-demo-date" type="date" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-time">Time</FieldLabel>
          <Input id="input-demo-time" type="time" />
        </Field>
        <Field>
          <FieldLabel for="input-demo-file">File</FieldLabel>
          <Input id="input-demo-file" type="file" />
        </Field>
      </div>
    </Example>
  );
}

function InputWithSelect() {
  const currencies = [
    { label: "USD", value: "usd" },
    { label: "EUR", value: "eur" },
    { label: "GBP", value: "gbp" },
  ];

  return (
    <Example title="With Select">
      <div class="flex w-full gap-2">
        <Input type="text" placeholder="Enter amount" class="flex-1" />
        <Select
          options={currencies}
          optionValue="value"
          optionTextValue="label"
          defaultValue={currencies[0]}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger class="w-32">
            <SelectValue<(typeof currencies)[number]>>
              {(state) => state.selectedOption()?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    </Example>
  );
}

function InputWithButton() {
  return (
    <Example title="With Button">
      <div class="flex w-full gap-2">
        <Input type="search" placeholder="Search..." class="flex-1" />
        <Button>Search</Button>
      </div>
    </Example>
  );
}

function InputWithNativeSelect() {
  return (
    <Example title="With Native Select">
      <div class="flex w-full gap-2">
        <Input type="tel" placeholder="(555) 123-4567" class="flex-1" />
        <NativeSelect value="+1">
          <NativeSelectOption value="+1">+1</NativeSelectOption>
          <NativeSelectOption value="+44">+44</NativeSelectOption>
          <NativeSelectOption value="+46">+46</NativeSelectOption>
        </NativeSelect>
      </div>
    </Example>
  );
}

function InputForm() {
  const countries = [
    { label: "United States", value: "us" },
    { label: "United Kingdom", value: "uk" },
    { label: "Canada", value: "ca" },
  ];

  return (
    <Example title="Form">
      <form class="w-full">
        <FieldGroup>
          <Field>
            <FieldLabel for="form-name">Name</FieldLabel>
            <Input id="form-name" type="text" placeholder="John Doe" />
          </Field>
          <Field>
            <FieldLabel for="form-email">Email</FieldLabel>
            <Input id="form-email" type="email" placeholder="john@example.com" />
            <FieldDescription>We'll never share your email with anyone.</FieldDescription>
          </Field>
          <div class="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel for="form-phone">Phone</FieldLabel>
              <Input id="form-phone" type="tel" placeholder="+1 (555) 123-4567" />
            </Field>
            <Field>
              <FieldLabel for="form-country">Country</FieldLabel>
              <Select
                options={countries}
                optionValue="value"
                optionTextValue="label"
                defaultValue={countries[0]}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger id="form-country">
                  <SelectValue<(typeof countries)[number]>>
                    {(state) => state.selectedOption()?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel for="form-address">Address</FieldLabel>
            <Input id="form-address" type="text" placeholder="123 Main St" />
          </Field>
          <Field orientation="horizontal">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </Field>
        </FieldGroup>
      </form>
    </Example>
  );
}
