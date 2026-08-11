import { createSignal } from "solid-js";
import { Label } from "@/registry/kobalte/ui/label";
import { Slider } from "@/registry/kobalte/ui/slider";

export default function SliderControlled() {
  const [value, setValue] = createSignal([0.3, 0.7]);

  return (
    <div class="mx-auto grid w-full max-w-xs gap-3">
      <div class="flex items-center justify-between gap-2">
        <Label for="slider-demo-temperature">Temperature</Label>
        <span class="text-muted-foreground text-sm">{value().join(", ")}</span>
      </div>
      <Slider
        id="slider-demo-temperature"
        value={value()}
        onChange={(nextValue) => setValue(nextValue)}
        minValue={0}
        maxValue={1}
        step={0.1}
      />
    </div>
  );
}
