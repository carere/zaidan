import { Example, ExampleWrapper } from "@/components/example";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/registry/ui/field";
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group";

export default function RadioGroupExample() {
  return (
    <ExampleWrapper>
      <RadioGroupBasic />
      <RadioGroupWithDescriptions />
      <RadioGroupWithFieldSet />
      <RadioGroupGrid />
      <RadioGroupDisabled />
      <RadioGroupInvalid />
    </ExampleWrapper>
  );
}

function RadioGroupBasic() {
  return (
    <Example title="Basic">
      <RadioGroup defaultValue="compact">
        <Field orientation="horizontal">
          <RadioGroupItem value="default" id="r1" />
          <FieldLabel for="r1" class="font-normal">
            Default
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="comfortable" id="r2" />
          <FieldLabel for="r2" class="font-normal">
            Comfortable
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="compact" id="r3" />
          <FieldLabel for="r3" class="font-normal">
            Compact
          </FieldLabel>
        </Field>
      </RadioGroup>
    </Example>
  );
}

function RadioGroupWithDescriptions() {
  return (
    <Example title="With Descriptions">
      <RadioGroup defaultValue="plus">
        <FieldLabel for="plus-plan">
          <Field orientation="horizontal">
            <FieldContent>
              <div class="font-medium">Plus</div>
              <FieldDescription>For individuals and small teams</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="plus" id="plus-plan" />
          </Field>
        </FieldLabel>
        <FieldLabel for="pro-plan">
          <Field orientation="horizontal">
            <FieldContent>
              <div class="font-medium">Pro</div>
              <FieldDescription>For growing businesses</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="pro" id="pro-plan" />
          </Field>
        </FieldLabel>
        <FieldLabel for="enterprise-plan">
          <Field orientation="horizontal">
            <FieldContent>
              <div class="font-medium">Enterprise</div>
              <FieldDescription>For large teams and enterprises</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="enterprise" id="enterprise-plan" />
          </Field>
        </FieldLabel>
      </RadioGroup>
    </Example>
  );
}

function RadioGroupWithFieldSet() {
  return (
    <Example title="With FieldSet">
      <FieldSet>
        <FieldLegend>Battery Level</FieldLegend>
        <FieldDescription>Choose your preferred battery level.</FieldDescription>
        <RadioGroup defaultValue="medium">
          <Field orientation="horizontal">
            <RadioGroupItem value="high" id="battery-high" />
            <FieldLabel for="battery-high" class="font-normal">
              High
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="medium" id="battery-medium" />
            <FieldLabel for="battery-medium" class="font-normal">
              Medium
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="low" id="battery-low" />
            <FieldLabel for="battery-low" class="font-normal">
              Low
            </FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
    </Example>
  );
}

function RadioGroupGrid() {
  return (
    <Example title="Grid Layout">
      <RadioGroup defaultValue="medium" class="grid grid-cols-2 gap-2">
        <FieldLabel for="size-small">
          <Field orientation="horizontal">
            <RadioGroupItem value="small" id="size-small" />
            <div class="font-medium">Small</div>
          </Field>
        </FieldLabel>
        <FieldLabel for="size-medium">
          <Field orientation="horizontal">
            <RadioGroupItem value="medium" id="size-medium" />
            <div class="font-medium">Medium</div>
          </Field>
        </FieldLabel>
        <FieldLabel for="size-large">
          <Field orientation="horizontal">
            <RadioGroupItem value="large" id="size-large" />
            <div class="font-medium">Large</div>
          </Field>
        </FieldLabel>
        <FieldLabel for="size-xlarge">
          <Field orientation="horizontal">
            <RadioGroupItem value="xlarge" id="size-xlarge" />
            <div class="font-medium">X-Large</div>
          </Field>
        </FieldLabel>
      </RadioGroup>
    </Example>
  );
}

function RadioGroupDisabled() {
  return (
    <Example title="Disabled">
      <RadioGroup defaultValue="option2" disabled>
        <Field orientation="horizontal">
          <RadioGroupItem value="option1" id="disabled-1" />
          <FieldLabel for="disabled-1" class="font-normal">
            Option 1
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="option2" id="disabled-2" />
          <FieldLabel for="disabled-2" class="font-normal">
            Option 2
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="option3" id="disabled-3" />
          <FieldLabel for="disabled-3" class="font-normal">
            Option 3
          </FieldLabel>
        </Field>
      </RadioGroup>
    </Example>
  );
}

function RadioGroupInvalid() {
  return (
    <Example title="Invalid">
      <FieldSet>
        <FieldLegend>Notification Preferences</FieldLegend>
        <FieldDescription>Choose how you want to receive notifications.</FieldDescription>
        <RadioGroup defaultValue="email">
          <Field orientation="horizontal" data-invalid>
            <RadioGroupItem value="email" id="invalid-email" aria-invalid />
            <FieldLabel for="invalid-email" class="font-normal">
              Email only
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" data-invalid>
            <RadioGroupItem value="sms" id="invalid-sms" aria-invalid />
            <FieldLabel for="invalid-sms" class="font-normal">
              SMS only
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" data-invalid>
            <RadioGroupItem value="both" id="invalid-both" aria-invalid />
            <FieldLabel for="invalid-both" class="font-normal">
              Both Email & SMS
            </FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
    </Example>
  );
}
