import { Check, Repeat } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import { createContext, createMemo, createSignal, Show, splitProps, useContext } from "solid-js";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/registry/kobalte/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/kobalte/ui/tooltip";
import { useGantt, useGanttSelector, useGanttViewConfig } from "./gantt";
import { useGanttGestures, wasRecentDrag } from "./gantt-dnd";
import { flattenResources, toZoned } from "./gantt-lib";
import type { GanttOccurrence, GanttSegment } from "./gantt-types";

/**
 * Effective Tailwind palette presets for bar colors; every entry works on
 * light and dark surfaces through the bar's alpha background + accent border.
 */
const GANTT_COLORS: Array<{ name: string; value: string }> = [
  { name: "Blue", value: "var(--color-blue-500)" },
  { name: "Emerald", value: "var(--color-emerald-500)" },
  { name: "Violet", value: "var(--color-violet-500)" },
  { name: "Rose", value: "var(--color-rose-500)" },
  { name: "Amber", value: "var(--color-amber-500)" },
  { name: "Cyan", value: "var(--color-cyan-500)" },
  { name: "Orange", value: "var(--color-orange-500)" },
  { name: "Pink", value: "var(--color-pink-500)" },
  { name: "Teal", value: "var(--color-teal-500)" },
  { name: "Indigo", value: "var(--color-indigo-500)" },
];

interface GanttBarContextValue<TData = unknown> {
  occurrence: GanttOccurrence<TData>;
  segment: GanttSegment<TData>;
  isDragging: boolean;
  isSelected: boolean;
}

const GanttBarContext = createContext<GanttBarContextValue<never> | null>(null);

/**
 * The context-menu trigger rendered AS the bar button. The polymorphic
 * generic cannot express "every button attribute plus the trigger's own",
 * so the composition is typed as a plain button here.
 */
const ContextMenuTriggerButton = ContextMenuTrigger as unknown as (
  props: ComponentProps<"button"> & { as: "button" },
) => JSX.Element;

/** The bar's subject; usable inside renderEvent content and bar children. */
function useGanttBarContext<TData = unknown>(): GanttBarContextValue<TData> {
  const ctx = useContext(GanttBarContext);
  if (!ctx) {
    throw new Error("useGanttBarContext must be used within <GanttBar>");
  }
  return ctx as unknown as GanttBarContextValue<TData>;
}

interface GanttBarProps<TData = unknown> extends Omit<ComponentProps<"button">, "children"> {
  segment: GanttSegment<TData>;
  /** Replaces the default bar CONTENT; the wrapper stays gantt-owned. */
  children?: JSX.Element;
  /**
   * The title renders beside the bar (view-owned), so the default inner
   * content is suppressed. Explicit children and renderEvent still win.
   */
  labelOutside?: boolean;
  /**
   * The owning row's title for the aria-label. Pass it when the row is in
   * scope (the internal view does); omitting falls back to a tree lookup.
   */
  rowTitle?: string;
}

/**
 * The one interactive bar element. The wrapper owns positioning hooks, a11y,
 * selection, drag/resize listeners, and data attributes; content comes from
 * children, the root renderEvent override, or the built-in default.
 */
