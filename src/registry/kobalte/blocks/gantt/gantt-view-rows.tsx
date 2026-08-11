import { ChevronRight, GripVertical } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/registry/kobalte/ui/context-menu";
import type { GanttColumn } from "./gantt";
import {
  DEFAULT_ROW_ALIGN,
  resolveScheduleMode,
  useGantt,
  useGanttSelector,
  useGanttSettings,
  useGanttViewConfig,
} from "./gantt";
import { GanttBar } from "./gantt-bar";
import type { GanttPointerEvent } from "./gantt-dnd";
import { useGanttGestures, wasRecentDrag } from "./gantt-dnd";
import { toZoned } from "./gantt-lib";
import type { HintStop, TimelineRow, TimelineRowBars } from "./gantt-view-lib";
import {
  AUTO_LABEL_MIN_REM,
  DEFAULT_COLUMN_WIDTH,
  GHOST_HEIGHT_REM,
  lowestFreeLane,
  trackFraction,
  trackPoint,
} from "./gantt-view-lib";

/**
 * The context-menu trigger rendered AS the tree row. The polymorphic generic
 * cannot express "every div attribute plus the trigger's own", so the
 * composition is typed as a plain div here.
 */
const ContextMenuTriggerDiv = ContextMenuTrigger as unknown as (
  props: ComponentProps<"div"> & { as: "div" },
) => JSX.Element;

interface GanttTreeRowProps {
  row: TimelineRow;
  heightRem: number;
  bandRem: number;
  columns: GanttColumn[];
  nameWidth: number;
  dimmed: boolean;
  selected: boolean;
  onSelectedChange?: (id: string, checked: boolean) => void;
  onGripPointerDown?: (e: GanttPointerEvent, row: TimelineRow) => void;
  onToggle: (row: TimelineRow) => void;
}

