import { addDays, addMinutes, differenceInMinutes, format } from "date-fns";
import type { Accessor, ComponentProps, JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import {
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarDay,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarViewConfig,
  useEventCalendarViewContext,
  useEventCalendarViewSettings,
} from "./event-calendar";
import { useEventCalendarGestures, wasRecentChipPress, wasRecentDrag } from "./event-calendar-dnd";
import { EVENT_CALENDAR_GHOST, EventCalendarEvent } from "./event-calendar-event";
import {
  getDayKey,
  getDayTotalMinutes,
  getRangeKey,
  packTimedSegments,
  resolveOffDay,
  snapMinutes,
  toZoned,
  zonedStartOfDay,
} from "./event-calendar-lib";
import type {
  CalendarView,
  EventCalendarDateRange,
  EventCalendarDragState,
  EventCalendarSegment,
} from "./event-calendar-types";

/** Current time, refreshed on an interval and on tab focus. */
function useNow(intervalMs = 30_000): Accessor<Date> {
  const [now, setNow] = createSignal(new Date());
  createEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    onCleanup(() => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    });
  });
  return now;
}

const EMPTY_ALL_DAY_SEGMENTS: EventCalendarSegment[] = [];

interface EventCalendarTimeGridProps extends Omit<ComponentProps<"div">, "style"> {
  view: Extract<CalendarView, "week" | "day" | "days">;
  dayStartHour?: number;
  dayEndHour?: number;
  showAllDay?: boolean;
  /** Gutter/gridline interval in minutes; defaults to the interval view config. */
  interval?: number;
  /** Object form only, so the grid can merge its --ec-hour-height into it. */
  style?: JSX.CSSProperties;
}

