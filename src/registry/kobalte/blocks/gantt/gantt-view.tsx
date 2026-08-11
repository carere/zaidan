import {
  addDays,
  addMinutes,
  addMonths,
  format,
  getWeek,
  type Locale,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-solid";
import type { Accessor, ComponentProps } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { ScrollArea, ScrollBar } from "@/registry/kobalte/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/kobalte/ui/tooltip";
import {
  resolveScheduleMode,
  resolveTimelineLines,
  useGantt,
  useGanttSelector,
  useGanttSettings,
  useGanttViewConfig,
} from "./gantt";
import type { GanttPointerEvent } from "./gantt-dnd";
import { cancelActiveGanttGestures, markGestureEnd, useGanttGestureTeardown } from "./gantt-dnd";
import type { GanttLaneMemo } from "./gantt-lib";
import {
  getDayKey,
  getLaneKey,
  getRangeKey,
  packTimedSegments,
  reorderResources,
  resolveOffDay,
  toZoned,
  zonedStartOfDay,
} from "./gantt-lib";
import type {
  GanttDateRange,
  GanttEvent,
  GanttOccurrence,
  GanttResource,
  GanttResourceReorder,
  GanttSegment,
} from "./gantt-types";
import type {
  HintStop,
  TimelineGroup,
  TimelineReorderState,
  TimelineRow,
  TimelineRowBars,
  TimelineUnit,
} from "./gantt-view-lib";
import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_TREE_PANEL,
  DEFAULT_ZOOM_RANGE,
  getPaneViewport,
  getScrollStart,
  INFINITE_EDGE_PX,
  LANE_GAP_REM,
  LANE_HEIGHT_REM,
  lowestFreeLane,
  MIN_TIMELINE_WIDTH,
  ROW_PADDING_REM,
  setScrollStart,
  trackPoint,
  useNow,
  useTodayKey,
} from "./gantt-view-lib";
import { GanttTimelineRow, GanttTreeRow } from "./gantt-view-rows";

interface GanttViewProps extends ComponentProps<"div"> {
  /** Day-scale unit interval in minutes; defaults to the interval view config. */
  interval?: number;
}

