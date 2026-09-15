import { GripVertical } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/registry/kobalte/blocks/kanban";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";

type Task = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  assignee?: string;
  assigneeAvatar?: string;
  dueDate?: string;
};

const COLUMN_TITLES: Record<string, string> = {
  backlog: "Backlog",
  inProgress: "In Progress",
  review: "Review",
  done: "Done",
};

function priorityVariant(priority: Task["priority"]) {
  if (priority === "high") return "destructive" as const;
  if (priority === "medium") return "default" as const;
  return "secondary" as const;
}

function TaskCardContent(props: { task: Task }) {
  return (
    <Card>
      <CardContent class="flex flex-col gap-2.5 px-3">
        <div class="flex items-start justify-between gap-2">
          <span class="min-w-0 flex-1 line-clamp-2 font-medium text-sm">{props.task.title}</span>
          <Badge
            variant={priorityVariant(props.task.priority)}
            class="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-[11px] capitalize"
          >
            {props.task.priority}
          </Badge>
        </div>
        <div class="flex items-center justify-between text-muted-foreground text-xs">
          <Show when={props.task.assignee}>
            {(assignee) => (
              <div class="flex items-center gap-1">
                <Avatar class="size-4">
                  <AvatarImage src={props.task.assigneeAvatar} alt={assignee()} />
                  <AvatarFallback>{assignee().charAt(0)}</AvatarFallback>
                </Avatar>
                <span class="line-clamp-1">{assignee()}</span>
              </div>
            )}
          </Show>
          <Show when={props.task.dueDate}>
            {(dueDate) => (
              <time class="whitespace-nowrap text-[10px] tabular-nums">{dueDate()}</time>
            )}
          </Show>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard(props: { task: Task; asHandle?: boolean }) {
  return (
    <KanbanItem value={props.task.id}>
      <Show when={props.asHandle} fallback={<TaskCardContent task={props.task} />}>
        <KanbanItemHandle>
          <TaskCardContent task={props.task} />
        </KanbanItemHandle>
      </Show>
    </KanbanItem>
  );
}

function TaskColumn(props: { value: string; tasks: Task[]; isOverlay?: boolean }) {
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
          <KanbanColumnContent value={props.value} class="flex flex-col gap-2.5 p-0.5">
            <For each={props.tasks}>
              {(task) => <TaskCard task={task} asHandle={!props.isOverlay} />}
            </For>
          </KanbanColumnContent>
        </CardContent>
      </Card>
    </KanbanColumn>
  );
}

const defaultColumns: Record<string, Task[]> = {
  backlog: [
    {
      id: "1",
      title: "Add authentication",
      priority: "high",
      assignee: "Alex Johnson",
      assigneeAvatar: "https://avatar.vercel.sh/alex-johnson",
      dueDate: "Jan 10, 2025",
    },
    {
      id: "2",
      title: "Create API endpoints",
      priority: "medium",
      assignee: "Sarah Chen",
      assigneeAvatar: "https://avatar.vercel.sh/sarah-chen",
      dueDate: "Jan 15, 2025",
    },
    {
      id: "3",
      title: "Write documentation",
      priority: "low",
      assignee: "Michael Rodriguez",
      assigneeAvatar: "https://avatar.vercel.sh/michael-rodriguez",
      dueDate: "Jan 20, 2025",
    },
  ],
  inProgress: [
    {
      id: "4",
      title: "Design system updates",
      priority: "high",
      assignee: "Emma Wilson",
      assigneeAvatar: "https://avatar.vercel.sh/emma-wilson",
      dueDate: "Aug 25, 2025",
    },
    {
      id: "5",
      title: "Implement dark mode",
      priority: "medium",
      assignee: "David Kim",
      assigneeAvatar: "https://avatar.vercel.sh/david-kim",
      dueDate: "Aug 25, 2025",
    },
  ],
  done: [
    {
      id: "7",
      title: "Setup project",
      priority: "high",
      assignee: "Aron Thompson",
      assigneeAvatar: "https://avatar.vercel.sh/aron-thompson",
      dueDate: "Sep 25, 2025",
    },
    {
      id: "8",
      title: "Initial commit",
      priority: "low",
      assignee: "James Brown",
      assigneeAvatar: "https://avatar.vercel.sh/james-brown",
      dueDate: "Sep 20, 2025",
    },
  ],
};

export default function KanbanOverlayDemo() {
  const [columns, setColumns] = createSignal<Record<string, Task[]>>(defaultColumns);

  const findTask = (id: string) =>
    Object.values(columns())
      .flat()
      .find((task) => task.id === id);

  return (
    <Kanban
      value={columns()}
      onValueChange={setColumns}
      getItemValue={(task) => task.id}
      class="w-full"
    >
      <KanbanBoard class="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
        <For each={Object.keys(columns())}>
          {(columnValue) => <TaskColumn value={columnValue} tasks={columns()[columnValue] ?? []} />}
        </For>
      </KanbanBoard>
      <KanbanOverlay>
        {(params: { value: string; variant: "column" | "item" }) => (
          <Show
            when={params.variant === "column"}
            fallback={
              <Show when={findTask(params.value)}>{(task) => <TaskCard task={task()} />}</Show>
            }
          >
            <TaskColumn value={params.value} tasks={columns()[params.value] ?? []} isOverlay />
          </Show>
        )}
      </KanbanOverlay>
    </Kanban>
  );
}
