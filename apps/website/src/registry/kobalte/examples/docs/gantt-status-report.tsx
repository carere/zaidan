import { addDays, startOfDay, startOfWeek } from "date-fns";
import { Plus, SlidersHorizontal } from "lucide-solid";
import { createSignal, For } from "solid-js";
import {
  Gantt,
  type GanttApi,
  type GanttColumn,
  type GanttEvent,
  GanttNav,
  type GanttResource,
  GanttToolbar,
  GanttView,
} from "@/registry/kobalte/blocks/gantt";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

type TaskMeta = { owner: string; status: string };

/** Owner headshots keyed by name. Missing entries (e.g. "Unassigned") fall
 *  back to initials, and the initials also show while the photo loads. */
const OWNER_AVATARS: Record<string, string> = {
  "Ada Lovelace": "https://randomuser.me/api/portraits/women/44.jpg",
  "Grace Hopper": "https://randomuser.me/api/portraits/women/68.jpg",
  "Alan Turing": "https://randomuser.me/api/portraits/men/32.jpg",
  "Linus Torvalds": "https://randomuser.me/api/portraits/men/54.jpg",
  "Katherine Johnson": "https://randomuser.me/api/portraits/women/90.jpg",
  "Margaret Hamilton": "https://randomuser.me/api/portraits/women/12.jpg",
};

/** First + last initial from an owner name, used as the avatar fallback -
 *  "Ada Lovelace" reads "AL", "Unassigned" reads "UN". */
function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Status label -> badge tint (green done, amber in progress, neutral not
 *  started). Zaidan's Badge has no coloured "light" variants, so the tint is
 *  raw Tailwind on top of the secondary variant. */
const STATUS_CLASS: Record<string, string> = {
  Done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "In progress": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Not started": "",
};

/**
 * Status report: the left tree panel doubles as a task table with Owner and
 * Status columns beside each phase, every bar carries a progress fill, and the
 * timeline is drag-locked. New tasks are appended as rows from the toolbar.
 */
const INITIAL_RESOURCES: GanttResource[] = [
  {
    id: "planning",
    title: "Planning",
    children: [
      { id: "requirements", title: "Requirements" },
      { id: "design-phase", title: "Design" },
    ],
  },
  {
    id: "build",
    title: "Build",
    children: [
      { id: "frontend", title: "Frontend" },
      { id: "backend", title: "Backend" },
    ],
  },
  {
    id: "launch",
    title: "Launch",
    children: [
      { id: "qa", title: "QA & Testing" },
      { id: "rollout", title: "Rollout" },
    ],
  },
];

/** Owner + status per task, keyed by resource.id - GanttResource has no room
 *  for custom fields, so the extra column data lives in a lookup of your own. */
const INITIAL_META: Record<string, TaskMeta> = {
  requirements: { owner: "Ada Lovelace", status: "Done" },
  "design-phase": { owner: "Grace Hopper", status: "Done" },
  frontend: { owner: "Alan Turing", status: "In progress" },
  backend: { owner: "Linus Torvalds", status: "In progress" },
  qa: { owner: "Katherine Johnson", status: "Not started" },
  rollout: { owner: "Margaret Hamilton", status: "Not started" },
};

/** Status-report fixture - progress descends from finished planning to
 *  not-started launch, and the phases straddle today so the now-line falls
 *  mid-plan. Kept inside a month so every phase reads at a glance. */
function buildBars(anchor: Date): GanttEvent[] {
  const week = startOfWeek(startOfDay(anchor), { weekStartsOn: 0 });
  const day = (dayOffset: number) => addDays(week, dayOffset);
  const bar = (
    resourceId: string,
    title: string,
    startOffset: number,
    days: number,
    color: string,
    progress?: number,
  ): GanttEvent => ({
    id: `bar-${resourceId}`,
    title,
    start: day(startOffset),
    end: day(startOffset + days),
    allDay: true,
    color,
    resourceId,
    progress,
  });

  return [
    bar("requirements", "Requirements", -10, 8, "var(--color-blue-500)", 100),
    bar("design-phase", "Design", -8, 8, "var(--color-sky-500)", 100),
    bar("frontend", "Frontend", -2, 10, "var(--color-violet-500)", 60),
    bar("backend", "Backend", 0, 10, "var(--color-purple-500)", 45),
    bar("qa", "QA & Testing", 8, 8, "var(--color-amber-500)", 0),
    bar("rollout", "Rollout", 14, 5, "var(--color-emerald-500)", 0),
  ];
}

/** How many tasks the tree-foot "Add task" hint may append before it hides. */
const CREATE_TASK_LIMIT = 4;