function EventCalendarTimeGrid(props: EventCalendarTimeGridProps) {
  const instance = useEventCalendar();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, [
    "view",
    "class",
    "style",
    "dayStartHour",
    "dayEndHour",
    "showAllDay",
    "interval",
  ]);
  const visibleRange = useEventCalendarSelector<unknown, EventCalendarDateRange>(
    (state) => state.visibleRange,
    { isEqual: (a, b) => getRangeKey(a) === getRangeKey(b) },
  );

  const startHour = () => local.dayStartHour ?? settings.dayStartHour;
  const endHour = () => local.dayEndHour ?? settings.dayEndHour;
  const interval = () => Math.min(Math.max(local.interval ?? viewConfig.interval, 5), 240);
  const showAllDay = () => local.showAllDay ?? true;
  const contained = () => viewConfig.scrollMode !== "page";

  const { effective } = useEventCalendarViewSettings();
  const days = createMemo(() => {
    const result: Date[] = [];
    let cursor: Date = zonedStartOfDay(visibleRange().start, settings.timeZone);
    while (cursor < visibleRange().end) {
      result.push(cursor);
      cursor = zonedStartOfDay(addDays(toZoned(cursor, settings.timeZone), 1), settings.timeZone);
    }
    if (effective.weekends || local.view === "day") return result;
    // Same weekend definition the month view filters on, so the toggle cannot
    // hide one set of days here and another one there.
    const filtered = result.filter(
      (day) => !settings.weekendDays.includes(toZoned(day, settings.timeZone).getDay()),
    );
    // A short N-days window landing entirely on the weekend would otherwise
    // filter to nothing and emit an invalid repeat(0, ...) track.
    return filtered.length ? filtered : result;
  });

  // Initial scroll to scrollToHour + api.scrollToTime registration (contained)
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
        // Measure a rendered slot row - the CSS var is in rem, rects are in px.
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

  // Gutter slots in minutes from the zoned day start
  const slots = createMemo(() => {
    const result: number[] = [];
    for (let m = startHour() * 60; m < endHour() * 60; m += interval()) {
      result.push(m);
    }
    return result;
  });

  // Section-level all-day segments for renderAllDaySection - reads the same
  // per-day index buckets the cells subscribe to; inert (stable empty array,
  // so the memo never invalidates) while the override is unset.
  const allDaySegments = useEventCalendarSelector<unknown, EventCalendarSegment[]>(
    () => {
      if (!viewConfig.renderAllDaySection) return EMPTY_ALL_DAY_SEGMENTS;
      const byDay = instance.internals.getIndex().byDay;
      const result = days().flatMap(
        (day) => byDay.get(getDayKey(day, settings.timeZone))?.allDay ?? [],
      );
      return result.length ? result : EMPTY_ALL_DAY_SEGMENTS;
    },
    {
      isEqual: (a, b) =>
        a === b || (a.length === b.length && a.every((segment, i) => segment === b[i])),
    },
  );

  const gridTemplateColumns = () =>
    `repeat(${days().length}, minmax(var(--ec-day-col-min,0px), 1fr))`;

  const track = () => (
    <div class="relative flex">
      <EventCalendarTimeGutter
        days={days()}
        slots={slots()}
        startHour={startHour()}
        interval={interval()}
      />
      <div class="grid min-w-0 flex-1" style={{ "grid-template-columns": gridTemplateColumns() }}>
        <For each={days()}>
          {(day) => (
            <EventCalendarDayColumn
              day={day}
              startHour={startHour()}
              endHour={endHour()}
              interval={interval()}
            />
          )}
        </For>
      </div>
      <Show when={effective.nowIndicator}>
        <EventCalendarNowIndicator days={days()} startHour={startHour()} endHour={endHour()} />
      </Show>
    </div>
  );

  return (
    <EventCalendarViewContext.Provider
      value={{
        get view() {
          return local.view;
        },
      }}
    >
      <div
        data-slot="event-calendar-time-grid"
        data-view={local.view}
        class={cn(
          "flex flex-col border-t",
          contained() && "min-h-0 flex-1 overflow-hidden",
          viewConfig.classNames?.timeGrid,
          local.class,
        )}
        style={{ "--ec-hour-height": "4rem", ...local.style }}
        {...others}
      >
        {/* Day-header row (sticky below the nav in page scroll mode) */}
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
            <For each={days()}>
              {(day) => <EventCalendarDayHeader day={day} view={local.view} />}
            </For>
          </div>
        </div>
        {/* All-day row */}
        <Show when={showAllDay()}>
          <div
            data-slot="event-calendar-all-day-section"
            class={cn(
              "flex border-b pe-(--ec-scrollbar-w,0px)",
              viewConfig.classNames?.allDaySection,
            )}
          >
            {viewConfig.renderAllDaySection?.({
              days: days(),
              segments: allDaySegments(),
            }) ?? (
              <>
                <div
                  class={cn(
                    // pt-1.5 matches the bar overlay's top inset; the inner box
                    // is one bar-row tall and centers the label so it sits on
                    // the SAME baseline as the first all-day chip and stays top-
                    // aligned when the chips wrap onto more lanes
                    "text-muted-foreground w-(--ec-gutter-width,4.5rem) shrink-0 border-e ps-2 pe-2.5 pt-1.5",
                    viewConfig.classNames?.allDayLabel,
                  )}
                >
                  <span class="flex h-[calc(var(--ec-month-bar-h,1.625rem)-0.125rem)] items-center justify-end">
                    {settings.i18n.labels.allDay}
                  </span>
                </div>
                <EventCalendarAllDayBars
                  days={days()}
                  gridTemplateColumns={gridTemplateColumns()}
                />
              </>
            )}
          </div>
        </Show>
        {/* Time track: internal scroll (contained) or document flow (page) */}
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

function EventCalendarDayHeader(props: { day: Date; view: CalendarView }) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const day = useEventCalendarDay(() => props.day);
  return (
    <div
      data-slot="event-calendar-day-header"
      data-today={day.isToday || undefined}
      class={cn(
        "data-today:text-primary min-w-0 truncate border-e px-2 py-1.5 font-medium last:border-e-0",
        day.isToday && viewConfig.todayClassName,
      )}
    >
      {viewConfig.renderDayHeader?.({ day: props.day, view: props.view, isToday: day.isToday }) ??
        format(toZoned(props.day, settings.timeZone), settings.i18n.formats.timeGridDayHeader, {
          locale: settings.locale,
        })}
    </div>
  );
}

/**
 * Continuous all-day bars for the week/N-days all-day row: consecutive-day
 * segments of one occurrence merge into a single bar spanning its columns
 * (same treatment as the month view), lane-packed. Returns CLONED segments -
 * the shared per-day segments must stay pristine (see packWeekRowLanes).
 */