function GanttView(props: GanttViewProps) {
  const [local, others] = splitProps(props, ["class", "interval"]);
  const instance = useGantt();
  const settings = useGanttSettings();
  const viewConfig = useGanttViewConfig();
  const range = useGanttSelector<unknown, GanttDateRange>((state) => state.visibleRange, {
    isEqual: (a, b) => getRangeKey(a) === getRangeKey(b),
  });
  const occurrences = useGanttSelector<unknown, GanttOccurrence[]>(
    () => instance.api.getOccurrences(),
    {
      calendar: instance,
      isEqual: (a, b) =>
        a.length === b.length &&
        a.every(
          (occ, i) =>
            occ.key === b[i]?.key &&
            occ.start.getTime() === b[i]?.start.getTime() &&
            occ.end.getTime() === b[i]?.end.getTime() &&
            occ.event === b[i]?.event,
        ),
    },
  );

  // Tree expand/collapse: controlled (collapsedGroups/onCollapsedGroupsChange)
  // or uncontrolled (defaultCollapsedGroups) - same pattern as selectedRows.
  const [internalCollapsed, setInternalCollapsed] = createSignal<string[]>(
    viewConfig.defaultCollapsedGroups ?? [],
  );
  const collapsedIds = () => viewConfig.collapsedGroups ?? internalCollapsed();
  const collapsedGroups = createMemo(() => new Set(collapsedIds()));

  const scale = useGanttSelector((state) => state.scale);
  const interval = () => Math.min(Math.max(local.interval ?? viewConfig.interval, 15), 240);
  // Every layout metric is consumer-overridable; unset keys keep defaults.
  const laneHeightRem = () => viewConfig.metrics?.laneHeight ?? LANE_HEIGHT_REM;
  const rowPaddingRem = () => viewConfig.metrics?.rowPadding ?? ROW_PADDING_REM;
  const laneGapRem = () => viewConfig.metrics?.laneGap ?? LANE_GAP_REM;
  const minRowRem = () => viewConfig.metrics?.minRowHeight ?? 2.5;
  const minTimelineWidth = () => viewConfig.metrics?.minTimelineWidth ?? MIN_TIMELINE_WIDTH;
  const infiniteEdgePx = () => viewConfig.metrics?.infiniteScrollEdge ?? INFINITE_EDGE_PX;
  const timeZone = () => settings.timeZone;
  const rangeStartMs = () => range().start.getTime();
  const rangeEndMs = () => range().end.getTime();
  const rangeKey = () => getRangeKey(range());
  const snapMin = () => (scale() === "day" ? settings.snapDuration : 24 * 60);
  // day-granular time input so the today highlight rolls over at midnight
  // without the whole grid recomputing on the 30s now tick
  const todayDayKey = useTodayKey(timeZone);

  const rows = createMemo(() => {
    const result: TimelineRow[] = [];
    const collapsed = collapsedGroups();
    const walk = (resources: GanttResource[], depth: number, parentId: string | null) => {
      for (const resource of resources) {
        const isGroup = !!resource.children?.length;
        const isCollapsed = collapsed.has(resource.id);
        result.push({ resource, parentId, depth, isGroup, collapsed: isCollapsed });
        if (isGroup && !isCollapsed)
          walk(resource.children as GanttResource[], depth + 1, resource.id);
      }
    };
    walk(settings.resources, 0, null);
    return result;
  });

  // Header model: bottom row = units, top row = grouping sectors.
  // Weights are proportional to REAL duration (a 23h/25h DST day differs from
  // its siblings), so weight-driven gridlines, ms-fraction bar geometry, and
  // the dnd pointer math all share one coordinate system.
  const axis = createMemo<{
    units: TimelineUnit[];
    groups: TimelineGroup[];
    unitWidthRem: number;
  }>(() => {
    const units: TimelineUnit[] = [];
    const groups: TimelineGroup[] = [];
    const metrics = viewConfig.metrics;
    const zone = timeZone();
    const endMs = rangeEndMs();
    const currentScale = scale();
    // day-start ms for the today window checks; recomputed when the day key
    // rolls over (this memo reads todayDayKey)
    const dayKey = todayDayKey();
    const todayStartMs = zonedStartOfDay(new Date(), zone).getTime();
    if (currentScale === "day") {
      const step = interval();
      const labelFormat = step % 60 === 0 ? settings.i18n.formats.timeGutter : "h:mm";
      // walk whole days: infinite scroll can extend the range past one day
      let dayCursor = zonedStartOfDay(range().start, zone);
      while (dayCursor.getTime() < endMs) {
        const zonedDay = toZoned(dayCursor, zone);
        const nextDay = zonedStartOfDay(addDays(zonedDay, 1), zone);
        const dayMinutes = (nextDay.getTime() - dayCursor.getTime()) / 60000;
        const dayOff = resolveOffDay(dayCursor, zone, viewConfig.offDays ?? true);
        let span = 0;
        for (let m = 0; m < dayMinutes; m += step) {
          const time = addMinutes(zonedDay, m);
          // a DST day whose minutes don't divide evenly leaves a short
          // final unit; its weight must be its REAL share or bars drift
          const weight = Math.min(step, dayMinutes - m) / step;
          units.push({
            key: `${getDayKey(dayCursor, zone)}-m${m}`,
            label: format(time, labelFormat, { locale: settings.locale }),
            ms: time.getTime(),
            weight,
            isOff: dayOff,
          });
          span += weight;
        }
        groups.push({
          key: getDayKey(dayCursor, zone),
          label: format(zonedDay, settings.i18n.formats.dayTitle, { locale: settings.locale }),
          span,
        });
        dayCursor = nextDay;
      }
      return {
        units,
        groups,
        unitWidthRem: metrics?.unitWidths?.day ?? Math.max(2.5, 5 * (step / 60)),
      };
    }
    if (currentScale === "quarter") {
      // units are week-aligned weeks (lib aligns the range), groups are months
      let cursor = zonedStartOfDay(range().start, zone);
      while (cursor.getTime() < endMs) {
        const zoned = toZoned(cursor, zone);
        const next = zonedStartOfDay(addDays(zoned, 7), zone);
        // real week duration / nominal week: 1 except across DST changes
        const weight = (next.getTime() - cursor.getTime()) / (7 * 24 * 60 * 60000);
        units.push({
          key: getDayKey(cursor, zone),
          label: format(zoned, "MMM d", { locale: settings.locale }),
          ms: cursor.getTime(),
          weight,
          isToday: todayStartMs >= cursor.getTime() && todayStartMs < next.getTime(),
        });
        const monthKey = format(zoned, "yyyy-MM");
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.key === monthKey) {
          lastGroup.span += weight;
        } else {
          groups.push({
            key: monthKey,
            label: format(zoned, "MMMM", { locale: settings.locale }),
            span: weight,
          });
        }
        cursor = next;
      }
      return { units, groups, unitWidthRem: metrics?.unitWidths?.quarter ?? 8 };
    }
    if (currentScale === "year") {
      // units are calendar months (weight = real duration), groups are quarters
      let cursor: Date = startOfMonth(toZoned(range().start, zone));
      while (cursor.getTime() < endMs) {
        const next = startOfMonth(addMonths(cursor, 1));
        // nominal-day units so a month reads ~30 wide; real ms keeps DST months true
        const weight = (next.getTime() - cursor.getTime()) / (24 * 60 * 60000);
        units.push({
          key: format(cursor, "yyyy-MM"),
          label: format(cursor, "MMM", { locale: settings.locale }),
          ms: cursor.getTime(),
          weight,
          isToday: todayStartMs >= cursor.getTime() && todayStartMs < next.getTime(),
        });
        const quarterStart = startOfQuarter(cursor);
        const quarterKey = format(quarterStart, "yyyy-QQQ");
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.key === quarterKey) {
          lastGroup.span += weight;
        } else {
          groups.push({
            key: quarterKey,
            label: format(quarterStart, "QQQ yyyy", { locale: settings.locale }),
            span: weight,
          });
        }
        cursor = next;
      }
      return { units, groups, unitWidthRem: metrics?.unitWidths?.year ?? 10 };
    }
    // week/month: units are days, groups are ISO-ish weeks
    let cursor = zonedStartOfDay(range().start, zone);
    while (cursor.getTime() < endMs) {
      const zoned = toZoned(cursor, zone);
      const nextDay = zonedStartOfDay(addDays(zoned, 1), zone);
      // real day duration / 24h: 1 except the 23h/25h DST days
      const weight = (nextDay.getTime() - cursor.getTime()) / (24 * 60 * 60000);
      units.push({
        key: getDayKey(cursor, zone),
        label: format(zoned, "EEE d", { locale: settings.locale }),
        ms: cursor.getTime(),
        weight,
        isToday: getDayKey(cursor, zone) === dayKey,
        isOff: resolveOffDay(cursor, zone, viewConfig.offDays ?? true),
      });
      // locale supplies firstWeekContainsDate so W-numbers match the locale's
      // week numbering (ISO in de/fr, US-style otherwise); the explicit
      // weekStartsOn keeps the number aligned with the rendered grid
      const weekNumber = getWeek(zoned, {
        locale: settings.locale,
        weekStartsOn: settings.weekStartsOn,
      });
      // key + label from the true week start: a range that begins midweek
      // must not split or mislabel its first group (incl. the Jan 1 week)
      const weekStart = startOfWeek(zoned, { weekStartsOn: settings.weekStartsOn });
      const weekKey = `w-${format(weekStart, "yyyy-MM-dd")}`;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === weekKey) {
        lastGroup.span += weight;
      } else {
        groups.push({
          key: weekKey,
          label: `${settings.i18n.labels.week(weekNumber)} ${format(weekStart, "MMM d", { locale: settings.locale })} - ${format(addDays(weekStart, 6), "d", { locale: settings.locale })}`,
          span: weight,
        });
      }
      cursor = nextDay;
    }
    return {
      units,
      groups,
      unitWidthRem: metrics?.unitWidths?.[currentScale] ?? (currentScale === "week" ? 10 : 4),
    };
  });

  const units = () => axis().units;
  const groups = () => axis().groups;

  // Zoom multiplies the minimum unit width; the flex track still fills when
  // the zoomed width is narrower than the pane. Controlled (zoom/onZoomChange)
  // or uncontrolled (defaultZoom) - same pattern as selectedRows.
  const zoomRange = () => ({ ...DEFAULT_ZOOM_RANGE, ...viewConfig.zoomRange });
  const clampZoom = (value: number) => {
    const bounds = zoomRange();
    return Math.min(Math.max(value, bounds.min), bounds.max);
  };
  const [internalZoom, setInternalZoom] = createSignal(viewConfig.defaultZoom ?? 1);
  const zoom = () => clampZoom(viewConfig.zoom ?? internalZoom());
  const setZoomValue = (next: number) => {
    const clamped = clampZoom(next);
    if (viewConfig.zoom === undefined) setInternalZoom(clamped);
    viewConfig.onZoomChange?.(clamped);
  };
  const canZoomIn = () => zoom() < zoomRange().max - 1e-9;
  const canZoomOut = () => zoom() > zoomRange().min + 1e-9;
  const trackRemWidth = () => units().length * axis().unitWidthRem * zoom();
  const trackWidth = () => `${trackRemWidth()}rem`;
  // unequal weights (year months, DST-containing day/week ranges) draw
  // boundaries from weight fractions instead of the uniform gradient
  const uniform = () => units().every((unit) => Math.abs(unit.weight - units()[0].weight) < 1e-9);
  const totalWeight = () => units().reduce((sum, unit) => sum + unit.weight, 0);
  /** Cumulative start/width fractions per unit, for backdrop stripes/lines. */
  const unitFractions = createMemo(() => {
    const total = totalWeight();
    let acc = 0;
    return units().map((unit) => {
      const start = acc / total;
      acc += unit.weight;
      return { unit, start, width: unit.weight / total };
    });
  });
  /** Snap a track fraction to its unit (hint preview target). */
  const resolveHintStop = (fraction: number): HintStop | null => {
    const fractions = unitFractions();
    for (let i = 0; i < fractions.length; i++) {
      const { unit, start, width } = fractions[i];
      if (fraction < start + width || i === fractions.length - 1) {
        return {
          index: i,
          center: start + width / 2,
          ms: unit.ms,
          endMs: fractions[i + 1]?.unit.ms ?? unit.ms,
        };
      }
    }
    return null;
  };

  /** Group boundary fractions; spans are in unit-weight terms everywhere. */
  const groupBoundaries = createMemo(() => {
    const fractions: number[] = [];
    const total = totalWeight();
    const list = groups();
    let acc = 0;
    for (let i = 0; i < list.length - 1; i++) {
      acc += list[i].span;
      fractions.push(acc / total);
    }
    return fractions;
  });
  /** Resource id -> every descendant id, for parent rollups. */
  const descendantIds = createMemo(() => {
    const map = new Map<string, string[]>();
    const walk = (resource: GanttResource): string[] => {
      const ids = (resource.children ?? []).flatMap((child) => [child.id, ...walk(child)]);
      map.set(resource.id, ids);
      return ids;
    };
    settings.resources.forEach(walk);
    return map;
  });

  // All events (not just visible occurrences) so parent rollup progress is
  // all-time and matches a consumer's own tree rollup, independent of scroll.
  const allEvents = useGanttSelector<unknown, GanttEvent[]>((state) => state.events);
  const subtreeProgress = createMemo(() => {
    const descendants = descendantIds();
    const events = allEvents();
    const rowList = rows();
    // consumer-owned rollup math: hand each group its descendant events
    if (viewConfig.getSummaryProgress) {
      const byResource = new Map<string, GanttEvent[]>();
      for (const ev of events) {
        if (!ev.resourceId) continue;
        const list = byResource.get(ev.resourceId);
        if (list) list.push(ev);
        else byResource.set(ev.resourceId, [ev]);
      }
      const map = new Map<string, number | null>();
      for (const row of rowList) {
        if (!row.isGroup) continue;
        const rowEvents: GanttEvent[] = [];
        for (const id of descendants.get(row.resource.id) ?? []) {
          const list = byResource.get(id);
          if (list) rowEvents.push(...list);
        }
        map.set(
          row.resource.id,
          viewConfig.getSummaryProgress({ resource: row.resource, events: rowEvents }),
        );
      }
      return map;
    }
    // default: one pass over events -> per-resource aggregates, then a cheap
    // descendant sum per group; never O(rows x events)
    const perResource = new Map<string, { weighted: number; total: number; saw: boolean }>();
    for (const ev of events) {
      if (!ev.resourceId) continue;
      let agg = perResource.get(ev.resourceId);
      if (!agg) {
        agg = { weighted: 0, total: 0, saw: false };
        perResource.set(ev.resourceId, agg);
      }
      const dur = Math.max(ev.end.getTime() - ev.start.getTime(), 1);
      agg.total += dur;
      if (typeof ev.progress === "number") {
        agg.saw = true;
        agg.weighted += ev.progress * dur;
      }
    }
    const map = new Map<string, number | null>();
    for (const row of rowList) {
      if (!row.isGroup) continue;
      let weighted = 0;
      let weightTotal = 0;
      let saw = false;
      for (const id of descendants.get(row.resource.id) ?? []) {
        const agg = perResource.get(id);
        if (!agg) continue;
        weightTotal += agg.total;
        if (agg.saw) {
          saw = true;
          weighted += agg.weighted;
        }
      }
      map.set(
        row.resource.id,
        saw && weightTotal > 0
          ? Math.min(Math.max(Math.round(weighted / weightTotal), 0), 100)
          : null,
      );
    }
    return map;
  });

  // Lane memory across layout passes, keyed by getLaneKey (event identity,
  // NOT the time-stamped occurrence key). It stores the TIMES alongside the
  // lane so the packer can tell the schedule the user just edited apart from
  // the ones that sat still: untouched schedules keep their lane, the edited
  // one re-seeks. Written during the memo below on purpose: the pass is
  // idempotent - feeding its own output back in produces the same assignment.
  let laneMemory = new Map<string, GanttLaneMemo>();

  // A drag-create in flight. Reduced to the three fields the layout needs, and
  // compared by value, so this re-runs only when the SNAPPED range moves - the
  // gesture engine already gates setSlotDraft on exactly that, so it is a
  // handful of recomputes per drag rather than one per frame.
  const draftLayout = useGanttSelector<
    unknown,
    { resourceId: string; startMs: number; endMs: number } | null
  >(
    (state) => {
      const slotDraft = state.slotDraft;
      if (!slotDraft?.resourceId) return null;
      return {
        resourceId: slotDraft.resourceId,
        startMs: slotDraft.start.getTime(),
        endMs: slotDraft.end.getTime(),
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.resourceId === b.resourceId &&
          a.startMs === b.startMs &&
          a.endMs === b.endMs),
    },
  );

  // Per-row packed bars, hoisted so the tree and timeline rows share heights.
  const baseRowBars = createMemo(() => {
    const map = new Map<string, TimelineRowBars>();
    // read the lanes the previous pass settled on, write the ones this pass
    // settles on; rebuilding (not mutating) prunes schedules that are gone
    const previousLanes = laneMemory;
    const nextLanes = new Map<string, GanttLaneMemo>();
    const startMs = rangeStartMs();
    const endMs = rangeEndMs();
    const totalMin = (endMs - startMs) / 60000;
    const laneHeight = laneHeightRem();
    const laneGap = laneGapRem();
    const rowPadding = rowPaddingRem();
    const minRow = minRowRem();
    const descendants = descendantIds();
    const progressByResource = subtreeProgress();
    const summaryBars = viewConfig.summaryBars;
    const scheduleMode = viewConfig.scheduleMode;
    // one pass: occurrences grouped by resource, plus per-resource envelopes
    // for the parent rollups (never O(rows x occurrences))
    const byResource = new Map<string, GanttOccurrence[]>();
    const envelopes = new Map<string, { fromMin: number; toMin: number }>();
    for (const occ of occurrences()) {
      const rid = occ.event.resourceId;
      if (!rid) continue;
      const list = byResource.get(rid);
      if (list) list.push(occ);
      else byResource.set(rid, [occ]);
      const fromMin = Math.max((occ.start.getTime() - startMs) / 60000, 0);
      const toMin = Math.min((occ.end.getTime() - startMs) / 60000, totalMin);
      const env = envelopes.get(rid);
      if (!env) {
        envelopes.set(rid, { fromMin, toMin });
      } else {
        env.fromMin = Math.min(env.fromMin, fromMin);
        env.toMin = Math.max(env.toMin, toMin);
      }
    }
    for (const row of rows()) {
      const mine = byResource.get(row.resource.id) ?? [];
      const segments: GanttSegment[] = mine.map((occurrence) => ({
        occurrence,
        day: new Date(startMs),
        isStart: occurrence.start.getTime() >= startMs,
        isEnd: occurrence.end.getTime() <= endMs,
        continuesBefore: occurrence.start.getTime() < startMs,
        continuesAfter: occurrence.end.getTime() > endMs,
        startMin: Math.max((occurrence.start.getTime() - startMs) / 60000, 0),
        endMin: Math.min((occurrence.end.getTime() - startMs) / 60000, totalMin),
      }));
      const mode = resolveScheduleMode(row.resource, scheduleMode);
      packTimedSegments(segments, { mode, preferredLanes: previousLanes });
      for (const segment of segments) {
        nextLanes.set(getLaneKey(segment.occurrence), {
          lane: segment.column ?? 0,
          startMs: segment.occurrence.start.getTime(),
          endMs: segment.occurrence.end.getTime(),
        });
      }
      const laneCount = segments.reduce(
        (max, segment) => Math.max(max, (segment.column ?? 0) + 1),
        1,
      );
      let from = Number.POSITIVE_INFINITY;
      let to = Number.NEGATIVE_INFINITY;
      for (const segment of segments) {
        from = Math.min(from, (segment.startMin ?? 0) / totalMin);
        to = Math.max(to, (segment.endMin ?? 0) / totalMin);
      }

      // Parent rollup from the subtree's bars: envelope clamped to the range,
      // progress weighted by each bar's full duration
      let summary: TimelineRowBars["summary"] = null;
      if (row.isGroup && segments.length === 0 && summaryBars) {
        let sumFrom = Number.POSITIVE_INFINITY;
        let sumTo = Number.NEGATIVE_INFINITY;
        for (const id of descendants.get(row.resource.id) ?? []) {
          const env = envelopes.get(id);
          if (!env) continue;
          sumFrom = Math.min(sumFrom, env.fromMin / totalMin);
          sumTo = Math.max(sumTo, env.toMin / totalMin);
        }
        if (sumTo > sumFrom) {
          summary = {
            from: sumFrom,
            to: sumTo,
            // all-time completion (matches a consumer's tree rollup), not the
            // visible-range slice - task progress is independent of scroll
            progress: progressByResource.get(row.resource.id) ?? null,
          };
        }
      }

      // The stack, then the row's own padding around it. Centering the block
      // in the resulting height gives an equal inset top and bottom, and it
      // is also what keeps a lone bar on the tree label's centerline when a
      // short row is held open by minRowHeight.
      const blockRem = laneCount * laneHeight + (laneCount - 1) * laneGap;
      const heightRem = Math.max(minRow, blockRem + 2 * rowPadding);
      const laneOffsetRem = (heightRem - blockRem) / 2;

      map.set(row.resource.id, {
        segments,
        laneCount,
        draftLane: null,
        scheduleMode: mode,
        heightRem,
        laneOffsetRem,
        bandRem: laneHeight + laneOffsetRem * 2,
        extent:
          segments.length > 0
            ? {
                from,
                to,
                color: segments[0].occurrence.event.color,
                label:
                  segments.length === 1
                    ? segments[0].occurrence.event.title
                    : settings.i18n.labels.events(segments.length),
                startMs: Math.min(...segments.map((s) => s.occurrence.start.getTime())),
              }
            : summary
              ? {
                  from: summary.from,
                  to: summary.to,
                  label: row.resource.title,
                  startMs: startMs + summary.from * (endMs - startMs),
                }
              : null,
        summary,
      });
    }
    laneMemory = nextLanes;
    return map;
  });

  // ----- split panes: width state, splitter drag/keyboard, scroll sync -----
  const treeConfig = () => ({ ...DEFAULT_TREE_PANEL, ...viewConfig.treePanel });
  const clampTree = (width: number) => {
    const config = treeConfig();
    return Math.min(Math.max(width, config.minWidth), config.maxWidth);
  };
  const [treeWidth, setTreeWidth] = createSignal(treeConfig().width);
  const configuredTreeWidth = () => clampTree(treeWidth());
  const columns = () => viewConfig.columns ?? [];

  /**
   * Reserve the track a drag-create in flight will land on - as a THIN overlay
   * over the layout above, never as an input to it.
   *
   * `laneOffsetRem` and `bandRem` are deliberately carried over UNCHANGED.
   * Deriving them from the grown track count re-centres the row, which drags
   * the settled bars and the tree label box with it - a 2px wobble by default
   * and, under a consumer `metrics.minRowHeight` big enough to swallow the
   * growth, an 11.5px jerk that snaps back on release. Growing a row must add
   * space BELOW what is already there and move nothing.
   */
  const rowBars = createMemo(() => {
    const base = baseRowBars();
    const draft = draftLayout();
    if (!draft) return base;
    const row = base.get(draft.resourceId);
    if (!row) return base;
    const next = new Map(base);
    // "single" packs every bar onto lane 0, so that is where the draft goes
    // too and the row never grows. Recorded rather than left null so the
    // placeholder's data-lane still names a real destination.
    if (row.scheduleMode === "single") {
      next.set(draft.resourceId, { ...row, draftLane: 0 });
      return next;
    }
    const draftLane = lowestFreeLane(row.segments, draft.startMs, draft.endMs);
    const trackCount = Math.max(row.laneCount, draftLane + 1);
    const draftBlockRem = trackCount * laneHeightRem() + (trackCount - 1) * laneGapRem();
    next.set(draft.resourceId, {
      ...row,
      draftLane,
      heightRem: Math.max(row.heightRem, row.laneOffsetRem * 2 + draftBlockRem),
    });
    return next;
  });

  // "Add task" hint at the foot of the tree, gated by validation
  const showCreateTask = () =>
    viewConfig.displayCreateTaskHint &&
    !!settings.onCreateTask &&
    (settings.canCreateTask?.({ parentId: null }) ?? true);

  // Responsive guard: the timeline must always keep a usable width, so on
  // narrow containers the tree pane yields down toward its minWidth. Measured
  // (not media-queried) because the gantt can live in any column. The -1
  // reserves the splitter hairline so the timeline truly keeps MIN width.
  const [containerWidth, setContainerWidth] = createSignal(0);
  const clampContainer = (width: number, container: number) => {
    if (container <= 0) return width;
    const ceiling = container - minTimelineWidth() - 1;
    // The tree's own minWidth is a PREFERENCE, not a licence to squeeze the
    // timeline out of existence: cap it by what the container can actually
    // spare. Without this cap a consumer minWidth wider than the container
    // wins outright and the timeline collapses below minTimelineWidth with
    // the splitter already pinned, so the space cannot be dragged back.
    const floor = Math.min(treeConfig().minWidth, Math.max(ceiling, 0));
    return Math.max(Math.min(width, ceiling), Math.min(floor, container - 1));
  };
  const clampedTreeWidth = () => clampContainer(configuredTreeWidth(), containerWidth());
  /** Live width while the splitter is dragging; the pane reads it so a
      mid-drag layout change can't snap the pane back to stale state. */
  const [liveTreeWidth, setLiveTreeWidth] = createSignal<number | null>(null);

  // In-flight gestures must never outlive the view (leaked window listeners,
  // body overlays and the drag cursor), and must never keep running against
  // geometry they measured before it changed - a gesture snapshots the axis
  // and row rects once at activation, so any of these invalidates it.
  // Cancel-and-revert is the safe contract; all of this is a no-op in normal
  // flows (none of these values can change during an ordinary pointer drag).
  useGanttGestureTeardown();
  createEffect(
    on([zoom, scale, rangeKey, clampedTreeWidth, () => rows().length], () => {
      cancelActiveGanttGestures();
    }),
  );

  // Leaf-row checkbox selection: uncontrolled unless selectedRows is passed
  const [internalSelected, setInternalSelected] = createSignal<string[]>([]);
  const selectedRows = () => viewConfig.selectedRows ?? internalSelected();
  const selectedSet = createMemo(() => new Set(selectedRows()));
  const toggleRowSelected = (id: string, checked: boolean) => {
    const current = selectedRows();
    const next = checked
      ? [...current.filter((rowId) => rowId !== id), id]
      : current.filter((rowId) => rowId !== id);
    if (viewConfig.selectedRows === undefined) setInternalSelected(next);
    viewConfig.onSelectedRowsChange?.(next);
  };

  let bodyEl: HTMLDivElement | undefined;
  let treePaneEl: HTMLDivElement | undefined;
  let timelinePaneEl: HTMLDivElement | undefined;
  let treeRowsEl: HTMLDivElement | undefined;

  // Track the body width so the tree pane can yield on narrow containers.
  // Solid flushes effects before the first paint, so a clamped tree width
  // never paints wide for a frame and then snaps.
  onMount(() => {
    if (!bodyEl) return;
    const body = bodyEl;
    const update = () => setContainerWidth(body.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(body);
    onCleanup(() => observer.disconnect());
  });

  const beginSplit = (e: PointerEvent & { currentTarget: HTMLElement }) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startWidth = clampedTreeWidth();
    const splitter = e.currentTarget;
    // in RTL the tree pane sits on the right: pointer deltas invert
    const dir = getComputedStyle(splitter).direction === "rtl" ? -1 : 1;
    splitter.setAttribute("data-resizing", "");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    // The live width drives one signal that only the pane's width binding
    // reads, so a pointermove never disturbs the rows or bars. State commits
    // on release. The container clamp applies live too - the timeline must not
    // collapse below its minimum mid-drag only to snap back on release.
    let width = startWidth;
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      width = clampContainer(
        clampTree(startWidth + (ev.clientX - startX) * dir),
        bodyEl?.clientWidth ?? 0,
      );
      setLiveTreeWidth(width);
    };
    const finish = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      splitter.removeAttribute("data-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setLiveTreeWidth(null);
      if (width !== startWidth) {
        setTreeWidth(width);
        viewConfig.treePanel?.onWidthChange?.(width);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  // Both panes scroll vertically; whichever moves drives the other.
  createEffect(
    on([scale, () => viewConfig.scrollbars], () => {
      const treeViewport = getPaneViewport(treePaneEl);
      const timelineViewport = getPaneViewport(timelinePaneEl);
      if (!treeViewport || !timelineViewport) return;
      const link = (source: HTMLElement, target: HTMLElement) => {
        // Mirror only when the source's own vertical position changed -
        // horizontal-only scroll events must not replay a stale scrollTop over
        // the other pane. Assign only on drift: the mirrored handler then
        // no-ops, so no loop.
        let lastTop = source.scrollTop;
        const onScroll = () => {
          if (source.scrollTop === lastTop) return;
          lastTop = source.scrollTop;
          if (target.scrollTop !== source.scrollTop) {
            target.scrollTop = source.scrollTop;
          }
        };
        source.addEventListener("scroll", onScroll);
        return () => source.removeEventListener("scroll", onScroll);
      };
      const unlinkTree = link(treeViewport, timelineViewport);
      const unlinkTimeline = link(timelineViewport, treeViewport);
      let unforward: (() => void) | null = null;
      if (treeViewport.hasAttribute("data-gantt-native-scroll")) {
        // Native mode: the tree's vertical axis is overflow-hidden (its bar
        // would duplicate the timeline's), so vertical wheel intent forwards to
        // the timeline, which mirrors back through the link above. Horizontal
        // wheel intent stays native for the tree's own columns.
        const onWheel = (ev: WheelEvent) => {
          // ctrl/cmd (and trackpad pinch, which sets ctrlKey) is the zoom
          // gesture; scrolling as well would move the rows out from under it
          if (ev.ctrlKey || ev.metaKey) return;
          if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
          const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
          timelineViewport.scrollTop += dy;
          ev.preventDefault();
        };
        treeViewport.addEventListener("wheel", onWheel, { passive: false });
        unforward = () => treeViewport.removeEventListener("wheel", onWheel);
      } else {
        // Custom scrollbars: both panes are real vertical scrollers. The links
        // above mirror on the scroll event, which fires only AFTER the source
        // has already painted - so with compositor momentum (wheel/trackpad) the
        // active pane runs a frame ahead of the mirror and the two visibly drift
        // (the flicker). Fix: drive BOTH viewports from one wheel handler so they
        // move in the same frame, perfectly locked. Horizontal intent stays
        // native for each pane's own axis; the links still cover scrollbar drags,
        // keyboard, touch and programmatic scrolls; touch has no wheel events,
        // so flick-scrolling syncs through the (frame-lagged) link - accepted,
        // pointer drags are the gantt's primary touch interaction.
        const onWheel = (ev: WheelEvent) => {
          if (ev.ctrlKey || ev.metaKey) return;
          if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
          const max = timelineViewport.scrollHeight - timelineViewport.clientHeight;
          if (max <= 0) return;
          const unit =
            ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? timelineViewport.clientHeight : 1;
          const next = Math.max(0, Math.min(max, timelineViewport.scrollTop + ev.deltaY * unit));
          ev.preventDefault();
          timelineViewport.scrollTop = next;
          treeViewport.scrollTop = next;
        };
        treeViewport.addEventListener("wheel", onWheel, { passive: false });
        timelineViewport.addEventListener("wheel", onWheel, { passive: false });
        unforward = () => {
          treeViewport.removeEventListener("wheel", onWheel);
          timelineViewport.removeEventListener("wheel", onWheel);
        };
      }
      onCleanup(() => {
        unlinkTree();
        unlinkTimeline();
        unforward?.();
      });
    }),
  );

  // Linked row hover: mirror data-hover onto the row's twin in the other pane
  onMount(() => {
    if (!bodyEl) return;
    const body = bodyEl;
    let current: string | null = null;
    const apply = (id: string | null) => {
      if (id === current) return;
      if (current) {
        for (const el of body.querySelectorAll(`[data-gantt-row-id="${CSS.escape(current)}"]`)) {
          el.removeAttribute("data-hover");
        }
      }
      if (id) {
        for (const el of body.querySelectorAll(`[data-gantt-row-id="${CSS.escape(id)}"]`)) {
          el.setAttribute("data-hover", "");
        }
      }
      current = id;
    };
    const onOver = (e: PointerEvent) => {
      const row = (e.target as HTMLElement | null)?.closest?.("[data-gantt-row-id]");
      apply(row?.getAttribute("data-gantt-row-id") ?? null);
    };
    const onLeave = () => apply(null);
    body.addEventListener("pointerover", onOver);
    body.addEventListener("pointerleave", onLeave);
    onCleanup(() => {
      body.removeEventListener("pointerover", onOver);
      body.removeEventListener("pointerleave", onLeave);
      apply(null);
    });
  });

  // ----- infinite scroll: grow the range near an edge, keep the position -----
  // Restoration is anchored to a TIMESTAMP, not pixel deltas: it survives
  // growth, window slides, and zoom changes alike.
  let pendingRestore: {
    ms: number;
    align: "start" | "center";
    /**
     * Park the anchored instant this many pixels from the viewport's inline
     * start instead of at the edge or the middle. Wheel zoom needs it so the
     * instant under the cursor stays under the cursor.
     */
    offsetPx?: number;
  } | null = null;
  let extendLock = false;
  let lastUserScroll = 0;
  /** Fine-grained viewport-center instant, for controlled-zoom anchoring. */
  let fineCenter: number | null = null;
  let lastZoom: number | null = null;
  const manage = { key: "", buffered: false, userTook: false };

  // Auto-manage the horizontal position for the current anchor until the user
  // scrolls: pre-buffer one period per side (so infinite scroll never resizes
  // the scrollbar on the first gesture), then center the target instant.
  // Idempotent - re-running just re-centers the same instant.
  const anchorMs = useGanttSelector((state) => state.date.getTime());
  // flattened to a primitive so an inline `initialCenter={new Date(...)}`
  // cannot re-run the centring effect on every update
  const initialCenter = () =>
    viewConfig.initialCenter instanceof Date
      ? viewConfig.initialCenter.getTime()
      : viewConfig.initialCenter;
  createEffect(
    on(
      [
        scale,
        anchorMs,
        initialCenter,
        () => viewConfig.scrollbars,
        () => viewConfig.infiniteScroll,
        rangeKey,
        rangeStartMs,
        rangeEndMs,
      ],
      () => {
        const key = `${scale()}:${anchorMs()}:${viewConfig.scrollbars}`;
        if (manage.key !== key) {
          // An anchor change from an extendRange window SLIDE continues the
          // user's own travel: the guard survives, or the pre-buffer branch
          // would re-extend and cascade further slides at the window cap.
          const slideContinuation = manage.userTook && instance.internals.didAnchorSlide();
          manage.key = key;
          if (!slideContinuation) {
            manage.buffered = false;
            manage.userTook = false;
          }
        }
        if (manage.userTook) return;
        // Deferred-mount wait: when the viewport is not measurable yet (hidden
        // tab, display:none ancestor), a ResizeObserver resumes positioning on
        // the exact frame it gains a size - RO callbacks run in the rendering
        // steps BEFORE that frame paints, so no uncentered frame is ever shown.
        let waiter: ResizeObserver | null = null;
        const run = () => {
          waiter?.disconnect();
          waiter = null;
          const viewport = getPaneViewport(timelinePaneEl);
          const axisEl = viewport?.querySelector<HTMLElement>("[data-gantt-axis]");
          if (!viewport || !axisEl) return;
          if (viewport.clientWidth === 0) {
            waiter = new ResizeObserver(() => {
              if (viewport.clientWidth > 0) run();
            });
            waiter.observe(viewport);
            return;
          }
          // pre-buffer once; the re-run after the range grows lands the center
          if (viewConfig.infiniteScroll && !manage.buffered) {
            manage.buffered = true;
            extendLock = true;
            instance.internals.extendRange("before");
            instance.internals.extendRange("after");
            return;
          }
          extendLock = false;
          if (viewport.scrollWidth <= viewport.clientWidth) return;
          // read the clock at run time - the effect must not depend on a
          // reactive now that re-runs it (and the whole grid) every 30s.
          // Target now ONLY when the anchor period itself contains it: keying
          // on the whole (buffered) visible range would re-center prev/next
          // navigation right back onto today.
          const active = instance.getState().activeRange;
          const center = initialCenter();
          let target: number;
          if (typeof center === "number") {
            target = center;
          } else if (center === "anchor") {
            target = anchorMs();
          } else {
            const nowMs = Date.now();
            target =
              nowMs >= active.start.getTime() && nowMs < active.end.getTime() ? nowMs : anchorMs();
          }
          const fraction = Math.min(
            Math.max((target - rangeStartMs()) / (rangeEndMs() - rangeStartMs()), 0),
            1,
          );
          setScrollStart(
            viewport,
            Math.max(0, fraction * viewport.scrollWidth - viewport.clientWidth / 2),
          );
        };
        run();
        onCleanup(() => waiter?.disconnect());
      },
    ),
  );

  // Only user gestures may extend the range - programmatic scrolls (chip
  // jumps, auto-center, zoom clamping) must never grow it.
  onMount(() => {
    const pane = timelinePaneEl;
    if (!pane) return;
    const markIntent = () => {
      lastUserScroll = performance.now();
    };
    // zooming is not scroll intent - the re-seat it triggers must not be
    // mistaken for the user reaching an edge and asking to grow the range
    const markWheelIntent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      markIntent();
    };
    // pointerdown counts only where pressing can scroll: the scrollbars,
    // the pan header, or a native-scroll host - NOT bars, chips, or zoom
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "[data-slot=scroll-area-scrollbar], [data-slot=gantt-timeline-header], [data-gantt-native-scroll]",
        )
      ) {
        markIntent();
      }
    };
    pane.addEventListener("wheel", markWheelIntent, { passive: true });
    pane.addEventListener("pointerdown", onPointerDown);
    pane.addEventListener("touchstart", markIntent, { passive: true });
    pane.addEventListener("keydown", markIntent);
    onCleanup(() => {
      pane.removeEventListener("wheel", markWheelIntent);
      pane.removeEventListener("pointerdown", onPointerDown);
      pane.removeEventListener("touchstart", markIntent);
      pane.removeEventListener("keydown", markIntent);
    });
  });

  createEffect(
    on(
      [scale, () => viewConfig.scrollbars, () => viewConfig.infiniteScroll, infiniteEdgePx],
      () => {
        if (!viewConfig.infiniteScroll) return;
        const viewport = getPaneViewport(timelinePaneEl);
        if (!viewport) return;
        const edgePx = infiniteEdgePx();
        const tryExtend = (direction: "before" | "after") => {
          // anchor the left edge as an instant, from the LIVE axis range
          const axisEl = viewport.querySelector<HTMLElement>("[data-gantt-axis]");
          const liveStart = Number(axisEl?.dataset.ganttRangeStart);
          const liveEnd = Number(axisEl?.dataset.ganttRangeEnd);
          if (!axisEl || Number.isNaN(liveStart) || Number.isNaN(liveEnd)) return;
          extendLock = true;
          manage.userTook = true;
          pendingRestore = {
            ms:
              liveStart + (getScrollStart(viewport) / viewport.scrollWidth) * (liveEnd - liveStart),
            align: "start",
          };
          if (!instance.internals.extendRange(direction)) {
            pendingRestore = null;
            extendLock = false;
          }
        };
        // scrollLeft is signed by direction; all edge math runs on the
        // distance-from-inline-start so RTL panes behave identically
        const isRtl = getComputedStyle(viewport).direction === "rtl";
        const onScroll = () => {
          if (extendLock) return;
          if (performance.now() - lastUserScroll > 1200) return;
          // a track that fits the pane has no scroll gesture to extend from
          if (viewport.scrollWidth <= viewport.clientWidth + 8) return;
          const fromStart = getScrollStart(viewport);
          const fromEnd = viewport.scrollWidth - fromStart - viewport.clientWidth;
          const direction =
            fromStart < edgePx ? ("before" as const) : fromEnd < edgePx ? ("after" as const) : null;
          if (!direction) return;
          tryExtend(direction);
        };
        // parked exactly on an edge, further wheeling emits no scroll event -
        // the wheel itself is the growth gesture then
        const onWheel = (e: WheelEvent) => {
          // a zoom gesture must never grow the range: the track is rescaling
          // under the pointer, so an edge reading mid-gesture is meaningless
          if (e.ctrlKey || e.metaKey) return;
          if (extendLock || e.deltaX === 0) return;
          if (viewport.scrollWidth <= viewport.clientWidth + 8) return;
          const towardStart = isRtl ? e.deltaX > 0 : e.deltaX < 0;
          if (towardStart && getScrollStart(viewport) <= 0) {
            tryExtend("before");
          } else if (
            !towardStart &&
            getScrollStart(viewport) + viewport.clientWidth >= viewport.scrollWidth - 1
          ) {
            tryExtend("after");
          }
        };
        viewport.addEventListener("scroll", onScroll);
        viewport.addEventListener("wheel", onWheel, { passive: true });
        onCleanup(() => {
          viewport.removeEventListener("scroll", onScroll);
          viewport.removeEventListener("wheel", onWheel);
        });
      },
    ),
  );

  // Report the visible-center instant so the nav title names what you are
  // looking at. Throttled to period boundaries (a coarse key) so scrolling
  // within a period never recomputes the grid.
  createEffect(
    on([scale, timeZone, () => viewConfig.scrollbars, rangeKey], () => {
      const viewport = getPaneViewport(timelinePaneEl);
      if (!viewport) return;
      const zone = timeZone();
      const currentScale = scale();
      const keyFmt =
        currentScale === "day"
          ? "yyyy-MM-dd"
          : currentScale === "week"
            ? "RRRR-'W'II"
            : currentScale === "month"
              ? "yyyy-MM"
              : currentScale === "quarter"
                ? "yyyy-qqq"
                : "yyyy";
      let raf = 0;
      let lastKey = "";
      const measure = () => {
        raf = 0;
        const axisEl = viewport.querySelector<HTMLElement>("[data-gantt-axis]");
        const liveStart = Number(axisEl?.dataset.ganttRangeStart);
        const liveEnd = Number(axisEl?.dataset.ganttRangeEnd);
        if (!axisEl || Number.isNaN(liveStart) || Number.isNaN(liveEnd)) return;
        const fraction =
          (getScrollStart(viewport) + viewport.clientWidth / 2) / Math.max(1, viewport.scrollWidth);
        const centerMs = liveStart + fraction * (liveEnd - liveStart);
        // fine center first (controlled-zoom anchor), then the coarse-keyed
        // store report that drives the nav title
        fineCenter = centerMs;
        const center = new Date(centerMs);
        const key = format(toZoned(center, zone), keyFmt);
        if (key === lastKey) return;
        lastKey = key;
        instance.internals.setViewportCenter(center);
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(measure);
      };
      viewport.addEventListener("scroll", schedule);
      schedule();
      onCleanup(() => {
        viewport.removeEventListener("scroll", schedule);
        if (raf) cancelAnimationFrame(raf);
      });
    }),
  );

  // Re-seat the viewport on its anchored instant before paint. Runs for range
  // growth, window slides, and zoom changes; a slide moves the anchor date,
  // so pre-mark auto-centering as done for the new key.
  createEffect(
    on([rangeKey, zoom, rangeStartMs, rangeEndMs, scale, () => viewConfig.scrollbars], () => {
      // Consumer-driven (controlled) zoom changes carry no anchorZoomCenter
      // call; anchor them to the last known viewport center so the view does
      // not drift. Built-in buttons set pendingRestore first and win.
      const currentZoom = zoom();
      if (lastZoom !== null && lastZoom !== currentZoom && !pendingRestore && fineCenter !== null) {
        pendingRestore = { ms: fineCenter, align: "center" };
      }
      lastZoom = currentZoom;
      let raf: number | null = null;
      let attempts = 0;
      const seat = () => {
        raf = null;
        const viewport = getPaneViewport(timelinePaneEl);
        if (viewport && pendingRestore) {
          // Not laid out yet (0-width on first mount): centering with a 0 offset
          // parks the view a half-pane off. Defer until the pane is measured so
          // "center" lands the anchored instant in the middle on initial load.
          if (viewport.clientWidth === 0 && attempts++ < 20) {
            raf = requestAnimationFrame(seat);
            return;
          }
          const { ms, align, offsetPx } = pendingRestore;
          pendingRestore = null;
          // clamp: a stale anchor (e.g. an ignored controlled-zoom proposal)
          // must never park the view outside the track
          const fraction = Math.min(
            Math.max((ms - rangeStartMs()) / (rangeEndMs() - rangeStartMs()), 0),
            1,
          );
          const offset = offsetPx ?? (align === "center" ? viewport.clientWidth / 2 : 0);
          setScrollStart(viewport, Math.max(0, fraction * viewport.scrollWidth - offset));
        }
        extendLock = false;
      };
      seat();
      onCleanup(() => {
        if (raf !== null) cancelAnimationFrame(raf);
      });
    }),
  );

  /** Keep the view centered on the same instant across a zoom step. */
  const anchorZoomCenter = () => {
    const viewport = getPaneViewport(timelinePaneEl);
    const axisEl = viewport?.querySelector<HTMLElement>("[data-gantt-axis]");
    if (!viewport || !axisEl) return;
    const liveStart = Number(axisEl.dataset.ganttRangeStart);
    const liveEnd = Number(axisEl.dataset.ganttRangeEnd);
    if (Number.isNaN(liveStart) || Number.isNaN(liveEnd)) return;
    pendingRestore = {
      ms:
        liveStart +
        ((getScrollStart(viewport) + viewport.clientWidth / 2) / viewport.scrollWidth) *
          (liveEnd - liveStart),
      align: "center",
    };
  };

  /**
   * Keep the instant under the POINTER pinned across a zoom step. The buttons
   * anchor the viewport center, but a wheel or pinch gesture points at
   * something - zooming away from it reads as the content sliding out from
   * under the cursor.
   */
  const anchorZoomPointer = (clientX: number) => {
    const viewport = getPaneViewport(timelinePaneEl);
    const axisEl = viewport?.querySelector<HTMLElement>("[data-gantt-axis]");
    if (!viewport || !axisEl) return;
    const liveStart = Number(axisEl.dataset.ganttRangeStart);
    const liveEnd = Number(axisEl.dataset.ganttRangeEnd);
    if (Number.isNaN(liveStart) || Number.isNaN(liveEnd)) return;
    // trackPoint mirrors in RTL, where the range start is the right edge
    const offsetPx = trackPoint(viewport, clientX).offset;
    pendingRestore = {
      ms:
        liveStart +
        ((getScrollStart(viewport) + offsetPx) / viewport.scrollWidth) * (liveEnd - liveStart),
      align: "start",
      offsetPx,
    };
  };

  // ----- ctrl/cmd + wheel (and trackpad pinch) zooms the time range -----
  // The listener is manual and non-passive because it must preventDefault.
  // It reads live accessors, so a zoom step never re-binds mid-gesture.
  createEffect(
    on([scale, () => viewConfig.scrollbars], () => {
      const viewport = getPaneViewport(timelinePaneEl);
      if (!viewport) return;
      const onWheel = (e: WheelEvent) => {
        if (!viewConfig.wheelZoom) return;
        // Browsers deliver a trackpad pinch as wheel + ctrlKey on every
        // platform; metaKey is the Mac keyboard idiom the same gesture implies.
        if (!e.ctrlKey && !e.metaKey) return;
        const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
        // Continuous, not stepped: a pinch emits dozens of small deltas per
        // second, so the button's 0.25 step would slam to a limit instantly.
        // Exponential keeps each notch proportional at any zoom level.
        const current = zoom();
        const next = clampZoom(current * Math.exp(-e.deltaY * lines * 0.002));
        // Already clamped: hand the gesture back so the browser's own page
        // zoom still works for anyone who relies on it.
        if (Math.abs(next - current) < 1e-4) return;
        e.preventDefault();
        // Controlled zoom anchors via fineCenter when the parent adopts;
        // pre-setting an anchor would leak stale if the parent ignores it.
        if (viewConfig.zoom === undefined) anchorZoomPointer(e.clientX);
        setZoomValue(+next.toFixed(4));
      };
      viewport.addEventListener("wheel", onWheel, { passive: false });
      onCleanup(() => viewport.removeEventListener("wheel", onWheel));
    }),
  );

  // Panning suppresses the placement hints (scroll intent, not create intent)
  const [isPanning, setIsPanning] = createSignal(false);

  // Drag-to-pan from the header (intent-based: activates after 4px)
  const beginHeaderPan = (e: PointerEvent & { currentTarget: HTMLElement }) => {
    if (e.button !== 0) return;
    const viewport = getPaneViewport(timelinePaneEl);
    if (!viewport) return;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startLeft = viewport.scrollLeft;
    let active = false;
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      if (!active && Math.abs(dx) < 4) return;
      if (!active) {
        markGestureEnd();
        setIsPanning(true);
      }
      active = true;
      // panning is a user scroll: keep the infinite-scroll gate open
      lastUserScroll = performance.now();
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      viewport.scrollLeft = startLeft - dx;
    };
    const finish = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (active) setIsPanning(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  // ----- tree-row drag reorder (mirrors the event engine: live validity,
  // destructive styling when invalid, Esc cancel, commit via callback) -----
  const [reorder, setReorder] = createSignal<TimelineReorderState | null>(null);
  const reorderEnabled = () => !!settings.onResourceReorder;

  const beginRowReorder = (e: GanttPointerEvent, dragRow: TimelineRow) => {
    const rowList = rows();
    if (e.button !== 0 || !settings.onResourceReorder) return;
    e.preventDefault();
    e.stopPropagation();
    const container = treeRowsEl;
    const pane = treePaneEl;
    if (!container || !pane) return;
    const rowEls = Array.from(
      container.querySelectorAll<HTMLElement>("[data-slot=gantt-row-group]"),
    );
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    let current: TimelineReorderState | null = null;
    let lastBoundary = -1;

    // Carry overlay: clone the WHOLE row (name + detail columns), flat -
    // it reads as the row itself moving, not a separate card
    const pointerId = e.pointerId;
    const rowEl = e.currentTarget.closest<HTMLElement>("[data-slot=gantt-row-group]");
    const overlay = document.createElement("div");
    overlay.setAttribute("data-slot", "gantt-drag-overlay");
    overlay.className = "pointer-events-none fixed overflow-hidden bg-background opacity-95";
    overlay.style.zIndex = "100";
    // body-appended, so it is outside the gantt root that owns the type
    // scale: without adopting the root's resolved metrics the carried row
    // renders at the document default and reads bigger than the row it left
    const ganttRoot = pane.closest<HTMLElement>("[data-slot=gantt]");
    if (ganttRoot) {
      const rootStyle = getComputedStyle(ganttRoot);
      overlay.style.fontSize = rootStyle.fontSize;
      overlay.style.lineHeight = rootStyle.lineHeight;
      overlay.style.fontFamily = rootStyle.fontFamily;
      overlay.style.letterSpacing = rootStyle.letterSpacing;
      overlay.style.direction = rootStyle.direction;
    }
    if (rowEl) {
      const rowRect = rowEl.getBoundingClientRect();
      overlay.style.width = `${rowRect.width}px`;
      overlay.style.height = `${rowRect.height}px`;
      const clone = rowEl.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-gantt-row-id");
      clone.classList.remove("border-b");
      clone.style.height = "100%";
      overlay.appendChild(clone);
    }
    document.body.appendChild(overlay);
    const grabRect = rowEl?.getBoundingClientRect();
    const grabDY = grabRect ? e.clientY - grabRect.top : 8;
    // vertical-only carry, locked to the tree panel like a list row drag
    const lockedX = grabRect?.left ?? pane.getBoundingClientRect().left;
    const paneRect = pane.getBoundingClientRect();
    const rowH = grabRect?.height ?? 40;
    // Rows do not move during the gesture (the carry is a fixed overlay), so
    // rects are measured ONCE - per-move full-row rect scans forced a
    // synchronous reflow after every overlay style write.
    const rects = rowEls.map((el) => el.getBoundingClientRect());
    const place = (y: number) => {
      const top = Math.min(Math.max(y - grabDY, paneRect.top), paneRect.bottom - rowH);
      overlay.style.left = `${lockedX}px`;
      overlay.style.top = `${top}px`;
    };
    place(e.clientY);

    const propose = (boundary: number): TimelineReorderState => {
      const below = rowList[boundary];
      const parentId = below?.parentId ?? rowList[rowList.length - 1]?.parentId ?? null;
      let index = 0;
      for (let i = 0; i < boundary; i++) {
        if (rowList[i].parentId === parentId && rowList[i].resource.id !== dragRow.resource.id) {
          index++;
        }
      }
      const next = reorderResources(settings.resources, dragRow.resource.id, parentId, index);
      const proposal: GanttResourceReorder | null = next
        ? { resourceId: dragRow.resource.id, parentId, index, resources: next }
        : null;
      const valid = !!proposal && (settings.canReorderResource?.(proposal) ?? true);
      const top =
        boundary < rects.length
          ? rects[boundary].top - paneRect.top
          : (rects[rects.length - 1]?.bottom ?? paneRect.top) - paneRect.top;
      return { resourceId: dragRow.resource.id, top, valid, proposal };
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      place(ev.clientY);
      let boundary = rects.length;
      for (let i = 0; i < rects.length; i++) {
        if (ev.clientY < rects[i].top + rects[i].height / 2) {
          boundary = i;
          break;
        }
      }
      // the immutable tree clone + validity check run only when the pointer
      // crosses into another slot, not per pointermove
      if (boundary === lastBoundary) return;
      lastBoundary = boundary;
      const nextState = propose(boundary);
      if (current && current.top === nextState.top && current.valid === nextState.valid) {
        return;
      }
      current = nextState;
      document.body.style.cursor = nextState.valid ? "grabbing" : "not-allowed";
      setReorder(nextState);
    };
    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancelEvent);
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (commit && current?.proposal && !current.valid) {
        // released on a rejected position (e.g. a pinned row): let the
        // consumer explain it - the destructive indicator already showed live
        settings.onResourceReorderReject?.(current.proposal);
      } else if (commit && current?.valid && current.proposal) {
        settings.onResourceReorder?.(current.proposal);
        const announcer = pane
          .closest<HTMLElement>("[data-slot=gantt]")
          ?.querySelector<HTMLElement>("[data-slot=gantt-announcer]");
        if (announcer) {
          announcer.textContent = `${dragRow.resource.title}: ${settings.i18n.labels.reorder}`;
        }
      }
      setReorder(null);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(true);
    };
    const onCancelEvent = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finish(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancelEvent);
    window.addEventListener("keydown", onKey);
  };

  const onToggleRow = (row: TimelineRow) => {
    const current = collapsedIds();
    const next = current.includes(row.resource.id)
      ? current.filter((id) => id !== row.resource.id)
      : [...current, row.resource.id];
    if (viewConfig.collapsedGroups === undefined) setInternalCollapsed(next);
    viewConfig.onCollapsedGroupsChange?.(next);
  };

  const loading = useGanttSelector<unknown, boolean>((state) => state.loading);
  const customScrollbars = () => viewConfig.scrollbars !== "native";
  const gridLines = () => resolveTimelineLines(viewConfig.timelineLines);
  const showVerticalLines = () => gridLines().vertical !== null;
  const offDayClass = () =>
    (typeof viewConfig.offDays === "object" && viewConfig.offDays.class) || "bg-muted/40";
  // Body texture: default off-days carry a whisper-faint diagonal hatch over
  // a lighter wash (header cells stay flat). A custom offDays.class replaces
  // both surfaces verbatim.
  const offDayBodyClass = () =>
    (typeof viewConfig.offDays === "object" && viewConfig.offDays.class) ||
    "bg-muted/25 bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,color-mix(in_oklab,var(--color-border)_35%,transparent)_5px,color-mix(in_oklab,var(--color-border)_35%,transparent)_6px)]";

  // Header-only unit lines, and ONE mechanism for every vertical line in the
  // header: positioned spans at calc(fraction% - 1px). A background gradient
  // rasterizes stripe positions differently from element layout at fractional
  // unit widths, which shifted the group-row boundaries 1px off the unit
  // lines below them mid-track - identical span formulas snap identically.
  // The body stays bare - rows separate by whitespace, never vertical borders.
  const showUnitLines = () => !uniform() || showVerticalLines();

  // ----- tree pane content -----
  // Header label offset = the row cell's ps-3 (0.75rem) left gutter + the
  // toggle/checkbox gutter (w-5 + me-1 = 1.5rem) + the reorder grip (0.875rem)
  // when present, so "Resources" lines up with the row titles below it.
  const namePaddingStart = () => (reorderEnabled() ? "3.125rem" : "2.25rem");

  const treeContent = () => (
    <div
      class={cn(
        "flex min-h-full w-max min-w-full flex-col",
        // clearance for the pinned horizontal scrollbar strip
        customScrollbars() && "pb-2.5",
      )}
    >
      {/* Same 65px height as the two-row timeline header so the panes align.
          The head keeps its own bottom rule (under the Resources label), but
          the header/body boundary line is transparent so the first tree node
          has no rule directly above it - the 1px is kept only to preserve the
          65px height, matching the timeline. */}
      <div
        data-slot="gantt-tree-header"
        class="sticky top-0 z-30 box-content h-16 shrink-0 border-b border-b-transparent bg-background"
      >
        <div class="flex h-8 border-b">
          <div class="flex h-full min-w-0 flex-1">
            <div
              class="flex h-full shrink-0 items-center"
              style={{
                width: `${treeConfig().nameColumnWidth}px`,
                "padding-inline-start": namePaddingStart(),
              }}
            >
              <span class="truncate font-medium text-muted-foreground">
                {settings.i18n.labels.resources}
              </span>
            </div>
            <For each={columns()}>
              {(column) => (
                <div
                  data-slot="gantt-column-header"
                  data-column={column.id}
                  class={cn(
                    "flex h-full shrink-0 items-center px-2 font-medium text-muted-foreground",
                    column.align === "center" && "justify-center",
                    column.align === "end" && "justify-end",
                    column.class,
                  )}
                  style={{ width: `${column.width ?? DEFAULT_COLUMN_WIDTH}px` }}
                >
                  <span class="truncate">{column.title ?? column.id}</span>
                </div>
              )}
            </For>
            <div class="min-w-0 flex-1" />
          </div>
          <Show when={viewConfig.columnsMenu}>
            <div
              data-slot="gantt-columns-menu"
              // gradient lead-in: scrolled column headers dissolve into this
              // sticky control instead of hard-clipping against its background
              class="sticky end-0 z-10 flex h-full shrink-0 items-center bg-background ps-1.5 pe-2.5 before:pointer-events-none before:absolute before:inset-y-0 before:-start-5 before:w-5 before:bg-linear-to-l before:from-background before:to-transparent rtl:before:bg-linear-to-r"
            >
              {viewConfig.columnsMenu}
            </div>
          </Show>
        </div>
      </div>
      <div ref={treeRowsEl} class="flex flex-col">
        <For each={rows()}>
          {(row) => (
            <GanttTreeRow
              row={row}
              heightRem={rowBars().get(row.resource.id)?.heightRem ?? minRowRem()}
              bandRem={rowBars().get(row.resource.id)?.bandRem ?? minRowRem()}
              columns={columns()}
              nameWidth={treeConfig().nameColumnWidth}
              dimmed={reorder()?.resourceId === row.resource.id}
              selected={selectedSet().has(row.resource.id)}
              onSelectedChange={row.isGroup ? undefined : toggleRowSelected}
              onGripPointerDown={reorderEnabled() ? beginRowReorder : undefined}
              onToggle={onToggleRow}
            />
          )}
        </For>
        <Show when={showCreateTask()}>
          <button
            type="button"
            data-slot="gantt-create-task"
            // mirror the tree row's left structure so the + lands in the same
            // column as the row toggle chevrons, and the label lines up with
            // the task titles above
            class="flex h-10 w-full shrink-0 items-center border-b ps-3 pe-3 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={() =>
              settings.onCreateTask?.({ parentId: null, index: settings.resources.length })
            }
          >
            <span class="flex h-full w-full items-center">
              <Show when={reorderEnabled()}>
                <span aria-hidden="true" class="w-3.5 shrink-0" />
              </Show>
              {/* group chevrons sit centered in a size-5 button that fills
                  this w-5 gutter, so the + must center here too */}
              <span class="me-1 flex w-5 shrink-0 items-center justify-center">
                <Plus class="size-3.5" aria-hidden="true" />
              </span>
              <span>{settings.i18n.labels.addTask}</span>
            </span>
          </button>
        </Show>
      </div>
    </div>
  );

  // ----- timeline pane content -----
  const timelineContent = () => (
    <div
      class={cn(
        // grow (not just min-h-full) so the body reaches the bottom of the
        // pane: the columns then run the full height and the empty space
        // below the last row becomes pannable canvas instead of dead area
        "flex min-h-full w-max min-w-full grow flex-col",
        customScrollbars() && "pb-2.5",
      )}
    >
      {/* Two-row grouped header; also the drag-to-pan surface */}
      <div
        data-slot="gantt-timeline-header"
        class="sticky top-0 z-30 shrink-0 border-b bg-background"
        style={{ "min-width": trackWidth() }}
        onPointerDown={beginHeaderPan}
      >
        {/* group sectors; boundaries painted like the body lines */}
        <div class="relative h-8 border-b">
          <div class="flex h-full">
            <For each={groups()}>
              {(group) => (
                <div
                  data-slot="gantt-axis-group"
                  // no `truncate` here: overflow-hidden would make this the
                  // sticky label's scrollport and the stick would never fire
                  class="flex min-w-0 items-center ps-3 pe-2 text-muted-foreground"
                  style={{ flex: `${group.span} 0 0px` }}
                >
                  {/* Pure-CSS sticky: the label rides the leading edge for as
                      long as its own band is on screen, then the next band
                      pushes it out - so the day you are looking at always names
                      itself. The browser composites this; a scroll listener
                      would run JS on every frame to do worse. start-3 matches
                      the cell's ps-3 so the gutter is identical parked or
                      pinned. */}
                  <span
                    data-slot="gantt-axis-group-label"
                    class="sticky start-3 max-w-full truncate"
                  >
                    {group.label}
                  </span>
                </div>
              )}
            </For>
          </div>
          {/* same span formula as the unit lines below: equal fractions get
              equal layout rounding, so the two rows' lines never drift apart */}
          <For each={groupBoundaries()}>
            {(fraction) => (
              <span
                aria-hidden="true"
                class="absolute inset-y-0 w-px bg-border"
                style={{ "inset-inline-start": `calc(${fraction * 100}% - 1px)` }}
              />
            )}
          </For>
        </div>
        {/* units, engine axis = this row */}
        <div
          data-gantt-axis=""
          data-gantt-range-start={rangeStartMs()}
          data-gantt-range-end={rangeEndMs()}
          data-gantt-snap={snapMin()}
          class="relative h-8"
        >
          {/* chrome underlay: off-day washes under the label layer */}
          <div aria-hidden="true" class="absolute inset-0">
            <For each={unitFractions()}>
              {({ unit, start, width }) => (
                <Show when={unit.isOff}>
                  <span
                    class={cn("absolute inset-y-0", offDayClass())}
                    style={{
                      "inset-inline-start": `${start * 100}%`,
                      width: `${width * 100}%`,
                    }}
                  />
                </Show>
              )}
            </For>
          </div>
          <div class="flex h-full">
            <For each={units()}>
              {(unit) => (
                <div
                  data-today={unit.isToday || undefined}
                  data-off={unit.isOff || undefined}
                  class={cn(
                    "flex min-w-0 items-center justify-center truncate px-1.5 text-center",
                    "text-muted-foreground",
                    unit.isToday && "font-medium text-primary",
                  )}
                  style={{ flex: `${unit.weight} 0 0px` }}
                >
                  {/* today reads as a soft pill, not just tinted text */}
                  <Show when={unit.isToday} fallback={unit.label}>
                    <span class="truncate rounded-full bg-primary/10 px-1.5 py-px">
                      {unit.label}
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </div>
          <Show when={showUnitLines()}>
            <For each={unitFractions().slice(1)}>
              {({ start }) => (
                <span
                  aria-hidden="true"
                  data-slot="gantt-grid-line"
                  data-axis="vertical"
                  class={cn(
                    "absolute inset-y-0 w-px",
                    // a dashed rule is a repeating gradient, not a border: the
                    // line is a 1px span, and border-dashed on a zero-width box
                    // paints nothing
                    gridLines().vertical === "dashed"
                      ? "bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0,var(--color-border)_3px,transparent_3px,transparent_6px)]"
                      : "bg-border",
                  )}
                  style={{ "inset-inline-start": `calc(${start * 100}% - 1px)` }}
                />
              )}
            </For>
          </Show>
          <Show when={viewConfig.nowIndicator}>
            <GanttNowDot rangeStartMs={rangeStartMs()} rangeEndMs={rangeEndMs()} />
          </Show>
        </div>
      </div>
      {/* Rows over a shared backdrop (off days, today, boundaries, now);
          grows so the columns run to the bottom of the pane. Pressing anywhere
          here that is not a bar or a hint tile begins a scroll pan - the whole
          panel is a draggable canvas, not just the rows. */}
      <div class="relative flex min-h-0 grow flex-col" onPointerDown={beginHeaderPan}>
        {/* off-day / today / now backdrop only; vertical gridlines are
            per-row and reveal on selection, not painted here */}
        <div
          aria-hidden="true"
          data-slot="gantt-timeline-backdrop"
          class="pointer-events-none absolute inset-0"
        >
          <For each={unitFractions()}>
            {({ unit, start, width }) => (
              <>
                <Show when={unit.isOff}>
                  <span
                    data-off=""
                    class={cn("absolute inset-y-0", offDayBodyClass())}
                    style={{
                      "inset-inline-start": `${start * 100}%`,
                      width: `${width * 100}%`,
                    }}
                  />
                </Show>
                <Show when={unit.isToday && scale() !== "day"}>
                  <span
                    data-today=""
                    class="absolute inset-y-0 bg-primary/5"
                    style={{
                      "inset-inline-start": `${start * 100}%`,
                      width: `${width * 100}%`,
                    }}
                  />
                </Show>
              </>
            )}
          </For>
          {/* one layer for the whole body, not per row: the unit boundaries
              have to line up with the header's spans exactly, so both use the
              same fraction formula */}
          <Show when={gridLines().vertical !== null}>
            <For each={unitFractions().slice(1)}>
              {({ start }) => (
                <span
                  data-slot="gantt-grid-line"
                  data-axis="vertical"
                  class={cn(
                    "absolute inset-y-0 w-px",
                    gridLines().vertical === "dashed"
                      ? "bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0,var(--color-border)_3px,transparent_3px,transparent_6px)]"
                      : "bg-border",
                  )}
                  style={{ "inset-inline-start": `calc(${start * 100}% - 1px)` }}
                />
              )}
            </For>
          </Show>
          <Show when={viewConfig.nowIndicator}>
            <GanttNowLine rangeStartMs={rangeStartMs()} rangeEndMs={rangeEndMs()} />
          </Show>
        </div>
        <For each={rows()}>
          {(row, rowIndex) => (
            <GanttTimelineRow
              row={row}
              rowIndex={rowIndex()}
              bars={rowBars().get(row.resource.id)}
              rangeStartMs={rangeStartMs()}
              rangeEndMs={rangeEndMs()}
              trackWidth={trackWidth()}
              trackRemWidth={trackRemWidth()}
              rowBorder={gridLines().horizontal}
              selected={selectedSet().has(row.resource.id)}
              resolveHintStop={resolveHintStop}
              isPanning={isPanning()}
              laneHeightRem={laneHeightRem()}
              laneGapRem={laneGapRem()}
              minRowRem={minRowRem()}
            />
          )}
        </For>
        <Show when={rows().length === 0 && viewConfig.renderNoResources}>
          <div
            data-slot="gantt-no-resources"
            class="flex grow items-center justify-center p-6 text-muted-foreground text-sm"
          >
            {viewConfig.renderNoResources?.()}
          </div>
        </Show>
        <Show when={showCreateTask()}>
          <div
            aria-hidden="true"
            data-slot="gantt-create-task-spacer"
            class="h-10 border-b"
            style={{ "min-width": trackWidth() }}
          />
        </Show>
      </div>
    </div>
  );

  const horizontalScrollbar = () => (
    <ScrollBar
      orientation="horizontal"
      // taller strip with vertical padding so the thumb is not crowded.
      // end-0 runs the strip (bg + top border) to the pane's right edge instead
      // of stopping short by the corner width - the vertical scrollbar is inset
      // to end above this strip, so nothing collides in the bottom-right corner.
      class="end-0! z-40 h-4! rounded-none bg-background py-1 border-t-border!"
    />
  );

  return (
    <div
      data-slot="gantt-view"
      data-scale={scale()}
      aria-busy={loading() || undefined}
      class={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        viewConfig.classNames?.view,
        local.class,
      )}
      {...others}
    >
      <div ref={bodyEl} class="relative flex min-h-0 flex-1">
        {/* Tree pane */}
        <div
          ref={treePaneEl}
          data-slot="gantt-tree-pane"
          class="relative h-full shrink-0"
          style={{ width: `${liveTreeWidth() ?? clampedTreeWidth()}px` }}
        >
          <Show
            when={customScrollbars()}
            fallback={
              <div
                data-slot="scroll-area-viewport"
                data-gantt-native-scroll=""
                // vertical axis is DISPLAY-ONLY: the position is always
                // mirrored from the timeline, so no vertical scrollbar can
                // ever appear (overlay platforms included). Wheel deltas
                // forward to the timeline (see the sync effect); horizontal
                // column scrolling stays fully native.
                class="h-full overflow-x-auto overflow-y-hidden overscroll-contain"
              >
                {treeContent()}
              </div>
            }
          >
            <ScrollArea class="h-full [&>[data-orientation=vertical]]:hidden">
              {treeContent()}
              {horizontalScrollbar()}
            </ScrollArea>
          </Show>
          {/* Reserved horizontal-scrollbar rail: the tree usually has no
              horizontal overflow, so its real scrollbar never mounts and its
              bottom edge would sit higher than the timeline's pinned strip.
              This static rail fills that gutter (same 1rem height + top border)
              so the bottom strip reads as one continuous band across both
              panes; a real tree scrollbar (with columns) draws over it. */}
          <Show when={customScrollbars()}>
            <div
              aria-hidden="true"
              data-slot="gantt-tree-scrollbar-rail"
              class="pointer-events-none absolute inset-x-0 bottom-0 h-4 border-t border-t-border bg-background"
            />
          </Show>
          {/* Reorder insertion indicator, pinned to the visible pane */}
          <Show when={reorder()}>
            {(state) => (
              <div
                data-slot="gantt-reorder-indicator"
                data-invalid={!state().valid || undefined}
                class="pointer-events-none absolute inset-x-0 flex items-center"
                style={{ top: `${state().top - 4}px`, "z-index": "110" }}
              >
                {/* caret head pointing along the insertion line; the whole
                    indicator sits above the row carry overlay (z 100) */}
                <span
                  class={cn(
                    "ms-0.5 size-0 shrink-0 border-y-4 border-s-8 border-y-transparent",
                    state().valid ? "border-s-primary" : "border-s-destructive",
                  )}
                />
                <span
                  class={cn("h-px min-w-0 flex-1", state().valid ? "bg-primary" : "bg-destructive")}
                />
              </div>
            )}
          </Show>
        </div>
        {/* Splitter */}
        <Show
          when={treeConfig().resizable}
          fallback={<div aria-hidden="true" class="w-px shrink-0 bg-border" />}
        >
          {/* biome-ignore lint/a11y/useSemanticElements: an <hr> cannot host the drag/keyboard splitter behaviour or the aria-valuenow range this separator reports. */}
          {/* biome-ignore lint/a11y/useFocusableInteractive: it IS focusable - Solid spells the attribute `tabindex`, which the rule does not recognise. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={settings.i18n.labels.resizePanel}
            aria-valuenow={Math.round(clampedTreeWidth())}
            // the EFFECTIVE floor, not the configured one: on a narrow
            // container the tree yields below its own minWidth to keep the
            // timeline usable, and valuenow must never fall outside the range
            aria-valuemin={Math.round(Math.min(treeConfig().minWidth, clampedTreeWidth()))}
            aria-valuemax={Math.round(Math.max(treeConfig().maxWidth, clampedTreeWidth()))}
            tabindex={0}
            data-slot="gantt-splitter"
            class={cn(
              "group/gantt-splitter relative z-30 w-px shrink-0 cursor-col-resize touch-none bg-border outline-none hover:bg-primary/60 data-resizing:bg-primary",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              "after:absolute after:inset-y-0 after:-start-1 after:-end-1",
            )}
            onPointerDown={beginSplit}
            onDblClick={() => {
              setTreeWidth(treeConfig().width);
              treeConfig().onWidthChange?.(treeConfig().width);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const dir = getComputedStyle(e.currentTarget).direction === "rtl" ? -1 : 1;
                const delta = (e.key === "ArrowLeft" ? -16 : 16) * dir;
                const next = clampTree(clampedTreeWidth() + delta);
                setTreeWidth(next);
                treeConfig().onWidthChange?.(next);
              }
            }}
          >
            {/* grip pill: makes the hairline read as draggable on approach */}
            <span
              aria-hidden="true"
              data-slot="gantt-splitter-grip"
              class="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-6 w-0.75 rounded-full bg-primary/60 opacity-0 transition-opacity duration-150 group-hover/gantt-splitter:opacity-100 group-focus-visible/gantt-splitter:opacity-100 group-data-resizing/gantt-splitter:bg-primary group-data-resizing/gantt-splitter:opacity-100"
            />
          </div>
        </Show>
        {/* Timeline pane */}
        <div
          ref={timelinePaneEl}
          data-slot="gantt-timeline-pane"
          class="relative h-full min-w-0 flex-1"
        >
          <Show when={viewConfig.zoomControl}>
            <div
              data-slot="gantt-zoom"
              class="absolute end-3 bottom-5 z-40 flex flex-col rounded-md border bg-background shadow-sm"
            >
              {/* aria-disabled instead of disabled: the not-allowed cursor
                  must still show at the zoom limits */}
              <TooltipProvider delay={600} closeDelay={0} timeout={300}>
                <Tooltip>
                  <TooltipTrigger
                    as={(triggerProps: ComponentProps<"button">) => (
                      <Button
                        {...triggerProps}
                        variant="ghost"
                        size="icon-xs"
                        aria-label={settings.i18n.labels.zoomIn}
                        aria-disabled={!canZoomIn() || undefined}
                        class="size-5! rounded-b-none text-muted-foreground hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
                      >
                        <Plus class="size-3" aria-hidden="true" />
                      </Button>
                    )}
                    onClick={() => {
                      if (!canZoomIn()) return;
                      // controlled zoom anchors via fineCenter when the parent
                      // adopts; a pre-set anchor would leak stale if the parent
                      // ignores the proposal
                      if (viewConfig.zoom === undefined) anchorZoomCenter();
                      setZoomValue(+(zoom() + (zoomRange().step ?? 0.25)).toFixed(2));
                    }}
                  />
                  <TooltipContent side="left">{settings.i18n.labels.zoomIn}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    as={(triggerProps: ComponentProps<"button">) => (
                      <Button
                        {...triggerProps}
                        variant="ghost"
                        size="icon-xs"
                        aria-label={settings.i18n.labels.zoomOut}
                        aria-disabled={!canZoomOut() || undefined}
                        class="size-5! rounded-t-none border-t text-muted-foreground hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
                      >
                        <Minus class="size-3" aria-hidden="true" />
                      </Button>
                    )}
                    onClick={() => {
                      if (!canZoomOut()) return;
                      if (viewConfig.zoom === undefined) anchorZoomCenter();
                      setZoomValue(+(zoom() - (zoomRange().step ?? 0.25)).toFixed(2));
                    }}
                  />
                  <TooltipContent side="left">{settings.i18n.labels.zoomOut}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Show>
          <Show
            when={customScrollbars()}
            fallback={
              <div
                data-slot="scroll-area-viewport"
                data-gantt-native-scroll=""
                class="h-full overflow-auto overscroll-contain"
              >
                {timelineContent()}
              </div>
            }
          >
            {/* The vertical scrollbar is inset into the body lane: it starts
                below the sticky 65px two-row header (otherwise its top slides
                behind the header and the thumb is clipped) and stops above the
                pinned 16px horizontal strip. `!` overrides the wrapper's inline
                top/bottom; h-auto lets top+bottom define the track height so the
                thumb is measured against the visible lane, not the full pane. */}
            <ScrollArea class="h-full [&>[data-orientation=vertical]]:top-[65px]! [&>[data-orientation=vertical]]:bottom-4! [&>[data-orientation=vertical]]:h-auto!">
              {/* A FLEX column, not a percentage: the content's own min-h-full
                  would resolve against this box's auto height and collapse to
                  nothing, which is why the columns used to stop at the last row
                  and leave the rest of the pane dead space. As a flex parent it
                  can hand the leftover height down instead. */}
              <div class="flex min-h-full flex-col">{timelineContent()}</div>
              {horizontalScrollbar()}
            </ScrollArea>
          </Show>
          {/* Reserved scrollbar rail - the twin of the tree rail. Keeps the
              bottom gutter present even when the real horizontal scrollbar is
              hidden (e.g. hover-reveal scrollbars at rest), so the strip reads
              as one continuous reserved band across both panes; the real
              scrollbar (z-40) draws over it when active. */}
          <Show when={customScrollbars()}>
            <div
              aria-hidden="true"
              data-slot="gantt-timeline-scrollbar-rail"
              class="pointer-events-none absolute inset-x-0 bottom-0 h-4 border-t border-t-border bg-background"
            />
          </Show>
          <Show when={viewConfig.offscreenIndicators}>
            <GanttOffscreenChips
              pane={() => timelinePaneEl}
              occurrences={occurrences()}
              locale={settings.locale}
              refreshKey={`${scale()}:${rangeKey()}:${zoom()}:${rows().length}:${clampedTreeWidth()}:${viewConfig.scrollbars}`}
            />
          </Show>
        </div>
        <Show when={loading()}>
          <div
            data-slot="gantt-loading"
            class="absolute inset-0 z-50 flex items-center justify-center bg-background/60"
          >
            <span class="animate-pulse text-muted-foreground text-sm">
              {settings.i18n.labels.loading}
            </span>
          </div>
        </Show>
        <Show when={viewConfig.renderDragPreview || viewConfig.renderResizeIndicator}>
          <GanttCustomDragLayer />
        </Show>
      </div>
    </div>
  );
}

