import { Label } from "@/registry/kobalte/ui/label";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export default function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="comfortable" class="w-fit">
      <div class="flex items-center gap-3">
        <RadioGroupItem value="default" id="radio-group-demo-default" />
        <Label for="radio-group-demo-default">Default</Label>
      </div>
      <div class="flex items-center gap-3">
        <RadioGroupItem value="comfortable" id="radio-group-demo-comfortable" />
        <Label for="radio-group-demo-comfortable">Comfortable</Label>
      </div>
      <div class="flex items-center gap-3">
        <RadioGroupItem value="compact" id="radio-group-demo-compact" />
        <Label for="radio-group-demo-compact">Compact</Label>
      </div>
    </RadioGroup>
  );
}
