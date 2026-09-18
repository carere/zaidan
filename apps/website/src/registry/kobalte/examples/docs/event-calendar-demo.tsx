import { addDays, addMinutes, type Locale, setHours, startOfDay, startOfWeek } from "date-fns";
import { ar, de, es, fr, ja } from "date-fns/locale";
import { Plus, SlidersHorizontal } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import {
  type CalendarEvent,
  type CalendarView,
  EventCalendar,
  type EventCalendarApi,
  EventCalendarContent,
  EventCalendarDatePicker,
  type EventCalendarI18nOverrides,
  type EventCalendarInteractions,
  EventCalendarNav,
  type EventCalendarOccurrence,
  type EventCalendarRenderEventProps,
  type EventCalendarResource,
  EventCalendarToolbar,
  type EventCalendarViewSettings,
} from "@/registry/kobalte/blocks/event-calendar";
import { Avatar, AvatarFallback } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import { Label } from "@/registry/kobalte/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Switch } from "@/registry/kobalte/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

/** Team members - passing resources unlocks the resource day view, so the
 *  view switcher offers every view the calendar ships. */
const TEAM: EventCalendarResource[] = [
  { id: "alex", title: "Alex", color: "var(--color-blue-500)" },
  { id: "mia", title: "Mia", color: "var(--color-violet-500)" },
  { id: "sam", title: "Sam", color: "var(--color-emerald-500)" },
];

const INITIALS: Record<string, string> = { alex: "AL", mia: "MJ", sam: "SP" };

/** Demo events: a balanced current week (timed, multi-day, all-day, two
 *  custom-rendered chips) plus a light scatter in the nearby weeks so the
 *  month view reads naturally without crowding any cell. */
function buildEvents(anchor: Date): CalendarEvent[] {
  const week = startOfWeek(startOfDay(anchor), { weekStartsOn: 0 });
  const at = (dayOffset: number, hour: number, minute = 0) =>
    addMinutes(setHours(addDays(week, dayOffset), hour), minute);
  const day = (dayOffset: number) => addDays(week, dayOffset);

  return [
    {
      id: "team-sync",
      title: "Team sync",
      start: at(1, 9, 0),
      end: at(1, 9, 30),
      resourceId: "alex",
      // A weekly series: recurrence accepts a raw RRULE line or the
      // structured EventCalendarRecurrenceRule shape.
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8",
    },
    {
      id: "design-review",
      title: "Design review",
      start: at(2, 11, 0),
      end: at(2, 12, 0),
      resourceId: "mia",
      color: "var(--color-violet-500)",
    },
    {
      id: "product-demo",
      title: "Product demo",
      start: at(3, 15, 0),
      end: at(3, 16, 0),
      resourceId: "sam",
      color: "var(--color-emerald-500)",
    },
    {
      id: "roadmap-planning",
      title: "Roadmap planning",
      start: at(4, 10, 0),
      end: at(4, 11, 30),
      resourceId: "alex",
      color: "var(--color-indigo-500)",
    },
    {
      id: "client-call",
      title: "Client call",
      start: at(5, 14, 0),
      end: at(5, 15, 0),
      resourceId: "mia",
      color: "var(--color-amber-500)",
    },
    {
      id: "team-offsite",
      title: "Team offsite",
      start: day(4),
      end: day(6),
      allDay: true,
      color: "var(--color-rose-500)",
    },
    {
      id: "sprint-planning",
      title: "Sprint planning",
      start: at(9, 9, 30),
      end: at(9, 10, 30),
      resourceId: "sam",
      color: "var(--color-blue-500)",
    },
    {
      id: "quarterly-review",
      title: "Quarterly review",
      start: at(17, 13, 0),
      end: at(17, 14, 30),
      resourceId: "alex",
      color: "var(--color-cyan-500)",
    },
  ];
}

/**
 * Custom chip content for a couple of events - proof that the chip is fully
 * yours to shape via `renderEvent`. Returning undefined for everything else
 * falls back to the built-in dot + title + time.
 */