function useEventCalendarAllDayBars(days: () => Date[]): Accessor<{
  bars: EventCalendarSegment[];
  laneCount: number;
}> {
  const instance = useEventCalendar();
  const settings = useEventCalendarSettings();
  return useEventCalendarSelector<unknown, { bars: EventCalendarSegment[]; laneCount: number }>(
    () => {
      const byDay = instance.internals.getIndex().byDay;
      type Bar = {
        seg: EventCalendarSegment;
        colStart: number;
        colEnd: number;
        isStart: boolean;
        isEnd: boolean;
        lane: number;
      };
      const merged = new Map<string, Bar>();
      const columns = days();
      columns.forEach((day, col) => {
        for (const seg of byDay.get(getDayKey(day, settings.timeZone))?.allDay ?? []) {
          const key = seg.occurrence.key;
          const bar = merged.get(key);
          if (bar) {
            bar.colEnd = col;
            bar.isEnd = seg.isEnd;
          } else {
            merged.set(key, {
              seg,
              colStart: col,
              colEnd: col,
              isStart: seg.isStart,
              isEnd: seg.isEnd,
              lane: 0,
            });
          }
        }
      });
      const packed = Array.from(merged.values()).sort(
        (a, b) =>
          a.colStart - b.colStart ||
          b.colEnd - b.colStart - (a.colEnd - a.colStart) ||
          a.seg.occurrence.key.localeCompare(b.seg.occurrence.key),
      );
      const lanes: boolean[][] = [];
      for (const bar of packed) {
        let lane = 0;
        for (;;) {
          lanes[lane] ??= new Array(columns.length).fill(false);
          let free = true;
          for (let c = bar.colStart; c <= bar.colEnd; c++) {
            if (lanes[lane][c]) {
              free = false;
              break;
            }
          }
          if (free) break;
          lane++;
        }
        for (let c = bar.colStart; c <= bar.colEnd; c++) lanes[lane][c] = true;
        bar.lane = lane;
      }
      return {
        bars: packed.map((bar) => ({
          ...bar.seg,
          isStart: bar.isStart,
          isEnd: bar.isEnd,
          continuesBefore: !bar.isStart,
          continuesAfter: !bar.isEnd,
          colStart: bar.colStart,
          colSpan: bar.colEnd - bar.colStart + 1,
          lane: bar.lane,
        })),
        laneCount: lanes.length,
      };
    },
    {
      calendar: instance,
      isEqual: (a, b) =>
        a.laneCount === b.laneCount &&
        a.bars.length === b.bars.length &&
        a.bars.every((s, i) => {
          const o = b.bars[i];
          // Compare the OCCURRENCE by identity, not by key: the key encodes
          // id+start only, so a title/color/data edit compared equal and the
          // all-day row kept its stale bars. Occurrences come from the
          // memoized index (rebuilt exactly when events change), so identity
          // also subsumes the end-time check it replaces. The positional
          // fields stay because they are recomputed on every read.
          return (
            s.occurrence === o.occurrence &&
            s.colStart === o.colStart &&
            s.colSpan === o.colSpan &&
            s.lane === o.lane &&
            s.isStart === o.isStart &&
            s.isEnd === o.isEnd
          );
        }),
    },
  );
}

/**
 * The all-day row body: drop-target cells underneath, one continuous bar per
 * occurrence in an overlay grid on top (month-view treatment), plus the
 * standardized day-granular drag ghost for moves/resizes in this lane.
 */
