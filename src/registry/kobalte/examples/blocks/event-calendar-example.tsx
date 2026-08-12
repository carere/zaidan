import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  setHours,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { Ban, CalendarRange, Clock, Lock, MapPin, Plus, Repeat } from "lucide-solid";
import { createMemo, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { cn } from "@/lib/utils";
import {
  type CalendarEvent,
  EventCalendar,
  EventCalendarContent,
  EventCalendarDatePicker,
  type EventCalendarInstance,
  EventCalendarNav,
  type EventCalendarOccurrence,
  type EventCalendarRenderEventProps,
  EventCalendarToolbar,
  useEventCalendarState,
} from "@/registry/kobalte/blocks/event-calendar";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Separator } from "@/registry/kobalte/ui/separator";

export default function EventCalendarExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <StudioSchedule />
    </ExampleWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

type CalendarId = "design" | "engineering" | "client" | "personal";
type BookingStatus = "confirmed" | "tentative" | "cancelled" | "focus";

/** The consumer payload rides along on `event.data`, fully typed via CalendarEvent<T>. */
interface Booking {
  calendar: CalendarId;
  status: BookingStatus;
  location: string;
  /** GitHub handles - the avatar is just `https://github.com/<handle>.png`. */
  attendees: string[];
}

type StudioEvent = CalendarEvent<Booking>;

/** One colour per calendar, so a chip's tint always names its owner. */
const CALENDARS: Array<{ id: CalendarId; title: string; color: string }> = [
  { id: "design", title: "Design", color: "var(--color-violet-500)" },
  { id: "engineering", title: "Engineering", color: "var(--color-blue-500)" },
  { id: "client", title: "Client", color: "var(--color-amber-500)" },
  { id: "personal", title: "Personal", color: "var(--color-emerald-500)" },
];

const TEAM = ["carere", "shadcn", "evilrabbit", "pranathip", "jorgezreik"];

const STATUS_META: Record<
  BookingStatus,
  { label: string; variant: "success-light" | "warning-light" | "destructive-light" | "info-light" }
> = {
  confirmed: { label: "Confirmed", variant: "success-light" },
  tentative: { label: "Awaiting replies", variant: "warning-light" },
  cancelled: { label: "Cancelled", variant: "destructive-light" },
  focus: { label: "Focus time", variant: "info-light" },
};

function calendarColor(id: CalendarId) {
  return CALENDARS.find((entry) => entry.id === id)?.color;
}

/** The event the panel opens on - a busy Monday slot, so nothing starts empty. */
const FEATURED_EVENT_ID = "design-critique";

/**
 * A studio week anchored on the CURRENT week, plus a light scatter in the
 * neighbouring weeks so the month view reads naturally when you switch to it.
 * Day offsets are Monday-based (0 = Monday); negatives reach the week before.
 */
