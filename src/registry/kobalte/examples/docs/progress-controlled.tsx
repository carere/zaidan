import { createSignal } from "solid-js";
import { Progress } from "@/registry/kobalte/ui/progress";
import { Slider } from "@/registry/kobalte/ui/slider";

export default function ProgressControlled() {
  const [value, setValue] = createSignal(50);

  return (
    <div class="flex w-full max-w-sm flex-col gap-4">
      <Progress value={value()} class="w-full" />
      <Slider
        value={[value()]}
        onChange={(values) => setValue(values[0])}
        minValue={0}
        maxValue={100}
        step={1}
        aria-label="Progress value"
      />
    </div>
  );
}