function GanttTreeRow(props: GanttTreeRowProps) {
  const settings = useGanttSettings();
  const viewConfig = useGanttViewConfig();
  const ctx = () => ({
    resource: props.row.resource,
    depth: props.row.depth,
    isGroup: props.row.isGroup,
    collapsed: props.row.collapsed,
  });

  // consumer-owned right-click menu, same contract as the bar menu
  const hasMenu = () => !!viewConfig.renderResourceMenu;

  // A node with several schedules grows its row; "start" keeps the label and
  // its columns on the FIRST schedule's baseline instead of floating them to
  // the middle of a tall row. Every cell's inner box is minRowHeight tall, so
  // a single-lane row renders identically either way.
  const alignStart = () => (viewConfig.rowAlign ?? DEFAULT_ROW_ALIGN) === "start";

  const chromeClick = (e: MouseEvent & { target: Element }) =>
    !!e.target.closest?.("button, [role=checkbox]");

  const rowAttrs = {
    "data-slot": "gantt-row-group",
    get "data-gantt-row-id"() {
      return props.row.resource.id;
    },
    get "data-selected"() {
      return props.selected || undefined;
    },
    get class() {
      return cn(
        "group/gantt-row flex border-b data-hover:bg-muted/40 data-selected:bg-primary/5 data-selected:data-hover:bg-primary/5",
        props.dimmed && "opacity-50",
      );
    },
    get style(): JSX.CSSProperties {
      return { height: `${props.heightRem}rem` };
    },
    onClick: (e: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
      // chrome clicks (chevron, checkbox, grip) are their own actions
      if (!settings.onResourceClick || chromeClick(e)) return;
      settings.onResourceClick(ctx(), e);
    },
    onDblClick: (e: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
      if (!settings.onResourceDoubleClick || chromeClick(e)) return;
      settings.onResourceDoubleClick(ctx(), e);
    },
  } as unknown as ComponentProps<"div">;

  const rowChildren = () => (
    <div class="flex h-full w-full min-w-0">
      {/* In-flow name cell: the whole tree row scrolls horizontally as one;
          row-level hover/selected tints show through the transparent cell */}
      <div
        data-slot="gantt-tree-cell"
        class={cn(
          // ps-3 keeps the row toggles off the left edge (kept in sync with
          // namePaddingStart in the view so headers stay aligned with titles)
          "flex shrink-0 ps-3 pe-3",
          alignStart() ? "items-start" : "items-center",
          props.row.isGroup && "font-medium",
        )}
        style={{ width: `${props.nameWidth}px` }}
      >
        {/* exactly the band the first schedule occupies: same height, both
            top-anchored, so the label and that schedule share a centerline */}
        <div class="flex w-full min-w-0 items-center" style={{ height: `${props.bandRem}rem` }}>
          <Show when={props.onGripPointerDown}>
            <button
              type="button"
              data-slot="gantt-row-grip"
              aria-label={settings.i18n.labels.reorder}
              // pointer-coarse keeps the grip visible on touch (no hover there).
              // -ms-1.5/me-1.5 nudge the grip toward the row edge and open a
              // gap before the checkbox so it's easy to grab without catching
              // the checkbox; the equal start/end margins keep the grip's
              // footprint net-zero, so the title stays aligned with the header.
              class="-ms-1.5 me-1.5 flex w-3.5 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 opacity-0 pointer-coarse:opacity-100 hover:text-foreground focus-visible:opacity-100 group-hover/gantt-row:opacity-100 group-data-hover/gantt-row:opacity-100"
              onPointerDown={(e) => props.onGripPointerDown?.(e, props.row)}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical class="size-3" aria-hidden="true" />
            </button>
          </Show>
          {/* per-level indent keeps sibling titles on one x */}
          <span
            aria-hidden="true"
            class="shrink-0"
            style={{ width: `${props.row.depth * 0.875}rem` }}
          />
          {/* fixed gutter: groups toggle here, leaves carry the checkbox -
              titles of one level share the same x either way */}
          <span class="me-1 flex w-5 shrink-0 items-center justify-start">
            <Show
              when={props.row.isGroup}
              fallback={
                <Show when={viewConfig.rowCheckboxes && props.onSelectedChange}>
                  <Checkbox
                    data-slot="gantt-row-checkbox"
                    checked={props.selected}
                    onChange={(checked: boolean) =>
                      props.onSelectedChange?.(props.row.resource.id, checked)
                    }
                    aria-label={props.row.resource.title}
                    class={cn(
                      "size-3.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/gantt-row:opacity-100 group-data-hover/gantt-row:opacity-100",
                      props.selected && "opacity-100",
                    )}
                  />
                </Show>
              }
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-expanded={!props.row.collapsed}
                aria-label={props.row.resource.title}
                class={cn(
                  "size-5! aria-expanded:bg-transparent!",
                  props.row.collapsed
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground! aria-expanded:text-muted-foreground!",
                )}
                onClick={() => props.onToggle(props.row)}
              >
                <ChevronRight
                  class={cn("size-3.5 transition-transform", !props.row.collapsed && "rotate-90")}
                  aria-hidden="true"
                />
              </Button>
            </Show>
          </span>
          {viewConfig.renderResourceLabel?.(ctx()) ?? (
            <span class="truncate">{props.row.resource.title}</span>
          )}
        </div>
      </div>
      <For each={props.columns}>
        {(column) => (
          <div
            data-slot="gantt-tree-column-cell"
            data-column={column.id}
            class={cn(
              "flex shrink-0 px-2",
              alignStart() ? "items-start" : "items-center",
              column.class,
            )}
            style={{ width: `${column.width ?? DEFAULT_COLUMN_WIDTH}px` }}
          >
            <div
              class={cn(
                "flex w-full min-w-0 items-center",
                column.align === "center" && "justify-center",
                column.align === "end" && "justify-end",
              )}
              style={{ height: `${props.bandRem}rem` }}
            >
              {column.render?.(ctx())}
            </div>
          </div>
        )}
      </For>
      <div class="min-w-0 flex-1" />
    </div>
  );

  return (
    <Show when={hasMenu()} fallback={<div {...rowAttrs}>{rowChildren()}</div>}>
      <ContextMenu>
        <ContextMenuTriggerDiv as="div" {...rowAttrs}>
          {rowChildren()}
        </ContextMenuTriggerDiv>
        <ContextMenuContent data-slot="gantt-resource-menu" class="min-w-44">
          {viewConfig.renderResourceMenu?.(ctx())}
        </ContextMenuContent>
      </ContextMenu>
    </Show>
  );
}

interface GanttTimelineRowProps {
  row: TimelineRow;
  rowIndex: number;
  bars: TimelineRowBars | undefined;
  rangeStartMs: number;
  rangeEndMs: number;
  trackWidth: string;
  trackRemWidth: number;
  rowBorder: "solid" | "dashed" | null;
  selected: boolean;
  resolveHintStop: (fraction: number) => HintStop | null;
  isPanning: boolean;
  laneHeightRem: number;
  laneGapRem: number;
  minRowRem: number;
}