function EventCalendarAllDayBars(props: { days: Date[]; gridTemplateColumns: string }) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const allDay = useEventCalendarAllDayBars(() => props.days);

  const dragGhost = useEventCalendarSelector<
    unknown,
    | (Pick<
        EventCalendarDragState,
        "kind" | "valid" | "occurrence" | "proposedStart" | "proposedEnd"
      > & {
        colStart: number;
        colSpan: number;
        isStart: boolean;
        isEnd: boolean;
        color?: string;
      })
    | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag?.proposedDayGranular) return null;
      const tz = settings.timeZone;
      const startMs = zonedStartOfDay(drag.proposedStart, tz).getTime();
      const lastMs = zonedStartOfDay(new Date(drag.proposedEnd.getTime() - 1), tz).getTime();
      let colStart = -1;
      let colEnd = -1;
      props.days.forEach((day, i) => {
        const t = zonedStartOfDay(day, tz).getTime();
        if (t >= startMs && t <= lastMs) {
          if (colStart === -1) colStart = i;
          colEnd = i;
        }
      });
      if (colStart === -1) return null;
      return {
        kind: drag.kind,
        valid: drag.valid,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
        colStart,
        colSpan: colEnd - colStart + 1,
        isStart: zonedStartOfDay(props.days[colStart], tz).getTime() <= startMs,
        isEnd: zonedStartOfDay(props.days[colEnd], tz).getTime() >= lastMs,
        color: drag.occurrence.event.color,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.colStart === b.colStart &&
          a.colSpan === b.colSpan &&
          a.valid === b.valid &&
          a.kind === b.kind &&
          a.proposedStart.getTime() === b.proposedStart.getTime() &&
          a.proposedEnd.getTime() === b.proposedEnd.getTime()),
    },
  );
  const ghostLane = () => {
    const ghost = dragGhost();
    if (!ghost) return 0;
    return (
      allDay().bars.find((s) => s.occurrence.key === ghost.occurrence.key)?.lane ??
      allDay().laneCount
    );
  };
  const effectiveLanes = () => Math.max(allDay().laneCount, dragGhost() ? ghostLane() + 1 : 0);
  const ghostSegment = createMemo(() => {
    const ghost = dragGhost();
    if (!ghost) return null;
    return {
      occurrence: {
        ...ghost.occurrence,
        start: ghost.proposedStart,
        end: ghost.proposedEnd,
      },
      day: props.days[ghost.colStart] ?? props.days[0],
      isStart: ghost.isStart,
      isEnd: ghost.isEnd,
      continuesBefore: !ghost.isStart,
      continuesAfter: !ghost.isEnd,
    } satisfies EventCalendarSegment;
  });

  return (
    <div class="relative min-w-0 flex-1">
      <div
        class="grid h-full"
        style={{
          "grid-template-columns": props.gridTemplateColumns,
          // always reserve at least one bar row so the all-day row keeps the
          // same height whether or not the day has all-day events (an empty
          // row would otherwise collapse to the label height and misalign)
          "min-height": `calc(${Math.max(effectiveLanes(), 1)} * var(--ec-month-bar-h, 1.625rem) + 0.625rem)`,
        }}
      >
        <For each={props.days}>{(day) => <EventCalendarAllDayCell day={day} />}</For>
      </div>
      <Show when={allDay().bars.length > 0 || dragGhost()}>
        <div
          data-slot="event-calendar-all-day-bar-overlay"
          class="pointer-events-none absolute inset-x-0 top-0 grid pt-1.5"
          style={{
            "grid-template-columns": props.gridTemplateColumns,
            "grid-auto-rows": "var(--ec-month-bar-h, 1.625rem)",
          }}
        >
          <For each={allDay().bars}>
            {(segment) => (
              <div
                class={cn("pointer-events-auto min-w-0 px-1", viewConfig.classNames?.monthBar)}
                style={{
                  "grid-column": `${(segment.colStart ?? 0) + 1} / span ${segment.colSpan ?? 1}`,
                  "grid-row": (segment.lane ?? 0) + 1,
                }}
              >
                <EventCalendarEvent
                  segment={segment}
                  class="h-[calc(var(--ec-month-bar-h,1.625rem)-0.125rem)]"
                />
              </div>
            )}
          </For>
          <Show when={dragGhost()}>
            {(ghost) => (
              <div
                aria-hidden
                class={cn("min-w-0 px-1", viewConfig.classNames?.monthBar)}
                style={{
                  "grid-column": `${ghost().colStart + 1} / span ${ghost().colSpan}`,
                  "grid-row": ghostLane() + 1,
                }}
              >
                <div
                  data-slot="event-calendar-drag-ghost"
                  data-kind={ghost().kind}
                  data-drop-invalid={!ghost().valid || undefined}
                  class={cn(
                    "h-[calc(var(--ec-month-bar-h,1.625rem)-0.125rem)]",
                    ghost().kind === "move"
                      ? cn(
                          EVENT_CALENDAR_GHOST.move,
                          !ghost().valid && EVENT_CALENDAR_GHOST.invalid,
                        )
                      : cn(
                          EVENT_CALENDAR_GHOST.resize,
                          !ghost().valid && EVENT_CALENDAR_GHOST.invalidResize,
                        ),
                    viewConfig.classNames?.dragGhost,
                  )}
                  style={
                    {
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
                          "h-full inset-ring-0",
                          !ghost().valid && EVENT_CALENDAR_GHOST.invalidContent,
                        )}
                      />
                    )}
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
}

