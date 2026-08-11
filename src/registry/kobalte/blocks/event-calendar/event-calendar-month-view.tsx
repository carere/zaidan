import { addDays, format, getWeek } from "date-fns";
import { Plus } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import {
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarDay,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarViewConfig,
  useEventCalendarViewSettings,
  useEventCalendarWeek,
} from "./event-calendar";
import { useEventCalendarGestures, wasRecentChipPress, wasRecentDrag } from "./event-calendar-dnd";
import { EVENT_CALENDAR_GHOST, EventCalendarEvent } from "./event-calendar-event";
import {
  getDayKey,
  getRangeKey,
  resolveOffDay,
  toZoned,
  zonedStartOfDay,
} from "./event-calendar-lib";
import type {
  EventCalendarDateRange,
  EventCalendarDragState,
  EventCalendarEventId,
  EventCalendarSegment,
} from "./event-calendar-types";

// An occurrence key encodes the start instant and is also the chip's list key,
// so committing a move re-keys the chip: <For> recreates it and the browser
// drops focus to <body>. The chip that owns focus is recorded here so the cell
// rendering its replacement can hand focus back. Module scope because the drop
// can land in a different cell than the one the chip left, and only one element
// holds focus at a time anyway.
let focusedChip: {
  node: HTMLElement;
  eventId: EventCalendarEventId;
  recurrenceIndex?: number;
} | null = null;

/** Give focus back to the recorded chip's replacement, if `root` renders it. */
function restoreChipFocus(root: HTMLElement | null, segments: EventCalendarSegment[]) {
  const pending = focusedChip;
  // Only a chip removed WHILE focused needs help: a node still in the tree, or
  // a focus that has already moved on by itself, is left alone.
  if (!root || !pending || pending.node.isConnected) return;
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const index = segments.findIndex(
    (segment) =>
      segment.occurrence.eventId === pending.eventId &&
      segment.occurrence.recurrenceIndex === pending.recurrenceIndex,
  );
  if (index < 0) return;
  const chip = root.querySelectorAll<HTMLElement>("[data-slot=event-calendar-event]")[index];
  if (!chip) return;
  // cleared first: focus() re-records through the new chip's own onFocus
  focusedChip = null;
  chip.focus();
}

interface EventCalendarMonthViewProps extends ComponentProps<"div"> {
  maxEventsPerCell?: number | "auto";
}

