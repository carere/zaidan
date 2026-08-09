import { GripVertical } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Sortable, SortableItem, SortableItemHandle } from "@/registry/kobalte/blocks/sortable";
import { Badge } from "@/registry/kobalte/ui/badge";

type Lesson = {
  id: string;
  title: string;
};

const defaultLessons: Lesson[] = [
  { id: "1", title: "Introduction" },
  { id: "2", title: "Setting Up" },
  { id: "3", title: "Core Concepts" },
  { id: "4", title: "Going Further" },
];

// Simulated backend call that fails on every other attempt.
let attempt = 0;
function saveOrder(_order: string[]) {
  attempt += 1;
  const shouldFail = attempt % 2 === 0;
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => (shouldFail ? reject(new Error("Network error")) : resolve()), 600);
  });
}

export default function SortablePersistence() {
  const [lessons, setLessons] = createSignal<Lesson[]>(defaultLessons);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "failed">("idle");

  return (
    <div class="w-full max-w-md space-y-3">
      <Sortable
        value={lessons()}
        onValueChange={setLessons}
        getItemValue={(lesson) => lesson.id}
        onValueCommit={(value, meta) => {
          setStatus("saving");
          saveOrder(value.map((lesson) => lesson.id))
            .then(() => setStatus("saved"))
            .catch(() => {
              // Roll back the optimistic update on failure.
              setLessons(meta.previousValue);
              setStatus("failed");
            });
        }}
        class="space-y-2"
      >
        <For each={lessons()}>
          {(lesson, index) => (
            <SortableItem value={lesson.id}>
              <div class="flex items-center gap-3 rounded-md border bg-background p-3">
                <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                  <GripVertical class="size-4" />
                </SortableItemHandle>
                <span class="text-muted-foreground text-xs tabular-nums">
                  {String(index() + 1).padStart(2, "0")}
                </span>
                <p class="min-w-0 flex-1 truncate font-medium text-sm">{lesson.title}</p>
              </div>
            </SortableItem>
          )}
        </For>
      </Sortable>
      <div class="flex h-6 items-center" aria-live="polite">
        <Show when={status() === "saving"}>
          <Badge variant="secondary">Saving order…</Badge>
        </Show>
        <Show when={status() === "saved"}>
          <Badge>Order saved</Badge>
        </Show>
        <Show when={status() === "failed"}>
          <Badge variant="destructive">Save failed — order restored</Badge>
        </Show>
      </div>
    </div>
  );
}
