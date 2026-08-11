import type { Locale } from "date-fns";
import type { Accessor, ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
  onMount,
  splitProps,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "@/lib/utils";
import type { GanttI18nConfig, GanttI18nOverrides } from "./gantt-i18n";
import { mergeGanttI18n } from "./gantt-i18n";
import type { GanttIndex, WeekStartsOn } from "./gantt-lib";
import {
  buildEventIndex,
  defaultEventOrder,
  eventsOverlap,
  findResource,
  getGanttDateRange,
  getRangeKey,
  stepGanttDate,
  toZoned,
} from "./gantt-lib";
import type {
  GanttBarId,
  GanttDateRange,
  GanttDragState,
  GanttEvent,
  GanttInteractions,
  GanttOccurrence,
  GanttOffDaysConfig,
  GanttOverlapPolicy,
  GanttProposedUpdate,
  GanttRangeInfo,
  GanttResource,
  GanttResourceReorder,
  GanttRowAlign,
  GanttScale,
  GanttScheduleMode,
  GanttSegment,
  GanttSelection,
  GanttSlotDraft,
  GanttSlotInfo,
  GanttState,
  GanttUpdateResult,
} from "./gantt-types";

const DEFAULT_INTERACTIONS: GanttInteractions = {
  drag: true,
  resize: true,
  selectSlot: true,
};

/** Infinite-scroll growth cap, in whole periods per side. */
const MAX_RANGE_WINDOW = 12;

/** A node holds as many concurrent schedules as it needs unless told otherwise. */
const DEFAULT_SCHEDULE_MODE: GanttScheduleMode = "multiple";

/** Tree label sits on the first schedule's baseline, not the grown row's middle. */
const DEFAULT_ROW_ALIGN: GanttRowAlign = "start";

/**
 * A node's cardinality: its own override wins over the view-level default.
 * Shared by the layout pass and the gesture engine so both read one rule.
 */
function resolveScheduleMode(
  node: GanttResource | null | undefined,
  scheduleMode: GanttScheduleMode | undefined,
): GanttScheduleMode {
  return node?.scheduleMode ?? scheduleMode ?? DEFAULT_SCHEDULE_MODE;
}

const EMPTY_SELECTION: GanttSelection = { eventKeys: [], slot: null };

/** Shared empty tree so an omitted `resources` keeps a stable identity. */
const EMPTY_RESOURCES: GanttResource[] = [];

interface GanttCallbacks<TData = unknown> {
  onEventClick?: (occurrence: GanttOccurrence<TData>, e: MouseEvent) => void;
  onEventDoubleClick?: (occurrence: GanttOccurrence<TData>, e: MouseEvent) => void;
  onEventUpdate?: (update: GanttProposedUpdate<TData>) => GanttUpdateResult;
  canDropEvent?: (update: GanttProposedUpdate<TData>) => boolean;
  onSlotClick?: (slot: GanttSlotInfo, e: MouseEvent) => void;
  onSelectSlot?: (slot: GanttSlotDraft) => void;
  canSelectSlot?: (slot: GanttSlotDraft) => boolean;
  /** Fires when the "add task" hint is activated; create a new tree row. */
  onCreateTask?: (ctx: { parentId: string | null; index: number }) => void;
  /**
   * Gates the "add task" hint. The shipped view offers root-level creation
   * only (parentId = null); parentId stays in the contract for group-level
   * affordances a consumer builds via its own UI + onCreateTask.
   */
  canCreateTask?: (ctx: { parentId: string | null }) => boolean;
  /** Click on a tree row's surface (chevron/checkbox/grip clicks excluded). */
  onResourceClick?: (ctx: GanttColumnContext, e: MouseEvent) => void;
  onResourceDoubleClick?: (ctx: GanttColumnContext, e: MouseEvent) => void;
  onRangeChange?: (info: GanttRangeInfo) => void;
  onScaleChange?: (scale: GanttScale) => void;
  onDateChange?: (date: Date) => void;
  onSelectionChange?: (selection: GanttSelection) => void;
  onInteractionsChange?: (interactions: GanttInteractions) => void;
  onEventsChange?: (events: GanttEvent<TData>[]) => void;
  /**
   * Commit gate for timeline resource-row drag reorder. Return false to
   * reject; apply the move by adopting proposal.resources into your
   * `resources` state (controlled - the calendar never self-mutates).
   */
  // biome-ignore lint/suspicious/noConfusingVoidType: `void` is the public contract - a handler that returns nothing accepts the reorder, and `undefined` would reject every `() => void` callback.
  onResourceReorder?: (proposal: GanttResourceReorder) => void | false;
  /** Live validity predicate while a resource row is being dragged. */
  canReorderResource?: (proposal: GanttResourceReorder) => boolean;
  /**
   * Fires when a reorder gesture is released on a position rejected by
   * `canReorderResource` (e.g. a pinned row). Use it to explain the rejection
   * (a toast) - the destructive drop indicator already shows it live.
   */
  onResourceReorderReject?: (proposal: GanttResourceReorder) => void;
}

interface UseGanttStateOptions<TData = unknown> extends GanttCallbacks<TData> {
  events?: GanttEvent<TData>[];
  defaultEvents?: GanttEvent<TData>[];
  scale?: GanttScale;
  defaultScale?: GanttScale;
  date?: Date;
  defaultDate?: Date;
  selection?: GanttSelection;
  defaultSelection?: GanttSelection;
  interactions?: Partial<GanttInteractions>;
  defaultInteractions?: Partial<GanttInteractions>;
  loading?: boolean;
  timeZone?: string;
  locale?: Locale;
  weekStartsOn?: WeekStartsOn;
  slotDuration?: number;
  snapDuration?: number;
  i18n?: GanttI18nOverrides;
  /**
   * Hard travel bounds for infinite scrolling; either side may be omitted
   * for unlimited travel in that direction.
   */
  rangeBounds?: { min?: Date; max?: Date };
  /** Pointer-activation threshold overrides for drag/resize/create. */
  activation?: GanttActivationConfig;
  /**
   * Infinite-scroll growth cap in whole periods per side; past it the
   * anchor slides instead (DOM stays bounded). Default 12.
   */
  maxRangeWindow?: number;
  /** Tree nodes of the gantt (GanttNode is the preferred type name). */
  resources?: GanttResource[];
  /**
   * What a gesture may do when it would overlap another schedule in the SAME
   * node: "allow" (default), "clamp" to the neighbour's edge, or "reject".
   * Policy only - overlapping data always renders. A node in "single"
   * scheduleMode rejects regardless.
   */
  overlap?: GanttOverlapPolicy;
  getEventPriority?: (event: GanttEvent<TData>) => number;
  eventOrder?: (a: GanttOccurrence<TData>, b: GanttOccurrence<TData>) => number;
  getOccurrences?: (
    event: GanttEvent<TData>,
    range: GanttDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
}

/**
 * Resolved configuration: every UseGanttStateOptions field except the
 * controlled/uncontrolled state pairs, with defaults applied and i18n merged.
 * Every field is a live getter over the options, so the object identity is
 * stable for a gesture's lifetime while its reads stay reactive.
 */
interface GanttSettings<TData = unknown> extends GanttCallbacks<TData> {
  timeZone: string;
  locale?: Locale;
  weekStartsOn: WeekStartsOn;
  slotDuration: number;
  snapDuration: number;
  i18n: GanttI18nConfig;
  rangeBounds?: { min?: Date; max?: Date };
  activation?: GanttActivationConfig;
  maxRangeWindow?: number;
  resources: GanttResource[];
  overlap: GanttOverlapPolicy;
  getEventPriority: (event: GanttEvent<TData>) => number;
  eventOrder: (a: GanttOccurrence<TData>, b: GanttOccurrence<TData>) => number;
  getOccurrences?: (
    event: GanttEvent<TData>,
    range: GanttDateRange,
    ctx: { timeZone: string },
  ) => Array<{ start: Date; end: Date }> | null;
}

interface GanttApi<TData = unknown> {
  next(): void;
  prev(): void;
  today(): void;
  goTo(date: Date): void;
  setScale(scale: GanttScale): void;
  getEvents(): GanttEvent<TData>[];
  getEvent(id: GanttBarId): GanttEvent<TData> | undefined;
  setEvents(events: GanttEvent<TData>[]): void;
  addEvent(event: GanttEvent<TData>): void;
  updateEvent(id: GanttBarId, patch: Partial<GanttEvent<TData>>): void;
  removeEvent(id: GanttBarId): void;
  getOccurrences(range?: GanttDateRange): GanttOccurrence<TData>[];
  findOverlapping(candidate: {
    start: Date;
    end: Date;
    excludeEventId?: string;
  }): GanttOccurrence<TData>[];
  select(selection: Partial<GanttSelection>): void;
  selectEvent(key: string, opts?: { additive?: boolean }): void;
  clearSelection(): void;
  setInteractions(patch: Partial<GanttInteractions>): void;
  getVisibleRange(): GanttDateRange;
  getActiveRange(): GanttDateRange;
  /** TZDate in the gantt's display time zone. */
  toZoned(date: Date): Date;
}

/** Cross-file plumbing for sibling view/interaction modules; not public API. */
interface GanttInternals<TData = unknown> {
  getIndex(): GanttIndex<TData>;
  setDrag(drag: GanttDragState<TData> | null): void;
  setSlotDraft(draft: GanttSlotDraft | null): void;
  applyProposedUpdate(update: GanttProposedUpdate<TData>): boolean;
  /**
   * Grow visibleRange by whole periods for infinite scrolling; resets on
   * date/scale changes. Returns false once the growth cap is reached.
   */
  extendRange(direction: "before" | "after"): boolean;
  /**
   * True when the LAST anchor-date change was an extendRange window slide
   * (not a navigation) - the view keeps its scroll guard across slides.
   */
  didAnchorSlide(): boolean;
  /** View reports the visible-center instant (or null) for the nav title. */
  setViewportCenter(date: Date | null): void;
}

interface GanttInstance<TData = unknown> {
  /**
   * The live engine snapshot. The returned object is stable and every
   * property is a reactive read, so `instance.getState().scale` tracks inside
   * a memo, an effect, or JSX - this replaces the upstream subscribe/selector
   * machinery.
   */
  getState(): GanttState<TData>;
  api: GanttApi<TData>;
  settings: GanttSettings<TData>;
  internals: GanttInternals<TData>;
}

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (import.meta.env.DEV && !warned.has(key)) {
    warned.add(key);
    console.warn(`[gantt] ${message}`);
  }
}

/** Cheap value equality for the two derived ranges. */
function sameRange(a: GanttDateRange, b: GanttDateRange): boolean {
  return getRangeKey(a) === getRangeKey(b);
}

/**
 * Headless root hook - the full calendar engine without any markup.
 * Pass the returned instance to <Gantt calendar={instance}> or drive
 * fully custom UI from instance.getState()/api.
 */
function useGanttState<TData = unknown>(
  options: UseGanttStateOptions<TData> = {},
): GanttInstance<TData> {
  // ---- uncontrolled state ------------------------------------------------
  const [internalScale, setInternalScale] = createSignal<GanttScale>(options.defaultScale ?? "day");
  const [internalDate, setInternalDate] = createSignal<Date>(options.defaultDate ?? new Date());
  const [internalEvents, setInternalEvents] = createSignal<GanttEvent<TData>[]>(
    options.defaultEvents ?? [],
  );
  const [internalSelection, setInternalSelection] = createSignal<GanttSelection>(
    options.defaultSelection ?? EMPTY_SELECTION,
  );
  const [internalInteractions, setInternalInteractions] = createSignal<GanttInteractions>({
    ...DEFAULT_INTERACTIONS,
    ...options.defaultInteractions,
  });
  const [drag, setDragState] = createSignal<GanttDragState<TData> | null>(null);
  const [slotDraft, setSlotDraftState] = createSignal<GanttSlotDraft | null>(null);
  /** Whole extra periods rendered on each side (infinite scroll). */
  const [rangeWindow, setRangeWindow] = createSignal({ before: 0, after: 0 });
  /** Visible-center instant reported by the view; drives the nav title. */
  const [viewportCenter, setViewportCenterState] = createSignal<Date | null>(null, {
    equals: (a, b) => (a ? a.getTime() : null) === (b ? b.getTime() : null),
  });

  let lastEmittedRangeKey: string | null = null;
  /** Whether the last anchor change came from an extendRange window slide. */
  let lastAnchorChangeWasSlide = false;

  // ---- resolved settings -------------------------------------------------
  const i18n = createMemo(() => mergeGanttI18n(options.i18n));

  // Stable identities that read their option lazily: a settings rebuild can
  // never invalidate the index memo, and the reads inside them still track.
  const getEventPriority = (event: GanttEvent<TData>): number =>
    options.getEventPriority ? options.getEventPriority(event) : (event.priority ?? 0);
  // priority-aware default: higher getEventPriority packs/orders first
  const eventOrder = (a: GanttOccurrence<TData>, b: GanttOccurrence<TData>): number =>
    options.eventOrder
      ? options.eventOrder(a, b)
      : getEventPriority(b.event) - getEventPriority(a.event) || defaultEventOrder(a, b);

  const settings: GanttSettings<TData> = {
    get timeZone() {
      return options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    },
    get locale() {
      return options.locale;
    },
    // locale-first default: a de/fr locale gets Monday weeks without also
    // having to set weekStartsOn; an explicit weekStartsOn always wins
    get weekStartsOn() {
      return options.weekStartsOn ?? options.locale?.options?.weekStartsOn ?? 0;
    },
    get slotDuration() {
      return options.slotDuration ?? 30;
    },
    get snapDuration() {
      return options.snapDuration ?? 15;
    },
    get i18n() {
      return i18n();
    },
    get rangeBounds() {
      return options.rangeBounds;
    },
    get activation() {
      return options.activation;
    },
    get maxRangeWindow() {
      return options.maxRangeWindow;
    },
    get resources() {
      return options.resources ?? EMPTY_RESOURCES;
    },
    get overlap() {
      return options.overlap ?? "allow";
    },
    getEventPriority,
    eventOrder,
    get getOccurrences() {
      return options.getOccurrences;
    },
    get onEventClick() {
      return options.onEventClick;
    },
    get onEventDoubleClick() {
      return options.onEventDoubleClick;
    },
    get onEventUpdate() {
      return options.onEventUpdate;
    },
    get canDropEvent() {
      return options.canDropEvent;
    },
    get onSlotClick() {
      return options.onSlotClick;
    },
    get onSelectSlot() {
      return options.onSelectSlot;
    },
    get canSelectSlot() {
      return options.canSelectSlot;
    },
    get onCreateTask() {
      return options.onCreateTask;
    },
    get canCreateTask() {
      return options.canCreateTask;
    },
    get onResourceClick() {
      return options.onResourceClick;
    },
    get onResourceDoubleClick() {
      return options.onResourceDoubleClick;
    },
    get onRangeChange() {
      return options.onRangeChange;
    },
    get onScaleChange() {
      return options.onScaleChange;
    },
    get onDateChange() {
      return options.onDateChange;
    },
    get onSelectionChange() {
      return options.onSelectionChange;
    },
    get onInteractionsChange() {
      return options.onInteractionsChange;
    },
    get onEventsChange() {
      return options.onEventsChange;
    },
    get onResourceReorder() {
      return options.onResourceReorder;
    },
    get canReorderResource() {
      return options.canReorderResource;
    },
    get onResourceReorderReject() {
      return options.onResourceReorderReject;
    },
  };

  // ---- derived state -----------------------------------------------------
  const scale = createMemo(() => options.scale ?? internalScale());
  // compare by value: a freshly built but equal controlled date must not
  // recompute the axis on every parent update
  const date = createMemo(() => options.date ?? internalDate(), undefined, {
    equals: (a, b) => a.getTime() === b.getTime(),
  });
  const events = createMemo(() => options.events ?? internalEvents());
  const selection = createMemo(() => options.selection ?? internalSelection());
  const interactions = createMemo<GanttInteractions>(() =>
    options.interactions
      ? { ...DEFAULT_INTERACTIONS, ...options.interactions }
      : internalInteractions(),
  );

  const rangeOpts = () => ({
    timeZone: settings.timeZone,
    weekStartsOn: settings.weekStartsOn,
  });
  const baseRanges = createMemo(() => getGanttDateRange(scale(), date(), rangeOpts()));
  const activeRange = createMemo(() => baseRanges().activeRange, undefined, { equals: sameRange });
  // Infinite scroll: widen by whole periods; the anchor period stays put
  const visibleRange = createMemo(
    () => {
      const base = baseRanges().visibleRange;
      const { before, after } = rangeWindow();
      if (before === 0 && after === 0) return base;
      const anchor = date();
      const current = scale();
      const opts = rangeOpts();
      let earlier = anchor;
      for (let i = 0; i < before; i++) {
        earlier = stepGanttDate(current, earlier, -1, opts);
      }
      let later = anchor;
      for (let i = 0; i < after; i++) {
        later = stepGanttDate(current, later, 1, opts);
      }
      return {
        start: getGanttDateRange(current, earlier, opts).visibleRange.start,
        end: getGanttDateRange(current, later, opts).visibleRange.end,
      };
    },
    undefined,
    { equals: sameRange },
  );

  const state: GanttState<TData> = {
    get scale() {
      return scale();
    },
    get date() {
      return date();
    },
    get visibleRange() {
      return visibleRange();
    },
    get activeRange() {
      return activeRange();
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
    get viewportCenter() {
      return viewportCenter();
    },
  };

  const getState = () => state;

  const index = createMemo<GanttIndex<TData>>(() =>
    buildEventIndex(events(), visibleRange(), {
      timeZone: settings.timeZone,
      eventOrder,
      getOccurrences: settings.getOccurrences,
    }),
  );
  const getIndex = () => index();

  // ---- commits -----------------------------------------------------------
  /**
   * Navigating re-anchors the axis: drop any infinite-scroll growth and let
   * the title follow the anchor again until the user scrolls.
   */
  const resetAnchorWindow = () => {
    setRangeWindow((prev) =>
      prev.before === 0 && prev.after === 0 ? prev : { before: 0, after: 0 },
    );
    setViewportCenterState(null);
    lastAnchorChangeWasSlide = false;
  };

  const commitDate = (value: Date) => {
    // value-equal sets are no-ops: they must not drop infinite-scroll growth
    // for a navigation that never happened
    if (untrack(date).getTime() === value.getTime()) return;
    resetAnchorWindow();
    if (options.date === undefined) setInternalDate(value);
    options.onDateChange?.(value);
  };

  const commitScale = (value: GanttScale) => {
    if (untrack(scale) === value) return;
    resetAnchorWindow();
    if (options.scale === undefined) setInternalScale(value);
    options.onScaleChange?.(value);
  };

  const commitEvents = (value: GanttEvent<TData>[]) => {
    if (options.events === undefined) setInternalEvents(value);
    options.onEventsChange?.(value);
  };

  const commitSelection = (value: GanttSelection) => {
    if (options.selection === undefined) setInternalSelection(value);
    options.onSelectionChange?.(value);
  };

  const commitInteractions = (value: GanttInteractions) => {
    if (options.interactions === undefined) setInternalInteractions(value);
    options.onInteractionsChange?.(value);
  };

  const applyProposedUpdate = (
    update: GanttProposedUpdate<TData>,
    // extra non-timing fields committed in the SAME events emission: a second
    // commit pass would read stale controlled options.events and emit an
    // array without the timing change
    extra?: Partial<GanttEvent<TData>>,
  ): boolean => {
    const result = settings.onEventUpdate?.(update);
    if (result === false) return false;
    const adjusted: Partial<GanttEvent<TData>> =
      result && typeof result === "object"
        ? {
            start: result.start ?? update.start,
            end: result.end ?? update.end,
            allDay: result.allDay ?? update.allDay,
          }
        : { start: update.start, end: update.end, allDay: update.allDay };
    if (update.resourceId !== undefined) adjusted.resourceId = update.resourceId;
    const merged = extra ? { ...extra, ...adjusted } : adjusted;
    const next = untrack(events).map((event) =>
      event.id === update.event.id ? { ...event, ...merged } : event,
    );
    commitEvents(next);
    return true;
  };

  /** Anchor clamp: navigation may never leave the configured bounds. */
  const clampToBounds = (value: Date): Date => {
    const bounds = settings.rangeBounds;
    if (!bounds) return value;
    if (bounds.min && value.getTime() < bounds.min.getTime()) return bounds.min;
    if (bounds.max && value.getTime() > bounds.max.getTime()) return bounds.max;
    return value;
  };

  const api: GanttApi<TData> = {
    next() {
      commitDate(
        clampToBounds(
          stepGanttDate(untrack(scale), untrack(date), 1, {
            timeZone: settings.timeZone,
          }),
        ),
      );
    },
    prev() {
      commitDate(
        clampToBounds(
          stepGanttDate(untrack(scale), untrack(date), -1, {
            timeZone: settings.timeZone,
          }),
        ),
      );
    },
    today() {
      commitDate(clampToBounds(new Date()));
    },
    goTo(value) {
      commitDate(clampToBounds(value));
    },
    setScale(value) {
      commitScale(value);
    },
    getEvents() {
      return events();
    },
    getEvent(id) {
      return events().find((event) => event.id === id);
    },
    setEvents(value) {
      commitEvents(value);
    },
    addEvent(event) {
      commitEvents([...untrack(events), event]);
    },
    updateEvent(id, patch) {
      const event = untrack(events).find((candidate) => candidate.id === id);
      if (!event) return;
      const merged = { ...event, ...patch };
      const timingChanged =
        patch.start !== undefined || patch.end !== undefined || patch.allDay !== undefined;
      if (timingChanged && settings.onEventUpdate) {
        // timing + rest commit as ONE events emission (a rejected update
        // drops the whole patch, same as before)
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
          Object.keys(rest).length > 0 ? rest : undefined,
        );
        return;
      }
      commitEvents(untrack(events).map((candidate) => (candidate.id === id ? merged : candidate)));
    },
    removeEvent(id) {
      commitEvents(untrack(events).filter((event) => event.id !== id));
    },
    getOccurrences(range) {
      if (!range) return index().occurrences;
      const window = visibleRange();
      const within = range.start >= window.start && range.end <= window.end;
      if (within) {
        return index().occurrences.filter((occ) => eventsOverlap(occ, range));
      }
      return buildEventIndex(events(), range, {
        timeZone: settings.timeZone,
        eventOrder,
        getOccurrences: settings.getOccurrences,
      }).occurrences;
    },
    findOverlapping({ start, end, excludeEventId }) {
      return api.getOccurrences({ start, end }).filter((occ) => occ.eventId !== excludeEventId);
    },
    select(partial) {
      const current = untrack(selection);
      commitSelection({
        eventKeys: partial.eventKeys ?? current.eventKeys,
        slot: partial.slot !== undefined ? partial.slot : current.slot,
      });
    },
    selectEvent(key, opts) {
      const current = untrack(selection);
      const eventKeys = opts?.additive
        ? current.eventKeys.includes(key)
          ? current.eventKeys.filter((k) => k !== key)
          : [...current.eventKeys, key]
        : [key];
      commitSelection({ ...current, eventKeys });
    },
    clearSelection() {
      commitSelection(EMPTY_SELECTION);
    },
    setInteractions(patch) {
      commitInteractions({ ...untrack(interactions), ...patch });
    },
    getVisibleRange() {
      return visibleRange();
    },
    getActiveRange() {
      return activeRange();
    },
    toZoned(value) {
      return toZoned(value, settings.timeZone);
    },
  };

  const internals: GanttInternals<TData> = {
    getIndex,
    setDrag(value) {
      setDragState(value);
    },
    setSlotDraft(value) {
      setSlotDraftState(value);
    },
    setViewportCenter(value) {
      setViewportCenterState(value);
    },
    applyProposedUpdate,
    extendRange(direction) {
      const window = untrack(visibleRange);
      const bounds = settings.rangeBounds;
      if (direction === "before" && bounds?.min && window.start.getTime() <= bounds.min.getTime()) {
        return false;
      }
      if (direction === "after" && bounds?.max && window.end.getTime() >= bounds.max.getTime()) {
        return false;
      }
      const cap = Math.max(1, settings.maxRangeWindow ?? MAX_RANGE_WINDOW);
      const { before, after } = untrack(rangeWindow);
      const grow = direction === "before" ? before < cap : after < cap;
      if (grow) {
        setRangeWindow(
          direction === "before" ? { before: before + 1, after } : { before, after: after + 1 },
        );
      } else {
        // window is at capacity: SLIDE the anchor one period instead, so
        // travel stays unbounded while the DOM stays bounded
        const next = stepGanttDate(untrack(scale), untrack(date), direction === "before" ? -1 : 1, {
          timeZone: settings.timeZone,
        });
        if (options.date !== undefined) {
          // controlled anchor: propose the slide; nothing changes until the
          // parent adopts it
          options.onDateChange?.(next);
          return false;
        }
        setInternalDate(next);
        lastAnchorChangeWasSlide = true;
        options.onDateChange?.(next);
      }
      return true;
    },
    didAnchorSlide() {
      return lastAnchorChangeWasSlide;
    },
  };

  // A controlled anchor/scale change is a navigation too: drop the growth so
  // the parent's jump is not rendered on top of a stale window. Keyed by
  // VALUE - a freshly constructed but equal controlled date must not wipe
  // infinite-scroll growth on every parent update.
  const controlledAnchorKey = createMemo(
    () => `${options.date?.getTime() ?? ""}:${options.scale ?? ""}`,
  );
  createEffect(
    on(
      controlledAnchorKey,
      () => {
        setRangeWindow({ before: 0, after: 0 });
        lastAnchorChangeWasSlide = false;
      },
      { defer: true },
    ),
  );

  // onRangeChange fires once for the initial range, then on every change.
  createEffect(() => {
    const key = `${state.scale}:${getRangeKey(state.visibleRange)}:${settings.timeZone}`;
    if (!options.onRangeChange) return;
    if (key === lastEmittedRangeKey) return;
    lastEmittedRangeKey = key;
    untrack(() =>
      options.onRangeChange?.({
        range: state.visibleRange,
        activeRange: state.activeRange,
        scale: state.scale,
        date: state.date,
        timeZone: settings.timeZone,
      }),
    );
  });

  return { getState, api, settings, internals };
}

const GanttContext = createContext<GanttInstance<never> | null>(null);

/** The stable calendar instance; throws outside <Gantt>. */
function useGantt<TData = unknown>(): GanttInstance<TData> {
  const instance = useContext(GanttContext);
  if (!instance) {
    throw new Error("useGantt must be used within <Gantt>");
  }
  return instance as unknown as GanttInstance<TData>;
}

interface UseGanttSelectorOptions<TData, TSelected> {
  calendar?: GanttInstance<TData>;
  isEqual?: (a: TSelected, b: TSelected) => boolean;
}

/**
 * Derived accessor over the engine state, with equality memoization
 * (`Object.is` default). Solid's fine-grained reads replace the upstream
 * subscription: the returned accessor recomputes only when the state the
 * selector actually touched changes.
 */
function useGanttSelector<TData = unknown, TSelected = unknown>(
  selector: (state: GanttState<TData>) => TSelected,
  options?: UseGanttSelectorOptions<TData, TSelected>,
): Accessor<TSelected> {
  const contextInstance = useContext(GanttContext);
  const instance = options?.calendar ?? (contextInstance as unknown as GanttInstance<TData> | null);
  if (!instance) {
    throw new Error("useGanttSelector needs an <Gantt> ancestor or an explicit `calendar` option");
  }
  return createMemo(() => selector(instance.getState()), undefined, {
    equals: options?.isEqual ?? ((a, b) => Object.is(a, b)),
  });
}

interface GanttScaleState {
  scale: Accessor<GanttScale>;
  setScale: (scale: GanttScale) => void;
}

function useGanttScale(): GanttScaleState {
  const instance = useGantt();
  const state = instance.getState();
  return { scale: () => state.scale, setScale: instance.api.setScale };
}

interface GanttNavigationState {
  date: Accessor<Date>;
  /** i18n.functions.formatTitle output for the current view. */
  title: Accessor<string>;
  visibleRange: Accessor<GanttDateRange>;
  activeRange: Accessor<GanttDateRange>;
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Date) => void;
  /** True when the anchor period contains now in the display time zone. */
  isToday: Accessor<boolean>;
}