function EventCalendarMonthView(props: EventCalendarMonthViewProps) {
  const instance = useEventCalendar();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, ["class", "maxEventsPerCell"]);
  const visibleRange = useEventCalendarSelector<unknown, EventCalendarDateRange>(
    (state) => state.visibleRange,
    { isEqual: (a, b) => getRangeKey(a) === getRangeKey(b) },
  );
  const anchorDate = useEventCalendarSelector((state) => state.date);

  const { effective } = useEventCalendarViewSettings();
  const weeks = createMemo(() => {
    const days: Date[] = [];
    let cursor: Date = zonedStartOfDay(visibleRange().start, settings.timeZone);
    while (cursor < visibleRange().end) {
      days.push(cursor);
      cursor = zonedStartOfDay(addDays(toZoned(cursor, settings.timeZone), 1), settings.timeZone);
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    if (effective.weekends) return rows;
    return rows.map((row) =>
      row.filter((day) => !settings.weekendDays.includes(toZoned(day, settings.timeZone).getDay())),
    );
  });

  const headerDays = () => weeks()[0] ?? [];
  const title = () =>
    settings.i18n.functions.formatTitle("month", {
      date: toZoned(anchorDate(), settings.timeZone),
      activeRange: instance.api.getActiveRange(),
      visibleRange: visibleRange(),
      locale: settings.locale,
    });

  const gridTemplateColumns = () =>
    `${effective.weekNumbers ? "var(--ec-week-number-w, 2.75rem) " : ""}repeat(${headerDays().length}, minmax(0, 1fr))`;
  const cap = () => local.maxEventsPerCell ?? viewConfig.maxEventsPerCell;
  const contained = () => viewConfig.scrollMode !== "page";

  // "auto" fits as many event rows as the cell height allows and rolls the rest
  // into "+N more". Only the contained mode gives a cell a bounded height to
  // measure; page mode grows to fit, so "auto" there keeps the fixed fallback.
  const autoFit = () => cap() === "auto" && contained();
  // slotProbe resolves the event-row height (--ec-month-bar-h) to px, honoring
  // the current font size and any consumer override; contentProbe is the first
  // cell's flex-1 content area, whose height is the event space per cell.
  let slotProbeEl: HTMLDivElement | undefined;
  let contentProbeEl: HTMLDivElement | undefined;
  const [autoCap, setAutoCap] = createSignal<number | null>(null);
  const measureCap = () => {
    const content = contentProbeEl;
    const slot = slotProbeEl;
    if (!content || !slot) return;
    const laneH = slot.getBoundingClientRect().height;
    if (laneH <= 0) return;
    const cs = getComputedStyle(content);
    const inner = content.clientHeight - (Number.parseFloat(cs.paddingTop) || 0);
    const gap = Number.parseFloat(cs.rowGap) || 0;
    // N rows occupy N*laneH - gap (the last row has no trailing gap)
    setAutoCap(Math.max(1, Math.floor((inner + gap) / laneH)));
  };
  createEffect(() => {
    if (!autoFit()) {
      setAutoCap(null);
      return;
    }
    // re-observe the first cell after a re-layout (row count or month change)
    weeks().length;
    anchorDate();
    const content = contentProbeEl;
    if (!content || typeof ResizeObserver === "undefined") return;
    measureCap();
    const observer = new ResizeObserver(measureCap);
    observer.observe(content);
    onCleanup(() => observer.disconnect());
  });
  const resolvedCap = () => {
    const value = cap();
    return value === "auto" ? (autoFit() ? (autoCap() ?? 3) : 3) : value;
  };

  return (
    <EventCalendarViewContext.Provider value={{ view: "month" }}>
      {/* biome-ignore lint/a11y/useSemanticElements: the month grid is an ARIA grid of day cells, not a data <table> - its rows carry an overlay of cross-day bars a table layout cannot express. */}
      <div
        data-slot="event-calendar-month-view"
        data-view="month"
        role="grid"
        aria-label={title()}
        class={cn(
          "flex flex-col border-t",
          contained() && "min-h-0 flex-1 overflow-hidden",
          viewConfig.classNames?.monthView,
          local.class,
        )}
        {...others}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid rows, see above. */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: rows are structure, not stops - focus lives on the chips inside the cells. */}
        <div
          role="row"
          data-slot="event-calendar-month-header"
          // @container scopes the narrow-label breakpoint to the header row
          class={cn("@container grid border-b", viewConfig.classNames?.monthHeader)}
          style={{ "grid-template-columns": gridTemplateColumns() }}
        >
          <Show when={effective.weekNumbers}>
            {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid column header, see above. */}
            {/* biome-ignore lint/a11y/useFocusableInteractive: column headers are structure, not stops. */}
            <div
              role="columnheader"
              aria-hidden
              class={cn("border-e px-2 py-1.5", viewConfig.classNames?.weekNumber)}
            />
          </Show>
          <For each={headerDays()}>
            {(day) => (
              // biome-ignore lint/a11y/useSemanticElements: ARIA grid column header, see above.
              // biome-ignore lint/a11y/useFocusableInteractive: column headers are structure, not stops.
              <div
                role="columnheader"
                class={cn(
                  "text-muted-foreground truncate px-2 py-1.5 font-medium",
                  viewConfig.classNames?.monthDayHeader,
                )}
              >
                {viewConfig.renderDayHeader?.({
                  day,
                  view: "month",
                  isToday:
                    getDayKey(day, settings.timeZone) === getDayKey(new Date(), settings.timeZone),
                }) ?? (
                  <>
                    <span class="@max-[36rem]:hidden">
                      {format(
                        toZoned(day, settings.timeZone),
                        settings.i18n.formats.monthDayHeader,
                        { locale: settings.locale },
                      )}
                    </span>
                    <span class="hidden @max-[36rem]:inline">
                      {format(
                        toZoned(day, settings.timeZone),
                        settings.i18n.formats.monthDayHeaderNarrow,
                        { locale: settings.locale },
                      )}
                    </span>
                  </>
                )}
              </div>
            )}
          </For>
        </div>
        <div
          data-slot="event-calendar-month-body"
          class={cn("grid", contained() && "min-h-0 flex-1", viewConfig.classNames?.monthBody)}
          style={{
            "grid-template-rows": contained()
              ? `repeat(${weeks().length}, minmax(0, 1fr))`
              : `repeat(${weeks().length}, minmax(var(--ec-month-row-min-h, 8rem), auto))`,
          }}
        >
          <For each={weeks()}>
            {(week, rowIndex) => (
              <EventCalendarMonthWeek
                week={week}
                gridTemplateColumns={gridTemplateColumns()}
                showWeekNumber={effective.weekNumbers}
                cap={resolvedCap()}
                autoFit={autoFit()}
                contentRef={
                  rowIndex() === 0
                    ? (el: HTMLDivElement) => {
                        contentProbeEl = el;
                      }
                    : undefined
                }
              />
            )}
          </For>
        </div>
        <Show when={autoFit()}>
          <div
            ref={slotProbeEl}
            aria-hidden
            class="pointer-events-none invisible absolute h-[var(--ec-month-bar-h,1.75rem)] w-0"
          />
        </Show>
      </div>
    </EventCalendarViewContext.Provider>
  );
}

/**
 * One month week row. Multi-day / all-day events render as CONTINUOUS bars in
 * an overlay grid that spans day columns (colStart -> colSpan) and stacks by
 * lane; single-day timed events render inside each cell below the reserved bar
 * lanes. This is what makes a cross-day event read as one whole block instead
 * of a chip repeated per cell.
 */
