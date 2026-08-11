import { CalendarDays, GripVertical, MessageSquare, Paperclip, Plus, Undo2 } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";

export default function KanbanExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <Example title="Sprint board" class="p-6">
        <SprintBoard />
      </Example>
    </ExampleWrapper>
  );
}

type Priority = "critical" | "high" | "medium" | "low";
type Label = "Bug" | "Feature" | "Infra" | "Design";

type Task = {
  id: string;
  ref: string;
  title: string;
  label: Label;
  priority: Priority;
  handle: string;
  due: string;
  comments: number;
  attachments: number;
};

type ColumnTone = "secondary" | "info-light" | "warning-light" | "success-light";

const COLUMNS: Record<string, { title: string; tone: ColumnTone }> = {
  backlog: { title: "Backlog", tone: "secondary" },
  inProgress: { title: "In Progress", tone: "info-light" },
  review: { title: "In Review", tone: "warning-light" },
  shipped: { title: "Shipped", tone: "success-light" },
};

const PRIORITY_TONE = {
  critical: "destructive-light",
  high: "warning-light",
  medium: "info-light",
  low: "secondary",
} as const;

const LABEL_TONE = {
  Bug: "destructive-outline",
  Feature: "primary-outline",
  Infra: "info-outline",
  Design: "success-outline",
} as const;

const initialColumns: Record<string, Task[]> = {
  backlog: [
    {
      id: "zd-318",
      ref: "ZD-318",
      title: "Audit token contrast in the dark theme",
      label: "Design",
      priority: "medium",
      handle: "pranathip",
      due: "Aug 21",
      comments: 3,
      attachments: 2,
    },
    {
      id: "zd-322",
      ref: "ZD-322",
      title: "Virtualise the data grid row renderer",
      label: "Infra",
      priority: "high",
      handle: "maxleiter",
      due: "Aug 26",
      comments: 8,
      attachments: 0,
    },
    {
      id: "zd-327",
      ref: "ZD-327",
      title: "Empty states for the filters panel",
      label: "Design",
      priority: "low",
      handle: "jorgezreik",
      due: "Sep 02",
      comments: 1,
      attachments: 4,
    },
    {
      id: "zd-331",
      ref: "ZD-331",
      title: "Retire the legacy /v1 preferences endpoint",
      label: "Infra",
      priority: "low",
      handle: "evilrabbit",
      due: "Sep 09",
      comments: 0,
      attachments: 0,
    },
  ],
  inProgress: [
    {
      id: "zd-301",
      ref: "ZD-301",
      title: "Keyboard drag and drop for the board",
      label: "Feature",
      priority: "high",
      handle: "shadcn",
      due: "Aug 18",
      comments: 12,
      attachments: 1,
    },
    {
      id: "zd-305",
      ref: "ZD-305",
      title: "Sticky column headers clip on Safari 17",
      label: "Bug",
      priority: "critical",
      handle: "evilrabbit",
      due: "Aug 14",
      comments: 6,
      attachments: 3,
    },
    {
      id: "zd-309",
      ref: "ZD-309",
      title: "Gantt dependency arrows overlap when zoomed out",
      label: "Bug",
      priority: "medium",
      handle: "maxleiter",
      due: "Aug 20",
      comments: 2,
      attachments: 1,
    },
  ],
  review: [
    {
      id: "zd-288",
      ref: "ZD-288",
      title: "Toast queue drops rapid successive calls",
      label: "Bug",
      priority: "critical",
      handle: "jorgezreik",
      due: "Aug 13",
      comments: 9,
      attachments: 0,
    },
    {
      id: "zd-293",
      ref: "ZD-293",
      title: "Tighten week view density in the event calendar",
      label: "Design",
      priority: "medium",
      handle: "pranathip",
      due: "Aug 15",
      comments: 4,
      attachments: 2,
    },
  ],
  shipped: [
    {
      id: "zd-274",
      ref: "ZD-274",
      title: "Ship the badge status variants",
      label: "Feature",
      priority: "medium",
      handle: "shadcn",
      due: "Aug 06",
      comments: 5,
      attachments: 1,
    },
    {
      id: "zd-269",
      ref: "ZD-269",
      title: "Migrate every icon to lucide-solid",
      label: "Infra",
      priority: "low",
      handle: "maxleiter",
      due: "Aug 04",
      comments: 2,
      attachments: 0,
    },
  ],
};