function EventCalendarAllDayCell(props: { day: Date }) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const viewContext = useEventCalendarViewContext();
  const { effective } = useEventCalendarViewSettings();
  const gestures = useEventCalendarGestures();
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
  const inDraft = useEventCalendarSelector<unknown, { isStart: boolean; isEnd: boolean } | null>(
    (state) => {
      const draft = state.slotDraft;
      if (!draft?.allDay) return null;
      if (draft.start >= dayEnd() || draft.end <= dayStart()) return null;
      return {
        isStart: draft.start >= dayStart(),
        isEnd: draft.end <= dayEnd(),
      };
    },
    {
      isEqual: (a, b) =>
        a === b || (a !== null && b !== null && a.isStart === b.isStart && a.isEnd === b.isEnd),
    },
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the all-day cell is the calendar's slot-selection surface; everything it exposes is also reachable from the focusable chips rendered above it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: same - the chips above the lane carry the keyboard path.
    <div
      data-slot="event-calendar-all-day-cell"
      data-ec-day={dayStart().getTime()}
      data-drop-target={isDropTarget() ?? undefined}
      data-off={isOff() || undefined}
      class={cn(
        "relative flex min-w-0 flex-col gap-0.5 border-e px-1 py-1.5 last:border-e-0",
        isOff() && offClass(),
        viewConfig.dayClassName?.(props.day),
        // No drop-target bg fill on move/resize (see month view) - a subtle
        // dashed inset outline below marks the target instead.
        inDraft() && cn("bg-primary/10", viewConfig.classNames?.slotDraft),
        viewConfig.classNames?.allDayCell,
      )}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) gestures.beginCreate(e, props.day, true);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !wasRecentDrag() && !wasRecentChipPress()) {
          settings.onSlotClick?.({ date: dayStart(), allDay: true, view: viewContext.view }, e);
        }
      }}
    />
  );
}

