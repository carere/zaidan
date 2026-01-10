import { Example, ExampleWrapper } from "@/components/example";
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group";

export default function RadioGroupExample() {
  return (
    <ExampleWrapper>
      <RadioGroupBasic />
      <RadioGroupDisabled />
    </ExampleWrapper>
  );
}

function RadioGroupBasic() {
  return (
    <Example title="Basic">
      <RadioGroup defaultValue="comfortable" class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <RadioGroupItem value="default" />
          <label for="default">Default</label>
        </div>
        <div class="flex items-center gap-3">
          <RadioGroupItem value="comfortable" />
          <label for="comfortable">Comfortable</label>
        </div>
        <div class="flex items-center gap-3">
          <RadioGroupItem value="compact" />
          <label for="compact">Compact</label>
        </div>
      </RadioGroup>
    </Example>
  );
}

function RadioGroupDisabled() {
  return (
    <Example title="Disabled">
      <RadioGroup defaultValue="option2" class="flex flex-col gap-3" disabled>
        <div class="flex items-center gap-3">
          <RadioGroupItem value="option1" />
          <label for="option1">Option 1</label>
        </div>
        <div class="flex items-center gap-3">
          <RadioGroupItem value="option2" />
          <label for="option2">Option 2</label>
        </div>
        <div class="flex items-center gap-3">
          <RadioGroupItem value="option3" />
          <label for="option3">Option 3</label>
        </div>
      </RadioGroup>
    </Example>
  );
}
