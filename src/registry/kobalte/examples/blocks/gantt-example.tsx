import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { CalendarPlus, CircleCheck, Scan, TriangleAlert } from "lucide-solid";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  Gantt,
  type GanttApi,
  GanttDatePicker,
  type GanttEvent,
  GanttNav,
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  type GanttResource,
  type GanttResourceReorder,
  GanttScaleSwitcher,
  type GanttSlotDraft,
  GanttTitle,
  GanttToolbar,
  GanttView,
} from "@/registry/kobalte/blocks/gantt";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";
import { TooltipProvider } from "@/registry/kobalte/ui/tooltip";

export default function GanttExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <ReleasePlan />
    </ExampleWrapper>
  );
}

/** Where a task stands today; also what the toolbar filter selects on. */
type TaskStatus = "done" | "on-track" | "at-risk" | "blocked";

type PlanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  /**
   * Day offset from the Monday of the current week. Left out on purpose for
   * the two tasks that ship UNSCHEDULED - hovering their empty row offers the
   * custom schedule hint that places them.
   */
  start?: number;
  /** Planned length in days, used both by the fixture and by the hint. */
  days: number;
  progress: number;
};

type Workstream = {
  id: string;
  title: string;
  /** One color per workstream, so the timeline reads by team at a glance. */
  color: string;
  tasks: PlanTask[];
};

/**
 * A real release plan: five workstreams, fourteen tasks, offsets anchored to
 * the Monday of the current week so the now-line always falls mid-flight -
 * discovery and design behind it, engineering straddling it, go-to-market and
 * the ship gate ahead.
 */