/**
 * The red now-line, self-ticking: only this node re-positions on the 30s
 * clock, never the grid around it. z-10 keeps it above row content but UNDER
 * the sticky header (z-30) - vertical scrolling slides it beneath, never over.
 */
function GanttNowLine(props: { rangeStartMs: number; rangeEndMs: number }) {
  const now = useNow();
  const ms = () => now().getTime();
  const fraction = () => (ms() - props.rangeStartMs) / (props.rangeEndMs - props.rangeStartMs);
  return (
    <Show when={ms() >= props.rangeStartMs && ms() < props.rangeEndMs}>
      <div
        data-slot="gantt-now-indicator"
        // comet tail: solid at the cap, dissolving toward the bottom -
        // present without ruling a hard line through every row
        class="absolute inset-y-0 z-10 w-px bg-linear-to-b from-destructive/80 via-destructive/45 to-destructive/15"
        style={{ "inset-inline-start": `${fraction() * 100}%` }}
      />
    </Show>
  );
}

/**
 * The now-line's dot cap, pinned INSIDE the sticky header at the header/body
 * boundary: it stays put while the line scrolls beneath the header.
 */
function GanttNowDot(props: { rangeStartMs: number; rangeEndMs: number }) {
  const now = useNow();
  const ms = () => now().getTime();
  const fraction = () => (ms() - props.rangeStartMs) / (props.rangeEndMs - props.rangeStartMs);
  return (
    <Show when={ms() >= props.rangeStartMs && ms() < props.rangeEndMs}>
      <span
        aria-hidden="true"
        data-slot="gantt-now-dot"
        class="-bottom-0.75 -translate-x-1/2 absolute z-10 size-1.5 rounded-full bg-destructive"
        style={{ "inset-inline-start": `${fraction() * 100}%` }}
      />
    </Show>
  );
}