function useGanttNavigation(): GanttNavigationState {
  const instance = useGantt();
  const { settings } = instance;
  const state = instance.getState();
  // The title names what you are LOOKING at: the visible-center period when
  // the view reports one, otherwise the anchor period.
  const titleDate = () => state.viewportCenter ?? state.date;
  const titleActive = () => {
    const center = state.viewportCenter;
    if (!center) return state.activeRange;
    return getGanttDateRange(state.scale, center, {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
    }).activeRange;
  };
  const title = createMemo(() =>
    settings.i18n.functions.formatTitle(state.scale, {
      date: toZoned(titleDate(), settings.timeZone),
      activeRange: titleActive(),
      visibleRange: state.visibleRange,
      locale: settings.locale,
    }),
  );
  return {
    date: () => state.date,
    title,
    visibleRange: () => state.visibleRange,
    activeRange: () => state.activeRange,
    next: instance.api.next,
    prev: instance.api.prev,
    today: instance.api.today,
    goTo: instance.api.goTo,
    isToday: () => {
      const now = new Date();
      return now >= state.activeRange.start && now < state.activeRange.end;
    },
  };
}

interface GanttSelectionState {
  selection: Accessor<GanttSelection>;
  select: (selection: Partial<GanttSelection>) => void;
  selectEvent: (key: string, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
}

function useGanttSelection(): GanttSelectionState {
  const instance = useGantt();
  const state = instance.getState();
  return {
    selection: () => state.selection,
    select: instance.api.select,
    selectEvent: instance.api.selectEvent,
    clearSelection: instance.api.clearSelection,
  };
}

interface GanttInteractionsState {
  interactions: Accessor<GanttInteractions>;
  setInteractions: (patch: Partial<GanttInteractions>) => void;
}

function useGanttInteractions(): GanttInteractionsState {
  const instance = useGantt();
  const state = instance.getState();
  return {
    interactions: () => state.interactions,
    setInteractions: instance.api.setInteractions,
  };
}

/** Expanded, sorted occurrences; defaults to the visible range. */
function useGanttOccurrences<TData = unknown>(
  range?: GanttDateRange,
): Accessor<GanttOccurrence<TData>[]> {
  const instance = useGantt<TData>();
  return createMemo(() => instance.api.getOccurrences(range));
}

interface GanttNodeSchedules<TData = unknown> {
  /** The node itself, or null when the id is not in the tree. */
  node: Accessor<GanttResource | null>;
  /** Cardinality in force for this node (its own override, else the default). */
  scheduleMode: Accessor<GanttScheduleMode>;
  /** The node's occurrences in the visible range, in axis order. */
  schedules: Accessor<GanttOccurrence<TData>[]>;
  /** Pairs of the node's schedules that overlap in time. */
  conflicts: Accessor<Array<[GanttOccurrence<TData>, GanttOccurrence<TData>]>>;
}

/**
 * Everything a consumer needs to MANAGE one node's schedules without
 * re-deriving layout: the node, its resolved cardinality, its schedules in
 * order, and the pairs that collide. Pure state - it renders nothing, so a
 * "manage schedules" panel is entirely the consumer's design.
 */
function useGanttNodeSchedules<TData = unknown>(
  nodeId: string | Accessor<string>,
): GanttNodeSchedules<TData> {
  const settings = useGanttSettings<TData>();
  const viewConfig = useGanttViewConfig<TData>();
  const occurrences = useGanttOccurrences<TData>();
  const id = () => (typeof nodeId === "function" ? nodeId() : nodeId);

  const node = createMemo(() => findResource(settings.resources, id()));
  const schedules = createMemo(() =>
    occurrences().filter((occurrence) => occurrence.event.resourceId === id()),
  );
  const conflicts = createMemo(() => {
    const pairs: Array<[GanttOccurrence<TData>, GanttOccurrence<TData>]> = [];
    const list = schedules();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (eventsOverlap(list[i], list[j])) {
          pairs.push([list[i], list[j]]);
        }
      }
    }
    return pairs;
  });
  return {
    node,
    scheduleMode: () => resolveScheduleMode(node(), viewConfig.scheduleMode),
    schedules,
    conflicts,
  };
}

