import { type Accessor, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { getDayKey, MIN_PACK_SLOT } from "./gantt-lib";
import type { GanttResource, GanttResourceReorder, GanttSegment } from "./gantt-types";

/**
 * Row geometry is three numbers: a bar is LANE_HEIGHT_REM tall, stacked bars
 * are separated by LANE_GAP_REM, and the block as a whole is inset from the
 * row's edges by ROW_PADDING_REM. Padding and gap are deliberately NOT the
 * same value - schedules in one node belong together, so they sit tight, while
 * the row still needs real breathing room above and below. Every inter-lane
 * gap is identical, which is what keeps a stacked row reading evenly.
 */
const LANE_HEIGHT_REM = 1.25;
const LANE_GAP_REM = 0.1875;
const ROW_PADDING_REM = 0.5;
/** Drop-indicator height (h-5); it is centered inside its lane band. */
const GHOST_HEIGHT_REM = 1.25;
/** Bars narrower than this flip their title outside in barLabel "auto". */
const AUTO_LABEL_MIN_REM = 7;
const DEFAULT_TREE_PANEL = {
  width: 288,
  minWidth: 180,
  maxWidth: 640,
  resizable: true,
  nameColumnWidth: 208,
};
const DEFAULT_COLUMN_WIDTH = 96;
const DEFAULT_ZOOM_RANGE = { min: 0.5, max: 3 };
/** Timeline pane never shrinks below this so it stays usable on narrow screens. */
const MIN_TIMELINE_WIDTH = 200;
/** Scroll distance from an edge that triggers infinite-range growth. */
const INFINITE_EDGE_PX = 160;

interface TimelineUnit {
  key: string;
  label: string;
  ms: number;
  /** Relative width share; uniform scales use 1 (year: days per month). */
  weight: number;
  isToday?: boolean;
  isOff?: boolean;
}

interface TimelineGroup {
  key: string;
  label: string;
  span: number;
}

interface TimelineRow {
  resource: GanttResource;
  parentId: string | null;
  depth: number;
  isGroup: boolean;
  collapsed: boolean;
}

/** Per-row packed bars plus the extents the off-screen chips need. */
interface TimelineRowBars {
  segments: GanttSegment[];
  laneCount: number;
  /**
   * Lane a drag-create in flight would land on, or null when none is aimed at
   * this row. The row reserves the track, so it grows exactly as it will on
   * commit and the placeholder never has to overlap the bar it is going under.
   * Computed here, once, because BOTH panes size themselves from this object -
   * deriving it a second time in the timeline row is how the two would drift.
   */
  draftLane: number | null;
  /** Mode this row was packed under; the draft overlay must honour it. */
  scheduleMode: "single" | "multiple";
  heightRem: number;
  /** Gap above the first bar; equal to every other gap in the row. */
  laneOffsetRem: number;
  /**
   * The band the FIRST schedule occupies, its gaps included. The tree cell
   * sizes its label box to exactly this, so the label and the first bar share
   * a centerline however many lanes the node grew.
   */
  bandRem: number;
  /** Envelope of all bars, as track fractions; null when the row is empty. */
  extent: {
    from: number;
    to: number;
    color?: string;
    label: string;
    /** First bar start, for the jump-chip tooltip. */
    startMs: number;
  } | null;
  /**
   * Parent rollup: descendant-bar envelope + duration-weighted progress,
   * present only on group rows without bars of their own.
   */
  summary: { from: number; to: number; progress: number | null } | null;
}

interface TimelineReorderState {
  resourceId: string;
  /** Insertion offset (px) within the tree pane. */
  top: number;
  valid: boolean;
  proposal: GanttResourceReorder | null;
}

/** A snapped placement target on the axis: the unit under the pointer. */
interface HintStop {
  index: number;
  center: number;
  ms: number;
  endMs: number;
}

/** Current time, refreshed on an interval and on tab focus. */
function useNow(intervalMs = 30_000): Accessor<Date> {
  const [now, setNow] = createSignal(new Date());
  onMount(() => {
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

/**
 * Today's zoned day key, changing only at the midnight rollover (and on
 * focus/visibility) - the grid needs day granularity, not the 30s now tick.
 */
function useTodayKey(timeZone: Accessor<string>): Accessor<string> {
  const [key, setKey] = createSignal(getDayKey(new Date(), timeZone()));
  createEffect(
    on(timeZone, (zone) => {
      const tick = () =>
        setKey((prev) => {
          const next = getDayKey(new Date(), zone);
          return next === prev ? prev : next;
        });
      tick();
      const id = setInterval(tick, 60_000);
      document.addEventListener("visibilitychange", tick);
      window.addEventListener("focus", tick);
      onCleanup(() => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", tick);
        window.removeEventListener("focus", tick);
      });
    }),
  );
  return key;
}

/**
 * Lowest lane free for [startMs, endMs) among a row's segments, padded by
 * MIN_PACK_SLOT exactly as packTimedSegments pads its own occupancy test.
 * Comparing raw instants instead lets a sub-slot bar read as clear, so an
 * affordance would promise a lane the packer then refuses.
 *
 * Shared by the hover hint and the drag placeholder on purpose: two copies of
 * this is how the ring and the range it paints end up on different tracks.
 */
function lowestFreeLane(segments: GanttSegment[], startMs: number, endMs: number): number {
  const padMs = MIN_PACK_SLOT * 60000;
  const to = Math.max(endMs, startMs + padMs);
  const busy = new Set<number>();
  for (const segment of segments) {
    const segStart = segment.occurrence.start.getTime();
    const segEnd = Math.max(segment.occurrence.end.getTime(), segStart + padMs);
    if (segStart < to && segEnd > startMs) busy.add(segment.column ?? 0);
  }
  let lane = 0;
  while (busy.has(lane)) lane += 1;
  return lane;
}

/**
 * Pointer x resolved against the element's TIME axis: the 0..1 fraction and
 * the same measurement in CSS pixels from the axis start. Mirrored in RTL,
 * where the range start renders at the element's right edge. One rect read
 * and one style read, because this runs on every pointer move.
 */
function trackPoint(el: HTMLElement, clientX: number): { fraction: number; offset: number } {
  const rect = el.getBoundingClientRect();
  const rtl = getComputedStyle(el).direction === "rtl";
  const offset = rtl ? rect.right - clientX : clientX - rect.left;
  // `offset` is exact and drives the time maths. `snapped` is the same value
  // biased so that rect start + snapped lands on a WHOLE viewport pixel: the
  // row's own edge routinely sits on a half pixel, so rounding the offset
  // alone still puts anything placed at it between two pixels.
  const snapped = rtl ? rect.right - Math.round(clientX) : Math.round(clientX) - rect.left;
  return {
    fraction: rect.width > 0 ? offset / rect.width : 0,
    offset: snapped,
  };
}

/** Fraction only, for the call sites that do not place anything. */
function trackFraction(el: HTMLElement, clientX: number): number {
  return trackPoint(el, clientX).fraction;
}

/** The pane's scrollable viewport (custom ScrollArea or native host). */
function getPaneViewport(pane: HTMLElement | null | undefined): HTMLElement | null {
  return pane?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]") ?? null;
}

/** Distance scrolled from the inline-start edge (RTL reports negative). */
function getScrollStart(viewport: HTMLElement): number {
  return Math.abs(viewport.scrollLeft);
}

/** Write a distance-from-inline-start back as a signed scrollLeft. */
function setScrollStart(viewport: HTMLElement, value: number) {
  viewport.scrollLeft = getComputedStyle(viewport).direction === "rtl" ? -value : value;
}

export type {
  HintStop,
  TimelineGroup,
  TimelineReorderState,
  TimelineRow,
  TimelineRowBars,
  TimelineUnit,
};
export {
  AUTO_LABEL_MIN_REM,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_TREE_PANEL,
  DEFAULT_ZOOM_RANGE,
  GHOST_HEIGHT_REM,
  getPaneViewport,
  getScrollStart,
  INFINITE_EDGE_PX,
  LANE_GAP_REM,
  LANE_HEIGHT_REM,
  lowestFreeLane,
  MIN_TIMELINE_WIDTH,
  ROW_PADDING_REM,
  setScrollStart,
  trackFraction,
  trackPoint,
  useNow,
  useTodayKey,
};
