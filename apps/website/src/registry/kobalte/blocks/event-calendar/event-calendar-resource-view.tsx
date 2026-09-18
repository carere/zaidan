import { addDays, addMinutes } from "date-fns";
import type { ComponentProps, JSX } from "solid-js";
import { createEffect, createMemo, For, on, onCleanup, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import {
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarDay,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarViewConfig,
  useEventCalendarViewSettings,
} from "./event-calendar";
import { useEventCalendarGestures, wasRecentChipPress, wasRecentDrag } from "./event-calendar-dnd";
import { EVENT_CALENDAR_GHOST, EventCalendarEvent } from "./event-calendar-event";
import {
  flattenResources,
  getDayKey,
  getDayTotalMinutes,
  packTimedSegments,
  resolveOffDay,
  snapMinutes,
  toZoned,
  zonedStartOfDay,
} from "./event-calendar-lib";
import {
  EventCalendarNowIndicator,
  EventCalendarTimeGutter,
  minuteBlockStyle,
} from "./event-calendar-time-grid";
import type { EventCalendarResource, EventCalendarSegment } from "./event-calendar-types";

const EMPTY_ALL_DAY_SEGMENTS: EventCalendarSegment[] = [];

interface EventCalendarResourceViewProps extends Omit<ComponentProps<"div">, "style"> {
  dayStartHour?: number;
  dayEndHour?: number;
  showAllDay?: boolean;
  /** Gutter/gridline interval in minutes; defaults to the interval view config. */
  interval?: number;
  /** Object form only, so the view can merge its --ec-hour-height into it. */
  style?: JSX.CSSProperties;
}

/** Leaf resources become booking columns for the anchor day. */
function EventCalendarResourceView(props: EventCalendarResourceViewProps) {
  const instance = useEventCalendar();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const { effective } = useEventCalendarViewSettings();
  const [local, others] = splitProps(props, [
    "class",
    "style",
    "dayStartHour",
    "dayEndHour",
    "showAllDay",
    "interval",
  ]);
  const anchorDate = useEventCalendarSelector((state) => state.date, {
    isEqual: (a, b) => a.getTime() === b.getTime(),
  });

  const startHour = () => local.dayStartHour ?? settings.dayStartHour;
  const endHour = () => local.dayEndHour ?? settings.dayEndHour;
  const interval = () => Math.min(Math.max(local.interval ?? viewConfig.interval, 5), 240);
  const showAllDay = () => local.showAllDay ?? true;
  const contained = () => viewConfig.scrollMode !== "page";
  const day = () => zonedStartOfDay(anchorDate(), settings.timeZone);

  const resources = createMemo(() =>
    flattenResources(settings.resources)
      .filter(({ resource }) => !resource.children?.length)
      .map(({ resource }) => resource),
  );

  // Initial scroll + api.scrollToTime (same contract as the time grid)
  let scrollEl: HTMLDivElement | undefined;
  createEffect(
    on(
      () =>
        [
          contained(),
          settings.timeZone,
          startHour(),
          interval(),
          viewConfig.scrollToHour,
          // scrollbars custom<->native swaps the scroller DOM: re-bind the
          // viewport, the scroll wiring, and the measured --ec-scrollbar-w
          viewConfig.scrollbars,
        ] as const,
      ([isContained, timeZone, boundsStart, slotMinutes, scrollToHour]) => {
        if (!isContained) return;
        const el = scrollEl;
        if (!el) return;
        const viewport = el.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");
        const slotRow = el.querySelector<HTMLElement>(
          "[data-slot=event-calendar-time-gutter] > div",
        );
        const slotPx = slotRow?.getBoundingClientRect().height || 64;
        const pxPerMinute = slotPx / slotMinutes;
        const scrollTo = (minutes: number) => {
          // keep the hour label above the target line visible (it hangs -top-2)
          viewport?.scrollTo({
            top: Math.max(0, (minutes - boundsStart * 60) * pxPerMinute - 12),
          });
        };
        scrollTo(scrollToHour * 60);
        instance.internals.registerScrollHandler((time) => {
          const minutes =
            typeof time === "number"
              ? time
              : toZoned(time, timeZone).getHours() * 60 + toZoned(time, timeZone).getMinutes();
          scrollTo(minutes);
        });
        // Classic (width-consuming) scrollbars squeeze the scrolling track while
        // the header/all-day rows outside keep full width, drifting the column
        // borders. Mirror the measured gutter onto those rows via a CSS var -
        // 0px for overlay scrollbars and the custom ScrollArea, so both modes
        // lay out identically.
        const root = el.closest<HTMLElement>(
          "[data-slot=event-calendar-time-grid], [data-slot=event-calendar-resource-view]",
        );
        const syncScrollbarGutter = () => {
          root?.style.setProperty(
            "--ec-scrollbar-w",
            `${viewport ? viewport.offsetWidth - viewport.clientWidth : 0}px`,
          );
        };
        syncScrollbarGutter();
        const gutterObserver = viewport ? new ResizeObserver(syncScrollbarGutter) : null;
        if (viewport) gutterObserver?.observe(viewport);
        onCleanup(() => {
          instance.internals.registerScrollHandler(null);
          gutterObserver?.disconnect();
        });
      },
    ),
  );

  const slots = createMemo(() => {
    const result: number[] = [];
    for (let m = startHour() * 60; m < endHour() * 60; m += interval()) {
      result.push(m);
    }
    return result;
  });

  // All-day segments for renderAllDaySection - the same index bucket the
  // cells read; inert (stable empty array, so the memo never invalidates)
  // while the override is unset.
  const allDaySegments = useEventCalendarSelector<unknown, EventCalendarSegment[]>(
    () =>
      viewConfig.renderAllDaySection
        ? (instance.internals.getIndex().byDay.get(getDayKey(day(), settings.timeZone))?.allDay ??
          EMPTY_ALL_DAY_SEGMENTS)
        : EMPTY_ALL_DAY_SEGMENTS,
    {
      isEqual: (a, b) =>
        a === b || (a.length === b.length && a.every((segment, i) => segment === b[i])),
    },
  );

  const gridTemplateColumns = () =>
    `repeat(${resources().length || 1}, minmax(var(--ec-resource-col-min,8rem), 1fr))`;

  const track = () => (
    <div class="relative flex">
      {/* shared gutter component, so renderTimeGutterSlot and
          classNames.timeGutter customizations apply here too */}
      <EventCalendarTimeGutter
        days={[day()]}
        slots={slots()}
        startHour={startHour()}
        interval={interval()}
      />
      <div class="grid min-w-0 flex-1" style={{ "grid-template-columns": gridTemplateColumns() }}>
        <For each={resources()}>
          {(resource) => (
            <EventCalendarResourceColumn
              resource={resource}
              day={day()}
              startHour={startHour()}
              endHour={endHour()}
              interval={interval()}
            />
          )}
        </For>
      </div>
      <Show when={effective.nowIndicator}>
        <EventCalendarNowIndicator days={[day()]} startHour={startHour()} endHour={endHour()} />
      </Show>
    </div>
  );

  return (
    <EventCalendarViewContext.Provider value={{ view: "resource" }}>
      <div
        data-slot="event-calendar-resource-view"
        data-view="resource"
        class={cn(
          "flex flex-col border-t",
          contained() && "min-h-0 flex-1 overflow-hidden",
          viewConfig.classNames?.timeGrid,
          local.class,
        )}
        style={{ "--ec-hour-height": "4rem", ...local.style }}
        {...others}
      >
        {/* Resource header row */}
        <div
          class={cn(
            "flex border-b pe-(--ec-scrollbar-w,0px)",
            !contained() && "bg-background sticky top-(--ec-sticky-offset,0px) z-20",
            viewConfig.classNames?.timeGridHeader,
          )}
        >
          <div class="w-(--ec-gutter-width,4.5rem) shrink-0 border-e" />
          <div
            class="grid min-w-0 flex-1"
            style={{ "grid-template-columns": gridTemplateColumns() }}
          >
            <For each={resources()}>
              {(resource) => (
                <div
                  data-slot="event-calendar-resource-header"
                  class={cn(
                    "min-w-0 truncate border-e px-2 py-1.5 text-center font-medium last:border-e-0",
                    viewConfig.classNames?.resourceHeader,
                  )}
                >
                  {viewConfig.renderResourceHeader?.({ resource }) ?? resource.title}
                </div>
              )}
            </For>
          </div>
        </div>
        {/* All-day row per resource */}
        <Show when={showAllDay()}>
          <div
            data-slot="event-calendar-all-day-section"
            class={cn(
              "flex border-b pe-(--ec-scrollbar-w,0px)",
              viewConfig.classNames?.allDaySection,
            )}
          >
            {viewConfig.renderAllDaySection?.({
              days: [day()],
              segments: allDaySegments(),
            }) ?? (
              <>
                <div
                  class={cn(
                    // pt-1.5 matches the all-day cell's top inset; the inner box is
                    // one bar-row tall and centers the label so it sits on the SAME
                    // baseline as the first all-day chip and stays top-aligned when
                    // the chips wrap onto more lanes (mirrors the time-grid label)
                    "text-muted-foreground w-(--ec-gutter-width,4.5rem) shrink-0 border-e ps-2 pe-2.5 pt-1.5",
                    viewConfig.classNames?.allDayLabel,
                  )}
                >
                  <span class="flex h-[calc(var(--ec-month-bar-h,1.625rem)-0.125rem)] items-center justify-end">
                    {settings.i18n.labels.allDay}
                  </span>
                </div>
                <div
                  class="grid min-w-0 flex-1"
                  style={{ "grid-template-columns": gridTemplateColumns() }}
                >
                  <For each={resources()}>
                    {(resource) => (
                      <EventCalendarResourceAllDayCell resource={resource} day={day()} />
                    )}
                  </For>
                </div>
              </>
            )}
          </div>
        </Show>
        <Show when={contained()} fallback={track()}>
          <div ref={scrollEl} class="min-h-0 flex-1">
            <Show
              when={viewConfig.scrollbars === "native"}
              fallback={<ScrollArea class="h-full">{track()}</ScrollArea>}
            >
              <div
                data-slot="scroll-area-viewport"
                data-ec-native-scroll=""
                class="h-full overflow-y-auto"
              >
                {track()}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </EventCalendarViewContext.Provider>
  );
}

function EventCalendarResourceAllDayCell(props: { resource: EventCalendarResource; day: Date }) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const { effective } = useEventCalendarViewSettings();
  const gestures = useEventCalendarGestures();
  const day = useEventCalendarDay(() => props.day);
  const mine = () =>
    day.segments.allDay.filter(
      (segment) => segment.occurrence.event.resourceId === props.resource.id,
    );
  const dayStart = () => zonedStartOfDay(props.day, settings.timeZone);
  const dayEnd = () => addDays(toZoned(dayStart(), settings.timeZone), 1);
  const isOff = () =>
    resolveOffDay(
      props.day,
      settings.timeZone,
      effective.offDays
        ? typeof viewConfig.offDays === "object"
          ? viewConfig.offDays
          : true
        : false,
      settings.weekendDays,
    );
  const offClass = () =>
    (typeof viewConfig.offDays === "object" && viewConfig.offDays.class) || "bg-muted/25";
  const isDropTarget = useEventCalendarSelector<unknown, "valid" | "invalid" | null>((state) => {
    const drag = state.drag;
    if (!drag?.proposedDayGranular) return null;
    const covered = drag.proposedStart < dayEnd() && drag.proposedEnd > dayStart();
    if (!covered) return null;
    return drag.valid ? "valid" : "invalid";
  });
  // Slot-draft highlight, mirroring the time-grid all-day cell. The dnd
  // layer's all-day create branch does not plumb resourceId into the draft,
  // so every resource cell covering the day highlights together.
  const inDraft = useEventCalendarSelector<unknown, boolean>((state) => {
    const draft = state.slotDraft;
    if (!draft?.allDay) return false;
    return draft.start < dayEnd() && draft.end > dayStart();
  });
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the all-day cell is the calendar's slot-selection surface; everything it exposes is also reachable from the focusable chips inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: same - the chips inside the cell carry the keyboard path.
    <div
      data-slot="event-calendar-all-day-cell"
      // data-ec-day makes this a DnD day target: without it collectSurface()
      // finds no cells and dragging an all-day chip silently converts it to
      // a timed event via the column branch
      data-ec-day={dayStart().getTime()}
      data-drop-target={isDropTarget() ?? undefined}
      data-off={isOff() || undefined}
      class={cn(
        // reserve one bar row so the all-day row keeps the same height with or
        // without events, matching the time-grid all-day row (which reserves
        // the same via its bars-grid minHeight)
        "relative flex min-h-[calc(var(--ec-month-bar-h,1.625rem)+0.625rem)] min-w-0 flex-col gap-0.5 border-e px-1 py-1.5 last:border-e-0",
        isOff() && offClass(),
        viewConfig.dayClassName?.(props.day),
        inDraft() && cn("bg-primary/10", viewConfig.classNames?.slotDraft),
        viewConfig.classNames?.allDayCell,
      )}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) gestures.beginCreate(e, props.day, true);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !wasRecentDrag() && !wasRecentChipPress()) {
          settings.onSlotClick?.(
            {
              date: dayStart(),
              allDay: true,
              view: "resource",
              resourceId: props.resource.id,
            },
            e,
          );
        }
      }}
    >
      <For each={mine()}>
        {(segment) => (
          <EventCalendarEvent
            segment={segment}
            // one bar-row tall, matching the time-grid all-day bars so the row
            // height stays identical across views (and equals the reserved min)
            class="h-[calc(var(--ec-month-bar-h,1.625rem)-0.125rem)]"
          />
        )}
      </For>
      <Show when={isDropTarget()}>
        {(dropTarget) => (
          <span
            aria-hidden
            data-slot="event-calendar-drop-indicator"
            data-drop-target={dropTarget()}
            class={cn(
              "pointer-events-none absolute inset-0.5 z-10 rounded-sm border border-dashed",
              dropTarget() === "valid" ? "border-primary/50" : "border-destructive/60",
              viewConfig.classNames?.dropIndicator,
            )}
          />
        )}
      </Show>
    </div>
  );
}