/** Resolved settings incl. merged i18n; every property read is reactive. */
function useGanttSettings<TData = unknown>(): GanttSettings<TData> {
  return useGantt<TData>().settings;
}

interface GanttClassNames {
  nav?: string;
  toolbar?: string;
  /** The gantt body (tree + track). */
  view?: string;
  event?: string;
}

/** Row context handed to tree-panel column and label renderers. */
interface GanttColumnContext {
  resource: GanttResource;
  depth: number;
  isGroup: boolean;
  collapsed: boolean;
}

/** One extra tree-panel column after the built-in name column. */
interface GanttColumn {
  /** Stable id; doubles as the default header label. */
  id: string;
  /** Header label. */
  title?: JSX.Element;
  /** Fixed column width in px. Default 96. */
  width?: number;
  /** Cell content alignment. Default "start". */
  align?: "start" | "center" | "end";
  /** Cell content per row; omit or return null for an empty cell. */
  render?: (ctx: GanttColumnContext) => JSX.Element;
  /** Extra classes on every cell of this column (header included). */
  class?: string;
}

/** Pointer-activation thresholds; unset keys keep the dnd-kit parity defaults. */
interface GanttActivationConfig {
  /** Mouse travel (px) before a bar move starts. Default 5. */
  moveDistancePx?: number;
  /** Mouse travel (px) before a drag-create starts. Default 4. */
  createDistancePx?: number;
  /** Touch long-press delay in ms. Default 250. */
  touchDelayMs?: number;
  /** Touch movement tolerance (px) during the long-press. Default 5. */
  touchTolerancePx?: number;
}