function GanttBar<TData = unknown>(props: GanttBarProps<TData>) {
  const [local, others] = splitProps(props as GanttBarProps, [
    "segment",
    "class",
    "children",
    "labelOutside",
    "rowTitle",
    "style",
    "onPointerDown",
    "onClick",
    "onDblClick",
  ]);
  const instance = useGantt<TData>();
  const viewConfig = useGanttViewConfig<TData>();
  const gestures = useGanttGestures<TData>();
  const { settings } = instance;
  const segment = () => local.segment as GanttSegment<TData>;
  const occurrence = () => segment().occurrence;
  const event = () => occurrence().event;

  const isSelected = useGanttSelector<TData, boolean>(
    (state) => state.selection.eventKeys.includes(occurrence().key),
    { calendar: instance },
  );
  const isDragging = useGanttSelector<TData, boolean>(
    (state) => state.drag?.occurrence.key === occurrence().key,
    { calendar: instance },
  );
  // Which gesture owns this bar: a move hides the original (the smooth clone
  // stands in for it); a resize keeps it as a faint placeholder behind the
  // dashed preview so you can see the original extent.
  const dragKind = useGanttSelector<TData, string | null>(
    (state) => (state.drag?.occurrence.key === occurrence().key ? state.drag.kind : null),
    { calendar: instance },
  );
  // Hover-only range tooltip. Focus opens are ignored (the known button+
  // tooltip flash: clicking a bar opens a dialog, focus returns, and a
  // focus-triggered tooltip would pop). Hidden while dragging/resizing.
  const [tipOpen, setTipOpen] = createSignal(false);
  // Gated on tipOpen: with the tooltip closed the selector returns a stable
  // false, so gesture start/end doesn't recompute for every mounted bar.
  const anyInteracting = useGanttSelector<TData, boolean>(
    (state) => tipOpen() && (state.drag !== null || state.slotDraft !== null),
    { calendar: instance },
  );
  // One owned memo, read as a single call below. Left inline, the compiler
  // wraps the two-read expression in its own `memo()` and the tooltip handle
  // evaluates it first from a DOM listener - i.e. with no owner, which Solid
  // reports as a computation that will never be disposed.
  const tipVisible = createMemo(() => tipOpen() && !anyInteracting());

  const progress = () =>
    typeof event().progress === "number"
      ? Math.min(Math.max(Math.round(event().progress as number), 0), 100)
      : null;

  const defaultContent = () => (
    <>
      <Show when={occurrence().isRecurring}>
        <Repeat class="size-2.5 shrink-0 opacity-70" aria-hidden="true" />
      </Show>
      <span class="truncate font-medium">{event().title}</span>
      <Show when={!occurrence().allDay && segment().isStart}>
        <span class="hidden truncate text-muted-foreground @[8rem]:inline">
          {settings.i18n.functions.formatEventTime(
            toZoned(occurrence().start, settings.timeZone),
            toZoned(occurrence().end, settings.timeZone),
            occurrence().allDay,
            settings.locale,
          )}
        </span>
      </Show>
    </>
  );

  const renderProps = () => ({
    occurrence: occurrence(),
    segment: segment(),
    isDragging: isDragging(),
    isSelected: isSelected(),
  });
  const content = () =>
    local.children ??
    viewConfig.renderEvent?.(renderProps()) ??
    (local.labelOutside ? null : defaultContent());
  // Consumer-owned content owns the WHOLE inner visualization: the built-in
  // progress fill and done mark yield so custom bars start from a blank
  // canvas (progress stays readable via data-progress/data-completed).
  const consumerOwnsContent = () => local.children !== undefined || !!viewConfig.renderEvent;

  const timeLabel = () =>
    settings.i18n.functions.formatEventTime(
      toZoned(occurrence().start, settings.timeZone),
      toZoned(occurrence().end, settings.timeZone),
      occurrence().allDay,
      settings.locale,
    );
  // name the row too: the split-pane layout carries no grid semantics.
  // The prop path is O(1); the lookup fallback is memoized so external
  // GanttBar usage never flattens the tree on every update.
  const fallbackRowTitle = createMemo(() =>
    local.rowTitle === undefined && event().resourceId
      ? flattenResources(settings.resources).find(
          ({ resource }) => resource.id === event().resourceId,
        )?.resource.title
      : undefined,
  );
  const rowTitle = () => local.rowTitle ?? fallbackRowTitle();

  const showResize = () => gestures.canResize(segment());
  const resizeHandles = () => (
    <Show when={showResize()}>
      <Show when={segment().isStart}>
        <span
          data-slot="gantt-resize-handle"
          data-edge="start"
          // grip hugs the start edge (justify-start + tight inset) so the
          // indicator reads as "resize this end", not a centered pill.
          // pointer-coarse keeps it visible on touch, where hover never fires
          class="absolute inset-y-0 start-0.5 flex w-2 cursor-ew-resize items-center justify-start opacity-0 pointer-coarse:opacity-100 group-hover/gantt-bar-group:opacity-100"
          onPointerDown={(e) => gestures.beginResize(e, segment(), "start")}
        >
          <span aria-hidden="true" class="h-2.5 w-0.5 rounded-full bg-foreground/40" />
        </span>
      </Show>
      <Show when={segment().isEnd}>
        <span
          data-slot="gantt-resize-handle"
          data-edge="end"
          // grip hugs the end edge (justify-end + tight inset) so the
          // indicator reads as "resize this end", not a centered pill.
          // pointer-coarse keeps it visible on touch, where hover never fires
          class="absolute inset-y-0 end-0.5 flex w-2 cursor-ew-resize items-center justify-end opacity-0 pointer-coarse:opacity-100 group-hover/gantt-bar-group:opacity-100"
          onPointerDown={(e) => gestures.beginResize(e, segment(), "end")}
        >
          <span aria-hidden="true" class="h-2.5 w-0.5 rounded-full bg-foreground/40" />
        </span>
      </Show>
    </Show>
  );

  const hasMenu = () => !!viewConfig.renderEventMenu;

  // Getters, not a snapshot: a spread object keeps its property descriptors,
  // so every attribute below stays live after the element is created.
  const barAttrs = {
    type: "button",
    "data-slot": "gantt-bar",
    get "data-all-day"() {
      return occurrence().allDay || undefined;
    },
    get "data-recurring"() {
      return occurrence().isRecurring || undefined;
    },
    get "data-selected"() {
      return isSelected() || undefined;
    },
    get "data-dragging"() {
      return isDragging() || undefined;
    },
    get "data-drag-kind"() {
      return dragKind() ?? undefined;
    },
    get "data-past"() {
      return occurrence().end.getTime() < Date.now() || undefined;
    },
    get "data-label-outside"() {
      return local.labelOutside || undefined;
    },
    get "data-progress"() {
      return progress() ?? undefined;
    },
    get "data-completed"() {
      return progress() === 100 || undefined;
    },
    get "aria-label"() {
      return settings.i18n.functions.formatEventAriaLabel({
        title: event().title,
        timeLabel: timeLabel(),
        rowTitle: rowTitle(),
        progressLabel:
          progress() !== null ? settings.i18n.labels.progress(progress() as number) : undefined,
        continues: segment().continuesBefore || segment().continuesAfter,
      });
    },
    get style() {
      const base: JSX.CSSProperties = {
        "--gantt-event-color": event().color ?? "var(--color-primary)",
      };
      const extra = local.style;
      return typeof extra === "object" && extra !== null ? { ...base, ...extra } : base;
    },
    onDblClick: (e: MouseEvent & { currentTarget: HTMLElement }) => {
      e.stopPropagation();
      settings.onEventDoubleClick?.(occurrence(), e);
      callHandler(local.onDblClick, e);
    },
    get class() {
      return cn(
        "@container group/gantt-bar-group relative flex w-full min-w-0 cursor-pointer touch-none select-none items-center gap-1.5 overflow-hidden rounded-sm px-1.5 py-0.5 text-start text-foreground leading-normal",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        // the unfilled remainder has to be legible on its own - at /12 a bar
        // with a progress fill read as a floating segment with no basement
        "bg-(--gantt-event-color)/20 hover:bg-(--gantt-event-color)/30",
        // move: hide the original (the smooth cursor clone represents it)
        "data-[drag-kind=move]:opacity-0",
        // resize: keep the original event exactly, just fade it to a soft
        // placeholder behind the dashed preview - no dramatic restyle
        "data-[drag-kind=resize-start]:opacity-40 data-[drag-kind=resize-end]:opacity-40",
        "data-selected:bg-(--gantt-event-color)/30",
        segment().continuesBefore && "rounded-s-none",
        segment().continuesAfter && "rounded-e-none",
        viewConfig.classNames?.event,
        local.class,
      );
    },
  } as unknown as ComponentProps<"button">;

  const barBody = () => (
    <>
      <Show when={progress() !== null}>
        {/* Chrome, not content: it is an absolutely-positioned layer BEHIND
            whatever the bar renders, so a consumer bar (renderEvent) keeps
            its completion fill instead of silently losing it. The inline
            done-mark below stays gated, because that one really is content. */}
        <span
          aria-hidden="true"
          data-slot="gantt-bar-progress"
          class="pointer-events-none absolute inset-y-0 start-0 border-(--gantt-event-color)/65 border-e bg-(--gantt-event-color)/40 data-full:border-e-0"
          data-full={progress() === 100 || undefined}
          style={{ width: `${progress()}%` }}
        />
      </Show>
      <Show when={progress() === 100 && !consumerOwnsContent()}>
        {/* done mark: completion chrome like the fill itself, so it shows
            for outside-label bars too (where the inner content is empty) */}
        <Check class="relative size-2.5 shrink-0 opacity-80" aria-hidden="true" />
      </Show>
      {content()}
      {resizeHandles()}
    </>
  );

  // The bar is simultaneously the tooltip trigger and (when a menu exists)
  // the context-menu trigger. Kobalte composes both through polymorphic `as`:
  // the tooltip hands its computed props down, the context-menu trigger
  // adopts them, and the gantt attributes are applied last so `data-slot`
  // and the bar classes always win.
  const renderBar = (trigger: ComponentProps<"button">) => (
    <Show
      when={hasMenu()}
      fallback={
        <button {...trigger} {...barAttrs} {...others}>
          {barBody()}
        </button>
      }
    >
      <ContextMenuTriggerButton as="button" {...trigger} {...barAttrs} {...others}>
        {barBody()}
      </ContextMenuTriggerButton>
    </Show>
  );

  const barTree = () => (
    <TooltipProvider delay={500} closeDelay={0} timeout={300}>
      <Tooltip
        open={tipVisible()}
        onOpenChange={(next, details) => {
          // opens only on hover; focus/press opens are dropped
          if (next && details?.reason !== "trigger-hover") return;
          setTipOpen(next);
        }}
      >
        <TooltipTrigger
          as={(triggerProps: ComponentProps<"button">) => renderBar(triggerProps)}
          onPointerDown={(e: PointerEvent & { currentTarget: HTMLElement }) => {
            e.stopPropagation();
            gestures.beginMove(e, segment());
            callHandler(local.onPointerDown, e);
          }}
          onClick={(e: MouseEvent & { currentTarget: HTMLElement }) => {
            e.stopPropagation();
            callHandler(local.onClick, e);
            if (wasRecentDrag()) return;
            instance.api.selectEvent(occurrence().key);
            settings.onEventClick?.(occurrence(), e);
          }}
        />
        <Show when={tipVisible()}>
          <TooltipContent side="top" class="pointer-events-none">
            <div class="font-medium">{event().title}</div>
            <div class="opacity-80">{timeLabel()}</div>
          </TooltipContent>
        </Show>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <GanttBarContext.Provider
      value={
        {
          get occurrence() {
            return occurrence();
          },
          get segment() {
            return segment();
          },
          get isDragging() {
            return isDragging();
          },
          get isSelected() {
            return isSelected();
          },
        } as unknown as GanttBarContextValue<never>
      }
    >
      {/* Consumer-owned right-click menu (headless): the primitive only wires
          the ContextMenu; the items and their handlers come from the block. */}
      <Show when={hasMenu()} fallback={barTree()}>
        <ContextMenu>
          {barTree()}
          <ContextMenuContent data-slot="gantt-bar-menu" class="min-w-44">
            {viewConfig.renderEventMenu?.(renderProps())}
          </ContextMenuContent>
        </ContextMenu>
      </Show>
    </GanttBarContext.Provider>
  );
}

/** Invoke a Solid event-handler union (bare function or [handler, data]). */
function callHandler(handler: unknown, event: Event) {
  if (typeof handler === "function") {
    (handler as (e: Event) => void)(event);
  } else if (Array.isArray(handler)) {
    (handler[0] as (data: unknown, e: Event) => void)(handler[1], event);
  }
}

export type { GanttBarContextValue, GanttBarProps };
export { GANTT_COLORS, GanttBar, useGanttBarContext };
