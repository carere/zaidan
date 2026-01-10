import { Example, ExampleWrapper } from "@/components/example";
import { Checkbox, CheckboxLabel } from "@/registry/ui/checkbox";

export default function CheckboxExample() {
  return (
    <ExampleWrapper>
      <CheckboxBasic />
      <CheckboxWithDescription />
      <CheckboxInvalid />
      <CheckboxDisabled />
      <CheckboxGroup />
    </ExampleWrapper>
  );
}

function CheckboxBasic() {
  return (
    <Example title="Basic">
      <Checkbox>
        <CheckboxLabel>Accept terms and conditions</CheckboxLabel>
      </Checkbox>
    </Example>
  );
}

function CheckboxWithDescription() {
  return (
    <Example title="With Description">
      <Checkbox defaultChecked>
        <div class="grid gap-1.5 leading-none">
          <CheckboxLabel>Accept terms and conditions</CheckboxLabel>
          <p class="text-muted-foreground text-sm">
            By clicking this checkbox, you agree to the terms and conditions.
          </p>
        </div>
      </Checkbox>
    </Example>
  );
}

function CheckboxInvalid() {
  return (
    <Example title="Invalid">
      <Checkbox validationState="invalid">
        <CheckboxLabel>Accept terms and conditions</CheckboxLabel>
      </Checkbox>
    </Example>
  );
}

function CheckboxDisabled() {
  return (
    <Example title="Disabled">
      <div class="flex flex-col gap-4">
        <Checkbox disabled>
          <CheckboxLabel>Disabled (Unchecked)</CheckboxLabel>
        </Checkbox>
        <Checkbox defaultChecked disabled>
          <CheckboxLabel>Disabled (Checked)</CheckboxLabel>
        </Checkbox>
      </div>
    </Example>
  );
}

function CheckboxGroup() {
  return (
    <Example title="Group">
      <div class="flex flex-col gap-2">
        <span class="font-medium text-sm">Show these items on the desktop:</span>
        <div class="flex flex-col gap-2">
          <Checkbox>
            <CheckboxLabel class="font-normal">Hard disks</CheckboxLabel>
          </Checkbox>
          <Checkbox>
            <CheckboxLabel class="font-normal">External disks</CheckboxLabel>
          </Checkbox>
          <Checkbox>
            <CheckboxLabel class="font-normal">CDs, DVDs, and iPods</CheckboxLabel>
          </Checkbox>
          <Checkbox>
            <CheckboxLabel class="font-normal">Connected servers</CheckboxLabel>
          </Checkbox>
        </div>
      </div>
    </Example>
  );
}