/** A gridline: false to hide it, true for the default solid stroke, or a style. */
type GanttGridLine = boolean | "solid" | "dashed";

interface GanttTimelineLines {
  /** Unit boundary lines running down the timeline. Default solid. */
  vertical?: GanttGridLine;
  /** Row separator lines running across the timeline. Default solid. */
  horizontal?: GanttGridLine;
}

/** Resolved stroke per axis; null means the axis draws nothing. */
interface GanttResolvedLines {
  vertical: "solid" | "dashed" | null;
  horizontal: "solid" | "dashed" | null;
}

/**
 * One place decides what the grid draws, so the header lines, the body lines
 * and the row separators can never disagree.
 */
function resolveTimelineLines(
  value: GanttTimelineLines | "vertical" | "both" | "none" | undefined,
): GanttResolvedLines {
  if (value === "none") return { vertical: null, horizontal: null };
  if (value === "vertical") return { vertical: "solid", horizontal: null };
  if (value === "both" || value === undefined) {
    return { vertical: "solid", horizontal: "solid" };
  }
  const stroke = (line: GanttGridLine | undefined) =>
    line === false ? null : line === true || line === undefined ? "solid" : line;
  return {
    vertical: stroke(value.vertical),
    horizontal: stroke(value.horizontal),
  };
}