// Cards the "+" button pulls from, so a new card still reads like real work.
const backlogIdeas: Omit<Task, "id" | "ref">[] = [
  {
    title: "Skeleton loaders for the board columns",
    label: "Feature",
    priority: "medium",
    handle: "shadcn",
    due: "Sep 12",
    comments: 0,
    attachments: 0,
  },
  {
    title: "Column drag misses on trackpad flick",
    label: "Bug",
    priority: "high",
    handle: "evilrabbit",
    due: "Sep 15",
    comments: 0,
    attachments: 0,
  },
  {
    title: "Persist board layout per workspace",
    label: "Infra",
    priority: "low",
    handle: "pranathip",
    due: "Sep 19",
    comments: 0,
    attachments: 0,
  },
];

function columnTitle(value: string) {
  return COLUMNS[value]?.title ?? value;
}

function TaskCardContent(props: { task: Task }) {
  return (
    <Card size="sm" class="gap-2 py-3 shadow-xs transition-shadow hover:shadow-md">
      <CardContent class="space-y-2 px-3">
        <div class="flex flex-wrap items-center gap-1">
          <Badge
            variant={LABEL_TONE[props.task.label]}
            class="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-[10px]"
          >
            {props.task.label}
          </Badge>
          <Badge
            variant={PRIORITY_TONE[props.task.priority]}
            class="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-[10px] capitalize"
          >
            {props.task.priority}
          </Badge>
          <span class="ms-auto font-mono text-[10px] text-muted-foreground tabular-nums">
            {props.task.ref}
          </span>
        </div>

        <p class="line-clamp-2 font-medium text-sm leading-snug">{props.task.title}</p>

        <div class="flex items-center justify-between gap-2 text-muted-foreground text-xs">
          <div class="flex min-w-0 items-center gap-1.5">
            <Avatar size="sm" class="size-5">
              <AvatarImage
                src={`https://github.com/${props.task.handle}.png`}
                alt={`@${props.task.handle}`}
              />
              <AvatarFallback>{props.task.handle.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span class="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
              <CalendarDays class="size-3" />
              {props.task.due}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-2 tabular-nums">
            <Show when={props.task.comments > 0}>
              <span class="inline-flex items-center gap-1">
                <MessageSquare class="size-3" />
                {props.task.comments}
              </span>
            </Show>
            <Show when={props.task.attachments > 0}>
              <span class="inline-flex items-center gap-1">
                <Paperclip class="size-3" />
                {props.task.attachments}
              </span>
            </Show>
          </div>
        </div>
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

function ColumnHeader(props: { value: string; count: number; onAdd?: () => void }) {
  return (
    <div class="flex items-center justify-between gap-2 px-0.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate font-semibold text-sm">{columnTitle(props.value)}</span>
        <Badge
          variant={COLUMNS[props.value]?.tone ?? "secondary"}
          class="pointer-events-none h-5 rounded-sm px-1.5 text-[11px] tabular-nums"
        >
          {props.count}
        </Badge>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <Show when={props.onAdd}>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Add a card to ${columnTitle(props.value)}`}
            onClick={() => props.onAdd?.()}
          >
            <Plus />
          </Button>
        </Show>
        <KanbanColumnHandle
          as={Button}
          size="icon-xs"
          variant="ghost"
          aria-label={`Reorder the ${columnTitle(props.value)} column`}
        >
          <GripVertical />
        </KanbanColumnHandle>
      </div>
    </div>
  );
}

function TaskColumn(props: { value: string; tasks: Task[]; onAdd: () => void }) {
  return (
    <KanbanColumn
      value={props.value}
      class="gap-2.5 rounded-xl border bg-muted/40 p-2.5 dark:bg-muted/20"
    >
      <ColumnHeader value={props.value} count={props.tasks.length} onAdd={props.onAdd} />
      <KanbanColumnContent value={props.value} class="min-h-16 gap-2.5">
        <For each={props.tasks}>{(task) => <TaskCard task={task} />}</For>
        <Show when={props.tasks.length === 0}>
          <p class="rounded-lg border border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
            Drop a card here
          </p>
        </Show>
      </KanbanColumnContent>
    </KanbanColumn>
  );
}

function SprintBoard() {
  const [columns, setColumns] = createSignal<Record<string, Task[]>>(initialColumns);
  const [activity, setActivity] = createSignal<string>();
  let created = 0;

  const openCount = () =>
    Object.entries(columns()).reduce(
      (total, [key, tasks]) => (key === "shipped" ? total : total + tasks.length),
      0,
    );

  const findTask = (id: string) => {
    for (const tasks of Object.values(columns())) {
      const match = tasks.find((task) => task.id === id);
      if (match) return match;
    }
    return undefined;
  };

  // `onValueCommit` fires once per completed drag, never during the live
  // preview, so it is the right place to report (or persist) a move.
  const handleValueCommit = (_next: Record<string, Task[]>, meta: KanbanCommitMeta<Task>) => {
    if (meta.kind === "column") {
      setActivity(`Reordered the ${columnTitle(meta.activeValue)} column`);
      return;
    }

    const ref = findTask(meta.activeValue)?.ref ?? meta.activeValue;
    setActivity(
      meta.activeContainer === meta.overContainer
        ? `Reordered ${ref} in ${columnTitle(meta.overContainer)}`
        : `Moved ${ref} from ${columnTitle(meta.activeContainer)} to ${columnTitle(meta.overContainer)}`,
    );
  };

  const addTask = (columnValue: string) => {
    const idea = backlogIdeas[created % backlogIdeas.length];
    created += 1;
    const task: Task = { ...idea, id: `zd-new-${created}`, ref: `ZD-${340 + created}` };
    setColumns((previous) => ({
      ...previous,
      [columnValue]: [...previous[columnValue], task],
    }));
    setActivity(`Added ${task.ref} to ${columnTitle(columnValue)}`);
  };

  const reset = () => {
    setColumns(initialColumns);
    created = 0;
    setActivity("Board reset to the start of the sprint");
  };

  return (
    <div class="w-full space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <h3 class="font-heading font-semibold text-base leading-none">
            Design System · Sprint 24
          </h3>
          <p class="text-muted-foreground text-xs">
            Drag a card between columns, or grab a column header to reorder the board.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Badge variant="primary-light" class="tabular-nums">
            {openCount()} open
          </Badge>
          <Button variant="outline" size="sm" onClick={reset}>
            <Undo2 />
            Reset
          </Button>
        </div>
      </div>

      <Kanban
        value={columns()}
        onValueChange={setColumns}
        onValueCommit={handleValueCommit}
        getItemValue={(task) => task.id}
        restoreOnCancel
      >
        <KanbanBoard class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <For each={Object.keys(columns())}>
            {(columnValue) => (
              <TaskColumn
                value={columnValue}
                tasks={columns()[columnValue] ?? []}
                onAdd={() => addTask(columnValue)}
              />
            )}
          </For>
        </KanbanBoard>
        <KanbanOverlay>
          {(params) => (
            <Show
              when={params.variant === "item"}
              fallback={
                <div class="rounded-xl border border-primary/40 bg-muted/60 p-2.5 shadow-lg backdrop-blur-sm">
                  <ColumnHeader value={params.value} count={columns()[params.value]?.length ?? 0} />
                </div>
              }
            >
              <Show when={findTask(params.value)}>
                {(task) => (
                  <div class="w-full rotate-1">
                    <TaskCardContent task={task()} />
                  </div>
                )}
              </Show>
            </Show>
          )}
        </KanbanOverlay>
      </Kanban>

      <p class="flex h-5 items-center text-muted-foreground text-xs" aria-live="polite">
        <Show when={activity()} fallback="Every completed drag is reported through onValueCommit.">
          {(text) => <span>{text()}</span>}
        </Show>
      </p>
    </div>
  );
}