function EventCalendarMonthWeek(props: {
  week: Date[];
  gridTemplateColumns: string;
  showWeekNumber: boolean;
  cap: number;
  autoFit: boolean;
  /** Set on the first week only: forwarded to its first cell's content area so
   *  the view can measure the per-cell event height for "auto". */
  contentRef?: (el: HTMLDivElement) => void;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const weekRow = useEventCalendarWeek(() => props.week[0]);
  const colOffset = () => (props.showWeekNumber ? 1 : 0);
  const dayMs = 86400000;
  const rowStartMs = () =>
    zonedStartOfDay(weekRow.rowStart ?? props.week[0], settings.timeZone).getTime();
  // Day offsets from the TRUE row start (0-6) for each visible column, so a
  // weekends-hidden month still places bars on the right days.
  const offsets = createMemo(() =>
    props.week.map((d) =>
      Math.round((zonedStartOfDay(d, settings.timeZone).getTime() - rowStartMs()) / dayMs),
    ),
  );
  /** Clamp a day-offset span onto the visible columns; null = fully hidden. */
  const gridPos = (colStart: number, colSpan: number) => {
    let start = -1;
    let end = -1;
    for (let o = colStart; o < colStart + colSpan; o++) {
      const col = offsets().indexOf(o);
      if (col === -1) continue;
      if (start === -1) start = col;
      end = col;
    }
    return start === -1 ? null : { col: start, span: end - start + 1 };
  };
  // bars fit within the cap; deeper lanes fall into each day's "+N more"
  const visibleBars = createMemo(() => weekRow.bars.filter((b) => (b.lane ?? 0) < props.cap));
  const covers = (b: EventCalendarSegment, dayOffset: number) =>
    (b.colStart ?? 0) <= dayOffset && dayOffset < (b.colStart ?? 0) + (b.colSpan ?? 1);
  // Occurrence keys of the bars hidden in each column (lane >= cap). Threaded to
  // the cell so its "+N more" popover can list the hidden bars WITHOUT re-listing
  // the visible ones (day buckets carry no lane, so the week row - which owns bar
  // laning - is the only place that knows which bars are hidden).
  const hiddenBarKeysByCol = createMemo(() =>
    props.week.map(
      (_, col) =>
        new Set(
          weekRow.bars
            .filter((b) => (b.lane ?? 0) >= props.cap && covers(b, offsets()[col]))
            .map((b) => b.occurrence.key),
        ),
    ),
  );

  // Live move/resize ghost at the PROPOSED day span. Standardized treatment
  // (EVENT_CALENDAR_GHOST): move = the event carried as a full clone, resize =
  // the same clone with a dashed boundary; invalid adds destructive marking
  // while the engine shows the not-allowed cursor + validation hint.
  const dragGhost = useEventCalendarSelector<
    unknown,
    | (Pick<
        EventCalendarDragState,
        "kind" | "valid" | "occurrence" | "proposedStart" | "proposedEnd" | "proposedAllDay"
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
      if (!drag) return null;
      const rowEndMs = rowStartMs() + 7 * dayMs;
      const startDayMs = zonedStartOfDay(drag.proposedStart, settings.timeZone).getTime();
      // exclusive end -> the last covered day
      const lastDayMs = zonedStartOfDay(
        new Date(drag.proposedEnd.getTime() - 1),
        settings.timeZone,
      ).getTime();
      if (startDayMs >= rowEndMs || lastDayMs < rowStartMs()) return null;
      const startCol = Math.max(0, Math.round((startDayMs - rowStartMs()) / dayMs));
      const endCol = Math.min(6, Math.round((lastDayMs - rowStartMs()) / dayMs));
      if (endCol < startCol) return null;
      return {
        kind: drag.kind,
        valid: drag.valid,
        occurrence: drag.occurrence,
        proposedStart: drag.proposedStart,
        proposedEnd: drag.proposedEnd,
        proposedAllDay: drag.proposedAllDay,
        colStart: startCol,
        colSpan: endCol - startCol + 1,
        isStart: startDayMs >= rowStartMs(),
        isEnd: lastDayMs < rowEndMs,
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
          a.proposedAllDay === b.proposedAllDay &&
          a.proposedStart.getTime() === b.proposedStart.getTime() &&
          a.proposedEnd.getTime() === b.proposedEnd.getTime()),
    },
  );
  const ghostPos = () => {
    const ghost = dragGhost();
    return ghost ? gridPos(ghost.colStart, ghost.colSpan) : null;
  };
  const ghostLane = () => {
    const ghost = dragGhost();
    if (!ghost) return 0;
    return weekRow.bars.find((b) => b.occurrence.key === ghost.occurrence.key)?.lane ?? 0;
  };
  // A single-day timed MOVE is indicated INLINE in the target cell (a
  // placeholder at the time-sorted position, rendered by EventCalendarMonthCell)
  // rather than as a bar in this overlay, so only bar drags and every resize
  // render the overlay ghost. Bars = all-day or multi-day (span > 1 day).
  const ghostIsBar = () => {
    const ghost = dragGhost();
    return (
      !!ghost &&
      (ghost.kind !== "move" ||
        ghost.proposedAllDay ||
        ghost.proposedEnd.getTime() - ghost.proposedStart.getTime() > dayMs)
    );
  };
  const ghostSegment = createMemo(() => {
    const ghost = dragGhost();
    const pos = ghostPos();
    if (!ghost || !pos) return null;
    return {
      occurrence: {
        ...ghost.occurrence,
        start: ghost.proposedStart,
        end: ghost.proposedEnd,
      },
      day: props.week[pos.col] ?? props.week[0],
      isStart: ghost.isStart,
      isEnd: ghost.isEnd,
      continuesBefore: !ghost.isStart,
      continuesAfter: !ghost.isEnd,
    } satisfies EventCalendarSegment;
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA grid row, see EventCalendarMonthView.
    // biome-ignore lint/a11y/useFocusableInteractive: rows are structure, not stops.
    <div
      role="row"
      data-slot="event-calendar-month-row"
      class={cn("relative grid min-h-0 border-b last:border-b-0", viewConfig.classNames?.monthRow)}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      <Show when={props.showWeekNumber}>
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid row header, see EventCalendarMonthView. */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: row headers are structure, not stops. */}
        <div
          role="rowheader"
          data-slot="event-calendar-week-number"
          class={cn(
            "text-muted-foreground border-e px-2 pt-1 tabular-nums",
            viewConfig.classNames?.weekNumber,
          )}
        >
          {settings.i18n.labels.week(
            getWeek(toZoned(props.week[0], settings.timeZone), {
              // locale supplies firstWeekContainsDate, so a de/ISO calendar
              // numbers the year-boundary weeks its own way instead of falling
              // back to US numbering; weekStartsOn stays explicit so the number
              // keeps matching the rendered grid
              locale: settings.locale,
              weekStartsOn: settings.weekStartsOn,
            }),
          )}
        </div>
      </Show>
      <For each={props.week}>
        {(day, col) => (
          <EventCalendarMonthCell
            day={day}
            cap={props.cap}
            // Reserve lane space only for bars that pass through THIS cell, so a
            // short multi-day event does not push down timed events in unrelated
            // cells of the same row. Reserve down to the deepest covering bar
            // lane so timed events always sit below every bar in their own cell.
            reservedLanes={visibleBars().reduce(
              (max, b) => (covers(b, offsets()[col()]) ? Math.max(max, (b.lane ?? 0) + 1) : max),
              0,
            )}
            hiddenBarKeys={hiddenBarKeysByCol()[col()]}
            isLast={col() === props.week.length - 1}
            autoFit={props.autoFit}
            contentRef={col() === 0 ? props.contentRef : undefined}
          />
        )}
      </For>
      {/* Continuous bar overlay: one element per bar, placed by grid-column so
          a cross-day span is a single unbroken block. pointer-events pass
          through the gaps to the cells below. NOT aria-hidden - these are the
          real interactive bars. */}
      <Show when={visibleBars().length > 0 || (dragGhost() && ghostPos() && ghostIsBar())}>
        <div
          data-slot="event-calendar-month-bar-overlay"
          class={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 grid pt-1.5",
            viewConfig.classNames?.monthBarOverlay,
          )}
          style={{
            "grid-template-columns": props.gridTemplateColumns,
            "grid-auto-rows": "var(--ec-month-bar-h, 1.75rem)",
          }}
        >
          <For each={visibleBars()}>
            {(bar) => {
              const pos = () => gridPos(bar.colStart ?? 0, bar.colSpan ?? 1);
              return (
                <Show when={pos()}>
                  {(position) => (
                    <div
                      class={cn(
                        "pointer-events-auto min-w-0 px-1",
                        viewConfig.classNames?.monthBar,
                      )}
                      style={{
                        "grid-column": `${colOffset() + position().col + 1} / span ${position().span}`,
                        "grid-row": (bar.lane ?? 0) + 1,
                      }}
                    >
                      {/* lane height minus the 2px inter-lane gap */}
                      <EventCalendarEvent
                        segment={bar}
                        class="h-[calc(var(--ec-month-bar-h,1.75rem)-0.125rem)]"
                      />
                    </div>
                  )}
                </Show>
              );
            }}
          </For>
          <Show when={dragGhost() && ghostPos() && ghostIsBar() ? dragGhost() : null}>
            {(ghost) => (
              <div
                aria-hidden
                class={cn("min-w-0 px-1", viewConfig.classNames?.monthBar)}
                style={{
                  "grid-column": `${colOffset() + (ghostPos()?.col ?? 0) + 1} / span ${ghostPos()?.span ?? 1}`,
                  "grid-row": ghostLane() + 1,
                }}
              >
                <div
                  data-slot="event-calendar-drag-ghost"
                  data-kind={ghost().kind}
                  data-drop-invalid={!ghost().valid || undefined}
                  class={cn(
                    "h-[calc(var(--ec-month-bar-h,1.75rem)-0.125rem)]",
                    ghost().kind === "move"
                      ? // faint drop placeholder only: the cursor-attached
                        // carry clone owns the visual during moves
                        cn(
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

function EventCalendarMonthCell(props: {
  day: Date;
  cap: number;
  reservedLanes: number;
  /** Occurrence keys of the bars hidden in THIS column (lane >= cap), from the
   *  week row. Lets the cell list hidden bars in its overflow popover without
   *  re-listing the bars already visible in the row overlay. */
  hiddenBarKeys: Set<string>;
  /** Last column in the row - drops the right border so the grid's outer edge
   *  is owned by the container, not a doubled cell border. Passed explicitly
   *  because the bar overlay renders after the cells, so `:last-child` is
   *  unreliable on rows that have bars. */
  isLast: boolean;
  /** When true, the "+N more" chip is treated as taking a row so the visible
   *  chips + indicator always fit the measured cell height. */
  autoFit: boolean;
  /** Set on the first cell only: measured to derive the "auto" cap. */
  contentRef?: (el: HTMLDivElement) => void;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const gestures = useEventCalendarGestures();
  const day = useEventCalendarDay(() => props.day);

  const dayStart = () => zonedStartOfDay(props.day, settings.timeZone);
  const dayEnd = () => addDays(toZoned(dayStart(), settings.timeZone), 1);
  const { effective } = useEventCalendarViewSettings();
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
    if (!drag) return null;
    const covered = drag.proposedStart < dayEnd() && drag.proposedEnd > dayStart();
    if (!covered) return null;
    return drag.valid ? "valid" : "invalid";
  });
  // Hide hover affordances mid-gesture: the only intent is the drop target.
  // Gated on the one thing that reads it: a plain global boolean flips for all
  // 42 cells the moment a gesture starts and again when it ends, which is pure
  // waste in the default configuration where no add button renders.
  const isInteracting = useEventCalendarSelector<unknown, boolean>((state) =>
    viewConfig.showDayAddButton ? state.drag !== null || state.slotDraft !== null : false,
  );
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
  // A single-day timed MOVE landing on THIS day: expose the proposed
  // minute-of-day (+ color/validity) so the cell can render a drop placeholder
  // at the correct time-sorted position, instead of the overlay marking a bar
  // over the first chip. Skipped for bars (they keep the overlay ghost) and for
  // a no-op move back onto the event's own day (the dimmed source already marks
  // the spot).
  const inlineDrop = useEventCalendarSelector<
    unknown,
    { min: number; valid: boolean; color?: string } | null
  >(
    (state) => {
      const drag = state.drag;
      if (drag?.kind !== "move" || drag.proposedAllDay) return null;
      if (drag.proposedEnd.getTime() - drag.proposedStart.getTime() > 86400000) return null;
      const dropDayMs = zonedStartOfDay(drag.proposedStart, settings.timeZone).getTime();
      if (dropDayMs !== dayStart().getTime()) return null;
      if (
        zonedStartOfDay(drag.occurrence.start, settings.timeZone).getTime() === dayStart().getTime()
      )
        return null;
      return {
        min: (drag.proposedStart.getTime() - dropDayMs) / 60000,
        valid: drag.valid,
        color: drag.occurrence.event.color,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null && b !== null && a.min === b.min && a.valid === b.valid && a.color === b.color),
    },
  );

  // Bars (allDay/multi-day) are drawn by the week-row overlay; the cell renders
  // only single-day timed events, below the reserved bar lanes.
  const extraHidden = () => props.hiddenBarKeys.size;
  const hiddenBarSegs = () =>
    day.segments.allDay.filter((s) => props.hiddenBarKeys.has(s.occurrence.key));
  const timedCount = () => day.segments.timed.length;
  const timedSlots = () => Math.max(0, props.cap - props.reservedLanes);

  // Static (at-rest) split: what the cell shows with no drag, and - crucially -
  // what the "+N more" popover lists. The popover carries ONLY the hidden events
  // (hidden bars + timed past the cap), never the chips already visible in the
  // cell, so it never duplicates them. autoFit gives up one timed row to the
  // "+N more" indicator so the visible chips fit the clipped cell height.
  const staticOverflow = () => extraHidden() > 0 || timedCount() > timedSlots();
  const staticShown = () =>
    props.autoFit && staticOverflow() ? Math.max(0, timedSlots() - 1) : timedSlots();
  const overflowSegments = () => [...hiddenBarSegs(), ...day.segments.timed.slice(staticShown())];

  // Live split: while a timed chip is dragged onto this day, render the day
  // exactly as it will look AFTER the drop. The dragged chip is a phantom in the
  // time-sorted order and is shown as the placeholder - inline where it lands,
  // or ON the "+N more" indicator when it lands in the overflow bucket (so the
  // user sees the drop will push it into "more"). The "+N more" count always
  // reflects the post-drop hidden total.
  const split = createMemo(() => {
    const drop = inlineDrop();
    if (!drop) {
      return {
        visibleTimed: day.segments.timed.slice(0, staticShown()),
        overflowCount: overflowSegments().length,
        placeholderIndex: -1,
        placeholderAtMore: false,
      };
    }
    // rank of the dragged chip in the resulting time-sorted list (chips are
    // time-ordered, so this is the count starting at or before its time)
    const insertRank = day.segments.timed.filter((s) => (s.startMin ?? 0) <= drop.min).length;
    const dropOverflow = extraHidden() > 0 || timedCount() + 1 > timedSlots();
    // rows for timed items INCLUDING the phantom, before the "+N more" row
    const vis = !dropOverflow
      ? timedCount() + 1
      : props.autoFit
        ? Math.max(0, timedSlots() - 1)
        : timedSlots();
    const placeholderAtMore = insertRank >= vis;
    const visibleTimed = placeholderAtMore
      ? day.segments.timed.slice(0, vis)
      : day.segments.timed.slice(0, Math.max(0, vis - 1));
    return {
      visibleTimed,
      overflowCount:
        extraHidden() + (timedCount() - visibleTimed.length) + (placeholderAtMore ? 1 : 0),
      placeholderIndex: placeholderAtMore ? -1 : insertRank,
      placeholderAtMore,
    };
  });

  // The replacement for a chip that lost focus to a commit appears exactly when
  // this cell's visible chips are rebuilt, so tracking them is the Solid
  // equivalent of upstream's dependency-free layout effect.
  let rootEl: HTMLDivElement | undefined;
  createEffect(() => {
    const visible = split().visibleTimed;
    restoreChipFocus(rootEl ?? null, visible);
  });

  // Faint dashed drop placeholder, tinted to the dragged event's color, echoing
  // the move ghost (EVENT_CALENDAR_GHOST.move); one chip-height tall so chips
  // shift by exactly one row when it is inserted.
  const dropPlaceholder = () => (
    <Show when={inlineDrop()}>
      {(drop) => (
        <div
          aria-hidden
          data-slot="event-calendar-drop-placeholder"
          data-drop-invalid={!drop().valid || undefined}
          class={cn(
            "shrink-0 rounded-sm border border-dashed",
            drop().valid
              ? "border-(--ec-event-color)/50 bg-(--ec-event-color)/8"
              : "border-destructive/70 bg-destructive/10",
            viewConfig.classNames?.dragGhost,
          )}
          style={
            {
              "--ec-event-color": drop().color ?? "var(--color-primary)",
              height: "calc(var(--ec-month-bar-h, 1.75rem) - 0.125rem)",
            } as JSX.CSSProperties
          }
        />
      )}
    </Show>
  );

  const defaultContent = () => (
    <>
      <div
        ref={(el: HTMLDivElement) => props.contentRef?.(el)}
        class={cn(
          // gap-0.5 pairs with the 0.125rem subtraction in the lane spacer
          // below; changing the gap requires renderMonthCell
          // px-1 matches the all-day bar wrapper inset so single-day chips and
          // multi-day bars line up on the same left/right edge in a cell
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-1 pt-1.5",
          viewConfig.classNames?.monthCellContent,
        )}
      >
        <Show when={props.reservedLanes > 0}>
          <div
            aria-hidden
            class="shrink-0"
            style={{
              // lane height already carries the 2px inter-lane gap; subtract
              // it so spacer + the column's own gap-0.5 = the SAME 2px rhythm
              // between the last bar and the first timed chip
              height: `calc(${props.reservedLanes} * var(--ec-month-bar-h, 1.75rem) - 0.125rem)`,
            }}
          />
        </Show>
        <For each={split().visibleTimed}>
          {(segment, i) => (
            <>
              <Show when={i() === split().placeholderIndex}>{dropPlaceholder()}</Show>
              <EventCalendarEvent
                segment={segment}
                // Remember the chip holding focus so a commit that re-keys it can
                // hand focus back to the remounted one (see restoreChipFocus)
                onFocus={(e) => {
                  focusedChip = {
                    node: e.currentTarget,
                    eventId: segment.occurrence.eventId,
                    recurrenceIndex: segment.occurrence.recurrenceIndex,
                  };
                }}
                // A chip still in the tree lost focus on its own, so there is
                // nothing to restore; only a blur from the remount is kept.
                onBlur={(e) => {
                  if (e.currentTarget.isConnected) focusedChip = null;
                }}
                // Hold a fixed height like the all-day lane above; without this
                // the chip flex-shrinks to whatever room the cell has left, so
                // cells with a reserved bar lane or a second chip render shorter
                // chips.
                class="shrink-0"
              />
            </>
          )}
        </For>
        <Show
          when={
            split().placeholderIndex >= 0 && split().placeholderIndex >= split().visibleTimed.length
          }
        >
          {dropPlaceholder()}
        </Show>
        <Show when={split().overflowCount > 0}>
          <EventCalendarMoreIndicator
            day={props.day}
            count={split().overflowCount}
            segments={overflowSegments()}
            dropInto={
              split().placeholderAtMore && inlineDrop()
                ? { color: inlineDrop()?.color, valid: inlineDrop()?.valid ?? true }
                : undefined
            }
          />
        </Show>
      </div>
      {/* Day number + add affordance, bottom-right (Notion-style) */}
      <div
        class={cn(
          "flex items-center justify-end gap-1 px-2 pb-1.5",
          viewConfig.classNames?.monthCellFooter,
        )}
      >
        <Show when={viewConfig.showDayAddButton && !isInteracting()}>
          <button
            type="button"
            data-slot="event-calendar-day-add"
            aria-label={settings.i18n.labels.addEvent}
            // a different icon/markup is a renderMonthCell job
            class={cn(
              "bg-primary text-primary-foreground flex size-5 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/ec-cell:opacity-100 focus-visible:opacity-100",
              viewConfig.classNames?.dayAddButton,
            )}
            onClick={(e) => {
              e.stopPropagation();
              settings.onSlotClick?.({ date: props.day, allDay: true, view: "month" }, e);
            }}
          >
            <Plus class="size-3.5" aria-hidden="true" />
          </button>
        </Show>
        <span
          data-slot="event-calendar-month-day-number"
          class={cn(
            "flex size-5 items-center justify-center rounded-full",
            day.isOutside && "text-muted-foreground",
            // the filled circle already marks today; keep the number the same
            // weight/size as the other days so it does not read as larger
            // Same font-size as every other day; a lighter weight cancels the
            // way white digits on the filled circle read bolder/larger than the
            // dark-on-light numbers around them.
            day.isToday && "bg-primary text-primary-foreground font-light",
            viewConfig.classNames?.monthDayNumber,
          )}
        >
          {format(toZoned(props.day, settings.timeZone), settings.i18n.formats.monthCellDay, {
            locale: settings.locale,
          })}
        </span>
      </div>
    </>
  );

  const content = () => {
    const renderMonthCell = viewConfig.renderMonthCell;
    if (!renderMonthCell) return defaultContent();
    // Lazy + cached: in Solid `defaultContent()` builds real DOM (and the
    // computations inside it), so a custom cell must not pay for a subtree it
    // never mounts - while a consumer that reads `defaultContent` twice still
    // gets the same one.
    let built: JSX.Element;
    let hasBuilt = false;
    const fallback = () => {
      if (!hasBuilt) {
        built = defaultContent();
        hasBuilt = true;
      }
      return built;
    };
    return (
      renderMonthCell({
        day: props.day,
        segments: day.segments,
        isToday: day.isToday,
        isOutside: day.isOutside,
        overflowCount: split().overflowCount,
        get defaultContent() {
          return fallback();
        },
      }) ?? fallback()
    );
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA grid cell, see EventCalendarMonthView.
    // biome-ignore lint/a11y/useFocusableInteractive: cells are structure; focus lives on the chips and the day add button inside them.
    // biome-ignore lint/a11y/useKeyWithClickEvents: the cell is the calendar's slot-selection surface; every action it exposes is also reachable from the focusable chips and the day add button inside it.
    <div
      ref={rootEl}
      role="gridcell"
      data-slot="event-calendar-month-cell"
      data-today={day.isToday || undefined}
      data-outside={day.isOutside || undefined}
      data-weekend={
        settings.weekendDays.includes(toZoned(props.day, settings.timeZone).getDay()) || undefined
      }
      data-ec-day={dayStart().getTime()}
      data-drop-target={isDropTarget() ?? undefined}
      data-off={isOff() || undefined}
      data-draft={inDraft() ? "" : undefined}
      aria-label={format(
        toZoned(props.day, settings.timeZone),
        settings.i18n.formats.monthCellAriaLabel,
        { locale: settings.locale },
      )}
      class={cn(
        "group/ec-cell relative flex min-h-0 min-w-0 flex-col overflow-hidden",
        !props.isLast && "border-e",
        day.isOutside && !settings.showOutsideDays && "invisible",
        isOff() && offClass(),
        day.isToday &&
          cn("bg-primary/3 border-b-primary/40 relative border-b-2", viewConfig.todayClassName),
        viewConfig.dayClassName?.(props.day),
        // No drop-target bg fill on move/resize - the dragged bar + not-allowed
        // cursor carry the feedback; a cell-wide color wash is too distracting.
        // data-drop-target stays as an opt-in styling hook.
        inDraft() && "bg-primary/5",
        viewConfig.classNames?.monthCell,
      )}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-slot=event-calendar-event]")) return;
        if (target.closest("[data-slot=event-calendar-more]")) return;
        gestures.beginCreate(e, props.day, true);
      }}
      onClick={(e) => {
        if (wasRecentDrag() || wasRecentChipPress()) return;
        settings.onSlotClick?.({ date: props.day, allDay: true, view: "month" }, e);
      }}
    >
      <Show when={inDraft()}>
        {(draft) => (
          <span
            aria-hidden
            data-slot="event-calendar-slot-draft"
            class={cn(
              "border-primary/40 pointer-events-none absolute inset-0 z-10 border-y border-dashed",
              draft().isStart && "border-s",
              draft().isEnd && "border-e",
              viewConfig.classNames?.slotDraft,
            )}
          />
        )}
      </Show>
      {content()}
    </div>
  );
}

interface EventCalendarMoreIndicatorProps {
  day: Date;
  count: number;
  /** The OVERFLOW (hidden) segments for this day - bars first, then timed. The
   *  popover lists only these, never the chips already visible in the cell. */
  segments: EventCalendarSegment[];
  /** Set while a timed chip is dragged and will land in THIS overflow bucket:
   *  the indicator itself becomes the drop placeholder (dashed, event-tinted) so
   *  it reads as "the chip joins the +N more list". */
  dropInto?: { color?: string; valid: boolean };
}

/** Popover placement for the configured "+N more" alignment. */
const MORE_POPOVER_PLACEMENT = {
  start: "bottom-start",
  center: "bottom",
  end: "bottom-end",
} as const;

/**
 * "+N more" trigger opening a popover with the day's full event list.
 * onMoreClick returning false suppresses the built-in popover.
 */
function EventCalendarMoreIndicator(props: EventCalendarMoreIndicatorProps) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const [open, setOpen] = createSignal(false);
  const headerId = createUniqueId();
  // Kobalte's trigger toggles AFTER the consumer's onClick, so a vetoed
  // onMoreClick parks the verdict here instead of relying on preventDefault
  // (which upstream's Base UI trigger honored).
  let suppressOpen = false;

  // Grabbing a chip from this list starts a drag; close the popover so it does
  // not sit over the drop target while the event is carried to another day.
  const isDragging = useEventCalendarSelector<unknown, boolean>((state) => state.drag !== null);
  createEffect(() => {
    if (isDragging()) setOpen(false);
  });

  return (
    <Popover
      open={open()}
      onOpenChange={(next: boolean) => {
        if (next && suppressOpen) {
          suppressOpen = false;
          return;
        }
        setOpen(next);
      }}
      placement={MORE_POPOVER_PLACEMENT[viewConfig.morePopoverAlign]}
    >
      <PopoverTrigger
        data-slot="event-calendar-more"
        data-drop-into={props.dropInto ? "" : undefined}
        data-drop-invalid={props.dropInto && !props.dropInto.valid ? "" : undefined}
        class={cn(
          "text-muted-foreground hover:text-foreground cursor-pointer truncate rounded-sm px-1.5 text-start",
          // While a dragged chip will land in this overflow bucket, the "+N more"
          // link itself becomes the drop placeholder: dashed, event-tinted, one
          // chip tall, so the drop target is unmistakable.
          props.dropInto &&
            cn(
              "flex shrink-0 items-center border border-dashed",
              props.dropInto.valid
                ? "text-foreground border-(--ec-event-color)/50 bg-(--ec-event-color)/8"
                : "border-destructive/70 bg-destructive/10 text-destructive",
            ),
          viewConfig.classNames?.moreIndicator,
        )}
        style={
          props.dropInto
            ? ({
                "--ec-event-color": props.dropInto.color ?? "var(--color-primary)",
                height: "calc(var(--ec-month-bar-h, 1.75rem) - 0.125rem)",
              } as JSX.CSSProperties)
            : undefined
        }
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          const verdict = settings.onMoreClick?.(
            props.day,
            props.segments.map((segment) => segment.occurrence),
            e,
          );
          if (verdict === false) {
            e.preventDefault();
            suppressOpen = true;
            setOpen(false);
          }
        }}
      >
        {viewConfig.renderMoreIndicator?.({
          day: props.day,
          count: props.count,
          segments: props.segments,
        }) ?? settings.i18n.labels.more(props.count)}
      </PopoverTrigger>
      <PopoverContent
        data-slot="event-calendar-more-popover"
        // The popover is a dialog, so it needs a name. The built-in body already
        // renders the day header this list belongs to, so point at that; a
        // consumer body has no header to point at and gets the same formatted
        // day as a label instead.
        aria-labelledby={viewConfig.renderMoreContent ? undefined : headerId}
        aria-label={
          viewConfig.renderMoreContent
            ? format(toZoned(props.day, settings.timeZone), settings.i18n.formats.moreDayHeader, {
                locale: settings.locale,
              })
            : undefined
        }
        // PopoverContent is unlayered (flex-col gap-4 p-4); override with !.
        // text-xs re-establishes the calendar's base type here because this
        // content is portaled out of the root subtree and cannot inherit it.
        class={cn("w-64 gap-1! p-2! text-xs", viewConfig.classNames?.morePopover)}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <Show
          when={viewConfig.renderMoreContent}
          fallback={
            <EventCalendarMoreDefaultContent
              day={props.day}
              segments={props.segments}
              headerId={headerId}
            />
          }
        >
          {(render) =>
            render()({
              day: props.day,
              segments: props.segments,
              close: () => setOpen(false),
            })
          }
        </Show>
      </PopoverContent>
    </Popover>
  );
}

