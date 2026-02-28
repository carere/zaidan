import { createSignal } from "solid-js";
import { Field, FieldDescription, FieldTitle } from "@/registry/kobalte/ui/field";
import { Slider } from "@/registry/kobalte/ui/slider";

export default function FieldSlider() {
  const [value, setValue] = createSignal([200, 800]);
  return (
    <div class="w-full max-w-md">
      <Field>
        <FieldTitle>Price Range</FieldTitle>
        <FieldDescription>
          Set your budget range ($
          <span class="font-medium tabular-nums">{value()[0]}</span> -{" "}
          <span class="font-medium tabular-nums">{value()[1]}</span>).
        </FieldDescription>
        <Slider
          value={value()}
          onChange={(v) => setValue(v)}
          maxValue={1000}
          minValue={0}
          step={10}
          class="mt-2 w-full"
          aria-label="Price Range"
        />
      </Field>
    </div>
  );
}