function GanttTimelineRow(props: GanttTimelineRowProps) {
  const instance = useGantt();
  const settings = useGanttSettings();
  const viewConfig = useGanttViewConfig();
  const gestures = useGanttGestures();
  const segments = () => props.bars?.segments ?? [];
  // parents aggregate their subtree; they take no direct scheduling gestures
  const schedulable = () => !props.row.isGroup || viewConfig.parentScheduling;
  const heightRem = () => props.bars?.heightRem ?? props.minRowRem;
  const laneCount = () => props.bars?.laneCount ?? 1;
  const singleTrack = () =>
    resolveScheduleMode(props.row.resource, viewConfig.scheduleMode) === "single";
  // shared with the tree pane so the two can never drift apart
  const laneOffsetRem = () =>
    props.bars?.laneOffsetRem ?? (props.minRowRem - props.laneHeightRem) / 2;

  // Hover affordance over empty track space: the ghost tile snaps to the
  // unit under the cursor, so the (real) tooltip re-anchors per unit
  const [hintStop, setHintStop] = createSignal<HintStop | null>(null);
  // Gated on an active hint: rows without one read a stable false, so a
  // gesture starting/ending anywhere doesn't recompute for every row.
  const hintSuppressed = useGanttSelector<unknown, boolean>(
    (state) => hintStop() !== null && (state.drag !== null || state.slotDraft !== null),
  );
  const canSchedule = useGanttSelector<unknown, boolean>((state) => state.interactions.selectSlot);
  // The affordance is offered ANYWHERE on a schedulable row - over bare track
  // and over existing bars alike - because a row can always take another
  // schedule on a free lane. The primitive deliberately owns NO opinion about
  // what may land where: that is `canSelectSlot`, the consumer's call.
  // The lowest track FREE at the hovered time. Two jobs, kept separate on
  // purpose:
  //  - VISIBILITY: `hintFreeLane < laneCount` is what proves an empty track
  //    actually exists to draw on. It is computed regardless of mode, because
  //    a "single" row whose only track is booked has nowhere free either, and
  //    pinning the placement to 0 there would put the ring straight on the bar.
  //  - PLACEMENT: "single" packs everything onto track 0, so that is where its
  //    ring belongs; otherwise the ring sits on the track the schedule will
  //    actually land on. Lane is a function of TIME only, so moving the pointer
  //    down onto the ring never moves it away from you.
  const hintFreeLane = () => {
    const stop = hintStop();
    return stop ? lowestFreeLane(segments(), stop.ms, stop.endMs) : 0;
  };
  const hintLane = () => (props.bars?.scheduleMode === "single" ? 0 : hintFreeLane());
  const hintTopRem = () =>
    Math.min(
      laneOffsetRem() +
        hintLane() * (props.laneHeightRem + props.laneGapRem) +
        props.laneHeightRem / 2,
      Math.max(heightRem() - props.laneHeightRem / 2, props.laneHeightRem / 2),
    );
  // Single source of truth for "the add affordance is live at this spot". The
  // ring renders on it AND the row takes its cursor from it, so the pointer can
  // never promise something the ring is not offering.
  const hintVisible = () =>
    hintStop() !== null && hintFreeLane() < laneCount() && !hintSuppressed() && !props.isPanning;
  // name the gesture that is actually wired, not a generic one
  const hintLabel = () =>
    viewConfig.dragCreate
      ? settings.i18n.labels.scheduleHintDrag
      : settings.i18n.labels.scheduleHint;
  const showHint = () =>
    viewConfig.displayScheduleHint &&
    schedulable() &&
    canSchedule() &&
    !props.isPanning &&
    !!(settings.onSelectSlot || settings.onSlotClick);

  const fractionOf = (ms: number) =>
    Math.min(Math.max((ms - props.rangeStartMs) / (props.rangeEndMs - props.rangeStartMs), 0), 1);

  const dragTarget = useGanttSelector<unknown, "valid" | "invalid" | null>((state) => {
    const drag = state.drag;
    if (!drag || drag.proposedResourceId !== props.row.resource.id) return null;
    return drag.valid ? "valid" : "invalid";
  });
  const ghost = useGanttSelector<
    unknown,
    {
      from: number;
      to: number;
      color?: string;
      valid: boolean;
      title: string;
      kind: string;
      occurrenceKey: string;
    } | null
  >(
    (state) => {
      const drag = state.drag;
      if (!drag || drag.proposedResourceId !== props.row.resource.id) return null;
      return {
        from: fractionOf(drag.proposedStart.getTime()),
        to: fractionOf(drag.proposedEnd.getTime()),
        color: drag.occurrence.event.color,
        valid: drag.valid,
        title: drag.occurrence.event.title,
        kind: drag.kind,
        occurrenceKey: drag.occurrence.key,
      };
    },
    {
      isEqual: (a, b) =>
        a === b ||
        (a !== null && b !== null && a.from === b.from && a.to === b.to && a.valid === b.valid),
    },
  );
  const draft = useGanttSelector<
    unknown,
    { from: number; to: number; startMs: number; endMs: number } | null
  >(
    (state) => {
      const slotDraft = state.slotDraft;
      if (!slotDraft || slotDraft.resourceId !== props.row.resource.id) return null;
      const startMs = slotDraft.start.getTime();
      const endMs = slotDraft.end.getTime();
      return { from: fractionOf(startMs), to: fractionOf(endMs), startMs, endMs };
    },
    {
      // from/to as well as the instants: they are derived through fractionOf,
      // which reads the range. An extendRange mid-gesture moves every bar while
      // an instants-only compare serves the cached (stale) fractions, leaving
      // the placeholder pinned to where the range used to be.
      isEqual: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.startMs === b.startMs &&
          a.endMs === b.endMs &&
          a.from === b.from &&
          a.to === b.to),
    },
  );

  /**
   * Where the schedule being painted will land - resolved in the shared layout
   * memo, which also RESERVES that track, so the row has already grown to hold
   * it. The clamp is only a backstop for the frame between a draft appearing
   * and the layout catching up.
   */
  const draftLane = () => props.bars?.draftLane ?? 0;
  const draftTopRem = () =>
    Math.min(
      laneOffsetRem() + draftLane() * (props.laneHeightRem + props.laneGapRem),
      Math.max(heightRem() - props.laneHeightRem, 0),
    );
  // the range you are painting, named while you paint it - a drag that shows
  // no times asks you to guess where you let go
  const draftLabel = () => {
    const value = draft();
    return value
      ? settings.i18n.functions.formatEventTime(
          toZoned(new Date(value.startMs), settings.timeZone),
          toZoned(new Date(value.endMs), settings.timeZone),
          false,
          settings.locale,
        )
      : "";
  };

  /**
   * The row's create contract, in one place: onSlotClick if the consumer
   * wired it, else a ready-made slot draft. Both the hint tile and a plain
   * click on bare track go through this, so clicking anywhere placeable
   * behaves the same as clicking the tile.
   */
  const createAt = (stop: { ms: number; endMs: number }, e: MouseEvent) => {
    if (settings.onSlotClick) {
      settings.onSlotClick(
        { date: new Date(stop.ms), allDay: false, resourceId: props.row.resource.id },
        e,
      );
    } else {
      settings.onSelectSlot?.({
        start: new Date(stop.ms),
        end: new Date(Math.max(stop.endMs, stop.ms + 1)),
        allDay: false,
        resourceId: props.row.resource.id,
      });
    }
  };

  const allowsSlot = (stop: HintStop | null) =>
    stop !== null &&
    (settings.canSelectSlot?.({
      start: new Date(stop.ms),
      end: new Date(Math.max(stop.endMs, stop.ms + 1)),
      allDay: false,
      resourceId: props.row.resource.id,
    }) ??
      true);

  // The drop indicator belongs on the lane the dragged schedule actually
  // occupies. The gesture has not committed, so the segment is still packed
  // under its pre-drag key - no second packing pass, just a lookup.
  const ghostLane = () => {
    const value = ghost();
    return value
      ? (segments().find((segment) => segment.occurrence.key === value.occurrenceKey)?.column ?? 0)
      : 0;
  };
  const ghostLaneOffsetRem = () =>
    laneOffsetRem() +
    ghostLane() * (props.laneHeightRem + props.laneGapRem) +
    (props.laneHeightRem - GHOST_HEIGHT_REM) / 2;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the row's click is a pointer-only create shortcut; the keyboard path is the schedule-hint tile button rendered inside it.
    // biome-ignore lint/a11y/noStaticElementInteractions: the row is the pan / drag-create / hover-hint pointer surface; giving it a widget role would misdescribe a scroll canvas to assistive tech.
    <div
      data-gantt-row=""
      data-gantt-resource={props.row.resource.id}
      data-gantt-row-id={props.row.resource.id}
      data-gantt-row-static={!schedulable() || undefined}
      data-gantt-bar-min={props.bars?.extent?.from}
      data-gantt-bar-max={props.bars?.extent?.to}
      data-gantt-bar-color={props.bars?.extent?.color}
      data-gantt-bar-label={props.bars?.extent?.label}
      data-gantt-bar-start-ms={props.bars?.extent?.startMs}
      data-drop-target={dragTarget() ?? undefined}
      data-selected={props.selected || undefined}
      class={cn(
        "relative w-full min-w-0 data-hover:bg-muted/30 data-selected:bg-primary/5 data-selected:data-hover:bg-primary/5",
        // The ring is pointer-events-none, so a cursor set on IT can never be
        // reached - the row is the element actually under the pointer, so the
        // cursor belongs here. Gated on the same flag as the ring: wherever the
        // add affordance shows, the pointer says "add", and nowhere else.
        hintVisible() && "cursor-crosshair",
        // horizontal separators mirror the tree node borders across panes.
        // No special case for the last row: the columns run the full height of
        // the pane, so the grid closes on the container edge on its own.
        props.rowBorder !== null && "border-b",
        props.rowBorder === "dashed" && "border-dashed",
        dragTarget() === "valid" && "bg-muted/40",
        dragTarget() === "invalid" && "bg-destructive/10",
      )}
      style={{ height: `${heightRem()}rem`, "min-width": props.trackWidth }}
      onPointerDown={(e) => {
        // Opt-in drag-create owns presses on empty schedulable track (the
        // onSelectSlot contract); otherwise the press bubbles to the
        // container and pans the timeline.
        if (
          viewConfig.dragCreate &&
          e.button === 0 &&
          schedulable() &&
          canSchedule() &&
          // the bare track, or the hint tile that spawns under the cursor -
          // a sub-threshold press still ends as the tile's own click
          (e.target === e.currentTarget ||
            !!(e.target as HTMLElement).closest?.("[data-slot=gantt-schedule-hint]")) &&
          settings.onSelectSlot
        ) {
          // validate BEFORE claiming the press: on a vetoed slot (e.g. the
          // one-schedule-per-task rule) the press falls through to the pan
          const stop = props.resolveHintStop(trackFraction(e.currentTarget, e.clientX));
          if (!allowsSlot(stop)) return;
          e.stopPropagation();
          gestures.beginCreate(e);
        }
      }}
      onPointerMove={(e) => {
        // read interaction state imperatively - the row must not recompute
        // for every gesture anywhere on the grid
        const interacting =
          instance.getState().drag !== null || instance.getState().slotDraft !== null;
        if (!showHint() || e.pointerType !== "mouse" || interacting) {
          if (hintStop()) setHintStop(null);
          return;
        }
        // EMPTY TRACK ONLY. A bar under the pointer means the pointer is not
        // on an empty slot, so the affordance goes away entirely rather than
        // hovering over booked time - and the bar is left completely alone,
        // hover and click both. (No "pointer is over the tile" bail: the ring
        // is pointer-events-none, so it is never the target; a bail on it would
        // freeze it on the spot, since it rides under the cursor.)
        if (e.target !== e.currentTarget) {
          if (hintStop()) setHintStop(null);
          return;
        }
        const { fraction, offset } = trackPoint(e.currentTarget, e.clientX);
        // The dot follows the pointer FREELY - it is a cursor, not a cell, so
        // it is never quantised to the interval grid. Its position is written
        // as a CSS custom property straight onto the row: the cursor moves
        // every frame and a signal write per frame would re-run the row's
        // bindings. Signal state still owns WHICH slot is offered, and that
        // changes only once per interval.
        //
        // In pixels rather than a percentage, pre-snapped by trackPoint to the
        // viewport pixel grid: a fractional inset makes the browser antialias
        // the ring and the glyph across two device pixels, which reads as a
        // furry, smudged dot. -translate-x-1/2 of an even-sized box keeps it on
        // the grid, so the result is crisp.
        e.currentTarget.style.setProperty("--gantt-hint-x", `${offset}px`);
        const stop = props.resolveHintStop(fraction);
        // validate placement before offering it: a consumer canSelectSlot
        // veto (e.g. a locked span) hides the hint entirely
        const next = allowsSlot(stop) ? stop : null;
        // state changes only when the cursor crosses into another unit
        if (next?.index !== hintStop()?.index) setHintStop(next);
      }}
      onPointerLeave={() => {
        if (hintStop()) setHintStop(null);
      }}
      onClick={(e) => {
        // With dragCreate the press belongs to the create GESTURE, which only
        // activates past its movement threshold - so a click that never moved
        // committed nothing and the row felt dead. Treat it as a create at the
        // hovered slot, using the same validation the hint tile uses.
        if (!viewConfig.dragCreate || e.target !== e.currentTarget) return;
        if (!schedulable() || !canSchedule()) return;
        if (wasRecentDrag()) return;
        if (!settings.onSlotClick && !settings.onSelectSlot) return;
        const stop = props.resolveHintStop(trackFraction(e.currentTarget, e.clientX));
        if (!stop) return;
        if (!allowsSlot(stop)) return;
        createAt(stop, e);
        setHintStop(null);
      }}
    >
      {/* row CONTENT (bars, labels, ghosts). Pointer-transparent so
          empty-track presses still hit the row itself.
          content-visibility lets the browser skip rendering this layer for
          rows scrolled out of view (large trees stay cheap on low-end
          devices). Safe here: the layer is absolute inset-0 (geometry comes
          from the row, never from content), its paint containment keeps it
          a stacking context, and nothing inside escapes the row box - the
          schedule hint deliberately lives OUTSIDE this layer. Browsers
          without support simply ignore it. */}
      <div class="pointer-events-none absolute inset-0" style={{ "content-visibility": "auto" }}>
        <For each={segments()}>
          {(segment, segmentIndex) => {
            const from = () => fractionOf(props.rangeStartMs + (segment.startMin ?? 0) * 60000);
            const to = () => fractionOf(props.rangeStartMs + (segment.endMin ?? 0) * 60000);
            const lane = () => segment.column ?? 0;
            // Title placement: outside beside the bar when configured (or too
            // short in "auto"), flipped before the bar near the range end, and
            // back inside when the bar spans the whole view.
            const barRemWidth = () => (to() - from()) * props.trackRemWidth;
            const wantsOutside = () =>
              viewConfig.barLabel === "outside" ||
              (viewConfig.barLabel === "auto" &&
                barRemWidth() < (viewConfig.metrics?.autoLabelMin ?? AUTO_LABEL_MIN_REM));
            const placement = () =>
              !wantsOutside()
                ? "inside"
                : to() <= 0.92
                  ? "after"
                  : from() >= 0.08
                    ? "before"
                    : "inside";
            // the wrapper carries the drag kind itself (from the row's ghost
            // state, same notify as the bar's own attribute) so the hide rules
            // below use plain attribute selectors instead of :has(), which
            // older Firefox (<121) does not support
            const segDragKind = () => {
              const value = ghost();
              return value && value.occurrenceKey === segment.occurrence.key
                ? value.kind
                : undefined;
            };
            return (
              <Show when={to() > from()}>
                <div
                  data-drag-kind={segDragKind()}
                  // lane position is headless state: a consumer can read it to
                  // label the bar ("2 of 4") or drive its own manage UI
                  data-lane={lane()}
                  data-lane-count={laneCount()}
                  // during a MOVE the whole thing (bar + its outside label) hides so
                  // the smooth clone carries both; resize keeps the BAR as a faint
                  // placeholder but its label yields to the ghost's outside label.
                  // pointer-events-auto: the parent mask layer is pointer-
                  // transparent so empty-track presses reach the row.
                  // px-px keeps back-to-back bars off each other; the vertical
                  // breathing room is the lane gap itself, not padding here, so
                  // the bar is exactly laneHeight tall
                  class="group/gantt-seg pointer-events-auto absolute px-px data-[drag-kind=move]:opacity-0"
                  // inset-inline-start, not left: in RTL the axis mirrors and
                  // bars must mirror with it (fractions measure from the range
                  // start)
                  style={{
                    "inset-inline-start": `${from() * 100}%`,
                    width: `${Math.max((to() - from()) * 100, 0.5)}%`,
                    top: `${laneOffsetRem() + lane() * (props.laneHeightRem + props.laneGapRem)}rem`,
                    height: `${props.laneHeightRem}rem`,
                    // one track means every lane is 0, so paint order (not the
                    // lane) is what keeps overlapping bars individually reachable
                    "z-index":
                      segment.occurrence.event.zIndex ??
                      10 + (singleTrack() ? segmentIndex() : lane()),
                  }}
                >
                  <GanttBar
                    segment={segment}
                    labelOutside={placement() !== "inside"}
                    rowTitle={props.row.resource.title}
                    class="h-full"
                  />
                  <Show when={placement() !== "inside"}>
                    <span
                      data-slot="gantt-bar-label"
                      data-placement={placement()}
                      class={cn(
                        "pointer-events-none absolute top-1/2 z-10 max-w-60 -translate-y-1/2 truncate font-medium text-foreground",
                        // one label at a time: the resize ghost carries it while
                        // this bar is the faded placeholder
                        "group-data-[drag-kind^=resize]/gantt-seg:opacity-0",
                        placement() === "after" ? "ms-2 start-full" : "me-2 end-full",
                      )}
                    >
                      {segment.occurrence.event.title}
                    </span>
                  </Show>
                </div>
              </Show>
            );
          }}
        </For>
        <Show when={props.bars?.summary && segments().length === 0 ? props.bars.summary : null}>
          {(summary) => (
            <div
              data-slot="gantt-summary"
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{
                "inset-inline-start": `${summary().from * 100}%`,
                width: `${Math.max((summary().to - summary().from) * 100, 0.5)}%`,
              }}
            >
              <Show
                when={viewConfig.renderSummary}
                fallback={
                  <>
                    {/* envelope end caps: the classic PM rollup silhouette, muted */}
                    <span
                      aria-hidden="true"
                      class="absolute start-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                    />
                    <span
                      aria-hidden="true"
                      class="absolute end-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                    />
                    <div class="relative h-1.5 overflow-hidden rounded-full bg-muted-foreground/20">
                      <Show when={summary().progress !== null}>
                        <div
                          data-slot="gantt-summary-progress"
                          class="absolute inset-y-0 start-0 rounded-full bg-muted-foreground/50"
                          style={{ width: `${summary().progress}%` }}
                        />
                      </Show>
                    </div>
                    <Show when={summary().progress !== null}>
                      <span class="absolute start-full top-1/2 ms-2 -translate-y-1/2 whitespace-nowrap text-muted-foreground">
                        {summary().progress}%
                      </span>
                    </Show>
                  </>
                }
              >
                {/* consumer-owned rollup: the positioned envelope wrapper stays */}
                {viewConfig.renderSummary?.({
                  resource: props.row.resource,
                  start: new Date(
                    props.rangeStartMs + summary().from * (props.rangeEndMs - props.rangeStartMs),
                  ),
                  end: new Date(
                    props.rangeStartMs + summary().to * (props.rangeEndMs - props.rangeStartMs),
                  ),
                  progress: summary().progress,
                })}
              </Show>
            </div>
          )}
        </Show>
        <Show when={ghost()}>
          {(value) => (
            <div
              data-slot="gantt-drag-ghost"
              data-kind={value().kind}
              data-drop-invalid={!value().valid || undefined}
              class={cn(
                // Slight dashed indicator, never a dramatic restyle. Move shows a
                // faint drop-target placeholder (the smooth cursor clone carries
                // the visual); resize shows the event at its new size in its own
                // color with just a dashed border.
                "pointer-events-none absolute z-40 h-5 rounded-sm border border-dashed font-medium",
                !value().valid && "border-destructive bg-destructive/10 text-destructive",
                value().valid &&
                  value().kind === "move" &&
                  "border-(--gantt-event-color)/50 bg-(--gantt-event-color)/8",
                value().valid &&
                  value().kind !== "move" &&
                  "border-(--gantt-event-color)/70 bg-(--gantt-event-color)/22 text-foreground",
              )}
              style={{
                "inset-inline-start": `${value().from * 100}%`,
                width: `${Math.max((value().to - value().from) * 100, 0.5)}%`,
                // sit on the dragged schedule's OWN lane. Centering the ghost
                // in the row put it on no lane at all once a node stacked, so
                // a 3-lane row showed the drop target floating in the middle.
                top: `${ghostLaneOffsetRem()}rem`,
                "--gantt-event-color": value().color ?? "var(--color-primary)",
              }}
            >
              <Show when={value().kind !== "move"}>
                {/* label rides OUTSIDE after the bar, exactly like the resting
                    outside placement - never inside the schedule */}
                <span class="pointer-events-none absolute start-full top-1/2 ms-2 max-w-60 -translate-y-1/2 truncate whitespace-nowrap">
                  {value().title}
                </span>
              </Show>
            </div>
          )}
        </Show>
        <Show when={draft()}>
          {(value) => (
            <div
              data-slot="gantt-slot-draft"
              data-lane={draftLane()}
              // OPAQUE. When the destination lane does not exist yet the row has
              // not grown, so the placeholder rides the bottom edge and overlaps
              // the bar it is going under - as a tint that read as a smudge over
              // the bar's own label. Punched out of the backdrop it reads as a
              // distinct object sliding underneath, which is what it is.
              class="pointer-events-none absolute z-40 overflow-hidden rounded-sm border border-primary border-dashed bg-background"
              style={{
                "inset-inline-start": `${value().from * 100}%`,
                width: `${Math.max((value().to - value().from) * 100, 0.5)}%`,
                // the destination lane, not the row's middle (which on a stacked
                // row is the GAP between two lanes), and the real lane height
                // rather than a hardcoded h-5 a consumer's metrics would break
                top: `${draftTopRem()}rem`,
                height: `${props.laneHeightRem}rem`,
              }}
            >
              {/* the accent tint, over the opaque base rather than over whatever
                  happens to be beneath the row */}
              <span aria-hidden="true" class="absolute inset-0 bg-primary/15" />
            </div>
          )}
        </Show>
      </div>
      {/* OUTSIDE the content layer for the same reason as the hint bubble: the
          layer's paint containment would CLIP a chip that overhangs the row.
          Centred on the range being painted, so the times track the drag. */}
      <Show when={draft() && draftLabel() ? draft() : null}>
        {(value) => (
          <div
            data-slot="gantt-slot-draft-label"
            class="pointer-events-none absolute z-40"
            style={{
              // anchored to the range's END and riding after it, exactly like the
              // drag ghost's own label. Centred above the placeholder it covered
              // the schedule on the track above - and the one thing a create
              // gesture must never hide is what is already booked.
              "inset-inline-start": `${value().to * 100}%`,
              top: `${draftTopRem()}rem`,
              height: `${props.laneHeightRem}rem`,
            }}
          >
            <span class="absolute start-full top-1/2 ms-2 inline-flex w-max -translate-y-1/2 items-center whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-medium text-background text-xs">
              {draftLabel()}
              {/* Same arrow as every other bubble, one size down. A 45-degree
                  square is symmetric, so size-2.5 spans ~14px whichever edge it
                  straddles: a small nub under a ~120px-wide chip, but most of the
                  short edge of a ~26px-TALL one. size-1.5 spans ~8.5px and
                  protrudes ~4px, the usual tooltip-arrow proportion, so the side
                  arrow reads the same weight as the ones above and below. */}
              <span
                aria-hidden="true"
                class="absolute start-0 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-foreground"
              />
            </span>
          </div>
        )}
      </Show>
      {/* OUTSIDE the content layer: its paint containment creates a stacking
          context that would trap the bubble's z-index under neighboring rows.
          As a direct row child its z-30 stacks above every row in the pane.
          `hintLane < laneCount` is the second half of "empty slots only": the
          pointer being on bare track can still mean the row's own padding above
          a column that is booked on every track. There is no free track to
          draw on there, so the clamp would park the ring on top of a bar -
          exactly what must never happen. Booking such an instant is a drag from
          a free point, not a click. */}
      <Show when={hintVisible() ? hintStop() : null}>
        {(stop) => (
          <div
            data-slot="gantt-schedule-hint"
            // rtl flips the translate sign: inset-inline-start anchors the box's
            // inline-start edge, which is the RIGHT edge under rtl, so centring
            // on the anchor shifts the opposite way there
            class="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
            style={{
              // the live cursor position, written without a signal (see onPointerMove)
              "inset-inline-start": "var(--gantt-hint-x, 50%)",
              // first track, centred on it - z-30 on this wrapper keeps the dot
              // above every bar, so a busy span still offers the affordance
              top: `${hintTopRem()}rem`,
            }}
          >
            <Show
              when={viewConfig.renderScheduleHint}
              fallback={
                <>
                  {/* the band IS the placement affordance: it covers the interval
                      under the pointer, so what you see is the slot you get.
                      Clicking books it; pressing and dragging paints a longer
                      range. The bubble mirrors the tooltip theme, arrow included.
                      The dot IS the cursor: an open ring, so whatever it is
                      standing on stays readable through it. The outer background
                      ring is what keeps it visible on a dark bar - an outline,
                      not a fill. */}
                  <button
                    type="button"
                    data-slot="gantt-schedule-hint-tile"
                    aria-label={hintLabel()}
                    // pointer-events-NONE: the ring rides under the cursor, so any
                    // press it accepts is a press stolen from whatever it is
                    // standing on - which is how it swallowed every click meant for
                    // a bar. Passing pointers straight through makes the element
                    // physically underneath the thing you click: a bar opens its
                    // job, bare track creates (the row's own handlers, which the
                    // ring merely previews). The button and its onClick stay for
                    // KEYBOARD use - pointer-events never blocks Enter/Space.
                    // No cursor class here: pointer-events-none makes it
                    // unreachable. The row carries it (see `hintVisible`).
                    class="pointer-events-none block size-5 rounded-full border-2 border-primary bg-transparent ring-1 ring-background/80"
                    onPointerDown={(e) => {
                      // with drag-create on the press belongs to the row's create
                      // gesture; a sub-threshold press still ends as this click
                      if (!viewConfig.dragCreate) e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // a completed drag-create already committed via onSelectSlot
                      if (wasRecentDrag()) return;
                      createAt(stop(), e);
                      setHintStop(null);
                    }}
                  />
                  <span
                    data-slot="gantt-schedule-hint-bubble"
                    class={cn(
                      "absolute start-1/2 inline-flex w-max -translate-x-1/2 items-center whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-medium text-background text-xs",
                      props.rowIndex === 0 ? "mt-2 top-full" : "mb-2 bottom-full",
                    )}
                  >
                    {hintLabel()}
                    <span
                      aria-hidden="true"
                      class={cn(
                        "absolute start-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-foreground",
                        props.rowIndex === 0 ? "-top-1" : "-bottom-1",
                      )}
                    />
                  </span>
                </>
              }
            >
              {/* consumer-owned hint: the wrapper stays snapped + validated;
                  the content drives its own create flow */}
              {viewConfig.renderScheduleHint?.({
                start: new Date(stop().ms),
                end: new Date(Math.max(stop().endMs, stop().ms + 1)),
                resource: props.row.resource,
              })}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

export type { GanttTimelineRowProps, GanttTreeRowProps };
export { GanttTimelineRow, GanttTreeRow };
