import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Slider } from "@/registry/ui/slider";

export default function SliderExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <SliderDemo />
      <SliderRange />
      <SliderVertical />
      <SliderStep />
      <SliderControlled />
    </ExampleWrapper>
  );
}

function SliderDemo() {
  return (
    <Example title="Default">
      <div class="mx-auto flex w-full max-w-lg items-center justify-center">
        <Slider defaultValue={[50]} maxValue={100} step={1} class="w-[60%]" />
      </div>
    </Example>
  );
}

function SliderRange() {
  return (
    <Example title="Range">
      <div class="mx-auto flex w-full max-w-lg items-center justify-center">
        <Slider defaultValue={[25, 75]} maxValue={100} step={1} class="w-[60%]" />
      </div>
    </Example>
  );
}

function SliderVertical() {
  return (
    <Example title="Vertical">
      <div class="mx-auto flex h-48 w-full max-w-lg items-center justify-center">
        <Slider defaultValue={[50]} maxValue={100} step={1} orientation="vertical" />
      </div>
    </Example>
  );
}

function SliderStep() {
  return (
    <Example title="Step (10)">
      <div class="mx-auto flex w-full max-w-lg items-center justify-center">
        <Slider defaultValue={[50]} maxValue={100} step={10} class="w-[60%]" />
      </div>
    </Example>
  );
}

function SliderControlled() {
  const [value, setValue] = createSignal([33]);
  return (
    <Example title="Controlled">
      <div class="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4">
        <Slider value={value()} onChange={setValue} maxValue={100} step={1} class="w-[60%]" />
        <p class="text-muted-foreground text-sm">Value: {value()[0]}</p>
      </div>
    </Example>
  );
}
