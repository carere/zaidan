import { addDays, format } from "date-fns";
import { Calendar } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { createMemo, For, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { IconStack } from "@/registry/kobalte/ui/icon-stack";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import {
  EventCalendarViewContext,
  useEventCalendar,
  useEventCalendarSelector,
  useEventCalendarSettings,
  useEventCalendarViewConfig,
} from "./event-calendar";
import { EventCalendarEvent } from "./event-calendar-event";
import { getDayKey, getRangeKey, toZoned, zonedStartOfDay } from "./event-calendar-lib";
import type { EventCalendarDateRange, EventCalendarSegment } from "./event-calendar-types";

// The agenda window length is the agendaDayCount SETTING (the store derives
// visibleRange from it); a per-view prop here would silently disagree.
type EventCalendarAgendaViewProps = ComponentProps<"div">;

function EventCalendarAgendaView(props: EventCalendarAgendaViewProps) {
  const instance = useEventCalendar();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, ["class"]);
  const visibleRange = useEventCalendarSelector<unknown, EventCalendarDateRange>(
    (state) => state.visibleRange,
    { isEqual: (a, b) => getRangeKey(a) === getRangeKey(b) },
  );
  // Subscribe to event changes via the day-bucket content of the whole range
  const events = useEventCalendarSelector((state) => state.events);

  const days = createMemo(() => {
    const result: Date[] = [];
    let cursor: Date = zonedStartOfDay(visibleRange().start, settings.timeZone);
    while (cursor < visibleRange().end) {
      result.push(cursor);
      cursor = zonedStartOfDay(addDays(toZoned(cursor, settings.timeZone), 1), settings.timeZone);
    }
    return result;
  });

  const groups = () => {
    events();
    const index = instance.internals.getIndex();
    return days()
      .map((day) => ({
        day,
        bucket: index.byDay.get(getDayKey(day, settings.timeZone)),
      }))
      .filter((group) => {
        const total = (group.bucket?.allDay.length ?? 0) + (group.bucket?.timed.length ?? 0);
        return total > 0;
      });
  };

  const isToday = (day: Date) =>
    getDayKey(day, settings.timeZone) === getDayKey(new Date(), settings.timeZone);

  const native = () => viewConfig.scrollbars === "native";

  const body = () => (
    <Show
      when={groups().length > 0}
      fallback={
        <div
          data-slot="event-calendar-no-events"
          class={cn(
            "flex min-h-72 flex-col items-center justify-center gap-4 py-16",
            viewConfig.classNames?.noEvents,
          )}
        >
          {viewConfig.renderNoEvents?.() ?? (
            <>
              <IconStack>
                <Calendar class="size-5" aria-hidden="true" />
              </IconStack>
              <span class="text-muted-foreground text-sm">{settings.i18n.labels.noEvents}</span>
            </>
          )}
        </div>
      }
    >
      {/* Drop the very last row's bottom border so it does not double up with
          the calendar container's own bottom border. Targets the last day
          group's last child (its last agenda item); per-item `border-b` is
          kept everywhere else, including each day's internal rows. */}
      <div class="flex flex-col [&>*:last-child>*:last-child]:border-b-0">
        <For each={groups()}>
          {(group) => {
            const items = () => [...(group.bucket?.allDay ?? []), ...(group.bucket?.timed ?? [])];
            const zoned = () => toZoned(group.day, settings.timeZone);
            const weekday = () => format(zoned(), "EEEE", { locale: settings.locale });
            const dayDate = () => format(zoned(), "MMMM d, yyyy", { locale: settings.locale });
            return (
              // biome-ignore lint/a11y/useSemanticElements: the agenda day is a labelled ARIA group, not a fieldset - a form grouping element would carry the wrong semantics for a read-only list.
              <div
                data-slot="event-calendar-agenda-day"
                data-today={isToday(group.day) || undefined}
                // A named group per day so a screen reader can step day by day
                // (and hear how full one is) instead of arrowing every row.
                role="group"
                aria-label={`${weekday()}, ${dayDate()}, ${settings.i18n.labels.events(items().length)}`}
              >
                {/* Group header: weekday (leading) + full date (trailing) */}
                {/* biome-ignore lint/a11y/useSemanticElements: role+aria-level keeps the heading level configurable from one place; a literal <h3> would hard-code the document outline the agenda is embedded in. */}
                <div
                  data-slot="event-calendar-agenda-day-header"
                  // The day bar is the agenda's only structure, so give it a
                  // heading level: the H key and the rotor can jump between
                  // days, which is the whole point of a long agenda.
                  role="heading"
                  aria-level={3}
                  class={cn(
                    "bg-muted/60 sticky top-0 z-10 flex items-baseline justify-between gap-4 border-b px-4 py-2",
                    // The custom ScrollArea's overlay scrollbar (w-2.5 = 10px)
                    // is painted UNDER this sticky, z-10, opaque header, so the
                    // thumb vanishes behind the day bar at the top of the view.
                    // Inset the header by the scrollbar lane so its background
                    // stops before the scrollbar instead of covering it. Native
                    // scrollbars already sit outside the content box, so this
                    // only applies to the custom-scrollbar path.
                    !native() && "me-2.5",
                    viewConfig.classNames?.agendaDayHeader,
                  )}
                >
                  <span
                    class={cn(
                      "text-foreground font-semibold",
                      isToday(group.day) && "text-primary",
                    )}
                  >
                    {weekday()}
                  </span>
                  <span class="text-muted-foreground font-medium tabular-nums">{dayDate()}</span>
                </div>
                <For each={items()}>
                  {(segment) => <EventCalendarAgendaItem segment={segment} />}
                </For>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );

  return (
    <EventCalendarViewContext.Provider value={{ view: "agenda" }}>
      {/* biome-ignore lint/a11y/useSemanticElements: the view region is a labelled ARIA group, not a form fieldset. */}
      <div
        data-slot="event-calendar-agenda-view"
        data-view="agenda"
        // Unlike the grid views the agenda has no row/column semantics to carry a
        // name, so label the region with the day range it covers - through
        // formatDayRange, so a consumer override reaches it.
        role="group"
        aria-label={settings.i18n.functions.formatDayRange(visibleRange(), {
          locale: settings.locale,
        })}
        class={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border-t",
          viewConfig.classNames?.agendaView,
          local.class,
        )}
        {...others}
      >
        <Show when={native()} fallback={<ScrollArea class="h-full">{body()}</ScrollArea>}>
          <div
            data-slot="scroll-area-viewport"
            data-ec-native-scroll=""
            class="h-full overflow-y-auto"
          >
            {body()}
          </div>
        </Show>
      </div>
    </EventCalendarViewContext.Provider>
  );
}

/**
 * One agenda row: a full-width, selectable table row - time column, color dot,
 * and title (all replaceable via renderAgendaEvent). Clicking selects the
 * event (drag/resize stay off in the agenda).
 */
function EventCalendarAgendaItem(props: { segment: EventCalendarSegment }) {
  const viewConfig = useEventCalendarViewConfig();
  return (
    <EventCalendarEvent
      segment={props.segment}
      class={cn(
        // read-only list: hover only, no selected/focused styling on click
        "hover:bg-accent/40 gap-3 rounded-none border-b px-4 py-2.5 transition-colors",
        viewConfig.classNames?.agendaItem,
      )}
    />
  );
}

export type { EventCalendarAgendaViewProps };
export { EventCalendarAgendaView };