function renderEventContent(props: EventCalendarRenderEventProps) {
  const event = props.occurrence.event;

  // Attendee initials in place of the leading color dot; a thin ring keeps the
  // overlap crisp at chip size.
  if (event.id === "design-review") {
    return (
      <>
        <span class="-space-x-1 flex shrink-0">
          <span class="flex size-4 items-center justify-center rounded-full bg-violet-500 font-semibold text-[8px] text-white ring-1 ring-background">
            MJ
          </span>
          <span class="flex size-4 items-center justify-center rounded-full bg-sky-500 font-semibold text-[8px] text-white ring-1 ring-background">
            AL
          </span>
        </span>
        <span class="truncate font-medium">{event.title}</span>
      </>
    );
  }

  // Title with a trailing status pill. The dot, title and pill share one flex
  // row so the leading dot stays glued to the label - a stacked (flex-col)
  // timed-grid chip would otherwise drop the dot onto its own line.
  if (event.id === "client-call") {
    return (
      <span class="flex w-full min-w-0 items-center gap-1.5">
        <span aria-hidden class="-me-0.5 size-1.5 shrink-0 rounded-full bg-(--ec-event-color)" />
        <span class="truncate font-medium">{event.title}</span>
        <span class="ms-auto shrink-0 rounded bg-(--ec-event-color)/25 px-1 font-semibold text-[10px]">
          30m
        </span>
      </span>
    );
  }

  return undefined;
}

/** Resource columns get an avatar next to the member name. */
function renderResourceHeaderContent(props: { resource: EventCalendarResource }) {
  return (
    <span class="flex items-center gap-1.5">
      <Avatar size="sm">
        <AvatarFallback class="font-medium text-[10px]">
          {INITIALS[props.resource.id] ?? props.resource.title.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span class="truncate">{props.resource.title}</span>
    </span>
  );
}

/** Styled hover tooltip content (only rendered while `eventTooltip` is on). */
function renderEventTooltipContent(props: {
  occurrence: EventCalendarOccurrence;
  label: string | undefined;
}) {
  const resource = TEAM.find((member) => member.id === props.occurrence.event.resourceId);
  return (
    <span class="flex flex-col gap-0.5">
      <span class="font-medium">{props.label}</span>
      <Show when={resource}>
        {(member) => <span class="text-[11px] opacity-80">Owner: {member().title}</span>}
      </Show>
    </span>
  );
}

/**
 * i18n presets - each language ships a date-fns `locale` (localizes every
 * formatted date: weekday headers, month title, time gutter) plus an `i18n`
 * override map for the static UI strings the locale can't reach (Today, view
 * names, "+N more"). Arabic also flips the whole calendar to right-to-left.
 * English is the built-in default, so it leaves both undefined.
 */
interface DemoLocale {
  value: string;
  /** Native language name, shown in the picker. */
  label: string;
  locale: Locale | undefined;
  dir: "ltr" | "rtl";
  i18n: EventCalendarI18nOverrides | undefined;
}

const LOCALES: DemoLocale[] = [
  { value: "en", label: "English", locale: undefined, dir: "ltr", i18n: undefined },
  {
    value: "de",
    label: "Deutsch",
    locale: de,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Heute",
        allDay: "Ganztägig",
        noEvents: "Keine Termine",
        more: (count) => `+${count} weitere`,
      },
      viewNames: {
        month: "Monat",
        week: "Woche",
        day: "Tag",
        days: (count) => `${count} Tage`,
        agenda: "Agenda",
        resource: "Zeitraster",
      },
    },
  },
  {
    value: "fr",
    label: "Français",
    locale: fr,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Aujourd'hui",
        allDay: "Journée entière",
        noEvents: "Aucun événement",
        more: (count) => `+${count} autres`,
      },
      viewNames: {
        month: "Mois",
        week: "Semaine",
        day: "Jour",
        days: (count) => `${count} jours`,
        agenda: "Agenda",
        resource: "Grille horaire",
      },
    },
  },
  {
    value: "es",
    label: "Español",
    locale: es,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Hoy",
        allDay: "Todo el día",
        noEvents: "Sin eventos",
        more: (count) => `+${count} más`,
      },
      viewNames: {
        month: "Mes",
        week: "Semana",
        day: "Día",
        days: (count) => `${count} días`,
        agenda: "Agenda",
        resource: "Cuadrícula",
      },
    },
  },
  {
    value: "ja",
    label: "日本語",
    locale: ja,
    dir: "ltr",
    i18n: {
      labels: {
        today: "今日",
        allDay: "終日",
        noEvents: "予定なし",
        more: (count) => `他${count}件`,
      },
      viewNames: {
        month: "月",
        week: "週",
        day: "日",
        days: (count) => `${count}日間`,
        agenda: "予定",
        resource: "タイムグリッド",
      },
    },
  },
  {
    value: "ar",
    label: "العربية",
    locale: ar,
    dir: "rtl",
    i18n: {
      labels: {
        today: "اليوم",
        allDay: "طوال اليوم",
        noEvents: "لا توجد أحداث",
        more: (count) => `+${count} المزيد`,
      },
      viewNames: {
        month: "شهر",
        week: "أسبوع",
        day: "يوم",
        days: (count) => `${count} أيام`,
        agenda: "جدول الأعمال",
        resource: "شبكة زمنية",
      },
    },
  },
];

