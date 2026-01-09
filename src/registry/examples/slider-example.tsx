import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Slider } from "@/registry/ui/slider";

export default function SliderExample() {
  return (
    <ExampleWrapper>
      <SliderBasic />
      <SliderRange />
      <SliderMultiple />
      <SliderVertical />
      <SliderControlled />
      <SliderDisabled />
    </ExampleWrapper>
  );
}

function SliderBasic() {
  return (
    <Example title="Basic">
      <Slider defaultValue={[50]} maxValue={100} step={1} />
    </Example>
  );
}

function SliderRange() {
  return (
    <Example title="Range">
      <Slider defaultValue={[25, 50]} maxValue={100} step={5} />
    </Example>
  );
}

function SliderMultiple() {
  return (
    <Example title="Multiple Thumbs">
      <Slider defaultValue={[10, 20, 70]} maxValue={100} step={10} />
    </Example>
  );
}

function SliderVertical() {
  return (
    <Example title="Vertical">
      <div class="flex h-40 items-center gap-6">
        <Slider defaultValue={[50]} maxValue={100} step={1} orientation="vertical" />
        <Slider defaultValue={[25]} maxValue={100} step={1} orientation="vertical" />
      </div>
    </Example>
  );
}

function SliderControlled() {
  const [value, setValue] = createSignal([0.3, 0.7]);

  return (
    <Example title="Controlled">
      <div class="grid w-full gap-3">
        <div class="flex items-center justify-between gap-2">
          <label for="slider-demo-temperature">Temperature</label>
          <span class="text-muted-foreground text-sm">{value().join(", ")}</span>
        </div>
        <Slider
          id="slider-demo-temperature"
          value={value()}
          onChange={(value) => setValue(value)}
          minValue={0}
          maxValue={1}
          step={0.1}
        />
      </div>
    </Example>
  );
}

function SliderDisabled() {
  return (
    <Example title="Disabled">
      <Slider defaultValue={[50]} maxValue={100} step={1} disabled />
    </Example>
  );
}
