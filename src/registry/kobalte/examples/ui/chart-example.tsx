import type { Component } from "solid-js";
import { createSignal, lazy, onMount, Show, Suspense } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";

type ChartModule = Record<string, Component>;

const chartLoaders = import.meta.glob<ChartModule>("../../charts/chart-area-default.tsx");

const ChartAreaDefault = lazy(async () => {
  const loader = chartLoaders["../../charts/chart-area-default.tsx"];
  if (!loader) throw new TypeError("The default Area Chart source is missing");
  const module = await loader();
  const component = module.ChartAreaDefault;
  if (!component) throw new TypeError("The default Area Chart export is missing");
  return { default: component };
});

export default function ChartExample() {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  return (
    <ExampleWrapper>
      <Example title="Area Chart">
        <Show when={mounted()} fallback={<div role="status">Loading Area Chart Preview</div>}>
          <Suspense fallback={<div role="status">Loading Area Chart Preview</div>}>
            <ChartAreaDefault />
          </Suspense>
        </Show>
      </Example>
    </ExampleWrapper>
  );
}