/** Display time zones - all event math and rendering happen in the chosen
 *  zone, so switching it visibly shifts every event's clock time. */
const TIME_ZONES: Array<{ value: string; label: string; zone?: string }> = [
  { value: "local", label: "Browser" },
  { value: "ny", label: "New York", zone: "America/New_York" },
  { value: "london", label: "London", zone: "Europe/London" },
  { value: "tokyo", label: "Tokyo", zone: "Asia/Tokyo" },
  { value: "kolkata", label: "Kolkata", zone: "Asia/Kolkata" },
];

/** Everything the settings panel drives, as one resettable object. */
interface DemoSettings {
  viewSettings: EventCalendarViewSettings;
  interactions: EventCalendarInteractions;
  weekStartsOn: 0 | 1;
  dayStartHour: number;
  dayEndHour: number;
  interval: number;
  snapDuration: number;
  eventTooltip: boolean;
  showDayAddButton: boolean;
  localeId: string;
  timeZoneId: string;
}

const DEFAULT_SETTINGS: DemoSettings = {
  viewSettings: { weekends: true, weekNumbers: false, nowIndicator: true, offDays: false },
  interactions: { drag: true, resize: true, selectSlot: true },
  weekStartsOn: 0,
  dayStartHour: 0,
  dayEndHour: 24,
  interval: 60,
  snapDuration: 15,
  eventTooltip: false,
  showDayAddButton: false,
  localeId: "en",
  timeZoneId: "local",
};

type NumberOption = { value: number; label: string };
type TextOption = { value: string; label: string };

function SettingsSwitch(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div class="flex items-center justify-between gap-4">
      <Label for={props.id} class="font-normal text-sm">
        {props.label}
      </Label>
      <Switch id={props.id} size="sm" checked={props.checked} onChange={props.onChange} />
    </div>
  );
}

