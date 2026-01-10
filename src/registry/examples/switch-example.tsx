import { Example, ExampleWrapper } from "@/components/example";
import { Switch } from "@/registry/ui/switch";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "../ui/field";

export default function SwitchExample() {
  return (
    <ExampleWrapper>
      <SwitchBasic />
      <SwitchWithDescription />
      <SwitchDisabled />
      <SwitchSizes />
    </ExampleWrapper>
  );
}

function SwitchBasic() {
  return (
    <Example title="Basic">
      <Field orientation="horizontal">
        <Switch id="switch-basic" />
        <FieldLabel for="switch-basic">Airplane Mode</FieldLabel>
      </Field>
    </Example>
  );
}

function SwitchWithDescription() {
  return (
    <Example title="With Description">
      <FieldLabel for="switch-focus-mode">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Share across devices</FieldTitle>
            <FieldDescription>
              Focus is shared across devices, and turns off when you leave the app.
            </FieldDescription>
          </FieldContent>
          <Switch id="switch-focus-mode" />
        </Field>
      </FieldLabel>
    </Example>
  );
}

function SwitchDisabled() {
  return (
    <Example title="Disabled">
      <div class="flex flex-col gap-12">
        <div class="flex items-center gap-2">
          <Switch id="switch-disabled-unchecked" disabled />
          <label for="switch-disabled-unchecked">Disabled (Unchecked)</label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="switch-disabled-checked" defaultChecked disabled />
          <label for="switch-disabled-checked">Disabled (Checked)</label>
        </div>
      </div>
    </Example>
  );
}

function SwitchSizes() {
  return (
    <Example title="Sizes">
      <div class="flex flex-col gap-12">
        <div class="flex items-center gap-2">
          <Switch id="switch-size-sm" size="sm" />
          <label for="switch-size-sm">Small</label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="switch-size-default" size="default" />
          <label for="switch-size-default">Default</label>
        </div>
      </div>
    </Example>
  );
}