/** Built-in "+N more" popover body: day header + the day's chips. */
function EventCalendarMoreDefaultContent(props: {
  day: Date;
  segments: EventCalendarSegment[];
  /** Names the popover dialog: the header IS the list's accessible name. */
  headerId?: string;
}) {
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const list = () => (
    <div class="flex flex-col gap-1 py-1 ps-1 pe-4">
      <For each={props.segments}>
        {(segment) => <EventCalendarEvent segment={segment} class="py-0.5" />}
      </For>
    </div>
  );
  return (
    <>
      <div
        id={props.headerId}
        class={cn(
          "text-muted-foreground px-1 py-1 text-xs font-medium",
          viewConfig.classNames?.morePopoverHeader,
        )}
      >
        {format(toZoned(props.day, settings.timeZone), settings.i18n.formats.moreDayHeader, {
          locale: settings.locale,
        })}
      </div>
      {/* The scroll region breaks out of the popover's right padding (-me-2)
            so the scrollbar sits flush in the gutter; the list then pads itself
            back (ps-1 aligns with the header, pe-4 clears the ~10px bar with a
            gap) and adds py-1 so the first/last focus ring is not clipped by
            the overflow. Layout is identical with or without a scrollbar. */}
      <Show
        when={viewConfig.scrollbars === "native"}
        fallback={
          <ScrollArea class="-me-2 min-h-0 **:data-[slot=scroll-area-viewport]:max-h-(--ec-more-max-height,16rem)">
            {list()}
          </ScrollArea>
        }
      >
        <div
          data-ec-native-scroll=""
          class="-me-2 max-h-(--ec-more-max-height,16rem) min-h-0 overflow-y-auto"
        >
          {list()}
        </div>
      </Show>
    </>
  );
}

export type { EventCalendarMonthViewProps, EventCalendarMoreIndicatorProps };
export { EventCalendarMonthView, EventCalendarMoreIndicator };