/** Layout metrics (rem unless noted); every knob falls back to its default. */
interface GanttMetrics {
  /** Height of one schedule bar. Default 1.25. */
  laneHeight?: number;
  /** Gap between stacked schedules in one node. Default 0.1875. */
  laneGap?: number;
  /**
   * Vertical inset between the row's edges and its block of schedules - the
   * breathing room around the stack, kept separate from laneGap so schedules
   * in one node can sit tight without cramping the row. Default 0.5.
   */
  rowPadding?: number;
  /** Minimum row height. Default 2.5. */
  minRowHeight?: number;
  /** barLabel "auto" flips the title outside below this bar width. Default 7. */
  autoLabelMin?: number;
  /** Unit width at zoom 1, per scale. Day scale = width per interval unit. */
  unitWidths?: Partial<Record<GanttScale, number>>;
  /** Minimum timeline pane width in px. Default 200. */
  minTimelineWidth?: number;
  /** Scroll distance (px) from an edge that grows the range. Default 160. */
  infiniteScrollEdge?: number;
}

/** Live gesture snapshot handed to the drag/resize indicator render props. */
interface GanttDragIndicatorProps<TData = unknown> {
  occurrence: GanttOccurrence<TData>;
  kind: "move" | "resize-start" | "resize-end";
  /** Proposed (snapped) range of the current gesture step. */
  start: Date;
  end: Date;
  valid: boolean;
}

