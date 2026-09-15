import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Label } from "@/registry/kobalte/ui/label";

export default function LabelDemo() {
  return (
    <div class="flex gap-2">
      <Checkbox id="terms" />
      <Label for="terms">Accept terms and conditions</Label>
    </div>
  );
}
