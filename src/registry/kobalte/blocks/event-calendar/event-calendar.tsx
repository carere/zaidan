import { addDays, type Locale } from "date-fns";
import type { Accessor, Component, ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";
import type { EventCalendarI18nConfig, EventCalendarI18nOverrides } from "./event-calendar-i18n";
import { mergeEventCalendarI18n } from "./event-calendar-i18n";
import type {
  EventCalendarDayBucket,
  EventCalendarIndex,
  WeekStartsOn,
} from "./event-calendar-lib";
import {
  buildEventIndex,
  defaultEventOrder,
  eventsOverlap,
  getDayKey,
  getRangeKey,
  getViewDateRange,
  stepDate,
  toZoned,
  zonedStartOfDay,
} from "./event-calendar-lib";
import type {
  CalendarEvent,
  CalendarView,
  EventCalendarDateRange,
  EventCalendarDragState,
  EventCalendarEventId,
  EventCalendarInteractions,
  EventCalendarOccurrence,
  EventCalendarOffDaysConfig,
  EventCalendarProposedUpdate,
  EventCalendarRangeInfo,
  EventCalendarResource,
  EventCalendarSegment,
  EventCalendarSelection,
  EventCalendarSlotDraft,
  EventCalendarSlotInfo,
  EventCalendarState,
  EventCalendarUpdateResult,
  EventCalendarViewSettings,
} from "./event-calendar-types";

/**
 * A plain value or a Solid accessor for it. Every hook below that takes a
 * subject (a day, a range) accepts either, so a cell can pass a reactive
 * `() => props.day` without wrapping the whole hook in a memo.
 */
type MaybeAccessor<T> = T | Accessor<T>;

function access<T>(value: MaybeAccessor<T>): T {
  return typeof value === "function" ? (value as Accessor<T>)() : value;
}

const BASE_VIEWS: CalendarView[] = ["month", "week", "day", "days", "agenda"];
const ALL_VIEWS: CalendarView[] = [...BASE_VIEWS, "resource"];

const DEFAULT_INTERACTIONS: EventCalendarInteractions = {
  drag: true,
  resize: true,
  selectSlot: true,
};

const EMPTY_SELECTION: EventCalendarSelection = { eventKeys: [], slot: null };

// Settings resolve lazily on every read, so a freshly allocated default would
// bust the view memos keyed on it (the month grid rebuilds its 42 zoned day
// starts whenever weekendDays changes identity). Shared, never mutated.
const DEFAULT_WEEKEND_DAYS: number[] = [0, 6];
const EMPTY_RESOURCES: EventCalendarResource[] = [];
const DEFAULT_EVENT_PRIORITY = (event: CalendarEvent<never>) => event.priority ?? 0;

// Intl.DateTimeFormat() is not free and settings.timeZone is read on every day
// key, so the system zone is resolved once per session.
let systemTimeZone: string | undefined;
function resolveSystemTimeZone(): string {
  if (systemTimeZone === undefined) {
    systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return systemTimeZone;
}

// Priority-aware default order, cached on the resolver identity: eventOrder is
// part of the index memo, so a fresh closure per read would rebuild the whole
// index on every read.
const priorityOrderCache = new WeakMap<object, unknown>();
type EventOrder<TData> = (
  a: EventCalendarOccurrence<TData>,
  b: EventCalendarOccurrence<TData>,
) => number;
function priorityEventOrder<TData>(
  getEventPriority: (event: CalendarEvent<TData>) => number,
): EventOrder<TData> {
  const cached = priorityOrderCache.get(getEventPriority);
  if (cached) return cached as EventOrder<TData>;
  // higher priority packs and orders first; ties fall through to the
  // start/duration/key default
  const order: EventOrder<TData> = (a, b) =>
    getEventPriority(b.event) - getEventPriority(a.event) || defaultEventOrder(a, b);
  priorityOrderCache.set(getEventPriority, order);
  return order;
}

interface EventCalendarCallbacks<TData = unknown> {
  onEventClick?: (occurrence: EventCalendarOccurrence<TData>, e: MouseEvent) => void;
  onEventDoubleClick?: (occurrence: EventCalendarOccurrence<TData>, e: MouseEvent) => void;
  onEventUpdate?: (update: EventCalendarProposedUpdate<TData>) => EventCalendarUpdateResult;
  canDropEvent?: (update: EventCalendarProposedUpdate<TData>) => boolean;
  /**
   * A move/resize was attempted on an event that cannot be dragged (readOnly,
   * per-event draggable/resizable false, or the interaction is off). Fires once
   * per gesture when the pointer crosses the activation threshold; the calendar
   * shows a not-allowed cursor for the duration but never picks the message -
   * broadcast it here so the consumer can surface a custom one.
   */
  onDragBlocked?: (
    occurrence: EventCalendarOccurrence<TData>,
    info: {
      gesture: "move" | "resize";
      reason: "readOnly" | "disabled" | "interactions-off";
    },
  ) => void;
  onSlotClick?: (slot: EventCalendarSlotInfo, e: MouseEvent) => void;
  onSelectSlot?: (slot: EventCalendarSlotDraft) => void;
  canSelectSlot?: (slot: EventCalendarSlotDraft) => boolean;
  onRangeChange?: (info: EventCalendarRangeInfo) => void;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onDayCountChange?: (count: number) => void;
  onSelectionChange?: (selection: EventCalendarSelection) => void;
  onInteractionsChange?: (interactions: EventCalendarInteractions) => void;
  onViewSettingsChange?: (viewSettings: EventCalendarViewSettings) => void;
  onEventsChange?: (events: CalendarEvent<TData>[]) => void;
  /** Return false to suppress the built-in "+N more" popover. */
  onMoreClick?: (
    day: Date,
    segments: EventCalendarOccurrence<TData>[],
    e: MouseEvent,
    // biome-ignore lint/suspicious/noConfusingVoidType: this is a callback return type - `undefined` would reject handlers that simply return nothing.
  ) => void | false;
}

interface UseEventCalendarStateOptions<TData = unknown> extends EventCalendarCallbacks<TData> {
  events?: CalendarEvent<TData>[];
  defaultEvents?: CalendarEvent<TData>[];
  view?: CalendarView;
  defaultView?: CalendarView;
  date?: Date;
  defaultDate?: Date;
  dayCount?: number;
  defaultDayCount?: number;
  selection?: EventCalendarSelection;
  defaultSelection?: EventCalendarSelection;
  interactions?: Partial<EventCalendarInteractions>;
  defaultInteractions?: Partial<EventCalendarInteractions>;
  viewSettings?: EventCalendarViewSettings;
  defaultViewSettings?: EventCalendarViewSettings;
  loading?: boolean;
  views?: CalendarView[];
  timeZone?: string;
  locale?: Locale;
  weekStartsOn?: WeekStartsOn;
  dayStartHour?: number;
  dayEndHour?: number;
  slotDuration?: number;
  snapDuration?: number;
  agendaDayCount?: number;
  fixedWeeks?: boolean;
  showOutsideDays?: boolean;
  i18n?: EventCalendarI18nOverrides;
  /** Bookable resources for the resource view. */
  resources?: EventCalendarResource[];
  getEventPriority?: (event: CalendarEvent<TData>) => number;
  eventOrder?: (a: EventCalendarOccurrence<TData>, b: EventCalendarOccurrence<TData>) => number;
  getOccurrences?: (
    event: CalendarEvent<TData>,
    range: EventCalendarDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
  /**
   * Weekday numbers (0 = Sunday) treated as the weekend by the "weekends"
   * view toggle. @default [0, 6]
   */
  weekendDays?: number[];
  /** Pointer-gesture tuning (activation distances, touch delay, autoscroll). */
  activation?: Partial<EventCalendarActivationConfig>;
}

interface EventCalendarActivationConfig {
  moveDistancePx: number;
  createDistancePx: number;
  touchDelayMs: number;
  touchTolerancePx: number;
  autoScrollEdgePx: number;
  autoScrollMaxStepPx: number;
}

/**
 * Resolved configuration: every UseEventCalendarStateOptions field except the
 * controlled/uncontrolled state pairs, with defaults applied and i18n merged.
 * Every field is a live getter, so a settings read is as fine-grained as the
 * option behind it and callback identity changes never rebuild the grid.
 */
interface EventCalendarSettings<TData = unknown> extends EventCalendarCallbacks<TData> {
  timeZone: string;
  locale?: Locale;
  weekStartsOn: WeekStartsOn;
  views: CalendarView[];
  dayStartHour: number;
  dayEndHour: number;
  slotDuration: number;
  snapDuration: number;
  agendaDayCount: number;
  fixedWeeks: boolean;
  showOutsideDays: boolean;
  i18n: EventCalendarI18nConfig;
  resources: EventCalendarResource[];
  weekendDays: number[];
  activation?: Partial<EventCalendarActivationConfig>;
  getEventPriority: (event: CalendarEvent<TData>) => number;
  eventOrder: (a: EventCalendarOccurrence<TData>, b: EventCalendarOccurrence<TData>) => number;
  getOccurrences?: (
    event: CalendarEvent<TData>,
    range: EventCalendarDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
}

interface EventCalendarApi<TData = unknown> {
  next(): void;
  prev(): void;
  today(): void;
  goTo(date: Date): void;
  setView(view: CalendarView, opts?: { dayCount?: number }): void;
  setDayCount(count: number): void;
  getEvents(): CalendarEvent<TData>[];
  getEvent(id: EventCalendarEventId): CalendarEvent<TData> | undefined;
  setEvents(events: CalendarEvent<TData>[]): void;
  addEvent(event: CalendarEvent<TData>): void;
  updateEvent(id: EventCalendarEventId, patch: Partial<CalendarEvent<TData>>): void;
  removeEvent(id: EventCalendarEventId): void;
  getOccurrences(range?: EventCalendarDateRange): EventCalendarOccurrence<TData>[];
  getOccurrencesForDay(day: Date): EventCalendarOccurrence<TData>[];
  findOverlapping(candidate: {
    start: Date;
    end: Date;
    excludeEventId?: string;
  }): EventCalendarOccurrence<TData>[];
  select(selection: Partial<EventCalendarSelection>): void;
  selectEvent(key: string, opts?: { additive?: boolean }): void;
  clearSelection(): void;
  setInteractions(patch: Partial<EventCalendarInteractions>): void;
  setViewSettings(patch: EventCalendarViewSettings): void;
  getVisibleRange(): EventCalendarDateRange;
  getActiveRange(): EventCalendarDateRange;
  /** TZDate in the calendar's display time zone. */
  toZoned(date: Date): Date;
  /** number = minutes from the zoned day start; no-op outside time-grid views. */
  scrollToTime(time: Date | number): void;
}

/** Cross-file plumbing for sibling view/interaction modules; not public API. */
interface EventCalendarInternals<TData = unknown> {
  getIndex(): EventCalendarIndex<TData>;
  setDrag(drag: EventCalendarDragState<TData> | null): void;
  setSlotDraft(draft: EventCalendarSlotDraft | null): void;
  registerScrollHandler(handler: ((time: Date | number) => void) | null): void;
  applyProposedUpdate(
    update: EventCalendarProposedUpdate<TData>,
    extraPatch?: Partial<CalendarEvent<TData>>,
  ): boolean;
  getSettingsVersion(): number;
  /** The rendered calendar root element, or null before mount. */
  getRootEl(): HTMLElement | null;
  setRootEl(el: HTMLElement | null): void;
}

interface EventCalendarInstance<TData = unknown> {
  /**
   * The live state object. Every field is a getter over the underlying signals,
   * so reading one inside a memo or JSX subscribes to exactly that field -
   * there is no snapshot to diff and no listener to register.
   */
  getState(): EventCalendarState<TData>;
  api: EventCalendarApi<TData>;
  settings: EventCalendarSettings<TData>;
  internals: EventCalendarInternals<TData>;
}

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (import.meta.env.DEV && !warned.has(key)) {
    warned.add(key);
    console.warn(`[event-calendar] ${message}`);
  }
}

type ControlledKey =
  | "view"
  | "date"
  | "dayCount"
  | "events"
  | "selection"
  | "interactions"
  | "viewSettings";

/** The controlled/uncontrolled state pairs, stripped from the settings view. */
const STATE_PAIR_KEYS = [
  "events",
  "defaultEvents",
  "view",
  "defaultView",
  "date",
  "defaultDate",
  "dayCount",
  "defaultDayCount",
  "selection",
  "defaultSelection",
  "interactions",
  "defaultInteractions",
  "viewSettings",
  "defaultViewSettings",
  "loading",
] as const;

const SETTINGS_KEYS = [
  "timeZone",
  "locale",
  "weekStartsOn",
  "views",
  "dayStartHour",
  "dayEndHour",
  "slotDuration",
  "snapDuration",
  "agendaDayCount",
  "fixedWeeks",
  "showOutsideDays",
  "i18n",
  "resources",
  "getEventPriority",
  "eventOrder",
  "getOccurrences",
  "weekendDays",
  "activation",
] as const;

/**
 * Headless root hook - the full calendar engine without any markup.
 * Pass the returned instance to <EventCalendar calendar={instance}> or drive
 * fully custom UI from instance.getState() and instance.api.
 *
 * `options` is read lazily: pass the live props object (or any object with
 * getters) and every controlled prop stays reactive for the calendar's life.
 */
function useEventCalendarState<TData = unknown>(
  options: UseEventCalendarStateOptions<TData> = {},
): EventCalendarInstance<TData> {
  const [, settingsSource] = splitProps(
    options as UseEventCalendarStateOptions<TData> & Record<string, unknown>,
    [...STATE_PAIR_KEYS],
  );

  const i18n = createMemo(() => mergeEventCalendarI18n(options.i18n));
  const getEventPriority = () =>
    options.getEventPriority ?? (DEFAULT_EVENT_PRIORITY as (event: CalendarEvent<TData>) => number);

  const settings = mergeProps(settingsSource, {
    get timeZone() {
      return options.timeZone ?? resolveSystemTimeZone();
    },
    // locale-first default: a de/fr locale gets Monday weeks without also
    // having to set weekStartsOn; an explicit weekStartsOn always wins
    get weekStartsOn(): WeekStartsOn {
      return options.weekStartsOn ?? options.locale?.options?.weekStartsOn ?? 0;
    },
    // the resource view only makes sense with resources configured
    get views() {
      return options.views ?? (options.resources?.length ? ALL_VIEWS : BASE_VIEWS);
    },
    get dayStartHour() {
      return options.dayStartHour ?? 0;
    },
    get dayEndHour() {
      return options.dayEndHour ?? 24;
    },
    get slotDuration() {
      return options.slotDuration ?? 30;
    },
    get snapDuration() {
      return options.snapDuration ?? 15;
    },
    get agendaDayCount() {
      return options.agendaDayCount ?? 30;
    },
    get fixedWeeks() {
      return options.fixedWeeks ?? true;
    },
    get showOutsideDays() {
      return options.showOutsideDays ?? true;
    },
    get i18n() {
      return i18n();
    },
    get resources() {
      return options.resources ?? EMPTY_RESOURCES;
    },
    get getEventPriority() {
      return getEventPriority();
    },
    get eventOrder() {
      return options.eventOrder ?? priorityEventOrder(getEventPriority());
    },
    get weekendDays() {
      return options.weekendDays ?? DEFAULT_WEEKEND_DAYS;
    },
  }) as unknown as EventCalendarSettings<TData>;

  // Version counter for useEventCalendarSettingsVersion: advances whenever any
  // settings-relevant option changes. Fine-grained reads make it redundant for
  // rendering; it stays because the headless contract exposes it.
  let versionCounter = 0;
  const trackSettings = () => SETTINGS_KEYS.map((key) => (options as Record<string, unknown>)[key]);
  const settingsVersion = createMemo(() => {
    trackSettings();
    versionCounter += 1;
    return versionCounter;
  });

  const resolveView = (view: CalendarView): CalendarView => {
    if (settings.views.includes(view)) return view;
    const fallback = settings.views[0] ?? "month";
    warnOnce(
      `view-${view}`,
      `view "${view}" is not in views [${settings.views.join(", ")}]; falling back to "${fallback}".`,
    );
    return fallback;
  };

  const [internalView, setInternalView] = createSignal<CalendarView>(
    untrack(() => resolveView(options.defaultView ?? "month")),
  );
  const [internalDate, setInternalDate] = createSignal<Date>(
    untrack(() => options.defaultDate ?? new Date()),
  );
  const [internalDayCount, setInternalDayCount] = createSignal(
    untrack(() => options.defaultDayCount ?? 3),
  );
  const [internalEvents, setInternalEvents] = createSignal<CalendarEvent<TData>[]>(
    untrack(() => options.defaultEvents ?? []),
  );
  const [internalSelection, setInternalSelection] = createSignal<EventCalendarSelection>(
    untrack(() => options.defaultSelection ?? EMPTY_SELECTION),
  );
  const [internalInteractions, setInternalInteractions] = createSignal<EventCalendarInteractions>(
    untrack(() => ({ ...DEFAULT_INTERACTIONS, ...options.defaultInteractions })),
  );
  const [internalViewSettings, setInternalViewSettings] = createSignal<EventCalendarViewSettings>(
    untrack(() => options.defaultViewSettings ?? {}),
  );
  const [drag, setDragState] = createSignal<EventCalendarDragState<TData> | null>(null);
  const [slotDraft, setSlotDraftState] = createSignal<EventCalendarSlotDraft | null>(null);

  // Controlled interactions merge, memoized on the input: rebuilding the merged
  // object per read would hand every consumer a new identity.
  const controlledInteractions = createMemo(() => ({
    ...DEFAULT_INTERACTIONS,
    ...options.interactions,
  }));

  const view = createMemo(() => resolveView(options.view ?? internalView()));
  const date = () => options.date ?? internalDate();
  const dayCount = () => Math.max(1, options.dayCount ?? internalDayCount());
  const events = () => options.events ?? internalEvents();
  const selection = () => options.selection ?? internalSelection();
  const interactions = () =>
    options.interactions ? controlledInteractions() : internalInteractions();
  const viewSettings = () => options.viewSettings ?? internalViewSettings();

  const ranges = createMemo(() =>
    getViewDateRange(view(), date(), {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
      dayCount: dayCount(),
      agendaDayCount: settings.agendaDayCount,
      fixedWeeks: settings.fixedWeeks,
    }),
  );

  const state: EventCalendarState<TData> = {
    get view() {
      return view();
    },
    get date() {
      return date();
    },
    get dayCount() {
      return dayCount();
    },
    get visibleRange() {
      return ranges().visibleRange;
    },
    get activeRange() {
      return ranges().activeRange;
    },
    get events() {
      return events();
    },
    get selection() {
      return selection();
    },
    get interactions() {
      return interactions();
    },
    get loading() {
      return options.loading ?? false;
    },
    get drag() {
      return drag();
    },
    get slotDraft() {
      return slotDraft();
    },
    get viewSettings() {
      return viewSettings();
    },
  };

  const getState = () => state;

  const writeInternal: Record<ControlledKey, (value: never) => void> = {
    view: setInternalView as (value: never) => void,
    date: setInternalDate as (value: never) => void,
    dayCount: setInternalDayCount as (value: never) => void,
    events: setInternalEvents as (value: never) => void,
    selection: setInternalSelection as (value: never) => void,
    interactions: setInternalInteractions as (value: never) => void,
    viewSettings: setInternalViewSettings as (value: never) => void,
  };

  const setField = <K extends ControlledKey>(key: K, value: EventCalendarState<TData>[K]) => {
    if (options[key] === undefined) writeInternal[key](value as never);
    const callbacks: Record<ControlledKey, ((v: never) => void) | undefined> = {
      view: settings.onViewChange as never,
      date: settings.onDateChange as never,
      dayCount: settings.onDayCountChange as never,
      events: settings.onEventsChange as never,
      selection: settings.onSelectionChange as never,
      interactions: settings.onInteractionsChange as never,
      viewSettings: settings.onViewSettingsChange as never,
    };
    callbacks[key]?.(value as never);
  };

  // An occurrence key encodes the start instant (id::startISO), so committing a
  // move re-keys the occurrence and a selection holding the old key would point
  // at nothing. Remapped in the same commit and emitted BEFORE the events write
  // so a controlled consumer applies the two in a consistent order.
  const remapSelectionKey = (id: EventCalendarEventId, oldKey: string, nextStart: Date) => {
    const newKey = `${id}::${nextStart.toISOString()}`;
    if (newKey === oldKey) return;
    const current = getState().selection;
    if (!current.eventKeys.includes(oldKey)) return;
    setField("selection", {
      ...current,
      eventKeys: current.eventKeys.map((key) => (key === oldKey ? newKey : key)),
    });
  };

  // extraPatch: non-timing fields committed in the SAME write. Two sequential
  // setField("events") calls break controlled mode - the second one re-reads
  // the still-stale controlled array and its onEventsChange payload silently
  // reverts the timing change the first one emitted.
  const applyProposedUpdate = (
    update: EventCalendarProposedUpdate<TData>,
    extraPatch?: Partial<CalendarEvent<TData>>,
  ): boolean => {
    const result = settings.onEventUpdate?.(update);
    if (result === false) return false;
    const adjusted: Partial<CalendarEvent<TData>> =
      result && typeof result === "object"
        ? {
            start: result.start ?? update.start,
            end: result.end ?? update.end,
            allDay: result.allDay ?? update.allDay,
          }
        : { start: update.start, end: update.end, allDay: update.allDay };
    if (update.resourceId !== undefined) adjusted.resourceId = update.resourceId;
    // the STORED event holds the pre-commit start, which is what the live
    // occurrence key was built from (update.event already carries the proposal
    // when the call comes from api.updateEvent)
    const stored = getState().events.find((event) => event.id === update.event.id);
    const oldKey =
      update.occurrence?.key ?? (stored ? `${stored.id}::${stored.start.toISOString()}` : null);
    if (oldKey) {
      remapSelectionKey(update.event.id, oldKey, adjusted.start ?? update.start);
    }
    const next = getState().events.map((event) =>
      event.id === update.event.id ? { ...event, ...extraPatch, ...adjusted } : event,
    );
    setField("events", next);
    return true;
  };

  const index = createMemo(() =>
    buildEventIndex(state.events, state.visibleRange, {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
      eventOrder: settings.eventOrder,
      getOccurrences: settings.getOccurrences,
    }),
  );

  // Single-entry cache for api.getOccurrences(range) OUTSIDE the visible range:
  // that branch builds a throwaway index, so without it every call hands back
  // brand new occurrence objects and any identity-keyed memo downstream would
  // rebuild on every read.
  let rangeCache: {
    events: CalendarEvent<TData>[];
    rangeKey: string;
    timeZone: string;
    weekStartsOn: WeekStartsOn;
    eventOrder: EventCalendarSettings<TData>["eventOrder"];
    getOccurrences: EventCalendarSettings<TData>["getOccurrences"];
    occurrences: EventCalendarOccurrence<TData>[];
  } | null = null;
  let scrollHandler: ((time: Date | number) => void) | null = null;
  // The rendered calendar root element, registered by the <EventCalendar> host.
  // The drag engine falls back to it to find day cells when a gesture starts
  // from a portaled surface (e.g. a chip inside the "+N more" popover), whose
  // DOM ancestors do not include the calendar.
  let rootEl: HTMLElement | null = null;

  const api: EventCalendarApi<TData> = {
    next() {
      setField(
        "date",
        stepDate(state.view, state.date, 1, {
          timeZone: settings.timeZone,
          dayCount: state.dayCount,
          agendaDayCount: settings.agendaDayCount,
        }),
      );
    },
    prev() {
      setField(
        "date",
        stepDate(state.view, state.date, -1, {
          timeZone: settings.timeZone,
          dayCount: state.dayCount,
          agendaDayCount: settings.agendaDayCount,
        }),
      );
    },
    today() {
      setField("date", new Date());
    },
    goTo(date) {
      setField("date", date);
    },
    setView(view, opts) {
      if (opts?.dayCount !== undefined) {
        setField("dayCount", Math.max(1, opts.dayCount));
      }
      setField("view", resolveView(view));
    },
    setDayCount(count) {
      setField("dayCount", Math.max(1, count));
    },
    getEvents() {
      return getState().events;
    },
    getEvent(id) {
      return getState().events.find((event) => event.id === id);
    },
    setEvents(events) {
      setField("events", events);
    },
    addEvent(event) {
      setField("events", [...getState().events, event]);
    },
    updateEvent(id, patch) {
      const event = api.getEvent(id);
      if (!event) return;
      const merged = { ...event, ...patch };
      const timingChanged =
        patch.start !== undefined || patch.end !== undefined || patch.allDay !== undefined;
      if (timingChanged && settings.onEventUpdate) {
        // single write: the non-timing rest rides along as extraPatch so
        // controlled mode sees one consistent onEventsChange payload
        const rest = { ...patch };
        delete rest.start;
        delete rest.end;
        delete rest.allDay;
        applyProposedUpdate(
          {
            event: merged,
            occurrence: null,
            start: merged.start,
            end: merged.end,
            allDay: merged.allDay ?? false,
            source: "api",
          },
          rest,
        );
        return;
      }
      if (timingChanged) {
        remapSelectionKey(id, `${id}::${event.start.toISOString()}`, merged.start);
      }
      setField(
        "events",
        getState().events.map((e) => (e.id === id ? merged : e)),
      );
    },
    removeEvent(id) {
      setField(
        "events",
        getState().events.filter((event) => event.id !== id),
      );
    },
    getOccurrences(range) {
      if (!range) return index().occurrences;
      const within = range.start >= state.visibleRange.start && range.end <= state.visibleRange.end;
      if (within) {
        return index().occurrences.filter((occ) => eventsOverlap(occ, range));
      }
      const rangeKey = getRangeKey(range);
      if (
        rangeCache &&
        rangeCache.events === state.events &&
        rangeCache.rangeKey === rangeKey &&
        rangeCache.timeZone === settings.timeZone &&
        rangeCache.weekStartsOn === settings.weekStartsOn &&
        rangeCache.eventOrder === settings.eventOrder &&
        rangeCache.getOccurrences === settings.getOccurrences
      ) {
        return rangeCache.occurrences;
      }
      const { occurrences } = buildEventIndex(state.events, range, {
        timeZone: settings.timeZone,
        weekStartsOn: settings.weekStartsOn,
        eventOrder: settings.eventOrder,
        getOccurrences: settings.getOccurrences,
      });
      rangeCache = {
        events: state.events,
        rangeKey,
        timeZone: settings.timeZone,
        weekStartsOn: settings.weekStartsOn,
        eventOrder: settings.eventOrder,
        getOccurrences: settings.getOccurrences,
        occurrences,
      };
      return occurrences;
    },
    getOccurrencesForDay(day) {
      const bucket = index().byDay.get(getDayKey(day, settings.timeZone));
      if (!bucket) return [];
      const seen = new Set<string>();
      const result: EventCalendarOccurrence<TData>[] = [];
      for (const seg of [...bucket.allDay, ...bucket.timed]) {
        if (seen.has(seg.occurrence.key)) continue;
        seen.add(seg.occurrence.key);
        result.push(seg.occurrence);
      }
      return result;
    },
    findOverlapping({ start, end, excludeEventId }) {
      return api.getOccurrences({ start, end }).filter((occ) => occ.eventId !== excludeEventId);
    },
    select(partial) {
      const current = getState().selection;
      setField("selection", {
        eventKeys: partial.eventKeys ?? current.eventKeys,
        slot: partial.slot !== undefined ? partial.slot : current.slot,
      });
    },
    selectEvent(key, opts) {
      const current = getState().selection;
      const eventKeys = opts?.additive
        ? current.eventKeys.includes(key)
          ? current.eventKeys.filter((k) => k !== key)
          : [...current.eventKeys, key]
        : [key];
      setField("selection", { ...current, eventKeys });
    },
    clearSelection() {
      setField("selection", EMPTY_SELECTION);
    },
    setInteractions(patch) {
      setField("interactions", { ...getState().interactions, ...patch });
    },
    setViewSettings(patch) {
      setField("viewSettings", { ...getState().viewSettings, ...patch });
    },
    getVisibleRange() {
      return getState().visibleRange;
    },
    getActiveRange() {
      return getState().activeRange;
    },
    toZoned(date) {
      return toZoned(date, settings.timeZone);
    },
    scrollToTime(time) {
      scrollHandler?.(time);
    },
  };

  const internals: EventCalendarInternals<TData> = {
    getIndex() {
      return index();
    },
    setDrag(next) {
      setDragState(next);
    },
    setSlotDraft(next) {
      setSlotDraftState(next);
    },
    registerScrollHandler(handler) {
      scrollHandler = handler;
    },
    applyProposedUpdate,
    getSettingsVersion() {
      return settingsVersion();
    },
    getRootEl() {
      return rootEl;
    },
    setRootEl(el) {
      rootEl = el;
    },
  };

  // onRangeChange fires once for the initial range after mount, then whenever
  // the rendered window actually moves (view, range, or display zone).
  let lastEmittedRangeKey: string | null = null;
  createEffect(() => {
    const onRangeChange = settings.onRangeChange;
    if (!onRangeChange) return;
    const key = `${state.view}:${getRangeKey(state.visibleRange)}:${settings.timeZone}`;
    if (key === lastEmittedRangeKey) return;
    lastEmittedRangeKey = key;
    untrack(() => {
      onRangeChange({
        range: state.visibleRange,
        activeRange: state.activeRange,
        view: state.view,
        date: state.date,
        timeZone: settings.timeZone,
      });
    });
  });

  return { getState, api, settings, internals };
}

// biome-ignore lint/suspicious/noExplicitAny: the context is data-agnostic; TData is recovered by the typed hook.
type AnyEventCalendarInstance = EventCalendarInstance<any>;

const EventCalendarContext = createContext<AnyEventCalendarInstance>();

/** The stable calendar instance; throws outside <EventCalendar>. */
function useEventCalendar<TData = unknown>(): EventCalendarInstance<TData> {
  const instance = useContext(EventCalendarContext);
  if (!instance) {
    throw new Error("useEventCalendar must be used within <EventCalendar>");
  }
  return instance as EventCalendarInstance<TData>;
}

interface UseEventCalendarSelectorOptions<TData, TSelected> {
  calendar?: EventCalendarInstance<TData>;
  isEqual?: (a: TSelected, b: TSelected) => boolean;
}

/**
 * Fine-grained derived state: a memo over the live state object. The selector
 * tracks exactly the fields it reads, and `isEqual` becomes the memo's
 * comparator (referential equality by default).
 */
function useEventCalendarSelector<TData = unknown, TSelected = unknown>(
  selector: (state: EventCalendarState<TData>) => TSelected,
  options?: UseEventCalendarSelectorOptions<TData, TSelected>,
): Accessor<TSelected> {
  const contextInstance = useContext(EventCalendarContext);
  const instance = options?.calendar ?? contextInstance;
  if (!instance) {
    throw new Error(
      "useEventCalendarSelector needs an <EventCalendar> ancestor or an explicit `calendar` option",
    );
  }
  const isEqual = options?.isEqual;
  return createMemo(
    () => selector(instance.getState() as EventCalendarState<TData>),
    undefined,
    isEqual ? { equals: isEqual } : undefined,
  );
}

function useEventCalendarView(): {
  view: CalendarView;
  dayCount: number;
  /** The resolved `views` option from settings. */
  availableViews: CalendarView[];
  setView: (view: CalendarView, opts?: { dayCount?: number }) => void;
} {
  const instance = useEventCalendar();
  return {
    get view() {
      return instance.getState().view;
    },
    get dayCount() {
      return instance.getState().dayCount;
    },
    get availableViews() {
      return instance.settings.views;
    },
    setView: instance.api.setView,
  };
}

/**
 * isToday is a wall-clock read, so no store write ever invalidates it and a
 * calendar left open overnight keeps highlighting yesterday. One timer per
 * display zone, armed for the next zoned midnight and re-armed on fire, wakes
 * every day-scoped hook exactly when the answer changes; an interval would
 * tick thousands of times a day to catch one transition.
 */
const midnightTicker = (() => {
  const zones = new Map<
    string,
    { listeners: Set<() => void>; timer: ReturnType<typeof setTimeout> | null }
  >();
  let version = 0;

  const arm = (timeZone: string) => {
    const entry = zones.get(timeZone);
    if (!entry) return;
    const now = new Date();
    const next = zonedStartOfDay(addDays(toZoned(now, timeZone), 1), timeZone).getTime();
    entry.timer = setTimeout(
      () => {
        version++;
        for (const listener of entry.listeners) listener();
        arm(timeZone);
      },
      Math.max(1000, next - now.getTime()),
    );
  };

  return {
    subscribe(timeZone: string, listener: () => void) {
      let entry = zones.get(timeZone);
      if (!entry) {
        entry = { listeners: new Set(), timer: null };
        zones.set(timeZone, entry);
        entry.listeners.add(listener);
        arm(timeZone);
      } else {
        entry.listeners.add(listener);
      }
      const current = entry;
      return () => {
        current.listeners.delete(listener);
        if (current.listeners.size > 0) return;
        if (current.timer) clearTimeout(current.timer);
        zones.delete(timeZone);
      };
    },
    getVersion: () => version,
  };
})();

/** Invalidates the caller at the next midnight in `timeZone`. */
function useMidnightTick(timeZone: MaybeAccessor<string>): Accessor<number> {
  const [version, setVersion] = createSignal(midnightTicker.getVersion());
  createEffect(() => {
    const zone = access(timeZone);
    onCleanup(midnightTicker.subscribe(zone, () => setVersion(midnightTicker.getVersion())));
  });
  return version;
}

function useEventCalendarNavigation(): {
  date: Date;
  /** i18n.functions.formatTitle output for the current view. */
  title: string;
  visibleRange: EventCalendarDateRange;
  activeRange: EventCalendarDateRange;
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Date) => void;
  /** True when the anchor period contains now in the display time zone. */
  isToday: boolean;
} {
  const instance = useEventCalendar();
  const settings = instance.settings;
  const state = instance.getState();
  const tick = useMidnightTick(() => settings.timeZone);
  return {
    get date() {
      return state.date;
    },
    get title() {
      return settings.i18n.functions.formatTitle(state.view, {
        date: toZoned(state.date, settings.timeZone),
        activeRange: state.activeRange,
        visibleRange: state.visibleRange,
        locale: settings.locale,
      });
    },
    get visibleRange() {
      return state.visibleRange;
    },
    get activeRange() {
      return state.activeRange;
    },
    next: instance.api.next,
    prev: instance.api.prev,
    today: instance.api.today,
    goTo: instance.api.goTo,
    get isToday() {
      tick();
      const now = new Date();
      return now >= state.activeRange.start && now < state.activeRange.end;
    },
  };
}

function useEventCalendarSelection(): {
  selection: EventCalendarSelection;
  select: (selection: Partial<EventCalendarSelection>) => void;
  selectEvent: (key: string, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
} {
  const instance = useEventCalendar();
  return {
    get selection() {
      return instance.getState().selection;
    },
    select: instance.api.select,
    selectEvent: instance.api.selectEvent,
    clearSelection: instance.api.clearSelection,
  };
}

function useEventCalendarInteractions(): {
  interactions: EventCalendarInteractions;
  setInteractions: (patch: Partial<EventCalendarInteractions>) => void;
} {
  const instance = useEventCalendar();
  return {
    get interactions() {
      return instance.getState().interactions;
    },
    setInteractions: instance.api.setInteractions,
  };
}

/** Expanded, sorted occurrences; defaults to the visible range. */
function useEventCalendarOccurrences<TData = unknown>(
  range?: MaybeAccessor<EventCalendarDateRange | undefined>,
): Accessor<EventCalendarOccurrence<TData>[]> {
  const instance = useEventCalendar<TData>();
  return createMemo(() => instance.api.getOccurrences(access(range)));
}

const EMPTY_BUCKET: EventCalendarDayBucket = { allDay: [], timed: [] };

/** Per-cell derived state: only cells whose segments changed re-render. */
function useEventCalendarDay<TData = unknown>(
  day: MaybeAccessor<Date>,
): {
  segments: EventCalendarDayBucket<TData>;
  isToday: boolean;
  isOutside: boolean;
} {
  const instance = useEventCalendar<TData>();
  const timeZone = () => instance.settings.timeZone;
  const dayKey = createMemo(() => getDayKey(access(day), timeZone()));
  const tick = useMidnightTick(timeZone);

  // Buckets come straight out of the memoized index, which rebuilds precisely
  // when events change, so this memo settles on identity alone.
  const bucket = createMemo(
    () =>
      instance.internals.getIndex().byDay.get(dayKey()) ??
      (EMPTY_BUCKET as EventCalendarDayBucket<TData>),
  );

  return {
    get segments() {
      return bucket();
    },
    get isToday() {
      tick();
      return getDayKey(new Date(), timeZone()) === dayKey();
    },
    get isOutside() {
      const dayStart = zonedStartOfDay(access(day), timeZone());
      const activeRange = instance.getState().activeRange;
      return dayStart < activeRange.start || dayStart >= activeRange.end;
    },
  };
}

const EMPTY_BARS: EventCalendarSegment[] = [];

/**
 * Per-week-row derived state for the month view: the laned multi-day/all-day
 * bar segments (one per occurrence per row, colStart/colSpan/lane set) that
 * render as continuous cross-day bars. `laneCount` is the row's bar height.
 * Matched by CONTAINMENT - any day inside the row resolves it - so a
 * weekends-hidden month (first visible day Monday) still finds its row;
 * `rowStart` returns the row's TRUE start for colStart/colSpan day math.
 */
function useEventCalendarWeek<TData = unknown>(
  day: MaybeAccessor<Date>,
): {
  bars: EventCalendarSegment<TData>[];
  laneCount: number;
  rowStart: Date | null;
} {
  const instance = useEventCalendar<TData>();
  const timeZone = () => instance.settings.timeZone;

  const row = createMemo(() => {
    const zone = timeZone();
    const dayStartMs = zonedStartOfDay(access(day), zone).getTime();
    const match = instance.internals.getIndex().weekRows.find((r) => {
      const startMs = zonedStartOfDay(r.rowStart, zone).getTime();
      // calendar-aware row end: a fixed 168h window would let the first
      // day AFTER a spring-forward week (167h long) match the wrong row
      const endMs = zonedStartOfDay(addDays(toZoned(r.rowStart, zone), 7), zone).getTime();
      return dayStartMs >= startMs && dayStartMs < endMs;
    });
    return {
      bars: match?.bars ?? (EMPTY_BARS as EventCalendarSegment<TData>[]),
      rowStart: match?.rowStart ?? null,
    };
  });

  return {
    get bars() {
      return row().bars;
    },
    get laneCount() {
      return row().bars.reduce((m, s) => Math.max(m, (s.lane ?? 0) + 1), 0);
    },
    get rowStart() {
      return row().rowStart;
    },
  };
}

/**
 * User view settings (weekends, week numbers, now line, off days, schedule
 * hint) + the effective values after falling back to the root view-config
 * props. Drives the nav submenu; fully controllable from outside via
 * `viewSettings`/`onViewSettingsChange` or api.setViewSettings.
 */
function useEventCalendarViewSettings(): {
  viewSettings: EventCalendarViewSettings;
  setViewSettings: (patch: EventCalendarViewSettings) => void;
  effective: Required<EventCalendarViewSettings>;
} {
  const instance = useEventCalendar();
  const viewConfig = useEventCalendarViewConfig();
  const viewSettings = () => instance.getState().viewSettings;
  const effective: Required<EventCalendarViewSettings> = {
    get weekends() {
      return viewSettings().weekends ?? true;
    },
    get weekNumbers() {
      return viewSettings().weekNumbers ?? viewConfig.showWeekNumbers;
    },
    get nowIndicator() {
      return viewSettings().nowIndicator ?? viewConfig.nowIndicator;
    },
    get offDays() {
      return (
        viewSettings().offDays ?? (viewConfig.offDays !== undefined && viewConfig.offDays !== false)
      );
    },
  };
  return {
    get viewSettings() {
      return viewSettings();
    },
    setViewSettings: instance.api.setViewSettings,
    effective,
  };
}

/** The settings version counter; advances whenever a settings option changes. */
function useEventCalendarSettingsVersion<TData>(instance: EventCalendarInstance<TData>): number {
  return instance.internals.getSettingsVersion();
}

/** Resolved settings incl. merged i18n; every field is a live getter. */
function useEventCalendarSettings<TData = unknown>(): EventCalendarSettings<TData> {
  return useEventCalendar<TData>().settings;
}

const EventCalendarViewContext = createContext<{ view: CalendarView }>();

/**
 * Per-element class hooks, cn()-merged AFTER the built-in classes (so tailwind
 * variants and ! overrides win). Metric CSS variables can ride on any parent
 * key, e.g. classNames.timeGrid: "[--ec-gutter-width:4.5rem]".
 */
interface EventCalendarClassNames {
  nav?: string;
  toolbar?: string;
  content?: string;
  monthView?: string;
  monthCell?: string;
  timeGrid?: string;
  timeGutter?: string;
  dayColumn?: string;
  allDaySection?: string;
  agendaView?: string;
  event?: string;
  /** The styled hover tooltip popup (viewConfig.eventTooltip). */
  eventTooltip?: string;
  moreIndicator?: string;
  /** The "+N more" popover panel. Control the on-demand scroll cap through
   *  the CSS variable, e.g. "[--ec-more-max-height:20rem]". */
  morePopover?: string;
  /** "+N more" popover day header row. */
  morePopoverHeader?: string;
  // nav family (reachable without recomposing the default nav)
  navButton?: string;
  title?: string;
  navTooltip?: string;
  viewSwitcherContent?: string;
  viewSwitcherLabel?: string;
  viewShortcut?: string;
  datePickerContent?: string;
  // month view
  monthHeader?: string;
  monthDayHeader?: string;
  monthBody?: string;
  monthRow?: string;
  weekNumber?: string;
  monthBarOverlay?: string;
  monthBar?: string;
  monthCellContent?: string;
  monthCellFooter?: string;
  monthDayNumber?: string;
  dayAddButton?: string;
  // time grid / resource
  timeGridHeader?: string;
  timeGutterLabel?: string;
  allDayLabel?: string;
  allDayCell?: string;
  timedChip?: string;
  resourceHeader?: string;
  // interaction surfaces (shared by every view)
  dragGhost?: string;
  dragCarry?: string;
  dragCarryInvalid?: string;
  dropHint?: string;
  dropIndicator?: string;
  slotDraft?: string;
  resizeHandle?: string;
  resizeGrip?: string;
  // agenda
  noEvents?: string;
  agendaDay?: string;
  agendaDayHeader?: string;
  agendaDayGutter?: string;
  agendaDate?: string;
  agendaDayToggle?: string;
  agendaDayContent?: string;
  agendaItem?: string;
  agendaItemSurface?: string;
  agendaItemToggle?: string;
  agendaDaySummary?: string;
  agendaSummaryDot?: string;
}

interface EventCalendarRenderEventProps<TData = unknown> {
  occurrence: EventCalendarOccurrence<TData>;
  segment: EventCalendarSegment<TData>;
  view: CalendarView;
  isDragging: boolean;
  isSelected: boolean;
}

/**
 * View-layer configuration: display props and render overrides. These live on
 * <EventCalendar> (and per-view components), never in the headless options.
 */
interface EventCalendarViewConfig<TData = unknown> {
  scrollToHour: number;
  nowIndicator: boolean;
  /**
   * Grid interval in minutes for the time-based views (day, week, N-days,
   * time grid): gutter slots and gridlines follow it. Also accepted as a
   * prop on each view component.
   */
  interval: number;
  maxEventsPerCell: number | "auto";
  showWeekNumbers: boolean;
  enableShortcuts: boolean;
  shortcutsScope: "focus-within" | "global";
  /**
   * "contained" (default): the calendar fills its container and views scroll
   * internally. "page": content flows with the document, the page scrolls,
   * and day headers stick below `--ec-sticky-offset` (default 0px).
   */
  scrollMode: "contained" | "page";
  /** Stick the default nav to the top while the page scrolls. */
  stickyNav: boolean;
  /**
   * Custom per-day indication (light background classes work in both themes,
   * e.g. "bg-amber-500/10"). Applied to month cells, time-grid day columns,
   * and all-day cells; content stays readable on top of it.
   */
  dayClassName?: (day: Date) => string | undefined;
  /**
   * Extra classes for the CURRENT day, appended after the built-in highlight
   * (primary-tinted background + accent top border) on month cells, time-grid
   * day columns, and day headers.
   */
  todayClassName?: string;
  /**
   * Show a hover "+" add affordance on month cells next to the day number.
   * It fires the same onSlotClick as clicking the day. Calendar-level config
   * (consistent affordance, wired to the create flow); use renderMonthCell
   * when a fully custom cell is needed instead.
   */
  showDayAddButton: boolean;
  /**
   * Scroll implementation for every internally scrolling surface (time grid,
   * agenda, time-grid resources, month "+N more" popover):
   * "custom" (default, the Zaidan ScrollArea) or "native" (browser scrollbars
   * via overflow auto).
   */
  scrollbars: "custom" | "native";
  /** Nav button variant; all nav buttons follow it. Default "ghost". */
  navButtonVariant: "ghost" | "outline" | "secondary" | "default";
  /** Nav button size; icon buttons use the icon twin. Default "sm". */
  navButtonSize: "sm" | "default";
  /**
   * Off-day (non-working day) marking. true = weekends with a muted
   * background; a config object customizes weekdays, explicit dates, a
   * predicate, and the marker class. Marked cells carry data-off.
   */
  offDays?: boolean | EventCalendarOffDaysConfig;
  classNames?: EventCalendarClassNames;
  components?: Partial<Record<CalendarView, Component>>;
  renderEvent?: (props: EventCalendarRenderEventProps<TData>) => JSX.Element;
  renderAgendaEvent?: (props: EventCalendarRenderEventProps<TData>) => JSX.Element;
  /**
   * Content for the styled hover tooltip (viewConfig.eventTooltip). Return a
   * falsy value (null / undefined, or the `false` a `cond && <node>` yields)
   * to fall back to the default label (title + time); `label` itself is
   * undefined when a consumer i18n.formatEventLabel opts out.
   */
  renderEventTooltip?: (props: {
    occurrence: EventCalendarOccurrence<TData>;
    segment: EventCalendarSegment<TData>;
    view: CalendarView;
    label: string | undefined;
  }) => JSX.Element;
  renderDragPreview?: (props: { drag: EventCalendarDragState<TData> }) => JSX.Element;
  renderMonthCell?: (props: {
    day: Date;
    segments: EventCalendarDayBucket<TData>;
    isToday: boolean;
    isOutside: boolean;
    overflowCount: number;
    defaultContent: JSX.Element;
  }) => JSX.Element;
  /**
   * Time-grid business-logic layer, rendered pointer-events-none BEHIND event
   * segments in each day column. Position overlays with
   * top/height: calc(var(--ec-hour-height) * minutes / 60).
   */
  renderDayColumnBackground?: (props: {
    day: Date;
    boundsStartMin: number;
    boundsEndMin: number;
    totalMinutes: number;
  }) => JSX.Element;
  renderDayHeader?: (props: { day: Date; view: CalendarView; isToday: boolean }) => JSX.Element;
  renderTimeGutterSlot?: (props: { time: Date; hour: number; minute: number }) => JSX.Element;
  renderAllDaySection?: (props: {
    days: Date[];
    segments: EventCalendarSegment<TData>[];
  }) => JSX.Element;
  renderMoreIndicator?: (props: {
    day: Date;
    count: number;
    segments: EventCalendarSegment<TData>[];
  }) => JSX.Element;
  /**
   * Replaces the ENTIRE body of the built-in "+N more" popover (header +
   * chip list) while keeping its trigger and positioning; `close` dismisses
   * it. For a fully custom surface, return false from onMoreClick instead
   * and open your own UI.
   */
  renderMoreContent?: (props: {
    day: Date;
    segments: EventCalendarSegment<TData>[];
    close: () => void;
  }) => JSX.Element;
  /**
   * Agenda-only expandable details. When it returns a node for an occurrence,
   * the agenda row gains an expand/collapse toggle revealing the details
   * below the chip (the calendar itself never knows the consumer's fields).
   */
  renderAgendaEventDetails?: (occurrence: EventCalendarOccurrence<TData>) => JSX.Element;
  renderNowIndicator?: (props: { time: Date }) => JSX.Element;
  renderNoEvents?: () => JSX.Element;
  /** Resource column header cell content; default is resource.title. */
  renderResourceHeader?: (props: { resource: EventCalendarResource }) => JSX.Element;
  /** Agenda date gutter (day badge + weekday + collapse toggle). */
  renderAgendaDayHeader?: (props: {
    day: Date;
    collapsed: boolean;
    count: number;
    toggle: () => void;
    defaultContent: JSX.Element;
  }) => JSX.Element;
  /** Collapsed agenda day summary row content. */
  renderAgendaDaySummary?: (props: {
    day: Date;
    occurrences: EventCalendarOccurrence<TData>[];
    count: number;
    expand: () => void;
    defaultContent: JSX.Element;
  }) => JSX.Element;
  /**
   * N-day presets offered by the view switcher when the "days" view is
   * enabled. @default [5]
   */
  dayCountPresets: number[];
  /**
   * Nav tooltips: false disables them all; an object tunes placement and
   * timings. @default { side: "bottom", delay: 600, closeDelay: 0, timeout: 300 }
   */
  navTooltips?:
    | false
    | {
        side?: "top" | "bottom" | "left" | "right";
        delay?: number;
        closeDelay?: number;
        timeout?: number;
      };
  /**
   * Styled tooltip on event hover / keyboard focus. `false` (default) keeps
   * only the native title attribute; `true` shows the standard Tooltip with
   * the event label; an object also tunes the side and open delay. Content is
   * overridable with renderEventTooltip. @default false
   */
  eventTooltip?:
    | boolean
    | {
        side?: "top" | "bottom" | "left" | "right";
        delay?: number;
      };
  /**
   * Timed events shorter than this render the compact single-row chip layout.
   * @default 45
   */
  compactEventMinutes: number;
  /** "+N more" popover alignment against its trigger. @default "start" */
  morePopoverAlign: "start" | "center" | "end";
  /** Now-indicator refresh cadence in milliseconds. @default 30000 */
  nowIndicatorInterval: number;
  /** Max color dots in a collapsed agenda day summary. @default 6 */
  agendaSummaryMaxDots: number;
}

const DEFAULT_VIEW_CONFIG: EventCalendarViewConfig = {
  scrollToHour: 7,
  nowIndicator: true,
  interval: 60,
  maxEventsPerCell: "auto",
  showWeekNumbers: false,
  enableShortcuts: true,
  shortcutsScope: "focus-within",
  scrollMode: "contained",
  stickyNav: false,
  showDayAddButton: false,
  scrollbars: "custom",
  navButtonVariant: "ghost",
  navButtonSize: "sm",
  dayCountPresets: [5],
  eventTooltip: false,
  compactEventMinutes: 45,
  morePopoverAlign: "start",
  nowIndicatorInterval: 30_000,
  agendaSummaryMaxDots: 6,
};

const EventCalendarViewConfigContext =
  // biome-ignore lint/suspicious/noExplicitAny: the context is data-agnostic; TData is recovered by the typed hook.
  createContext<EventCalendarViewConfig<any>>(DEFAULT_VIEW_CONFIG);

/** Root-level display props + render overrides, for view components. */
function useEventCalendarViewConfig<TData = unknown>(): EventCalendarViewConfig<TData> {
  return useContext(EventCalendarViewConfigContext);
}

const VIEW_CONFIG_KEYS = [
  "scrollToHour",
  "nowIndicator",
  "interval",
  "maxEventsPerCell",
  "showWeekNumbers",
  "enableShortcuts",
  "shortcutsScope",
  "scrollMode",
  "stickyNav",
  "dayClassName",
  "todayClassName",
  "showDayAddButton",
  "scrollbars",
  "navButtonVariant",
  "navButtonSize",
  "offDays",
  "classNames",
  "components",
  "renderEvent",
  "renderAgendaEvent",
  "renderEventTooltip",
  "renderDragPreview",
  "renderMonthCell",
  "renderDayColumnBackground",
  "renderDayHeader",
  "renderTimeGutterSlot",
  "renderAllDaySection",
  "renderMoreIndicator",
  "renderMoreContent",
  "renderNowIndicator",
  "renderNoEvents",
  "renderAgendaEventDetails",
  "renderResourceHeader",
  "renderAgendaDayHeader",
  "renderAgendaDaySummary",
  "dayCountPresets",
  "navTooltips",
  "eventTooltip",
  "compactEventMinutes",
  "morePopoverAlign",
  "nowIndicatorInterval",
  "agendaSummaryMaxDots",
] as const satisfies ReadonlyArray<keyof EventCalendarViewConfig>;

/** The rendering view of the nearest view component ("month", "week", ...). */
function useEventCalendarViewContext(): { view: CalendarView } {
  const ctx = useContext(EventCalendarViewContext);
  if (!ctx) {
    throw new Error("useEventCalendarViewContext must be used inside a calendar view");
  }
  return ctx;
}

const OPTION_KEYS = [
  "events",
  "defaultEvents",
  "view",
  "defaultView",
  "date",
  "defaultDate",
  "dayCount",
  "defaultDayCount",
  "selection",
  "defaultSelection",
  "interactions",
  "defaultInteractions",
  "viewSettings",
  "defaultViewSettings",
  "loading",
  "views",
  "timeZone",
  "locale",
  "weekStartsOn",
  "dayStartHour",
  "dayEndHour",
  "slotDuration",
  "snapDuration",
  "agendaDayCount",
  "fixedWeeks",
  "showOutsideDays",
  "i18n",
  "resources",
  "getEventPriority",
  "eventOrder",
  "getOccurrences",
  "weekendDays",
  "activation",
  "onEventClick",
  "onEventDoubleClick",
  "onEventUpdate",
  "canDropEvent",
  "onDragBlocked",
  "onSlotClick",
  "onSelectSlot",
  "canSelectSlot",
  "onRangeChange",
  "onViewChange",
  "onDateChange",
  "onDayCountChange",
  "onSelectionChange",
  "onInteractionsChange",
  "onViewSettingsChange",
  "onEventsChange",
  "onMoreClick",
] as const satisfies ReadonlyArray<keyof UseEventCalendarStateOptions>;

/**
 * Imperative escape hatch. Either a setter (the Solid ref convention) or a
 * `{ current }` box, filled with the instance API during setup.
 */
type EventCalendarApiRef<TData = unknown> =
  | ((api: EventCalendarApi<TData>) => void)
  | { current: EventCalendarApi<TData> | null };

interface EventCalendarProps<TData = unknown>
  extends UseEventCalendarStateOptions<TData>,
    Partial<EventCalendarViewConfig<TData>>,
    // `onSelectionChange` is a DOM event on Solid's div props and a calendar
    // callback here; the calendar callback wins.
    Omit<ComponentProps<"div">, "children" | "onSelectionChange"> {
  /** Adopt a hoisted useEventCalendarState instance; option props are then ignored. */
  calendar?: EventCalendarInstance<TData>;
  /** Imperative escape hatch usable from outside the tree. */
  apiRef?: EventCalendarApiRef<TData>;
  children?: JSX.Element;
}

/**
 * Root provider + container. Composition contract:
 * <EventCalendar><EventCalendarNav/><EventCalendarToolbar/><EventCalendarContent/></EventCalendar>
 */
function EventCalendar<TData = unknown>(props: EventCalendarProps<TData>) {
  const [local, optionProps, viewConfigProps, rest] = splitProps(
    props as EventCalendarProps & Record<string, unknown>,
    ["calendar", "apiRef", "class", "children"],
    [...OPTION_KEYS],
    [...VIEW_CONFIG_KEYS],
  );

  // A spread copies keys that hold `undefined`, so mergeProps - which skips
  // undefined values - is what keeps `prop={cond ? value : undefined}` from
  // erasing a default.
  const viewConfig = mergeProps(
    DEFAULT_VIEW_CONFIG,
    viewConfigProps,
  ) as unknown as EventCalendarViewConfig<TData>;

  const adopted = untrack(() => local.calendar) as EventCalendarInstance<TData> | undefined;

  if (import.meta.env.DEV && adopted) {
    const passedOptions = untrack(() =>
      OPTION_KEYS.some((key) => (optionProps as Record<string, unknown>)[key] !== undefined),
    );
    if (passedOptions) {
      warnOnce(
        "calendar-and-options",
        "both `calendar` and option props were passed; option props are ignored when adopting an instance.",
      );
    }
  }

  const instance =
    adopted ??
    useEventCalendarState<TData>(optionProps as unknown as UseEventCalendarStateOptions<TData>);

  const apiRef = untrack(() => local.apiRef) as EventCalendarApiRef<TData> | undefined;
  if (typeof apiRef === "function") apiRef(instance.api);
  else if (apiRef) apiRef.current = instance.api;

  return (
    <EventCalendarContext.Provider value={instance}>
      <EventCalendarViewConfigContext.Provider value={viewConfig}>
        <div
          data-slot="event-calendar"
          // Register the root element so the drag engine can find day cells even
          // when a gesture starts from a portaled surface (the "+N more" popover).
          ref={(el: HTMLDivElement) => {
            instance.internals.setRootEl(el);
            onCleanup(() => instance.internals.setRootEl(null));
          }}
          // text-xs is the calendar-wide default type size; because it sits
          // before `class`, a consumer can override the whole scale with e.g.
          // <EventCalendar class="text-sm"> and every inheriting element
          // follows. Inner elements omit their own text-size so they cascade
          // from here (the few portaled surfaces - "+N more" popover, drag
          // carry clone - pin the size explicitly since DOM inheritance does
          // not cross a portal).
          class={cn("flex min-h-0 min-w-0 flex-col text-xs", local.class)}
          {...rest}
        >
          {local.children}
          <div data-slot="event-calendar-announcer" aria-live="polite" class="sr-only" />
        </div>
      </EventCalendarViewConfigContext.Provider>
    </EventCalendarContext.Provider>
  );
}

export type {
  EventCalendarActivationConfig,
  EventCalendarApi,
  EventCalendarApiRef,
  EventCalendarCallbacks,
  EventCalendarClassNames,
  EventCalendarInstance,
  EventCalendarInternals,
  EventCalendarProps,
  EventCalendarRenderEventProps,
  EventCalendarSettings,
  EventCalendarViewConfig,
  MaybeAccessor,
  UseEventCalendarStateOptions,
};
export {
  ALL_VIEWS,
  access,
  BASE_VIEWS,
  DEFAULT_VIEW_CONFIG,
  EventCalendar,
  EventCalendarContext,
  EventCalendarViewConfigContext,
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarDay,
  useEventCalendarInteractions,
  useEventCalendarNavigation,
  useEventCalendarOccurrences,
  useEventCalendarSelection,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarSettingsVersion,
  useEventCalendarState,
  useEventCalendarView,
  useEventCalendarViewConfig,
  useEventCalendarViewContext,
  useEventCalendarViewSettings,
  useEventCalendarWeek,
  useMidnightTick,
};