/** Slot handed to a custom schedule-hint renderer. */
interface GanttScheduleHintProps {
  start: Date;
  end: Date;
  resource: GanttResource;
}

/** Parent rollup handed to a custom summary renderer. */
interface GanttSummaryProps {
  resource: GanttResource;
  start: Date;
  end: Date;
  progress: number | null;
}

/** Left tree-panel sizing and splitter behavior. */
interface GanttTreePanelConfig {
  /** Initial panel width in px. Default 288. */
  width?: number;
  /** Splitter lower bound in px. Default 180. */
  minWidth?: number;
  /** Splitter upper bound in px. Default 640. */
  maxWidth?: number;
  /** Drag/keyboard splitter between the panels. Default true. */
  resizable?: boolean;
  /** Width of the sticky name column in px. Default 208. */
  nameColumnWidth?: number;
  /** Fires after any user resize (drag release, keyboard, double-click reset). */
  onWidthChange?: (width: number) => void;
}

interface GanttRenderEventProps<TData = unknown> {
  occurrence: GanttOccurrence<TData>;
  segment: GanttSegment<TData>;
  isDragging: boolean;
  isSelected: boolean;
}

/**
 * View-layer configuration: display props and render overrides. These live on
 * <Gantt> (and per-view components), never in the headless options.
 */