function buildEvents(anchor: Date): StudioEvent[] {
  const week = startOfWeek(startOfDay(anchor), { weekStartsOn: 1 });
  const at = (day: number, hour: number, minute = 0) =>
    addMinutes(setHours(addDays(week, day), hour), minute);
  /** All-day rows must sit on midnights in the display zone; `end` is exclusive. */
  const midnight = (day: number) => addDays(week, day);

  const book = (booking: {
    id: string;
    title: string;
    calendar: CalendarId;
    start: Date;
    end: Date;
    status?: BookingStatus;
    location?: string;
    attendees?: string[];
    allDay?: boolean;
    recurrence?: string;
  }): StudioEvent => ({
    id: booking.id,
    title: booking.title,
    start: booking.start,
    end: booking.end,
    allDay: booking.allDay,
    recurrence: booking.recurrence,
    color: calendarColor(booking.calendar),
    data: {
      calendar: booking.calendar,
      status: booking.status ?? "confirmed",
      location: booking.location ?? "Studio A",
      attendees: booking.attendees ?? [],
    },
  });

  return [
    // Monday
    book({
      id: "standup",
      title: "Daily standup",
      calendar: "engineering",
      start: at(0, 9, 15),
      end: at(0, 9, 30),
      // A raw RRULE line; the structured EventCalendarRecurrenceRule works too.
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=40",
      location: "Huddle room",
      attendees: ["maxleiter", "evilrabbit", "pranathip"],
    }),
    book({
      id: FEATURED_EVENT_ID,
      title: "Design critique · Checkout",
      calendar: "design",
      start: at(0, 10, 0),
      end: at(0, 11, 30),
      location: "Studio A",
      attendees: ["carere", "shadcn", "pranathip"],
    }),
    book({
      id: "focus-motion",
      title: "Focus · Motion polish",
      calendar: "design",
      start: at(0, 13, 0),
      end: at(0, 15, 0),
      status: "focus",
      location: "Do not disturb",
    }),
    book({
      id: "one-on-one",
      title: "1:1 · pranathip",
      calendar: "personal",
      start: at(0, 15, 30),
      end: at(0, 16, 15),
      location: "Room 3",
      attendees: ["pranathip"],
    }),

    // Tuesday
    book({
      id: "component-audit",
      title: "Component library audit",
      calendar: "engineering",
      start: at(1, 10, 0),
      end: at(1, 11, 0),
      location: "Room 3",
      attendees: ["evilrabbit", "maxleiter"],
    }),
    book({
      id: "usability",
      title: "Usability sessions · round 2",
      calendar: "design",
      start: at(1, 13, 30),
      end: at(1, 15, 30),
      location: "Research lab",
      attendees: ["pranathip"],
    }),
    book({
      id: "northwind-kickoff",
      title: "Northwind kickoff",
      calendar: "client",
      start: at(1, 16, 0),
      end: at(1, 17, 0),
      status: "tentative",
      location: "Google Meet",
      attendees: ["carere", "shadcn"],
    }),

    // Wednesday
    book({
      id: "sprint-planning",
      title: "Sprint planning",
      calendar: "engineering",
      start: at(2, 9, 45),
      end: at(2, 11, 15),
      location: "Room 3",
      attendees: ["carere", "shadcn", "evilrabbit", "pranathip"],
    }),
    book({
      id: "lunch-and-learn",
      title: "Lunch & learn · Type scales",
      calendar: "design",
      start: at(2, 12, 30),
      end: at(2, 13, 15),
      location: "Kitchen",
      attendees: ["jorgezreik"],
    }),
    book({
      id: "office-hours",
      title: "Design system office hours",
      calendar: "design",
      start: at(2, 15, 0),
      end: at(2, 16, 0),
      location: "Studio A",
      attendees: ["jorgezreik", "pranathip"],
    }),
    book({
      id: "design-week",
      title: "Design Week SF",
      calendar: "personal",
      start: midnight(2),
      end: midnight(5),
      allDay: true,
      location: "Moscone West",
    }),

    // Thursday
    book({
      id: "northwind-walkthrough",
      title: "Client walkthrough · Northwind",
      calendar: "client",
      start: at(3, 11, 0),
      end: at(3, 12, 0),
      location: "Google Meet",
      attendees: ["carere", "shadcn"],
    }),
    book({
      id: "a11y-review",
      title: "Accessibility review",
      calendar: "engineering",
      start: at(3, 14, 0),
      end: at(3, 15, 30),
      location: "Room 3",
      attendees: ["evilrabbit"],
    }),
    book({
      id: "studio-dinner",
      title: "Studio dinner",
      calendar: "personal",
      start: at(3, 18, 0),
      end: at(3, 20, 0),
      location: "Rosetta",
      attendees: TEAM,
    }),

    // Friday
    book({
      id: "okr-draft",
      title: "Q3 OKR draft due",
      calendar: "engineering",
      start: midnight(4),
      end: midnight(5),
      allDay: true,
      location: "Notion",
    }),
    book({
      id: "ship-review",
      title: "Ship review",
      calendar: "engineering",
      start: at(4, 10, 0),
      end: at(4, 11, 0),
      status: "cancelled",
      location: "Room 3",
      attendees: ["maxleiter", "evilrabbit"],
    }),
    book({
      id: "retro",
      title: "Retro",
      calendar: "engineering",
      start: at(4, 12, 0),
      end: at(4, 12, 45),
      location: "Huddle room",
      attendees: ["maxleiter", "evilrabbit", "pranathip"],
    }),
    book({
      id: "portfolio-jam",
      title: "Focus · Portfolio jam",
      calendar: "design",
      start: at(4, 14, 0),
      end: at(4, 16, 0),
      status: "focus",
      location: "Do not disturb",
    }),

    // Weekend
    book({
      id: "offsite",
      title: "Studio offsite · Sonoma",
      calendar: "personal",
      start: midnight(5),
      end: midnight(7),
      allDay: true,
      location: "Sonoma",
    }),

    // Neighbouring weeks - month view density.
    book({
      id: "qbr",
      title: "Quarterly business review",
      calendar: "client",
      start: at(-4, 15, 0),
      end: at(-4, 16, 30),
      location: "Google Meet",
      attendees: ["carere", "shadcn"],
    }),
    book({
      id: "portfolio-review",
      title: "Portfolio review · jorgezreik",
      calendar: "personal",
      start: at(-3, 11, 0),
      end: at(-3, 12, 0),
      location: "Room 3",
      attendees: ["jorgezreik"],
    }),
    book({
      id: "brand-workshop",
      title: "Brand workshop",
      calendar: "design",
      start: at(8, 10, 0),
      end: at(8, 12, 0),
      location: "Studio A",
      attendees: ["carere", "shadcn"],
    }),
    book({
      id: "release-gate",
      title: "Release 4.2 · go / no-go",
      calendar: "engineering",
      start: at(10, 9, 30),
      end: at(10, 10, 30),
      location: "Room 3",
      attendees: ["maxleiter", "evilrabbit"],
    }),
    book({
      id: "northwind-review",
      title: "Northwind design review",
      calendar: "client",
      start: at(11, 13, 0),
      end: at(11, 14, 0),
      status: "tentative",
      location: "Google Meet",
      attendees: ["carere", "shadcn"],
    }),
    book({
      id: "conference",
      title: "Config · San Francisco",
      calendar: "personal",
      start: midnight(14),
      end: midnight(16),
      allDay: true,
      location: "Moscone Center",
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/*  Custom chips                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Focus time and cancelled bookings swap the colour dot for an icon. Tall
 * time-grid blocks drop the dot entirely - the tinted surface already carries
 * the calendar colour, exactly like the built-in chip.
 */
function chipMarker(status: BookingStatus, withDot: boolean) {
  switch (status) {
    case "focus":
      return <Lock class="size-3 shrink-0 opacity-70" aria-hidden="true" />;
    case "cancelled":
      return <Ban class="size-3 shrink-0 opacity-70" aria-hidden="true" />;
    default:
      // --ec-event-color is set on every chip from the event's `color`.
      return withDot ? (
        <span aria-hidden class="size-1.5 shrink-0 rounded-full bg-(--ec-event-color)" />
      ) : null;
  }
}

/**
 * Attendee faces. Every chip is an `@container`, so `gate` decides how wide the
 * block has to be before the faces are worth the space they steal from the
 * title - a squeezed cascade column simply drops them. The query measures the
 * chip's CONTENT box, so a gate sits ~12px below the chip width it reads as.
 */
function chipAttendees(handles: string[], gate: string) {
  return (
    <span class={cn("-space-x-1 ms-auto hidden shrink-0", gate)}>
      <For each={handles.slice(0, 2)}>
        {(handle) => (
          <img
            src={`https://github.com/${handle}.png`}
            alt={`@${handle}`}
            loading="lazy"
            class="size-4 rounded-full ring-1 ring-background"
          />
        )}
      </For>
    </span>
  );
}

/**
 * The whole chip is ours: attendee faces, a lock on focus time, a struck-through
 * title on a cancelled booking. Returning undefined for an event without a
 * payload falls back to the built-in dot + title + time.
 *
 * The chip WRAPPER is a flex row for short blocks and a flex column for tall
 * ones, so each branch returns a single element that owns its own layout, and
 * every extra detail is gated on the block's own width.
 */
function renderBookingChip(props: EventCalendarRenderEventProps<Booking>) {
  const occurrence = props.occurrence;
  const booking = occurrence.event.data;
  if (!booking) return undefined;

  const segment = props.segment;
  const inTimeGrid = props.view === "week" || props.view === "day" || props.view === "days";
  // isStart && isEnd excludes multi-day bars, whose startMin/endMin describe a
  // single day slice rather than the block's own height.
  const singleDay = segment.isStart && segment.isEnd;
  const minutes = (segment.endMin ?? 0) - (segment.startMin ?? 0);
  const stacked = inTimeGrid && !occurrence.allDay && singleDay && minutes >= 45;

  // Month cells are the tightest surface in the calendar: they trade the dot
  // and the repeat glyph for a leading start time, the way a real month grid
  // does, and the tinted chip keeps carrying the calendar colour.
  const isMonth = props.view === "month";

  const lead = (
    <>
      {chipMarker(booking.status, !stacked && !isMonth)}
      <Show when={occurrence.isRecurring && !isMonth}>
        <Repeat class="size-2.5 shrink-0 opacity-70" aria-hidden="true" />
      </Show>
    </>
  );

  const title = (
    <span
      class={cn(
        "min-w-0 truncate font-medium",
        booking.status === "cancelled" && "line-through opacity-70",
      )}
    >
      {occurrence.event.title}
    </span>
  );

  if (stacked) {
    return (
      <span class="flex w-full min-w-0 flex-col gap-0.5 leading-tight">
        <span class="flex w-full min-w-0 items-center gap-1.5">
          {lead}
          {title}
        </span>
        <span class="flex w-full min-w-0 items-center gap-1 text-muted-foreground">
          <span class="shrink-0">{format(occurrence.start, "h:mm")}</span>
          <span class="hidden shrink-0 @[9rem]:inline">– {format(occurrence.end, "h:mm a")}</span>
          {/* the room detail waits for a genuinely wide block */}
          <Show when={booking.location}>
            <span class="hidden min-w-0 truncate @[13rem]:block">· {booking.location}</span>
          </Show>
          <Show when={booking.attendees.length > 0}>
            {chipAttendees(booking.attendees, "@[5rem]:flex")}
          </Show>
        </span>
      </span>
    );
  }

  return (
    <span class="flex w-full min-w-0 items-center gap-1.5">
      {lead}
      <Show when={isMonth && !occurrence.allDay && segment.isStart}>
        <span class="shrink-0 text-muted-foreground tabular-nums">
          {format(occurrence.start, "h:mm")}
        </span>
      </Show>
      {title}
      <Show when={!isMonth && booking.attendees.length > 0}>
        {chipAttendees(booking.attendees, "@[8rem]:flex")}
      </Show>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Calendar                                                                   */
/* -------------------------------------------------------------------------- */

function StudioSchedule() {
  const events = buildEvents(new Date());
  const featured = events.find((event) => event.id === FEATURED_EVENT_ID);

  // Hoisting the instance keeps the details panel OUTSIDE the calendar tree
  // while still reading its live state - no context, no prop drilling.
  const calendar = useEventCalendarState<Booking>({
    defaultEvents: events,
    defaultView: "week",
    views: ["month", "week", "day", "agenda"],
    // An occurrence key is `${id}::${startISO}`, so the panel opens populated.
    defaultSelection: featured
      ? { eventKeys: [`${featured.id}::${featured.start.toISOString()}`], slot: null }
      : { eventKeys: [], slot: null },
    // A studio runs Monday to Friday; the weekend offsite still shows up in the
    // month view, and week columns stay wide enough to read.
    defaultViewSettings: { weekends: false, nowIndicator: true },
    weekStartsOn: 1,
    dayStartHour: 8,
    dayEndHour: 21,
    snapDuration: 15,
  });

  let drafts = 0;
  const addBooking = () => {
    const start = addMinutes(setHours(startOfDay(new Date()), 16), 30);
    const end = addMinutes(start, 45);
    const id = `draft-${++drafts}`;
    calendar.api.addEvent({
      id,
      title: "New booking",
      start,
      end,
      color: calendarColor("design"),
      data: { calendar: "design", status: "tentative", location: "Studio A", attendees: [] },
    });
    calendar.api.goTo(start);
    calendar.api.selectEvent(`${id}::${start.toISOString()}`);
  };

  return (
    <Example title="Team schedule" class="p-4 sm:p-6">
      <Card class="w-full gap-0 overflow-hidden py-0">
        <CardHeader class="gap-1 border-b py-4">
          <CardTitle class="text-base">Studio schedule</CardTitle>
          <CardDescription class="text-sm">
            Drag a block to reschedule it, or pick one to open its details.
          </CardDescription>
          <CardAction class="flex items-center gap-3">
            <AvatarGroup class="hidden sm:flex">
              <For each={TEAM}>
                {(handle) => (
                  <Avatar size="sm">
                    <AvatarImage src={`https://github.com/${handle}.png`} alt={`@${handle}`} />
                    <AvatarFallback>{handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
              </For>
            </AvatarGroup>
            <Button size="sm" onClick={addBooking}>
              <Plus class="size-4" aria-hidden="true" />
              New event
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="grid min-w-0 p-0 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <EventCalendar
            calendar={calendar}
            renderEvent={renderBookingChip}
            scrollToHour={9}
            eventTooltip
            navButtonVariant="ghost"
            class="h-150 min-w-0"
          >
            <div class="flex flex-wrap items-center gap-2 border-b pe-2">
              <EventCalendarNav class="min-w-0 flex-1" />
              <EventCalendarToolbar>
                <EventCalendarDatePicker />
              </EventCalendarToolbar>
            </div>
            <EventCalendarContent />
          </EventCalendar>
          <SchedulePanel calendar={calendar} />
        </CardContent>
      </Card>
    </Example>
  );
}

/* -------------------------------------------------------------------------- */
/*  Details panel                                                              */
/* -------------------------------------------------------------------------- */

function SchedulePanel(props: { calendar: EventCalendarInstance<Booking> }) {
  // Both reads go through the instance, so the panel tracks navigation,
  // selection and every drag commit without a single extra signal.
  const periodOccurrences = createMemo(() =>
    props.calendar.api.getOccurrences(props.calendar.getState().activeRange),
  );
  const selected = createMemo(() => {
    const key = props.calendar.getState().selection.eventKeys[0];
    if (!key) return undefined;
    return props.calendar.api.getOccurrences().find((occurrence) => occurrence.key === key);
  });

  const countFor = (id: CalendarId) =>
    periodOccurrences().filter((occurrence) => occurrence.event.data?.calendar === id).length;

  const toggleCancelled = (occurrence: EventCalendarOccurrence<Booking>) => {
    const booking = occurrence.event.data;
    if (!booking) return;
    props.calendar.api.updateEvent(occurrence.eventId, {
      data: { ...booking, status: booking.status === "cancelled" ? "confirmed" : "cancelled" },
    });
  };

  return (
    <aside class="flex min-w-0 flex-col gap-4 border-t p-4 lg:border-t-0 lg:border-s">
      <div class="flex flex-col gap-2">
        <p class="font-medium text-sm">Calendars</p>
        <For each={CALENDARS}>
          {(entry) => (
            <div class="flex items-center gap-2">
              <span
                aria-hidden
                class="size-2 shrink-0 rounded-full"
                style={{ "background-color": entry.color }}
              />
              <span class="min-w-0 flex-1 truncate text-sm">{entry.title}</span>
              <span class="text-muted-foreground text-xs tabular-nums">{countFor(entry.id)}</span>
            </div>
          )}
        </For>
      </div>

      <Separator />

      <Show
        when={selected()}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <CalendarRange class="size-5 text-muted-foreground" aria-hidden="true" />
            <p class="text-muted-foreground text-xs">Pick an event to see its details.</p>
          </div>
        }
      >
        {(occurrence) => <BookingDetails occurrence={occurrence()} onToggle={toggleCancelled} />}
      </Show>
    </aside>
  );
}

function BookingDetails(props: {
  occurrence: EventCalendarOccurrence<Booking>;
  onToggle: (occurrence: EventCalendarOccurrence<Booking>) => void;
}) {
  const booking = () => props.occurrence.event.data;
  const status = () => STATUS_META[booking()?.status ?? "confirmed"];

  return (
    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <div class="flex min-w-0 items-start gap-2">
        <span
          aria-hidden
          class="mt-1.5 size-2 shrink-0 rounded-full"
          style={{ "background-color": props.occurrence.event.color ?? "var(--color-primary)" }}
        />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-sm leading-snug">{props.occurrence.event.title}</p>
          <p class="mt-0.5 text-muted-foreground text-xs">{formatWhen(props.occurrence)}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <Badge variant={status().variant}>{status().label}</Badge>
        <Show when={props.occurrence.isRecurring}>
          <Badge variant="primary-light">
            <Repeat class="size-3" aria-hidden="true" />
            Weekly
          </Badge>
        </Show>
      </div>

      <div class="flex flex-col gap-2 text-xs">
        <div class="flex items-center gap-2">
          <Clock class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 truncate">
            {formatDuration(differenceInMinutes(props.occurrence.end, props.occurrence.start))}
          </span>
        </div>
        <Show when={booking()?.location}>
          {(location) => (
            <div class="flex items-center gap-2">
              <MapPin class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 truncate">{location()}</span>
            </div>
          )}
        </Show>
      </div>

      <Show when={(booking()?.attendees.length ?? 0) > 0}>
        <div class="flex flex-col gap-2">
          <p class="text-muted-foreground text-xs">Attendees</p>
          <For each={booking()?.attendees}>
            {(handle) => (
              <div class="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarImage src={`https://github.com/${handle}.png`} alt={`@${handle}`} />
                  <AvatarFallback>{handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span class="min-w-0 truncate text-xs">@{handle}</span>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Editing one occurrence of a series would need its own exception event,
          so the action stays on single bookings. */}
      <Show when={!props.occurrence.isRecurring}>
        <Button
          variant="outline"
          size="sm"
          class="mt-auto w-full"
          onClick={() => props.onToggle(props.occurrence)}
        >
          {booking()?.status === "cancelled" ? "Restore booking" : "Cancel booking"}
        </Button>
      </Show>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatTimeRange(start: Date, end: Date) {
  return `${format(start, "h:mm")} – ${format(end, "h:mm a")}`;
}

function formatWhen(occurrence: EventCalendarOccurrence<Booking>) {
  if (occurrence.allDay) {
    // `end` is exclusive, so the last painted day is the day before it.
    const lastDay = addDays(occurrence.end, -1);
    return isSameDay(occurrence.start, lastDay)
      ? `${format(occurrence.start, "EEEE, MMM d")} · All day`
      : `${format(occurrence.start, "MMM d")} – ${format(lastDay, "MMM d")} · All day`;
  }
  return `${format(occurrence.start, "EEEE, MMM d")} · ${formatTimeRange(
    occurrence.start,
    occurrence.end,
  )}`;
}

function formatDuration(minutes: number) {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 day" : `${days} days`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