function EventCalendarResourceColumn(props: {
  resource: EventCalendarResource;
  day: Date;
  startHour: number;
  endHour: number;
  interval: number;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const { effective } = useEventCalendarViewSettings();
  const gestures = useEventCalendarGestures();
  const day = useEventCalendarDay(() => props.day);
  const isOff = () =>
    resolveOffDay(
      props.day,
      settings.timeZone,
      effective.offDays
        ? typeof viewConfig.offDays === "object"
          ? viewConfig.offDays
          : true
        : false,
      settings.weekendDays,
    );
  const offClass = () =>
    (typeof viewConfig.offDays === "object" && viewConfig.offDays.class) || "bg-muted/25";

  const timeZone = () => settings.timeZone;
  const dayStart = () => zonedStartOfDay(props.day, timeZone());
  const totalMinutes = () => getDayTotalMinutes(props.day, timeZone());
  const boundsStartMin = () => props.startHour * 60;
  const boundsEndMin = () => Math.min(props.endHour * 60, totalMinutes());
  const boundsMinutes = () => Math.max(60, boundsEndMin() - boundsStartMin());

  // Filter this resource's timed segments and repack per column.
  // Clones keep the shared index cache untouched. Segments the day bounds clip
  // away are dropped here too, otherwise they hold a column nobody can see and
  // leave a phantom empty half beside the first in-bounds chip.
  const packed = createMemo(() => {
    const mine = day.segments.timed
      .filter((segment) => {
        if (segment.occurrence.event.resourceId !== props.resource.id) return false;
        const startMin = Math.max(segment.startMin ?? 0, boundsStartMin());
        const endMin = Math.min(segment.endMin ?? startMin, boundsEndMin());
        return endMin > boundsStartMin() && startMin < boundsEndMin();
      })
      .map((segment) => ({ ...segment }) as EventCalendarSegment);
    packTimedSegments(mine);
    return mine;
  });

  const dragGhost = useEventCalendarSelector<
    unknown,
    {
      window: [number, number];
      valid: boolean;
      kind: string;
      color?: string;
      title: string;
      occurrence: EventCalendarSegment["occurrence"];
      proposedStart: Date;
      proposedEnd: Date;
    } | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag || drag.proposedDayGranular) return null;
      // Moves carry a proposedResourceId (they can cross columns); resizes stay
      // in place and leave it undefined, so fall back to the event's own
      // resource - otherwise the resize ghost is filtered out of every column.
      const targetResourceId = drag.proposedResourceId ?? drag.occurrence.event.resourceId;
      if (targetResourceId !== props.resource.id) return null;
      const from = Math.max(
        (drag.proposedStart.getTime() - dayStart().getTime()) / 60000,
        boundsStartMin(),
      );
      const to = Math.min(
        (drag.proposedEnd.getTime() - dayStart().getTime()) / 60000,
        boundsEndMin(),
      );
      if (to <= from) return null;
      return {
        window: [from, to] as [number, number],
        valid: drag.valid,
        kind: drag.kind,
        color: drag.occurrence.event.color,
        title: drag.occurrence.event.title,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.window[0] === b.window[0] &&
          a.window[1] === b.window[1] &&
          a.valid === b.valid &&
          a.proposedStart.getTime() === b.proposedStart.getTime() &&
          a.proposedEnd.getTime() === b.proposedEnd.getTime()),
    },
  );
  const ghostSegment = createMemo(() => {
    const ghost = dragGhost();
    if (!ghost) return null;
    return {
      occurrence: {
        ...ghost.occurrence,
        start: ghost.proposedStart,
        end: ghost.proposedEnd,
        allDay: false,
      },
      day: props.day,
      isStart: true,
      isEnd: true,
      continuesBefore: false,
      continuesAfter: false,
      startMin: ghost.window[0],
      endMin: ghost.window[1],
    } satisfies EventCalendarSegment;
  });

  const draftWindow = useEventCalendarSelector<unknown, [number, number] | null>(
    (state) => {
      const draft = state.slotDraft;
      if (!draft || draft.allDay || draft.resourceId !== props.resource.id) {
        return null;
      }
      const from = Math.max(
        (draft.start.getTime() - dayStart().getTime()) / 60000,
        boundsStartMin(),
      );
      const to = Math.min((draft.end.getTime() - dayStart().getTime()) / 60000, boundsEndMin());
      return to > from ? [from, to] : null;
    },
    {
      isEqual: (a, b) => a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]),
    },
  );

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: same - the chips inside the column carry the keyboard path.
    // biome-ignore lint/a11y/useSemanticElements: role="group" names the column with the resource title; a <fieldset> would carry form semantics.
    <div
      data-slot="event-calendar-day-column"
      data-today={day.isToday || undefined}
      data-off={isOff() || undefined}
      data-ec-day={dayStart().getTime()}
      data-ec-bounds-start={boundsStartMin()}
      data-ec-bounds-end={boundsEndMin()}
      data-ec-resource={props.resource.id}
      data-drop-target={dragGhost() ? (dragGhost()?.valid ? "valid" : "invalid") : undefined}
      role="group"
      aria-label={props.resource.title}
      class={cn(
        "relative min-w-0 border-e last:border-e-0",
        isOff() && offClass(),
        // the resource view is a single day, so today gets no column tint (the
        // header marks it); only a consumer todayClassName can tint it
        day.isToday && viewConfig.todayClassName,
        viewConfig.dayClassName?.(props.day),
        viewConfig.classNames?.dayColumn,
      )}
      style={{
        height: `calc(var(--ec-hour-height) * ${boundsMinutes() / 60})`,
        "background-image": `repeating-linear-gradient(to bottom, transparent, transparent calc(var(--ec-hour-height) * ${props.interval / 60} - var(--ec-slot-line-width, 1px)), var(--ec-slot-line-color, var(--color-border)) calc(var(--ec-hour-height) * ${props.interval / 60} - var(--ec-slot-line-width, 1px)), var(--ec-slot-line-color, var(--color-border)) calc(var(--ec-hour-height) * ${props.interval / 60}))`,
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) gestures.beginCreate(e, props.day, false);
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || wasRecentDrag() || wasRecentChipPress()) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pxPerMinute = rect.height / boundsMinutes();
        const minutes = snapMinutes(
          boundsStartMin() + (e.clientY - rect.top) / pxPerMinute,
          settings.snapDuration,
        );
        const clamped = Math.min(
          Math.max(minutes, boundsStartMin()),
          boundsEndMin() - settings.slotDuration,
        );
        settings.onSlotClick?.(
          {
            date: addMinutes(dayStart(), clamped),
            end: addMinutes(dayStart(), clamped + settings.slotDuration),
            allDay: false,
            view: "resource",
            resourceId: props.resource.id,
          },
          e,
        );
      }}
    >
      <For each={packed()}>
        {(segment) => {
          const startMin = () => Math.max(segment.startMin ?? 0, boundsStartMin());
          const endMin = () => Math.min(segment.endMin ?? startMin(), boundsEndMin());
          const columnCount = () => segment.columnCount ?? 1;
          const column = () => segment.column ?? 0;
          const span = () => segment.columnSpan ?? 1;
          const zIndex = () => segment.occurrence.event.zIndex ?? 10 + column();
          // Strict side-by-side columns - no cascade overlap (fade-truncate +
          // hover reveal carry the legibility); the ring separates neighbors.
          const colPct = () => 100 / columnCount();
          return (
            <Show when={endMin() > boundsStartMin() && startMin() < boundsEndMin()}>
              <div
                // min-h keeps 15-min chips readable (Google-style: the block may
                // slightly outgrow its true window); hover raises a squeezed
                // cascade chip above its overlapping neighbors
                class="absolute z-(--ec-z) min-h-(--ec-event-min-h,1.5rem) px-0.5 hover:z-40"
                style={
                  {
                    ...minuteBlockStyle(startMin(), endMin(), boundsStartMin()),
                    left: `${column() * colPct()}%`,
                    width: `${span() * colPct()}%`,
                    "--ec-z": zIndex(),
                  } as JSX.CSSProperties
                }
              >
                <EventCalendarEvent
                  segment={segment}
                  class={cn(
                    columnCount() > 1 && "ring-background ring-1",
                    // short chips: single centered row, exact-fit line height so
                    // the title never slices mid-glyph
                    endMin() - startMin() < viewConfig.compactEventMinutes
                      ? "h-full gap-1 py-0 leading-4"
                      : "h-full flex-col items-start justify-start gap-0 py-1",
                    viewConfig.classNames?.timedChip,
                  )}
                />
              </div>
            </Show>
          );
        }}
      </For>
      {/* Standardized ghost (EVENT_CALENDAR_GHOST): faint drop placeholder
          for moves (the cursor-attached carry clone owns the visual), dashed
          clone for resizes, destructive marking when invalid. */}
      <Show when={dragGhost()}>
        {(ghost) => (
          <div
            data-slot="event-calendar-drag-ghost"
            data-kind={ghost().kind}
            data-drop-invalid={!ghost().valid || undefined}
            class={cn(
              "pointer-events-none absolute inset-x-0.5 z-50 min-h-(--ec-event-min-h,1.5rem)",
              ghost().kind === "move"
                ? cn(EVENT_CALENDAR_GHOST.move, !ghost().valid && EVENT_CALENDAR_GHOST.invalid)
                : cn(
                    EVENT_CALENDAR_GHOST.resize,
                    !ghost().valid && EVENT_CALENDAR_GHOST.invalidResize,
                  ),
              viewConfig.classNames?.dragGhost,
            )}
            style={
              {
                ...minuteBlockStyle(ghost().window[0], ghost().window[1], boundsStartMin()),
                "--ec-event-color": ghost().color ?? "var(--color-primary)",
              } as JSX.CSSProperties
            }
          >
            <Show when={ghost().kind !== "move" && ghostSegment()}>
              {(segment) => (
                <EventCalendarEvent
                  preview
                  segment={segment()}
                  class={cn(
                    ghost().window[1] - ghost().window[0] < viewConfig.compactEventMinutes
                      ? "h-full gap-1 py-0 leading-4"
                      : "h-full flex-col items-start justify-start gap-0 py-1",
                    viewConfig.classNames?.timedChip,
                    "inset-ring-0",
                    !ghost().valid && EVENT_CALENDAR_GHOST.invalidContent,
                  )}
                />
              )}
            </Show>
          </div>
        )}
      </Show>
      <Show when={draftWindow()}>
        {(window) => (
          <div
            data-slot="event-calendar-slot-draft"
            class={cn(
              "border-primary/40 bg-primary/5 pointer-events-none absolute inset-x-0.5 z-40 rounded-sm border border-dashed",
              viewConfig.classNames?.slotDraft,
            )}
            style={minuteBlockStyle(window()[0], window()[1], boundsStartMin())}
          />
        )}
      </Show>
    </div>
  );
}

export type { EventCalendarResourceViewProps };
export { EventCalendarResourceView };
