import { Example, ExampleWrapper } from "@/components/example";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/registry/kobalte/ui/field";
import { Label } from "@/registry/kobalte/ui/label";
import { Switch } from "@/registry/kobalte/ui/switch";

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
          <Label for="switch-disabled-unchecked">Disabled (Unchecked)</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="switch-disabled-checked" defaultChecked disabled />
          <Label for="switch-disabled-checked">Disabled (Checked)</Label>
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
          <Label for="switch-size-sm">Small</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="switch-size-default" size="default" />
          <Label for="switch-size-default">Default</Label>
        </div>
      </div>
    </Example>
  );
}