function SettingsSelect(props: {
  label: string;
  value: number;
  options: NumberOption[];
  onChange: (value: number) => void;
}) {
  const selected = () => props.options.find((option) => option.value === props.value);
  return (
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm">{props.label}</span>
      <Select<NumberOption>
        options={props.options}
        optionValue="value"
        optionTextValue="label"
        value={selected()}
        onChange={(option) => option && props.onChange(option.value)}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger size="sm" class="w-28" aria-label={props.label}>
          <SelectValue<NumberOption>>{(state) => state.selectedOption().label}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
}

/** String-keyed sibling of SettingsSelect, for the language/time-zone pickers. */
function SettingsTextSelect(props: {
  label: string;
  value: string;
  options: TextOption[];
  onChange: (value: string) => void;
}) {
  const selected = () => props.options.find((option) => option.value === props.value);
  return (
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm">{props.label}</span>
      <Select<TextOption>
        options={props.options}
        optionValue="value"
        optionTextValue="label"
        value={selected()}
        onChange={(option) => option && props.onChange(option.value)}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger size="sm" class="w-36" aria-label={props.label}>
          <SelectValue<TextOption>>{(state) => state.selectedOption().label}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
}

export default function EventCalendarDemo() {
  const events = buildEvents(new Date());
  // apiRef takes the Solid ref convention: a setter that receives the API.
  let api: EventCalendarApi | undefined;
  let newEventCount = 0;
  const [settings, setSettings] = createSignal<DemoSettings>(DEFAULT_SETTINGS);
  // Mirror the active view so the settings panel can show the time-grid
  // internals tab only where those options are visible (week/day/N-days and
  // the resource time grid - month and agenda render no hour track).
  const [view, setView] = createSignal<CalendarView>("month");
  const [tab, setTab] = createSignal("view");
  const isTimeGridView = () => view() !== "month" && view() !== "agenda";
  const activeTab = () => (tab() === "time" && !isTimeGridView() ? "view" : tab());

  const activeLocale = () =>
    LOCALES.find((entry) => entry.value === settings().localeId) ?? LOCALES[0];
  const activeTimeZone = () =>
    TIME_ZONES.find((entry) => entry.value === settings().timeZoneId) ?? TIME_ZONES[0];

  const patch = (partial: Partial<DemoSettings>) =>
    setSettings((current) => ({ ...current, ...partial }));
  const patchViewSettings = (partial: EventCalendarViewSettings) =>
    patch({ viewSettings: { ...settings().viewSettings, ...partial } });
  const patchInteractions = (partial: Partial<EventCalendarInteractions>) =>
    patch({ interactions: { ...settings().interactions, ...partial } });

  // Add a one-hour event at noon today and jump to it - a minimal stand-in for
  // a real "create event" dialog.
  const addEvent = () => {
    if (!api) return;
    const start = setHours(startOfDay(new Date()), 12);
    const end = addMinutes(start, 60);
    api.addEvent({
      id: `new-event-${newEventCount++}`,
      title: "New event",
      start,
      end,
      resourceId: "alex",
      color: "var(--color-blue-500)",
    });
    api.goTo(start);
  };

  return (
    <div class="w-full p-4" dir={activeLocale().dir}>
      <Card class="w-full py-0">
        <CardContent class="p-0">
          <EventCalendar
            defaultEvents={events}
            defaultView="month"
            onViewChange={setView}
            resources={TEAM}
            apiRef={(instanceApi) => {
              api = instanceApi;
            }}
            renderEvent={renderEventContent}
            renderResourceHeader={renderResourceHeaderContent}
            renderEventTooltip={renderEventTooltipContent}
            locale={activeLocale().locale}
            i18n={activeLocale().i18n}
            timeZone={activeTimeZone().zone}
            viewSettings={settings().viewSettings}
            onViewSettingsChange={(viewSettings) => patch({ viewSettings })}
            interactions={settings().interactions}
            onInteractionsChange={(interactions) => patch({ interactions })}
            weekStartsOn={settings().weekStartsOn}
            dayStartHour={settings().dayStartHour}
            dayEndHour={settings().dayEndHour}
            interval={settings().interval}
            snapDuration={settings().snapDuration}
            eventTooltip={settings().eventTooltip}
            showDayAddButton={settings().showDayAddButton}
            // Object form of offDays: the marker class hook is named `class`
            // in this port, unlike the React original.
            offDays={{ weekendDays: [0, 6], class: "bg-muted/40" }}
            class="h-[640px] w-full"
          >
            <div class="flex flex-wrap items-center gap-2 pe-2">
              <EventCalendarNav class="min-w-0 flex-1" />
              <EventCalendarToolbar>
                {/* Not part of the default nav - compose it wherever it fits. */}
                <EventCalendarDatePicker />
                <Popover placement="bottom-end" gutter={8}>
                  <PopoverTrigger as={Button} variant="outline" size="sm">
                    <SlidersHorizontal class="size-4" aria-hidden="true" />
                    Settings
                  </PopoverTrigger>
                  <PopoverContent class="w-80">
                    <Tabs value={activeTab()} onChange={setTab}>
                      <TabsList class="w-full">
                        <TabsTrigger value="view" class="flex-1">
                          View
                        </TabsTrigger>
                        {/* time-grid internals only exist where an hour track
                            renders, so the tab follows the active view */}
                        <Show when={isTimeGridView()}>
                          <TabsTrigger value="time" class="flex-1">
                            Time grid
                          </TabsTrigger>
                        </Show>
                        <TabsTrigger value="behavior" class="flex-1">
                          Behavior
                        </TabsTrigger>
                        <TabsTrigger value="region" class="flex-1">
                          Region
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="view" class="flex flex-col gap-3 pt-3">
                        <SettingsSwitch
                          id="ec-set-weekends"
                          label="Weekends"
                          checked={settings().viewSettings.weekends ?? true}
                          onChange={(weekends) => patchViewSettings({ weekends })}
                        />
                        <SettingsSwitch
                          id="ec-set-week-numbers"
                          label="Week numbers"
                          checked={settings().viewSettings.weekNumbers ?? false}
                          onChange={(weekNumbers) => patchViewSettings({ weekNumbers })}
                        />
                        <SettingsSwitch
                          id="ec-set-now"
                          label="Now indicator"
                          checked={settings().viewSettings.nowIndicator ?? true}
                          onChange={(nowIndicator) => patchViewSettings({ nowIndicator })}
                        />
                        <SettingsSwitch
                          id="ec-set-off-days"
                          label="Mark off days"
                          checked={settings().viewSettings.offDays ?? false}
                          onChange={(offDays) => patchViewSettings({ offDays })}
                        />
                        <SettingsSwitch
                          id="ec-set-day-add"
                          label="Day add button"
                          checked={settings().showDayAddButton}
                          onChange={(showDayAddButton) => patch({ showDayAddButton })}
                        />
                        {/* week start shapes month and week grids alike, so
                            it lives here rather than in time-grid internals */}
                        <SettingsSelect
                          label="Week starts"
                          value={settings().weekStartsOn}
                          options={[
                            { value: 0, label: "Sunday" },
                            { value: 1, label: "Monday" },
                          ]}
                          onChange={(weekStartsOn) =>
                            patch({ weekStartsOn: weekStartsOn === 1 ? 1 : 0 })
                          }
                        />
                      </TabsContent>
                      <TabsContent value="time" class="flex flex-col gap-3 pt-3">
                        <SettingsSelect
                          label="Day starts"
                          value={settings().dayStartHour}
                          options={[
                            { value: 0, label: "00:00" },
                            { value: 6, label: "06:00" },
                            { value: 8, label: "08:00" },
                          ]}
                          onChange={(dayStartHour) => patch({ dayStartHour })}
                        />
                        <SettingsSelect
                          label="Day ends"
                          value={settings().dayEndHour}
                          options={[
                            { value: 18, label: "18:00" },
                            { value: 20, label: "20:00" },
                            { value: 24, label: "24:00" },
                          ]}
                          onChange={(dayEndHour) => patch({ dayEndHour })}
                        />
                        <SettingsSelect
                          label="Grid interval"
                          value={settings().interval}
                          options={[
                            { value: 30, label: "30 min" },
                            { value: 60, label: "60 min" },
                          ]}
                          onChange={(interval) => patch({ interval })}
                        />
                        <SettingsSelect
                          label="Drag snap"
                          value={settings().snapDuration}
                          options={[
                            { value: 5, label: "5 min" },
                            { value: 15, label: "15 min" },
                            { value: 30, label: "30 min" },
                          ]}
                          onChange={(snapDuration) => patch({ snapDuration })}
                        />
                      </TabsContent>
                      <TabsContent value="behavior" class="flex flex-col gap-3 pt-3">
                        <SettingsSwitch
                          id="ec-set-drag"
                          label="Drag to move"
                          checked={settings().interactions.drag}
                          onChange={(drag) => patchInteractions({ drag })}
                        />
                        <SettingsSwitch
                          id="ec-set-resize"
                          label="Drag to resize"
                          checked={settings().interactions.resize}
                          onChange={(resize) => patchInteractions({ resize })}
                        />
                        <SettingsSwitch
                          id="ec-set-select-slot"
                          label="Drag to create"
                          checked={settings().interactions.selectSlot}
                          onChange={(selectSlot) => patchInteractions({ selectSlot })}
                        />
                        <SettingsSwitch
                          id="ec-set-tooltip"
                          label="Event tooltips"
                          checked={settings().eventTooltip}
                          onChange={(eventTooltip) => patch({ eventTooltip })}
                        />
                      </TabsContent>
                      <TabsContent value="region" class="flex flex-col gap-3 pt-3">
                        <SettingsTextSelect
                          label="Language"
                          value={settings().localeId}
                          options={LOCALES.map((entry) => ({
                            value: entry.value,
                            label: entry.label,
                          }))}
                          onChange={(localeId) => patch({ localeId })}
                        />
                        <SettingsTextSelect
                          label="Time zone"
                          value={settings().timeZoneId}
                          options={TIME_ZONES.map((entry) => ({
                            value: entry.value,
                            label: entry.label,
                          }))}
                          onChange={(timeZoneId) => patch({ timeZoneId })}
                        />
                        <p class="text-muted-foreground text-xs leading-relaxed">
                          Language switches the date-fns locale and every UI label. Time zone shifts
                          all event times. Arabic also flips the calendar to right-to-left.
                        </p>
                      </TabsContent>
                    </Tabs>
                    <Button
                      variant="outline"
                      size="sm"
                      class="mt-4 w-full"
                      onClick={() => setSettings(DEFAULT_SETTINGS)}
                    >
                      Reset to defaults
                    </Button>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={addEvent}>
                  <Plus class="size-4" aria-hidden="true" />
                  New event
                </Button>
              </EventCalendarToolbar>
            </div>
            <EventCalendarContent />
          </EventCalendar>
        </CardContent>
      </Card>
    </div>
  );
}
