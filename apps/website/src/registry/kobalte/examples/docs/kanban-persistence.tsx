import { GripVertical } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  type KanbanCommitMeta,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/registry/kobalte/blocks/kanban";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";

type Task = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
};

const COLUMN_TITLES: Record<string, string> = {
  todo: "To Do",
  inProgress: "In Progress",
  done: "Done",
};

function priorityVariant(priority: Task["priority"]) {
  if (priority === "high") return "destructive" as const;
  if (priority === "medium") return "default" as const;
  return "secondary" as const;
}

// Simulated backend. In a real app this would be a mutation or a fetch to your
// API. Every other call fails so the optimistic rollback path is easy to see.
let attempt = 0;
function persistBoard(_meta: KanbanCommitMeta<Task>) {
  attempt += 1;
  const shouldFail = attempt % 2 === 0;
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => (shouldFail ? reject(new Error("Network error")) : resolve()), 700);
  });
}

function TaskCardContent(props: { task: Task }) {
  return (
    <Card>
      <CardContent class="flex items-start justify-between gap-2 px-3">
        <span class="min-w-0 flex-1 line-clamp-2 font-medium text-sm">{props.task.title}</span>
        <Badge
          variant={priorityVariant(props.task.priority)}
          class="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-xs capitalize"
        >
          {props.task.priority}
        </Badge>
      </CardContent>
    </Card>
  );
}

function TaskCard(props: { task: Task }) {
  return (
    <KanbanItem value={props.task.id}>
      <KanbanItemHandle>
        <TaskCardContent task={props.task} />
      </KanbanItemHandle>
    </KanbanItem>
  );
}

function TaskColumn(props: { value: string; tasks: Task[] }) {
  const title = () => COLUMN_TITLES[props.value] ?? props.value;

  return (
    <KanbanColumn value={props.value}>
      <Card class="mb-2.5">
        <CardHeader class="flex items-center justify-between px-3">
          <div class="flex items-center gap-2.5">
            <span class="font-semibold text-sm">{title()}</span>
            <Badge variant="outline">{props.tasks.length}</Badge>
          </div>
          <KanbanColumnHandle
            as={Button}
            size="icon-xs"
            variant="ghost"
            aria-label={`Reorder ${title()} column`}
          >
            <GripVertical />
          </KanbanColumnHandle>
        </CardHeader>
        <CardContent class="px-3">
          <KanbanColumnContent value={props.value} class="flex flex-col gap-2.5">
            <For each={props.tasks}>{(task) => <TaskCard task={task} />}</For>
          </KanbanColumnContent>
        </CardContent>
      </Card>
    </KanbanColumn>
  );
}

const defaultColumns: Record<string, Task[]> = {
  todo: [
    { id: "1", title: "Add authentication", priority: "high" },
    { id: "2", title: "Create API endpoints", priority: "medium" },
    { id: "3", title: "Write documentation", priority: "low" },
  ],
  inProgress: [
    { id: "4", title: "Design system updates", priority: "high" },
    { id: "5", title: "Implement dark mode", priority: "medium" },
  ],
  done: [{ id: "6", title: "Setup project", priority: "low" }],
};

export default function KanbanPersistence() {
  const [columns, setColumns] = createSignal<Record<string, Task[]>>(defaultColumns);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "failed">("idle");
  const [label, setLabel] = createSignal("");

  // Fires once per completed drag, never during the hover preview. The first
  // argument is the final board (already on screen, because onValueChange
  // applied it live), so only meta.previousValue is needed to roll back.
  const handleValueCommit = (_next: Record<string, Task[]>, meta: KanbanCommitMeta<Task>) => {
    const previous = meta.previousValue;
    setLabel(
      meta.kind === "column"
        ? `Reordered "${COLUMN_TITLES[meta.activeContainer] ?? meta.activeContainer}"`
        : `Moved "${meta.activeValue}" to "${COLUMN_TITLES[meta.overContainer] ?? meta.overContainer}"`,
    );
    setStatus("saving");

    persistBoard(meta)
      .then(() => setStatus("saved"))
      .catch(() => {
        // Roll back to the pre-drag arrangement. In production prefer a refetch
        // here so a newer drag is not clobbered by this snapshot.
        setColumns(previous);
        setStatus("failed");
      });
  };

  return (
    <div class="w-full space-y-3">
      <Kanban
        value={columns()}
        onValueChange={setColumns}
        getItemValue={(task) => task.id}
        onValueCommit={handleValueCommit}
      >
        <KanbanBoard class="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
          <For each={Object.keys(columns())}>
            {(columnValue) => (
              <TaskColumn value={columnValue} tasks={columns()[columnValue] ?? []} />
            )}
          </For>
        </KanbanBoard>
        <KanbanOverlay class="rounded-md border-2 border-dashed bg-muted/10" />
      </Kanban>
      <div class="flex h-6 items-center" aria-live="polite">
        <Show when={status() === "saving"}>
          <Badge variant="secondary">Saving board…</Badge>
        </Show>
        <Show when={status() === "saved"}>
          <Badge>{label()} — saved</Badge>
        </Show>
        <Show when={status() === "failed"}>
          <Badge variant="destructive">Could not save — board restored</Badge>
        </Show>
      </div>
    </div>
  );
}