interface GanttViewConfig<TData = unknown> {
  /** Red now-line on the axis. */
  nowIndicator: boolean;
  /**
   * Day-scale unit interval in minutes: axis units and gridlines follow it.
   */
  interval: number;
  /**
   * Scroll implementation for the gantt body: "custom" (default, shadcn
   * ScrollArea) or "native" (browser scrollbars via overflow auto).
   */
  scrollbars: "custom" | "native";
  /**
   * Placement hint over empty timeline track: a validated, snapped tile that
   * opens the schedule flow (onSlotClick, else onSelectSlot) at that day.
   * Works on every scale. Default off.
   */
  displayScheduleHint: boolean;
  /**
   * Where the viewport opens. `"now"` (default) centres the current instant
   * when the anchor period contains it and falls back to the anchor; `"anchor"`
   * always centres the anchor; a Date centres that instant.
   *
   * Only `"now"` follows the wall clock - which is right for a live board and
   * wrong for a demo or a report, whose opening composition must not depend on
   * the hour it is viewed at. Those pass an explicit instant.
   */
  initialCenter: "now" | "anchor" | Date;
  /**
   * Empty-track presses on schedulable rows start a drag-create gesture that
   * commits through onSelectSlot. Default off: the whole panel drags-to-pan
   * instead, and scheduling flows through the hint tile / onSlotClick.
   */
  dragCreate: boolean;
  /**
   * "Add task" affordance at the foot of the tree that opens the create-task
   * flow (onCreateTask). Shown only when canCreateTask allows it. Default off.
   */
  displayCreateTaskHint: boolean;
  /** Floating zoom in/out control over the track. Default on. */
  zoomControl: boolean;
  /**
   * Ctrl/Cmd + wheel over the timeline zooms the time range, anchored on the
   * pointer. Trackpad pinch arrives as the same event (browsers set ctrlKey
   * on it), so this is also the pinch-to-zoom switch. Default on. The gesture
   * is handed back to the browser at the zoom limits, so page zoom still
   * works there.
   */
  wheelZoom: boolean;
  /** Nav button variant; all nav buttons follow it. Default "ghost". */
  navButtonVariant: "ghost" | "outline" | "secondary" | "default";
  /** Nav button size; icon buttons use the icon twin. Default "sm". */
  navButtonSize: "sm" | "default";
  /**
   * Off-day (non-working day) marking on day/week/month scales. true =
   * weekends with a muted background; a config object customizes weekdays,
   * explicit dates, a predicate, and the marker class.
   */
  offDays?: boolean | GanttOffDaysConfig;
  /**
   * Extra tree-panel columns after the built-in name column. The tree panel
   * scrolls horizontally when the columns outgrow it; the name column stays
   * pinned.
   */
  columns?: GanttColumn[];
  /**
   * Consumer slot pinned at the end of the tree-panel header - the intended
   * home for an add/remove-columns dropdown menu.
   */
  columnsMenu?: JSX.Element;
  /** Tree-panel width, splitter bounds, and resizability. */
  treePanel?: GanttTreePanelConfig;
  /**
   * Timeline gridlines. The object form controls the two axes independently
   * and gives each its own stroke: `{ vertical: "dashed", horizontal: true }`.
   * An omitted axis stays on and solid. `true` means solid.
   *
   * The three legacy shorthands still work: "none" (bare), "vertical" (unit
   * boundaries only, rows separated by whitespace) and "both" (adds row
   * separators).
   */
  timelineLines: GanttTimelineLines | "vertical" | "both" | "none";
  /**
   * Bar title placement: "inside" (default) renders it in the bar, "outside"
   * beside the bar, "auto" moves it outside only when the bar is too short.
   */
  barLabel: "inside" | "outside" | "auto";
  /** Edge chips that scroll to bars outside the visible timeline. Default true. */
  offscreenIndicators: boolean;
  /**
   * Extend the timeline into the past/future while scrolling near an edge
   * (the anchor period stays the nav title). Default true.
   */
  infiniteScroll: boolean;
  /** Zoom bounds and button step for the floating control. Default 0.5 - 3, step 0.25. */
  zoomRange?: { min?: number; max?: number; step?: number };
  /** Layout metric overrides (row/lane/unit geometry, thresholds). */
  metrics?: GanttMetrics;
  /** Sticky nav bar (same contract as the event calendar). Default false. */
  stickyNav: boolean;
  /**
   * Leaf-row selection checkboxes in the tree panel. Default true;
   * uncontrolled unless selectedRows is passed.
   */
  rowCheckboxes: boolean;
  /** Controlled selected row ids; pairs with onSelectedRowsChange. */
  selectedRows?: string[];
  onSelectedRowsChange?: (ids: string[]) => void;
  /** Controlled collapsed group ids; pairs with onCollapsedGroupsChange. */
  collapsedGroups?: string[];
  /** Initial collapsed group ids (uncontrolled). */
  defaultCollapsedGroups?: string[];
  onCollapsedGroupsChange?: (ids: string[]) => void;
  /** Controlled zoom multiplier; pairs with onZoomChange. */
  zoom?: number;
  /** Initial zoom multiplier (uncontrolled). Default 1. */
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  /**
   * Allow drag-create and slot clicks on rows that have children. Default
   * false: parents aggregate their subtree instead of owning bars.
   */
  parentScheduling: boolean;
  /**
   * Rollup strips on parent rows without bars of their own: the envelope of
   * descendant bars with duration-weighted progress. Default true.
   */
  summaryBars: boolean;
  /**
   * How many schedules a tree node may hold. "multiple" (default) stacks
   * concurrent schedules into stable lanes and grows the row; "single" keeps
   * one track per node - the task-gantt shape. Any node can override it with
   * its own `scheduleMode`.
   */
  scheduleMode: GanttScheduleMode;
  /**
   * Vertical placement of a row's content once a node holds several lanes.
   * "start" (default) keeps the tree label on the baseline of the FIRST
   * schedule; "center" centers both against the grown row.
   */
  rowAlign: GanttRowAlign;
  classNames?: GanttClassNames;
  renderEvent?: (props: GanttRenderEventProps<TData>) => JSX.Element;
  /**
   * Right-click menu for a bar: return ContextMenu items (the primitive wraps
   * every bar in a ContextMenu and renders this as its content). Read the
   * occurrence for the subject and drive actions through the gantt api
   * (useGantt) or your own state - fully headless. Omit for no menu.
   */
  renderEventMenu?: (props: GanttRenderEventProps<TData>) => JSX.Element;
  /**
   * Tree-node label. Receives the resource with its tree position; return
   * any rich content (icons, badges). Default is the plain title.
   */
  renderResourceLabel?: (props: {
    resource: GanttResource;
    depth: number;
    isGroup: boolean;
    collapsed: boolean;
  }) => JSX.Element;
  /**
   * Right-click menu for a tree row (same contract as renderEventMenu):
   * return ContextMenu items and drive actions through your own state.
   */
  renderResourceMenu?: (ctx: GanttColumnContext) => JSX.Element;
  /** Rendered in the timeline body when there are no resources. */
  renderNoResources?: () => JSX.Element;
  /**
   * Replaces the smooth cursor-following MOVE clone. Content is Solid JSX and
   * re-renders per snap step; the gantt owns the fixed wrapper and writes
   * its position imperatively per pointermove.
   */
  renderDragPreview?: (props: GanttDragIndicatorProps<TData>) => JSX.Element;
  /**
   * Replaces the RESIZE edge line + status chip. Same positioning contract
   * as renderDragPreview: your content, gantt-owned cursor tracking.
   */
  renderResizeIndicator?: (props: GanttDragIndicatorProps<TData>) => JSX.Element;
  /**
   * Replaces the schedule-hint tile + bubble. Rendered inside the snapped,
   * validated, pointer-transparent wrapper: set pointer-events-auto on your
   * clickable parts and drive your own create flow from the slot.
   */
  renderScheduleHint?: (props: GanttScheduleHintProps) => JSX.Element;
  /** Replaces the parent rollup strip (the positioned wrapper stays gantt-owned). */
  renderSummary?: (props: GanttSummaryProps) => JSX.Element;
  /**
   * Replaces the rollup MATH: return 0-100 (or null to hide) for a group
   * from its descendant events. Default: duration-weighted mean progress.
   */
  getSummaryProgress?: (ctx: {
    resource: GanttResource;
    events: GanttEvent<TData>[];
  }) => number | null;
}

const DEFAULT_VIEW_CONFIG: GanttViewConfig = {
  nowIndicator: true,
  interval: 60,
  scrollbars: "custom",
  displayScheduleHint: false,
  initialCenter: "now",
  displayCreateTaskHint: false,
  dragCreate: false,
  zoomControl: true,
  wheelZoom: true,
  navButtonVariant: "ghost",
  navButtonSize: "sm",
  timelineLines: "vertical",
  barLabel: "inside",
  offscreenIndicators: true,
  infiniteScroll: true,
  stickyNav: false,
  rowCheckboxes: true,
  parentScheduling: false,
  summaryBars: true,
  scheduleMode: "multiple",
  rowAlign: "start",
};