export default function GanttStatusReport() {
  const bars = buildBars(new Date());
  let api: GanttApi | undefined;
  const [resources, setResources] = createSignal<GanttResource[]>(INITIAL_RESOURCES);
  const [meta, setMeta] = createSignal<Record<string, TaskMeta>>(INITIAL_META);
  // Numbers each appended task so ids stay unique. A signal, because
  // `canCreateTask` reads it to retire the create hint at the limit.
  const [added, setAdded] = createSignal(0);
  const [hiddenColumns, setHiddenColumns] = createSignal<string[]>([]);

  // Extra tree-panel columns after the pinned name column. The definitions
  // never change - each `render` reads `meta()` where it is called, so
  // appended rows pick up their Owner and Status with no new array; group
  // rows return null.
  const columns: GanttColumn[] = [
    {
      id: "owner",
      title: "Owner",
      width: 130,
      align: "start",
      render: (ctx) => {
        if (ctx.isGroup) return null;
        const owner = meta()[ctx.resource.id]?.owner;
        if (!owner) return null;
        return (
          <span class="flex min-w-0 items-center gap-2">
            <Avatar class="size-5 shrink-0">
              <AvatarImage src={OWNER_AVATARS[owner]} alt={owner} />
              <AvatarFallback class="text-[10px]">{ownerInitials(owner)}</AvatarFallback>
            </Avatar>
            <span class="truncate">{owner}</span>
          </span>
        );
      },
    },
    {
      id: "status",
      title: "Status",
      width: 100,
      align: "start",
      render: (ctx) => {
        if (ctx.isGroup) return null;
        const status = meta()[ctx.resource.id]?.status;
        if (!status) return null;
        return (
          <Badge variant="secondary" class={STATUS_CLASS[status]}>
            {status}
          </Badge>
        );
      },
    },
  ];

  /** The columns the menu currently leaves visible. */
  const visibleColumns = () => columns.filter((column) => !hiddenColumns().includes(column.id));

  const toggleColumn = (id: string, visible: boolean) =>
    setHiddenColumns((prev) => (visible ? prev.filter((entry) => entry !== id) : [...prev, id]));

  // Append a new task, register its Owner/Status, and drop a not-started bar
  // on its row. `parent` is the phase it lands under, or null for a row of
  // its own at the top level.
  const addTask = (parent: string | null) => {
    if (!api) return;
    const n = added() + 1;
    setAdded(n);
    const id = `task-${n}`;
    const node: GanttResource = { id, title: `New task ${n}` };
    setResources((prev) =>
      parent === null
        ? [...prev, node]
        : prev.map((group) =>
            group.id === parent ? { ...group, children: [...(group.children ?? []), node] } : group,
          ),
    );
    setMeta((prev) => ({ ...prev, [id]: { owner: "Unassigned", status: "Not started" } }));
    const week = startOfWeek(startOfDay(new Date()), { weekStartsOn: 0 });
    const start = addDays(week, (n % 6) - 2);
    api.addEvent({
      id: `bar-${id}`,
      title: `New task ${n}`,
      start,
      end: addDays(start, 5),
      allDay: true,
      color: "var(--color-slate-400)",
      resourceId: id,
      progress: 0,
    });
  };

  return (
    <div class="w-full p-4">
      <Card class="w-full py-0">
        <CardContent class="p-0">
          <Gantt
            defaultEvents={bars}
            resources={resources()}
            defaultScale="month"
            apiRef={(instance) => {
              api = instance;
            }}
            // Read-only timeline: drag, resize and slot-select are off so the
            // plan can't be shifted by dragging; rows are added via the toolbar.
            defaultInteractions={{ drag: false, resize: false, selectSlot: false }}
            columns={visibleColumns()}
            // Pinned at the end of the tree header - the intended home for a
            // columns dropdown.
            columnsMenu={
              <DropdownMenu placement="bottom-end">
                <DropdownMenuTrigger
                  as={Button}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle columns"
                >
                  <SlidersHorizontal aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-40">
                  {/* Kobalte's label is a group label: it throws outside a
                      DropdownMenuGroup. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Columns</DropdownMenuLabel>
                    <For each={columns}>
                      {(column) => (
                        <DropdownMenuCheckboxItem
                          checked={!hiddenColumns().includes(column.id)}
                          onChange={(checked) => toggleColumn(column.id, checked)}
                        >
                          {column.title}
                        </DropdownMenuCheckboxItem>
                      )}
                    </For>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            // The tree foot offers root-level creation only, so the hint files
            // its task as its own top-level row; `canCreateTask` retires the
            // affordance once the report has enough of them.
            displayCreateTaskHint
            canCreateTask={() => added() < CREATE_TASK_LIMIT}
            onCreateTask={() => addTask(null)}
            // Wider tree with a tighter name column so the Owner avatar,
            // owner name and Status all fit alongside the task names.
            treePanel={{ width: 400, nameColumnWidth: 150 }}
            class="h-[500px] w-full"
          >
            <div class="flex flex-wrap items-center gap-2 border-b pe-3">
              <GanttNav class="min-w-0 flex-1 border-b-0" />
              <GanttToolbar>
                <Button variant="outline" size="sm" onClick={() => addTask("launch")}>
                  <Plus class="size-4" aria-hidden="true" />
                  Add task
                </Button>
              </GanttToolbar>
            </div>
            <GanttView />
          </Gantt>
        </CardContent>
      </Card>
    </div>
  );
}