/**
 * Consumer-owned drag/resize indicators (renderDragPreview /
 * renderResizeIndicator): content is Solid JSX and updates per snap step from
 * drag state; the dnd engine adopts this wrapper and writes its
 * cursor-tracking transform imperatively, flipping visibility on the first
 * positioned frame so nothing flashes at the viewport origin.
 */
function GanttCustomDragLayer() {
  const viewConfig = useGanttViewConfig();
  const drag = useGanttSelector((state) => state.drag);
  const render = () =>
    drag()?.kind === "move" ? viewConfig.renderDragPreview : viewConfig.renderResizeIndicator;
  return (
    <Show when={drag() && render() ? drag() : null}>
      {(state) => (
        <div
          data-slot={state().kind === "move" ? "gantt-drag-overlay" : "gantt-resize-indicator"}
          data-custom=""
          // physical left-0 anchor: positioned by the engine's translate3d from
          // raw clientX (physical); a logical start-0 would break in RTL
          class="pointer-events-none fixed top-0 left-0 z-100 will-change-transform"
          style={{ visibility: "hidden" }}
        >
          {render()?.({
            occurrence: state().occurrence,
            kind: state().kind,
            start: state().proposedStart,
            end: state().proposedEnd,
            valid: state().valid,
          })}
        </div>
      )}
    </Show>
  );
}