const PLAN: Workstream[] = [
  {
    id: "discovery",
    title: "Discovery",
    color: "var(--color-sky-500)",
    tasks: [
      {
        id: "interviews",
        title: "Customer interviews",
        status: "done",
        start: -56,
        days: 14,
        progress: 100,
      },
      {
        id: "teardown",
        title: "Competitive teardown",
        status: "done",
        start: -49,
        days: 11,
        progress: 100,
      },
    ],
  },
  {
    id: "design",
    title: "Design",
    color: "var(--color-violet-500)",
    tasks: [
      {
        id: "flows",
        title: "Flows & wireframes",
        status: "done",
        start: -42,
        days: 18,
        progress: 100,
      },
      { id: "visual", title: "Visual design", status: "done", start: -28, days: 21, progress: 100 },
      {
        id: "design-qa",
        title: "Design QA",
        status: "on-track",
        start: -7,
        days: 14,
        progress: 45,
      },
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    color: "var(--color-emerald-500)",
    tasks: [
      {
        id: "sync-engine",
        title: "Sync engine rewrite",
        status: "at-risk",
        start: -21,
        days: 42,
        progress: 55,
      },
      {
        id: "offline-cache",
        title: "Offline cache",
        status: "on-track",
        start: -7,
        days: 35,
        progress: 30,
      },
      {
        id: "migrations",
        title: "Migration scripts",
        status: "at-risk",
        start: 7,
        days: 21,
        progress: 10,
      },
      { id: "perf", title: "Perf hardening", status: "on-track", days: 14, progress: 0 },
    ],
  },
  {
    id: "gtm",
    title: "Go-to-market",
    color: "var(--color-amber-500)",
    tasks: [
      { id: "pricing", title: "Pricing page", status: "on-track", start: 7, days: 21, progress: 0 },
      {
        id: "launch-video",
        title: "Launch video",
        status: "at-risk",
        start: 14,
        days: 21,
        progress: 0,
      },
      { id: "press", title: "Press briefing", status: "on-track", days: 7, progress: 0 },
    ],
  },
  {
    id: "release",
    title: "Release",
    color: "var(--color-rose-500)",
    tasks: [
      {
        id: "code-freeze",
        title: "Code freeze",
        status: "on-track",
        start: 35,
        days: 7,
        progress: 0,
      },
      { id: "ship", title: "Ship Nova 4.0", status: "on-track", start: 49, days: 3, progress: 0 },
    ],
  },
];

/** Task id -> its row data plus the workstream color it inherits. */
const TASKS: Record<string, PlanTask & { color: string }> = Object.fromEntries(
  PLAN.flatMap((stream) =>
    stream.tasks.map((task) => [task.id, { ...task, color: stream.color }] as const),
  ),
);

/** Resource id -> title, for naming a row in the reorder confirmations. */
const TITLES: Record<string, string> = Object.fromEntries(
  PLAN.flatMap((stream) => [
    [stream.id, stream.title] as const,
    ...stream.tasks.map((task) => [task.id, task.title] as const),
  ]),
);

/** Task id -> the workstream it belongs to; a reorder may never leave it. */
const TASK_PARENT: Record<string, string> = Object.fromEntries(
  PLAN.flatMap((stream) => stream.tasks.map((task) => [task.id, stream.id] as const)),
);

/** Statuses worth flagging in the tree; "on-track" stays unlabelled. */
const STATUS_BADGE: Partial<
  Record<TaskStatus, { label: string; variant: "success-light" | "warning-light" }>
> = {
  done: { label: "Done", variant: "success-light" },
  "at-risk": { label: "At risk", variant: "warning-light" },
};

/** Workstream id -> its accent color, for the rollup capsules and the legend. */
function streamColor(id: string) {
  return PLAN.find((stream) => stream.id === id)?.color;
}

const TASK_COUNT = Object.keys(TASKS).length;
const AT_RISK_COUNT = Object.values(TASKS).filter((task) => task.status === "at-risk").length;

/**
 * The gantt tree: workstreams are groups, tasks are their leaves. One schedule
 * per task (`scheduleMode="single"` on the root), so a row never stacks lanes.
 */
const INITIAL_RESOURCES: GanttResource[] = PLAN.map((stream) => ({
  id: stream.id,
  title: stream.title,
  children: stream.tasks.map((task) => ({ id: task.id, title: task.title })),
}));

/** Monday of the current week - every offset in the plan is relative to it. */
function planWeekStart(anchor: Date) {
  return startOfWeek(startOfDay(anchor), { weekStartsOn: 1 });
}

/** Scheduled tasks become bars; the two unscheduled ones deliberately do not. */
function buildBars(anchor: Date): GanttEvent[] {
  const monday = planWeekStart(anchor);
  return PLAN.flatMap((stream) =>
    stream.tasks.flatMap((task) => {
      const offset = task.start;
      if (offset === undefined) return [];
      return [
        {
          id: `bar-${task.id}`,
          title: task.title,
          start: addDays(monday, offset),
          end: addDays(monday, offset + task.days),
          allDay: true,
          color: stream.color,
          resourceId: task.id,
          progress: task.progress,
        } satisfies GanttEvent,
      ];
    }),
  );
}

type PlanFilter = "all" | "at-risk" | "blocked";

function isPlanFilter(value: string | null): value is PlanFilter {
  return value === "all" || value === "at-risk" || value === "blocked";
}

function ReleasePlan() {
  const monday = planWeekStart(new Date());
  const initialBars = buildBars(new Date());
  // Hoisted so every read hands the gantt the same object/instant instead of
  // a fresh one built by the JSX prop getter.
  const rangeBounds = { min: addDays(monday, -70), max: addDays(monday, 84) };
  const openAt = addDays(monday, 3);
  let api: GanttApi | undefined;

  const [resources, setResources] = createSignal<GanttResource[]>(INITIAL_RESOURCES);
  const [events, setEvents] = createSignal<GanttEvent[]>(initialBars);
  const [filter, setFilter] = createSignal<PlanFilter>("all");
  // Controlled zoom: the floating control inside the track and the toolbar
  // readout below are two views of the SAME number.
  const [zoom, setZoom] = createSignal(1);
  const [notice, setNotice] = createSignal<string | null>(null);

  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => setNotice(null), 4000);
  };
  onCleanup(() => {
    if (noticeTimer) clearTimeout(noticeTimer);
  });

  // The status filter narrows the tree to matching tasks and drops the
  // workstreams left empty - "Blocked" clears it entirely, which is what the
  // renderNoResources empty state is for.
  const visibleResources = () => {
    const mode = filter();
    if (mode === "all") return resources();
    return resources()
      .map((stream) => ({
        ...stream,
        children: (stream.children ?? []).filter((leaf) => TASKS[leaf.id]?.status === mode),
      }))
      .filter((stream) => (stream.children ?? []).length > 0);
  };

  const scheduledCount = () => events().length;

  /** Duration-weighted completion across every scheduled bar. */
  const completion = () => {
    const list = events();
    const total = list.reduce(
      (sum, event) => sum + (event.end.getTime() - event.start.getTime()),
      0,
    );
    if (total === 0) return 0;
    const done = list.reduce(
      (sum, event) =>
        sum + (event.end.getTime() - event.start.getTime()) * ((event.progress ?? 0) / 100),
      0,
    );
    return Math.round((done / total) * 100);
  };

  /** Ship date follows the release bar, so dragging it retitles the header. */
  const shipDate = () => events().find((event) => event.id === "bar-ship")?.start;

  /** Place an unscheduled task at the hovered day, at its planned length. */
  const scheduleTask = (resourceId: string, start: Date) => {
    const task = TASKS[resourceId];
    if (!api || !task) return;
    const from = startOfDay(start);
    api.addEvent({
      id: `bar-${task.id}`,
      title: task.title,
      start: from,
      end: addDays(from, task.days),
      allDay: true,
      color: task.color,
      resourceId: task.id,
      progress: 0,
    });
    flash(`${task.title} scheduled for ${format(from, "MMM d")}.`);
  };

  // Only the two unscheduled rows take a slot, and only until they hold a bar.
  // A veto here hides the hint on every other row, so the affordance appears
  // exactly where scheduling is possible.
  const canSelectSlot = (slot: GanttSlotDraft) => {
    const id = slot.resourceId;
    if (!id) return false;
    const task = TASKS[id];
    if (!task || task.start !== undefined) return false;
    return !(api?.getEvents() ?? []).some((event) => event.resourceId === id);
  };

  // The phase order is the plan's shape, so only TASKS move, and only inside
  // the workstream they belong to. Anything else is refused live (the drop
  // indicator turns destructive) and explained on release. The filter guard
  // matters too: a proposal is rebuilt from the resources the gantt currently
  // holds, and a filtered tree is not the whole plan.
  const canReorderResource = (proposal: GanttResourceReorder) =>
    filter() === "all" && proposal.parentId === TASK_PARENT[proposal.resourceId];

  const rejectReason = (proposal: GanttResourceReorder) => {
    if (filter() !== "all") return "Clear the status filter to reorder tasks.";
    if (!TASK_PARENT[proposal.resourceId])
      return "Workstreams are fixed - reorder tasks inside them.";
    return `${TITLES[proposal.resourceId]} stays in ${TITLES[TASK_PARENT[proposal.resourceId]]}.`;
  };

  return (
    <Example title="Release plan" containerClass="md:col-span-2">
      <Card class="w-full gap-0 py-0">
        <CardHeader class="border-b p-4">
          <CardTitle>Nova 4.0 release plan</CardTitle>
          <CardDescription>
            <Show when={shipDate()} fallback="Ship date not set">
              {(date) => <>Ships {format(date(), "MMMM d")}</>}
            </Show>
            {" · "}
            {scheduledCount()} of {TASK_COUNT} tasks scheduled
          </CardDescription>
          <CardAction class="flex flex-wrap items-center justify-end gap-1.5">
            <Badge variant="primary-light">{completion()}% complete</Badge>
            <Badge variant="warning-light">
              <TriangleAlert data-icon="inline-start" />
              {AT_RISK_COUNT} at risk
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent class="p-0">
          <Gantt
            defaultEvents={initialBars}
            resources={visibleResources()}
            defaultScale="quarter"
            weekStartsOn={1}
            scheduleMode="single"
            apiRef={(instance) => {
              api = instance;
            }}
            onEventsChange={setEvents}
            // The plan owns a window: scrolling can reach a fortnight before
            // kickoff and a month past launch, and no further.
            rangeBounds={rangeBounds}
            // An explicit instant, not "now": the view always opens on the same
            // composition - finished design on the left, the ship gate ahead.
            initialCenter={openAt}
            zoom={zoom()}
            onZoomChange={setZoom}
            zoomRange={{ min: 0.6, max: 2.4, step: 0.2 }}
            // Narrower weeks than the stock quarter axis: a 15-week plan reads
            // end to end once the zoom control is pulled back.
            metrics={{ unitWidths: { quarter: 5 } }}
            treePanel={{ width: 248, nameColumnWidth: 248 }}
            defaultCollapsedGroups={["discovery"]}
            rowCheckboxes={false}
            // Passing the handler is what puts a drag grip on the tree rows.
            // The proposal is adopted here because the resource tree is
            // controlled - the gantt never mutates it itself.
            onResourceReorder={(proposal) => {
              setResources(proposal.resources);
              flash(`${TITLES[proposal.resourceId]} moved.`);
            }}
            canReorderResource={canReorderResource}
            onResourceReorderReject={(proposal) => flash(rejectReason(proposal))}
            // Unscheduled rows accept one placement. The hint tile is replaced
            // below; onSelectSlot still backs the keyboard and drag paths.
            displayScheduleHint
            canSelectSlot={canSelectSlot}
            onSelectSlot={(slot) => {
              if (slot.resourceId) scheduleTask(slot.resourceId, slot.start);
            }}
            // Custom rollup on the workstream rows: the gantt owns the envelope
            // wrapper and the math, this owns what is drawn inside it - a
            // capsule tinted with the workstream's own color.
            renderSummary={(summary) => (
              <div class="relative">
                <div class="h-1.5 overflow-hidden rounded-full bg-foreground/15">
                  <Show when={summary.progress !== null}>
                    <div
                      class="h-full rounded-full opacity-80"
                      style={{
                        width: `${summary.progress}%`,
                        "background-color":
                          streamColor(summary.resource.id) ?? "var(--color-muted-foreground)",
                      }}
                    />
                  </Show>
                </div>
                <span class="absolute start-full top-1/2 ms-2 -translate-y-1/2 whitespace-nowrap font-medium text-muted-foreground">
                  {(summary.resource.children ?? []).length} tasks
                  <Show when={summary.progress !== null}>{` · ${summary.progress}%`}</Show>
                </span>
              </div>
            )}
            // Custom placement affordance: the wrapper stays snapped and
            // validated, the pill drives this plan's own create flow.
            renderScheduleHint={(hint) => (
              <button
                type="button"
                class="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary border-dashed bg-background px-2.5 py-1 font-medium text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                onClick={() => scheduleTask(hint.resource.id, hint.start)}
              >
                <CalendarPlus class="size-3.5" aria-hidden="true" />
                Schedule {hint.resource.title} · {format(hint.start, "MMM d")}
              </button>
            )}
            // Finished and slipping tasks carry their status in the tree;
            // everything in flight keeps the plain title (returning undefined
            // falls back to the built-in label).
            renderResourceLabel={(ctx) => {
              const status = ctx.isGroup ? undefined : TASKS[ctx.resource.id]?.status;
              const badge = status ? STATUS_BADGE[status] : undefined;
              if (!badge) return undefined;
              return (
                <span class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate">{ctx.resource.title}</span>
                  <Badge variant={badge.variant} class="shrink-0 px-1.5 py-0 text-[10px]">
                    {badge.label}
                  </Badge>
                </span>
              );
            }}
            renderNoResources={() => (
              <div class="flex flex-col items-center gap-1.5 py-8 text-center">
                <CircleCheck class="size-6 text-success-foreground" aria-hidden="true" />
                <p class="font-medium text-foreground text-sm">Nothing is blocked</p>
                <p class="max-w-xs text-muted-foreground text-xs">
                  Every task in the plan has what it needs. Switch back to All work for the full
                  timeline.
                </p>
              </div>
            )}
            class="h-[560px] w-full"
          >
            <div class="flex flex-wrap items-center gap-2 border-b pe-3">
              <GanttNav class="min-w-0 flex-1 border-b-0">
                {/* Shared provider: the first tooltip waits, moving between
                    buttons is instant. */}
                <TooltipProvider delay={600} closeDelay={0} timeout={300}>
                  <GanttNavToday />
                  <GanttDatePicker />
                  <div class="flex items-center">
                    <GanttNavPrev />
                    <GanttNavNext />
                  </div>
                  <GanttScaleSwitcher scales={["week", "month", "quarter"]} />
                  <GanttTitle />
                  <div class="grow" />
                </TooltipProvider>
              </GanttNav>
              <GanttToolbar>
                <ToggleGroup
                  value={filter()}
                  onChange={(value) => setFilter(isPlanFilter(value) ? value : "all")}
                  variant="outline"
                  size="sm"
                  aria-label="Filter tasks by status"
                >
                  <ToggleGroupItem value="all">All work</ToggleGroupItem>
                  <ToggleGroupItem value="at-risk">At risk</ToggleGroupItem>
                  <ToggleGroupItem value="blocked">Blocked</ToggleGroupItem>
                </ToggleGroup>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(1)}
                  disabled={Math.abs(zoom() - 1) < 0.001}
                >
                  <Scan class="size-4" aria-hidden="true" />
                  Fit
                  <span class="text-muted-foreground tabular-nums">
                    {Math.round(zoom() * 100)}%
                  </span>
                </Button>
              </GanttToolbar>
            </div>
            <GanttView />
          </Gantt>
        </CardContent>
        <CardFooter class="flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t p-3 text-xs">
          <div class="flex flex-wrap items-center gap-3">
            <For each={PLAN}>
              {(stream) => (
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    aria-hidden="true"
                    class="size-2 rounded-full"
                    style={{ "background-color": stream.color }}
                  />
                  {stream.title}
                </span>
              )}
            </For>
          </div>
          <Show
            when={notice()}
            fallback={
              <span class="text-muted-foreground">
                Drag a task grip to reorder it in its workstream · hover an unscheduled row to place
                it
              </span>
            }
          >
            {(message) => <span class="font-medium text-foreground">{message()}</span>}
          </Show>
        </CardFooter>
      </Card>
    </Example>
  );
}
