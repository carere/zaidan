import { createSignal, onMount } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Progress, ProgressLabel, ProgressValue } from "@/registry/ui/progress";

export default function ProgressExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <ProgressDemo />
      <ProgressWithLabel />
      <ProgressIndeterminate />
      <ProgressCustom />
    </ExampleWrapper>
  );
}

function ProgressDemo() {
  const [progress, setProgress] = createSignal(13);

  onMount(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  });

  return (
    <Example title="Default">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Progress value={progress()} class="w-[60%]" />
      </div>
    </Example>
  );
}

function ProgressWithLabel() {
  const [progress, setProgress] = createSignal(33);

  onMount(() => {
    const timer = setTimeout(() => setProgress(75), 500);
    return () => clearTimeout(timer);
  });

  return (
    <Example title="With Label">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Progress value={progress()}>
          <div class="flex w-full justify-between">
            <ProgressLabel>Loading...</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </div>
    </Example>
  );
}

function ProgressIndeterminate() {
  return (
    <Example title="Indeterminate">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Progress indeterminate>
          <ProgressLabel>Processing...</ProgressLabel>
        </Progress>
      </div>
    </Example>
  );
}

function ProgressCustom() {
  return (
    <Example title="Custom Value Range">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Progress value={5} minValue={0} maxValue={10}>
          <div class="flex w-full justify-between">
            <ProgressLabel>5 of 10 tasks completed</ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </div>
    </Example>
  );
}