const GanttViewConfigContext = createContext<GanttViewConfig<never>>(
  DEFAULT_VIEW_CONFIG as GanttViewConfig<never>,
);

/** Root-level display props + render overrides, for view components. */
function useGanttViewConfig<TData = unknown>(): GanttViewConfig<TData> {
  return useContext(GanttViewConfigContext) as unknown as GanttViewConfig<TData>;
}

const VIEW_CONFIG_KEYS: Array<keyof GanttViewConfig> = [
  "nowIndicator",
  "interval",
  "scrollbars",
  "displayScheduleHint",
  "initialCenter",
  "displayCreateTaskHint",
  "dragCreate",
  "zoomControl",
  "wheelZoom",
  "navButtonVariant",
  "navButtonSize",
  "offDays",
  "columns",
  "columnsMenu",
  "treePanel",
  "metrics",
  "timelineLines",
  "barLabel",
  "offscreenIndicators",
  "infiniteScroll",
  "zoomRange",
  "stickyNav",
  "rowCheckboxes",
  "selectedRows",
  "onSelectedRowsChange",
  "collapsedGroups",
  "defaultCollapsedGroups",
  "onCollapsedGroupsChange",
  "zoom",
  "defaultZoom",
  "onZoomChange",
  "parentScheduling",
  "summaryBars",
  "scheduleMode",
  "rowAlign",
  "classNames",
  "renderEvent",
  "renderEventMenu",
  "renderResourceLabel",
  "renderResourceMenu",
  "renderNoResources",
  "renderDragPreview",
  "renderResizeIndicator",
  "renderScheduleHint",
  "renderSummary",
  "getSummaryProgress",
];

const OPTION_KEYS: Array<keyof UseGanttStateOptions> = [
  "events",
  "defaultEvents",
  "scale",
  "defaultScale",
  "date",
  "defaultDate",
  "selection",
  "defaultSelection",
  "interactions",
  "defaultInteractions",
  "loading",
  "timeZone",
  "locale",
  "weekStartsOn",
  "slotDuration",
  "snapDuration",
  "i18n",
  "rangeBounds",
  "activation",
  "maxRangeWindow",
  "resources",
  "overlap",
  "getEventPriority",
  "eventOrder",
  "getOccurrences",
  "onEventClick",
  "onEventDoubleClick",
  "onEventUpdate",
  "canDropEvent",
  "onSlotClick",
  "onSelectSlot",
  "canSelectSlot",
  "onCreateTask",
  "canCreateTask",
  "onResourceClick",
  "onResourceDoubleClick",
  "onRangeChange",
  "onScaleChange",
  "onDateChange",
  "onSelectionChange",
  "onInteractionsChange",
  "onEventsChange",
  "onResourceReorder",
  "onResourceReorderReject",
  "canReorderResource",
];

interface GanttProps<TData = unknown>
  extends UseGanttStateOptions<TData>,
    Partial<GanttViewConfig<TData>>,
    // `onSelectionChange` is the gantt callback, not the DOM selectionchange
    // handler Solid types on every element.
    Omit<ComponentProps<"div">, "children" | "onSelectionChange"> {
  /** Adopt a hoisted useGanttState instance; option props are then ignored. */
  calendar?: GanttInstance<TData>;
  /** Imperative escape hatch usable from outside the tree; called on mount. */
  apiRef?: (api: GanttApi<TData>) => void;
  children?: JSX.Element;
}

/**
 * Root provider + container. Composition contract:
 * <Gantt><GanttNav/><GanttToolbar/><GanttView/></Gantt>
 */
function Gantt<TData = unknown>(props: GanttProps<TData>) {
  const [local, optionProps, viewProps, rest] = splitProps(
    props as GanttProps,
    ["calendar", "apiRef", "class", "children"],
    OPTION_KEYS,
    VIEW_CONFIG_KEYS,
  );

  // mergeProps keeps a stable identity AND lazy reads: the upstream
  // "hand out the previous object" ref dance is unnecessary in Solid.
  const viewConfig = mergeProps(
    DEFAULT_VIEW_CONFIG,
    viewProps,
  ) as unknown as GanttViewConfig<never>;

  if (local.calendar && OPTION_KEYS.some((key) => optionProps[key] !== undefined)) {
    warnOnce(
      "calendar-and-options",
      "both `calendar` and option props were passed; option props are ignored when adopting an instance.",
    );
  }

  const own = local.calendar
    ? undefined
    : useGanttState<TData>(optionProps as UseGanttStateOptions<TData>);
  const instance = (local.calendar ?? own) as GanttInstance<TData>;

  onMount(() => local.apiRef?.(instance.api));

  return (
    <GanttContext.Provider value={instance as unknown as GanttInstance<never>}>
      <GanttViewConfigContext.Provider value={viewConfig}>
        <div
          data-slot="gantt"
          {...rest}
          // own the foreground (previews and consumer shells may not set body
          // color) and the type scale: every gantt label inherits the root's
          // text size, so one class here (or on the consumer's class) rescales
          // the whole component - e.g. class="text-sm" for a roomier grid
          class={cn("text-foreground flex min-h-0 min-w-0 flex-col text-xs", local.class)}
        >
          {local.children}
          <div data-slot="gantt-announcer" aria-live="polite" class="sr-only" />
        </div>
      </GanttViewConfigContext.Provider>
    </GanttContext.Provider>
  );
}

export type {
  GanttActivationConfig,
  GanttApi,
  GanttCallbacks,
  GanttClassNames,
  GanttColumn,
  GanttColumnContext,
  GanttDragIndicatorProps,
  GanttGridLine,
  GanttInstance,
  GanttInteractionsState,
  GanttInternals,
  GanttMetrics,
  GanttNavigationState,
  GanttNodeSchedules,
  GanttProps,
  GanttRenderEventProps,
  GanttResolvedLines,
  GanttScaleState,
  GanttScheduleHintProps,
  GanttSelectionState,
  GanttSettings,
  GanttSummaryProps,
  GanttTimelineLines,
  GanttTreePanelConfig,
  GanttViewConfig,
  UseGanttSelectorOptions,
  UseGanttStateOptions,
};
export {
  DEFAULT_ROW_ALIGN,
  DEFAULT_SCHEDULE_MODE,
  DEFAULT_VIEW_CONFIG,
  Gantt,
  GanttContext,
  GanttViewConfigContext,
  resolveScheduleMode,
  resolveTimelineLines,
  useGantt,
  useGanttInteractions,
  useGanttNavigation,
  useGanttNodeSchedules,
  useGanttOccurrences,
  useGanttScale,
  useGanttSelection,
  useGanttSelector,
  useGanttSettings,
  useGanttState,
  useGanttViewConfig,
};
