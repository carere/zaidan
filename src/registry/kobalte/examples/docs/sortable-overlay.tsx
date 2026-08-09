import { GripVertical } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/registry/kobalte/blocks/sortable";

type Step = {
  id: string;
  name: string;
  description: string;
};

const defaultSteps: Step[] = [
  { id: "1", name: "Lint", description: "Static analysis and formatting checks" },
  { id: "2", name: "Build", description: "Compile and bundle the application" },
  { id: "3", name: "Test", description: "Unit and integration test suites" },
  { id: "4", name: "Deploy", description: "Ship the release to production" },
];

function StepRow(props: { step: Step }) {
  return (
    <div class="flex items-center gap-3 rounded-md border bg-background p-3">
      <SortableItemHandle class="text-muted-foreground hover:text-foreground">
        <GripVertical class="size-4" />
      </SortableItemHandle>
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium text-sm">{props.step.name}</p>
        <p class="truncate text-muted-foreground text-xs">{props.step.description}</p>
      </div>
    </div>
  );
}

export default function SortableOverlayDemo() {
  const [steps, setSteps] = createSignal<Step[]>(defaultSteps);

  return (
    <Sortable
      value={steps()}
      onValueChange={setSteps}
      getItemValue={(step) => step.id}
      class="w-full max-w-md space-y-2"
    >
      <For each={steps()}>
        {(step) => (
          <SortableItem value={step.id}>
            <StepRow step={step} />
          </SortableItem>
        )}
      </For>
      <SortableOverlay>
        {(params: { value: string }) => {
          const active = createMemo(() => steps().find((step) => step.id === params.value));
          return (
            <Show when={active()}>
              {(step) => (
                <SortableItem value={step().id} class="shadow-lg">
                  <StepRow step={step()} />
                </SortableItem>
              )}
            </Show>
          );
        }}
      </SortableOverlay>
    </Sortable>
  );
}