interface OffscreenChip {
  id: string;
  side: "start" | "end";
  top: number;
  color?: string;
  label: string;
  /** First bar start, shown in the chip tooltip. */
  startMs: number | null;
  /** scrollLeft that brings the bar back into view. */
  target: number;
  /** End-chip inset in px, widened to clear the zoom control when they overlap. */
  insetEnd: number;
}

function sameChips(a: OffscreenChip[], b: OffscreenChip[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (chip, i) =>
        chip.id === b[i].id &&
        chip.side === b[i].side &&
        chip.top === b[i].top &&
        chip.target === b[i].target &&
        chip.insetEnd === b[i].insetEnd,
    )
  );
}

/**
 * Edge chips for rows whose bars sit entirely outside the visible timeline;
 * clicking scrolls the bar back into view. Reads geometry straight from the
 * DOM (row data attributes), so scrolling never recomputes the grid.
 */
function GanttOffscreenChips(props: {
  pane: Accessor<HTMLDivElement | undefined>;
  occurrences: GanttOccurrence[];
  locale?: Locale;
  refreshKey: string;
}) {
  const settings = useGanttSettings();
  const [chips, setChips] = createSignal<OffscreenChip[]>([]);

  createEffect(
    on([() => props.occurrences, () => props.refreshKey], () => {
      const pane = props.pane();
      const viewport = getPaneViewport(pane);
      if (!pane || !viewport) return;
      let raf = 0;
      const measure = () => {
        raf = 0;
        const paneRect = pane.getBoundingClientRect();
        const header = viewport.querySelector<HTMLElement>("[data-slot=gantt-timeline-header]");
        const headerBottom = header ? header.getBoundingClientRect().bottom - paneRect.top : 0;
        const trackW = viewport.scrollWidth;
        const visibleStart = getScrollStart(viewport);
        const visibleEnd = visibleStart + viewport.clientWidth;
        // the floating zoom control shares the right edge (higher z); end chips
        // whose row center falls in its band shift left so they stay clickable
        const zoomEl = pane.querySelector<HTMLElement>("[data-slot=gantt-zoom]");
        const zoom = zoomEl
          ? {
              top: zoomEl.getBoundingClientRect().top - paneRect.top - 8,
              bottom: zoomEl.getBoundingClientRect().bottom - paneRect.top + 8,
              inset: paneRect.right - zoomEl.getBoundingClientRect().left + 8,
            }
          : null;
        const next: OffscreenChip[] = [];
        for (const rowEl of viewport.querySelectorAll<HTMLElement>("[data-gantt-row]")) {
          const from = Number.parseFloat(rowEl.dataset.ganttBarMin ?? "");
          const to = Number.parseFloat(rowEl.dataset.ganttBarMax ?? "");
          if (Number.isNaN(from) || Number.isNaN(to)) continue;
          const rect = rowEl.getBoundingClientRect();
          const top = rect.top - paneRect.top + rect.height / 2;
          if (top < headerBottom + 10 || top > paneRect.height - 16) continue;
          const startPx = from * trackW;
          const endPx = to * trackW;
          const startMs = Number.parseFloat(rowEl.dataset.ganttBarStartMs ?? "");
          const base = {
            id: rowEl.dataset.ganttRowId ?? "",
            top: Math.round(top),
            color: rowEl.dataset.ganttBarColor,
            label: rowEl.dataset.ganttBarLabel ?? "",
            startMs: Number.isNaN(startMs) ? null : startMs,
          };
          if (endPx <= visibleStart + 2) {
            next.push({ ...base, side: "start", target: startPx - 24, insetEnd: 14 });
          } else if (startPx >= visibleEnd - 2) {
            const overlapsZoom = zoom && top >= zoom.top && top <= zoom.bottom;
            next.push({
              ...base,
              side: "end",
              target: endPx - viewport.clientWidth + 24,
              insetEnd: overlapsZoom ? Math.max(14, zoom.inset) : 14,
            });
          }
        }
        setChips((prev) => (sameChips(prev, next) ? prev : next));
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(measure);
      };
      viewport.addEventListener("scroll", schedule);
      const observer = new ResizeObserver(schedule);
      observer.observe(viewport);
      schedule();
      onCleanup(() => {
        viewport.removeEventListener("scroll", schedule);
        observer.disconnect();
        if (raf) cancelAnimationFrame(raf);
      });
    }),
  );

  const scrollTo = (chip: OffscreenChip) => {
    const viewport = getPaneViewport(props.pane());
    if (!viewport) return;
    const target = Math.max(0, chip.target);
    viewport.scrollTo({
      // chip targets are distances from the inline start; RTL signs them
      left: getComputedStyle(viewport).direction === "rtl" ? -target : target,
      behavior: "smooth",
    });
    // hand keyboard focus to the bar the chip promised (the chip unmounts)
    const bar = viewport.querySelector<HTMLElement>(
      `[data-gantt-row-id="${CSS.escape(chip.id)}"] [data-slot=gantt-bar]`,
    );
    bar?.focus({ preventScroll: true });
  };

  return (
    <Show when={chips().length > 0}>
      <div
        data-slot="gantt-offscreen-chips"
        class="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      >
        <TooltipProvider delay={600} closeDelay={0} timeout={300}>
          <For each={chips()}>
            {(chip) => (
              <Tooltip>
                <TooltipTrigger
                  as={(triggerProps: ComponentProps<"button">) => (
                    <button
                      {...triggerProps}
                      type="button"
                      data-slot="gantt-offscreen-chip"
                      data-side={chip.side}
                      aria-label={settings.i18n.labels.jumpToBar(chip.label)}
                      class="pointer-events-auto absolute flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs hover:text-foreground"
                      style={{
                        top: `${chip.top}px`,
                        ...(chip.side === "start"
                          ? { "inset-inline-start": "0.5rem" }
                          : { "inset-inline-end": `${chip.insetEnd}px` }),
                      }}
                    >
                      <Show
                        when={chip.side === "start"}
                        fallback={<ChevronRight class="size-3" aria-hidden="true" />}
                      >
                        <ChevronLeft class="size-3" aria-hidden="true" />
                      </Show>
                      <span
                        aria-hidden="true"
                        class="-end-px -top-px absolute size-1.5 rounded-full ring-1 ring-background"
                        style={{ background: chip.color ?? "var(--color-primary)" }}
                      />
                    </button>
                  )}
                  onClick={() => scrollTo(chip)}
                />
                <TooltipContent side={chip.side === "start" ? "right" : "left"}>
                  <div class="font-medium">{chip.label}</div>
                  <Show when={chip.startMs !== null}>
                    <div class="opacity-80">
                      {/* zoned: the chip must name the same day the grid shows */}
                      {format(
                        toZoned(new Date(chip.startMs as number), settings.timeZone),
                        "MMM d, yyyy",
                        { locale: props.locale },
                      )}
                    </div>
                  </Show>
                </TooltipContent>
              </Tooltip>
            )}
          </For>
        </TooltipProvider>
      </div>
    </Show>
  );
}

export type { GanttViewProps };
export { GanttView };
