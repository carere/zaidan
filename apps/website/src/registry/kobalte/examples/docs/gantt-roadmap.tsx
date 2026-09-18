import { addDays, startOfDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-solid";
import { createSignal } from "solid-js";
import {
  Gantt,
  type GanttApi,
  type GanttEvent,
  GanttNav,
  type GanttResource,
  GanttToolbar,
  GanttView,
} from "@/registry/kobalte/blocks/gantt";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import { ContextMenuItem } from "@/registry/kobalte/ui/context-menu";

/**
 * Yearly roadmap: each workstream is a swimlane group and its multi-month
 * initiatives are the bars. The Backlog group ships with empty rows - the
 * toolbar button schedules the next one onto the timeline.
 */
const RESOURCES: GanttResource[] = [
  {
    id: "platform",
    title: "Platform",
    children: [
      { id: "auth-revamp", title: "Auth Revamp" },
      { id: "api-v2", title: "API v2" },
    ],
  },
  {
    id: "growth",
    title: "Growth",
    children: [
      { id: "onboarding", title: "Onboarding Flow" },
      { id: "referrals", title: "Referral Program" },
    ],
  },
  {
    id: "design-system",
    title: "Design System",
    children: [
      { id: "tokens", title: "Design Tokens" },
      { id: "components", title: "Component Library" },
    ],
  },
  {
    id: "backlog",
    title: "Backlog",
    children: [
      { id: "search", title: "Search Revamp" },
      { id: "billing", title: "Billing v2" },
      { id: "mobile", title: "Mobile App" },
    ],
  },
];

/** Backlog initiatives, scheduled one per click in this order. */
const BACKLOG: Array<{ id: string; title: string; color: string }> = [
  { id: "search", title: "Search Revamp", color: "var(--color-rose-500)" },
  { id: "billing", title: "Billing v2", color: "var(--color-amber-500)" },
  { id: "mobile", title: "Mobile App", color: "var(--color-cyan-500)" },
];

/** Roadmap fixture - initiatives span months so the quarter axis has something
 *  to show, and offsets straddle today so both past and future are visible. */
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
    bar("auth-revamp", "Auth Revamp", -30, 60, "var(--color-blue-500)", 100),
    bar("api-v2", "API v2", 20, 90, "var(--color-sky-500)", 30),
    bar("onboarding", "Onboarding Flow", -20, 60, "var(--color-emerald-500)", 80),
    bar("referrals", "Referral Program", 50, 90, "var(--color-teal-500)", 0),
    bar("tokens", "Design Tokens", -60, 70, "var(--color-violet-500)", 100),
    bar("components", "Component Library", 0, 120, "var(--color-purple-500)", 45),
  ];
}

export default function GanttRoadmap() {
  const bars = buildBars(new Date());
  let api: GanttApi | undefined;
  // How many backlog initiatives have been scheduled so far.
  const [scheduled, setScheduled] = createSignal(0);

  // Schedule the next unscheduled backlog initiative onto its (empty) row.
  // The "next" one is derived from the live events, not a captured counter,
  // so it stays correct even if the button is clicked in quick succession.
  const addInitiative = () => {
    if (!api) return;
    const scheduledIds = new Set(api.getEvents().map((event) => event.id));
    const index = BACKLOG.findIndex((item) => !scheduledIds.has(`bar-${item.id}`));
    if (index === -1) return;
    const item = BACKLOG[index];
    const week = startOfWeek(startOfDay(new Date()), { weekStartsOn: 0 });
    // Land the scheduled bars in the near-future part of the current quarter so
    // each one is visible the moment it drops onto its row.
    const start = addDays(week, 12 + index * 20);
    api.addEvent({
      id: `bar-${item.id}`,
      title: item.title,
      start,
      end: addDays(start, 24),
      allDay: true,
      color: item.color,
      resourceId: item.id,
    });
    setScheduled((count) => count + 1);
  };

  // Slide one initiative a quarter in either direction. Timing changes made
  // through the api route through `onEventUpdate` exactly like a drag does,
  // with `source: "api"` on the proposal.
  const shiftInitiative = (eventId: string, days: number) => {
    const event = api?.getEvent(eventId);
    if (!api || !event) return;
    api.updateEvent(eventId, {
      start: addDays(event.start, days),
      end: addDays(event.end, days),
    });
  };

  return (
    <div class="w-full p-4">
      <Card class="w-full py-0">
        <CardContent class="p-0">
          <Gantt
            defaultEvents={bars}
            resources={RESOURCES}
            defaultScale="quarter"
            apiRef={(instance) => {
              api = instance;
            }}
            treePanel={{ width: 200 }}
            // A workstream is done when its initiatives are, so the group
            // rollups count finished initiatives instead of the default
            // duration-weighted mean progress.
            getSummaryProgress={(ctx) => {
              const scored = ctx.events.filter((event) => event.progress !== undefined);
              if (scored.length === 0) return null;
              const done = scored.filter((event) => (event.progress ?? 0) >= 100).length;
              return Math.round((done / scored.length) * 100);
            }}
            // Right-click an initiative to reschedule it. The gantt owns the
            // context menu; the items are yours.
            renderEventMenu={(ctx) => (
              <>
                <ContextMenuItem onSelect={() => shiftInitiative(ctx.occurrence.eventId, -90)}>
                  <ChevronLeft aria-hidden="true" />
                  Pull in a quarter
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => shiftInitiative(ctx.occurrence.eventId, 90)}>
                  <ChevronRight aria-hidden="true" />
                  Push out a quarter
                </ContextMenuItem>
              </>
            )}
            class="h-[480px] w-full"
          >
            <div class="flex flex-wrap items-center gap-2 border-b pe-3">
              <GanttNav class="min-w-0 flex-1 border-b-0" />
              <GanttToolbar>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addInitiative}
                  disabled={scheduled() >= BACKLOG.length}
                >
                  <Plus class="size-4" aria-hidden="true" />
                  Add to roadmap
                </Button>
              </GanttToolbar>
            </div>
            {/* Parent workstream rows carry no bars - summaryBars rolls up the
                child initiatives into one envelope on the group row. */}
            <GanttView />
          </Gantt>
        </CardContent>
      </Card>
    </div>
  );
}