function EventCalendarTimeGutter(props: {
  days: Date[];
  slots: number[];
  startHour: number;
  interval: number;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const referenceDay = () => props.days[0] ?? new Date();
  const labelFormat = () =>
    props.interval % 60 === 0
      ? settings.i18n.formats.timeGutter
      : settings.i18n.formats.timeGutterMinute;
  return (
    <div
      data-slot="event-calendar-time-gutter"
      class={cn(
        "relative w-(--ec-gutter-width,4.5rem) shrink-0 border-e",
        viewConfig.classNames?.timeGutter,
      )}
    >
      <For each={props.slots}>
        {(minutes) => {
          const time = () =>
            addMinutes(zonedStartOfDay(referenceDay(), settings.timeZone), minutes);
          // Always consult renderTimeGutterSlot (a consumer may label the first
          // slot); only the DEFAULT label is suppressed at the day-start edge.
          const label = () =>
            viewConfig.renderTimeGutterSlot?.({
              time: time(),
              hour: Math.floor(minutes / 60),
              minute: minutes % 60,
            }) ??
            (minutes > props.startHour * 60
              ? format(time(), labelFormat(), { locale: settings.locale })
              : null);
          return (
            <div
              class="relative"
              style={{ height: `calc(var(--ec-hour-height) * ${props.interval / 60})` }}
            >
              <Show when={label() != null}>
                <span
                  class={cn(
                    "text-muted-foreground absolute end-2.5 -top-2",
                    viewConfig.classNames?.timeGutterLabel,
                  )}
                >
                  {label()}
                </span>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}

/** Absolute overlay block positioned by minutes (ghosts + drafts). */
function minuteBlockStyle(
  startMin: number,
  endMin: number,
  boundsStartMin: number,
): JSX.CSSProperties {
  const top = (startMin - boundsStartMin) / 60;
  const height = Math.max((endMin - startMin) / 60, 0.25);
  return {
    top: `calc(var(--ec-hour-height) * ${top})`,
    height: `calc(var(--ec-hour-height) * ${height})`,
  };
}

function EventCalendarDayColumn(props: {
  day: Date;
  startHour: number;
  endHour: number;
  interval: number;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const { effective } = useEventCalendarViewSettings();
  const viewContext = useEventCalendarViewContext();
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
  const dayEnd = () => addDays(toZoned(dayStart(), timeZone()), 1);
  const totalMinutes = () => getDayTotalMinutes(props.day, timeZone());
  const boundsStartMin = () => props.startHour * 60;
  const boundsEndMin = () => Math.min(props.endHour * 60, totalMinutes());
  const boundsMinutes = () => Math.max(60, boundsEndMin() - boundsStartMin());

  // Minute window of a proposal intersecting THIS day, or null
  const windowFor = (start: Date, end: Date): [number, number] | null => {
    if (start >= dayEnd() || end <= dayStart()) return null;
    const from = Math.max(
      differenceInMinutes(start > dayStart() ? start : dayStart(), dayStart()),
      boundsStartMin(),
    );
    const to = Math.min(
      differenceInMinutes(end < dayEnd() ? end : dayEnd(), dayStart()),
      boundsEndMin(),
    );
    return to > from ? [from, to] : null;
  };

  const dragGhost = useEventCalendarSelector<
    unknown,
    | (Pick<
        EventCalendarDragState,
        "valid" | "kind" | "occurrence" | "proposedStart" | "proposedEnd"
      > & {
        window: [number, number];
        color?: string;
        title: string;
      })
    | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag || drag.proposedDayGranular) return null;
      const window = windowFor(drag.proposedStart, drag.proposedEnd);
      if (!window) return null;
      return {
        valid: drag.valid,
        kind: drag.kind,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
        window,
        color: drag.occurrence.event.color,
        title: drag.occurrence.event.title,
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
          a.kind === b.kind &&
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
      if (!draft || draft.allDay) return null;
      return windowFor(draft.start, draft.end);
    },
    {
      isEqual: (a, b) => a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1]),
    },
  );

  // Segments the day bounds clip away still occupy a column in the shared
  // index's packing, leaving a phantom empty half beside the first in-bounds
  // chip. Repack the visible subset; clones keep the index cache untouched.
  const packedTimed = createMemo(() => {
    const timed = day.segments.timed;
    const visible = timed.filter((segment) => {
      const startMin = Math.max(segment.startMin ?? 0, boundsStartMin());
      const endMin = Math.min(segment.endMin ?? startMin, boundsEndMin());
      return endMin > boundsStartMin() && startMin < boundsEndMin();
    });
    if (visible.length === timed.length) return timed;
    const clones = visible.map((segment) => ({ ...segment }) as EventCalendarSegment);
    packTimedSegments(clones);
    return clones;
  });

  const slotFromPointer = (
    e: MouseEvent & { currentTarget: HTMLDivElement },
  ): { date: Date; end: Date } => {
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
    return {
      date: addMinutes(dayStart(), clamped),
      end: addMinutes(dayStart(), clamped + settings.slotDuration),
    };
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: same - the chips inside the column carry the keyboard path.
    // biome-ignore lint/a11y/useSemanticElements: role="group" names the column for assistive tech; a <fieldset> would carry form semantics.
    <div
      data-slot="event-calendar-day-column"
      data-today={day.isToday || undefined}
      data-off={isOff() || undefined}
      data-ec-day={dayStart().getTime()}
      data-ec-bounds-start={boundsStartMin()}
      data-ec-bounds-end={boundsEndMin()}
      role="group"
      aria-label={format(toZoned(props.day, timeZone()), settings.i18n.formats.dayAria, {
        locale: settings.locale,
      })}
      class={cn(
        "relative min-w-0 border-e last:border-e-0",
        isOff() && offClass(),
        // time grid keeps today's column on the normal background (the header
        // marks today); only a consumer todayClassName can tint it
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
        const slot = slotFromPointer(e);
        settings.onSlotClick?.({ ...slot, allDay: false, view: viewContext.view }, e);
      }}
    >
      <Show when={viewConfig.renderDayColumnBackground}>
        {(render) => (
          <div class="pointer-events-none absolute inset-0">
            {render()({
              day: props.day,
              boundsStartMin: boundsStartMin(),
              boundsEndMin: boundsEndMin(),
              totalMinutes: totalMinutes(),
            })}
          </div>
        )}
      </Show>
      <For each={packedTimed()}>
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
      {/* Drag ghost, standardized (EVENT_CALENDAR_GHOST). Move: a faint
          dashed placeholder at the snapped slot - the cursor-attached carry
          clone owns the visual. Resize: the chip clone with a dashed boundary
          at the proposed extent. Invalid: destructive marking. */}
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
      {/* Drag-create draft */}
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

function EventCalendarNowIndicator(props: {
  days: Date[];
  startHour: number;
  endHour: number;
}): JSX.Element {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const now = useNow(viewConfig.nowIndicatorInterval);

  const timeZone = () => settings.timeZone;
  const todayIndex = () => {
    const todayKey = getDayKey(now(), timeZone());
    return props.days.findIndex((day) => getDayKey(day, timeZone()) === todayKey);
  };
  const minutes = () => differenceInMinutes(now(), zonedStartOfDay(now(), timeZone()));
  const inBounds = () => minutes() >= props.startHour * 60 && minutes() <= props.endHour * 60;
  const top = () => minutes() / 60 - props.startHour;
  const columnWidthPct = () => 100 / props.days.length;

  return (
    <Show when={todayIndex() !== -1 && inBounds()}>
      <Show
        when={viewConfig.renderNowIndicator}
        fallback={
          <div
            data-slot="event-calendar-now-indicator"
            class="pointer-events-none absolute inset-x-0 z-40"
            style={{ top: `calc(var(--ec-hour-height) * ${top()})` }}
          >
            {/* hairline across the content columns only (clear of the time gutter) */}
            <div class="bg-destructive/40 absolute start-(--ec-gutter-width,4.5rem) end-0 h-px" />
            {/* stronger segment + dot over today's column */}
            <div
              class="absolute h-px"
              style={{
                left: `calc(var(--ec-gutter-width, 4.5rem) + (100% - var(--ec-gutter-width, 4.5rem)) * ${(todayIndex() * columnWidthPct()) / 100})`,
                width: `calc((100% - var(--ec-gutter-width, 4.5rem)) * ${columnWidthPct() / 100})`,
              }}
            >
              <div class="bg-destructive absolute inset-x-0 top-0 h-px" />
              {/* dot leads the line at today's column-start border: pulled 1px left of
                  center (-start-1 = -4px vs the 6px/size-1.5 circle) so it reads as a
                  distinct bullet instead of merging into the line to its right */}
              <div class="bg-destructive absolute -start-1 top-0 size-1.5 -translate-y-1/2 rounded-full" />
            </div>
          </div>
        }
      >
        {(render) => (
          <div
            class="pointer-events-none absolute inset-x-0 z-40"
            style={{ top: `calc(var(--ec-hour-height) * ${top()})` }}
          >
            {render()({ time: now() })}
          </div>
        )}
      </Show>
    </Show>
  );
}

type TimeGridViewProps = Omit<EventCalendarTimeGridProps, "view">;

function EventCalendarWeekView(props: TimeGridViewProps) {
  return <EventCalendarTimeGrid view="week" {...props} />;
}

function EventCalendarDayView(props: TimeGridViewProps) {
  return <EventCalendarTimeGrid view="day" {...props} />;
}

function EventCalendarDaysView(props: TimeGridViewProps) {
  return <EventCalendarTimeGrid view="days" {...props} />;
}

export type { EventCalendarTimeGridProps };
export {
  EventCalendarDaysView,
  EventCalendarDayView,
  EventCalendarNowIndicator,
  EventCalendarTimeGrid,
  EventCalendarTimeGutter,
  EventCalendarWeekView,
  minuteBlockStyle,
  useNow,
};
