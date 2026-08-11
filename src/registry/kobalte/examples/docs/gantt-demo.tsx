import { addDays, type Locale, startOfDay, startOfWeek } from "date-fns";
import { ar, de, es, fr, ja } from "date-fns/locale";
import { RotateCcw, Settings } from "lucide-solid";
import type { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import {
  Gantt,
  type GanttApi,
  type GanttEvent,
  type GanttI18nOverrides,
  type GanttInteractions,
  GanttNav,
  type GanttResource,
  type GanttSlotDraft,
  GanttToolbar,
  GanttView,
} from "@/registry/kobalte/blocks/gantt";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import { Label } from "@/registry/kobalte/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Switch } from "@/registry/kobalte/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

/**
 * White-label task tree, tall enough that the panes scroll vertically. The
 * Launch group and "Release prep" ship UNSCHEDULED: hover their empty rows
 * and click the hint tile (or drag a range) to schedule them.
 */
const RESOURCES: GanttResource[] = [
  {
    id: "planning",
    title: "Planning",
    children: [
      { id: "brief", title: "Project brief" },
      { id: "scope", title: "Scope review" },
    ],
  },
  {
    id: "design",
    title: "Design",
    children: [
      { id: "wireframes", title: "Wireframes" },
      { id: "visual-design", title: "Visual design" },
    ],
  },
  {
    id: "build",
    title: "Build",
    children: [
      { id: "frontend", title: "Frontend" },
      { id: "backend", title: "Backend" },
      { id: "qa", title: "QA pass" },
      { id: "release-prep", title: "Release prep" },
    ],
  },
  {
    id: "launch",
    title: "Launch",
    children: [
      { id: "docs", title: "Docs" },
      { id: "marketing-site", title: "Marketing site" },
      { id: "announcement", title: "Announcement" },
    ],
  },
];

/** Leaf id -> title, for naming bars scheduled from empty rows. */
const RESOURCE_TITLES = new Map(
  RESOURCES.flatMap((group) => group.children ?? []).map((leaf) => [leaf.id, leaf.title]),
);

/** Small white-label fixture built around the current week. */
function buildBars(anchor: Date): GanttEvent[] {
  const week = startOfWeek(startOfDay(anchor), { weekStartsOn: 0 });
  const day = (dayOffset: number) => addDays(week, dayOffset);
  const bar = (
    resourceId: string,
    title: string,
    startOffset: number,
    days: number,
    color: string,
    progress?: number,
  ): GanttEvent => ({
    id: `bar-${resourceId}`,
    title,
    start: day(startOffset),
    end: day(startOffset + days),
    allDay: true,
    color,
    resourceId,
    progress,
  });

  return [
    bar("brief", "Project brief", -9, 3, "var(--color-blue-500)", 100),
    bar("scope", "Scope review", -6, 2, "var(--color-sky-500)", 100),
    bar("wireframes", "Wireframes", -4, 4, "var(--color-violet-500)", 80),
    bar("visual-design", "Visual design", 0, 5, "var(--color-purple-500)", 35),
    bar("frontend", "Frontend", 3, 7, "var(--color-emerald-500)", 10),
    bar("backend", "Backend", 5, 6, "var(--color-teal-500)"),
    bar("qa", "QA pass", 12, 4, "var(--color-amber-500)"),
  ];
}

/**
 * i18n presets - each language ships a date-fns `locale` (localizes the axis
 * headers, the nav title, and bar date labels; it also drives the default
 * week start, so a German timeline starts Monday) plus an `i18n` override map
 * for the static strings the locale can't reach (Today, the scale names, the
 * schedule hint). Arabic also flips the chart to right-to-left. English is the
 * built-in default, so it leaves both undefined.
 */
type DemoLocale = {
  id: string;
  /** Native language name, shown in the picker. */
  label: string;
  locale: Locale | undefined;
  dir: "ltr" | "rtl";
  i18n: GanttI18nOverrides | undefined;
};

const LOCALES: DemoLocale[] = [
  { id: "en", label: "English", locale: undefined, dir: "ltr", i18n: undefined },
  {
    id: "de",
    label: "Deutsch",
    locale: de,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Heute",
        scheduleHint: "Zum Planen klicken",
        reorder: "Neu anordnen",
        scales: { day: "Tag", week: "Woche", month: "Monat", quarter: "Quartal", year: "Jahr" },
      },
    },
  },
  {
    id: "fr",
    label: "Français",
    locale: fr,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Aujourd'hui",
        scheduleHint: "Cliquer pour planifier",
        reorder: "Réorganiser",
        scales: {
          day: "Jour",
          week: "Semaine",
          month: "Mois",
          quarter: "Trimestre",
          year: "Année",
        },
      },
    },
  },
  {
    id: "es",
    label: "Español",
    locale: es,
    dir: "ltr",
    i18n: {
      labels: {
        today: "Hoy",
        scheduleHint: "Clic para programar",
        reorder: "Reordenar",
        scales: { day: "Día", week: "Semana", month: "Mes", quarter: "Trimestre", year: "Año" },
      },
    },
  },
  {
    id: "ja",
    label: "日本語",
    locale: ja,
    dir: "ltr",
    i18n: {
      labels: {
        today: "今日",
        scheduleHint: "クリックして予定を追加",
        reorder: "並べ替え",
        scales: { day: "日", week: "週", month: "月", quarter: "四半期", year: "年" },
      },
    },
  },
  {
    id: "ar",
    label: "العربية",
    locale: ar,
    dir: "rtl",
    i18n: {
      labels: {
        today: "اليوم",
        scheduleHint: "انقر لإضافة جدول",
        reorder: "إعادة ترتيب",
        scales: { day: "يوم", week: "أسبوع", month: "شهر", quarter: "ربع سنوي", year: "سنة" },
      },
    },
  },
];

/** Display time zones - all timeline math and rendering happen in the chosen
 *  zone, so switching it re-anchors every bar to that zone's calendar days. */
const TIME_ZONES: Array<{ id: string; label: string; value?: string }> = [
  { id: "local", label: "Browser" },
  { id: "ny", label: "New York", value: "America/New_York" },
  { id: "london", label: "London", value: "Europe/London" },
  { id: "tokyo", label: "Tokyo", value: "Asia/Tokyo" },
  { id: "kolkata", label: "Kolkata", value: "Asia/Kolkata" },
];

type DemoSettings = {
  rowCheckboxes: boolean;
  summaryBars: boolean;
  zoomControl: boolean;
  offscreenIndicators: boolean;
  infiniteScroll: boolean;
  nowIndicator: boolean;
  offDays: boolean;
  dragCreate: boolean;
  displayScheduleHint: boolean;
  barLabel: "inside" | "outside" | "auto";
  timelineLines: "vertical" | "both" | "none";
  interactions: GanttInteractions;
  localeId: string;
  timeZoneId: string;
};

/** Every toggle's default; the Reset button returns the demo here. */
const SETTINGS_DEFAULTS: DemoSettings = {
  rowCheckboxes: true,
  summaryBars: true,
  zoomControl: true,
  offscreenIndicators: true,
  infiniteScroll: true,
  nowIndicator: true,
  offDays: false,
  dragCreate: true,
  displayScheduleHint: true,
  barLabel: "inside",
  timelineLines: "vertical",
  interactions: { drag: true, resize: true, selectSlot: true },
  localeId: "en",
  timeZoneId: "local",
};

/** One labeled switch row inside a settings tab. */
function SettingSwitch(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div class="flex items-center justify-between gap-4 py-1">
      <Label for={props.id} class="font-normal">
        {props.label}
      </Label>
      <Switch id={props.id} checked={props.checked} onChange={props.onChange} />
    </div>
  );
}

/** One labeled radio row inside a settings tab. */
function SettingRadio(props: { id: string; value: string; label: string }) {
  return (
    <div class="flex items-center gap-2 py-0.5">
      <RadioGroupItem value={props.value} id={props.id} />
      <Label for={props.id} class="font-normal">
        {props.label}
      </Label>
    </div>
  );
}

type SelectOption = { value: string; label: string };

/** One labeled select row - the language and time-zone pickers. */
function SettingSelect(props: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
}) {
  const selected = () => props.options.find((option) => option.value === props.value);

  return (
    <div class="flex items-center justify-between gap-4 py-1">
      <Label for={props.id} class="font-normal">
        {props.label}
      </Label>
      <Select<SelectOption>
        options={props.options}
        optionValue="value"
        optionTextValue="label"
        value={selected()}
        onChange={(option) => option && props.onValueChange(option.value)}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
        )}
      >
        <SelectTrigger id={props.id} size="sm" class="w-36" aria-label={props.label}>
          {/* Kobalte's Value renders the raw value by default; the selected
              option's label reads better here. */}
          <SelectValue<SelectOption>>{(state) => state.selectedOption().label}</SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
}

function SettingsMenu(props: {
  settings: DemoSettings;
  onChange: <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => void;
  onInteractionChange: (key: keyof GanttInteractions, value: boolean) => void;
  onReset: () => void;
}): JSX.Element {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger as={Button} variant="outline" size="sm">
        <Settings class="size-4" aria-hidden="true" />
        Settings
      </PopoverTrigger>
      <PopoverContent class="w-80 p-0">
        {/* Tabs keep every group one screen tall - no menu scrolling */}
        <Tabs defaultValue="display">
          <div class="border-b p-2">
            <TabsList class="grid w-full grid-cols-4">
              <TabsTrigger value="display">Display</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="region">Region</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="display" class="space-y-0.5 p-3">
            <SettingSwitch
              id="gantt-demo-row-checkboxes"
              label="Row checkboxes"
              checked={props.settings.rowCheckboxes}
              onChange={(value) => props.onChange("rowCheckboxes", value)}
            />
            <SettingSwitch
              id="gantt-demo-summary-bars"
              label="Summary bars"
              checked={props.settings.summaryBars}
              onChange={(value) => props.onChange("summaryBars", value)}
            />
            <SettingSwitch
              id="gantt-demo-zoom-control"
              label="Zoom control"
              checked={props.settings.zoomControl}
              onChange={(value) => props.onChange("zoomControl", value)}
            />
            <SettingSwitch
              id="gantt-demo-offscreen-chips"
              label="Off-screen chips"
              checked={props.settings.offscreenIndicators}
              onChange={(value) => props.onChange("offscreenIndicators", value)}
            />
            <SettingSwitch
              id="gantt-demo-infinite-scroll"
              label="Infinite scroll"
              checked={props.settings.infiniteScroll}
              onChange={(value) => props.onChange("infiniteScroll", value)}
            />
            <SettingSwitch
              id="gantt-demo-now-indicator"
              label="Now indicator"
              checked={props.settings.nowIndicator}
              onChange={(value) => props.onChange("nowIndicator", value)}
            />
            <SettingSwitch
              id="gantt-demo-off-days"
              label="Mark off days"
              checked={props.settings.offDays}
              onChange={(value) => props.onChange("offDays", value)}
            />
          </TabsContent>
          <TabsContent value="behavior" class="space-y-0.5 p-3">
            <SettingSwitch
              id="gantt-demo-drag"
              label="Drag to move"
              checked={props.settings.interactions.drag}
              onChange={(value) => props.onInteractionChange("drag", value)}
            />
            <SettingSwitch
              id="gantt-demo-resize"
              label="Resize"
              checked={props.settings.interactions.resize}
              onChange={(value) => props.onInteractionChange("resize", value)}
            />
            <SettingSwitch
              id="gantt-demo-select-slot"
              label="Select slot"
              checked={props.settings.interactions.selectSlot}
              onChange={(value) => props.onInteractionChange("selectSlot", value)}
            />
            <SettingSwitch
              id="gantt-demo-drag-create"
              label="Drag to create"
              checked={props.settings.dragCreate}
              onChange={(value) => props.onChange("dragCreate", value)}
            />
            <SettingSwitch
              id="gantt-demo-schedule-hint"
              label="Schedule hint"
              checked={props.settings.displayScheduleHint}
              onChange={(value) => props.onChange("displayScheduleHint", value)}
            />
          </TabsContent>
          <TabsContent value="style" class="space-y-4 p-3">
            <div class="space-y-1.5">
              <div class="font-medium text-muted-foreground text-xs">Bar label</div>
              <RadioGroup
                value={props.settings.barLabel}
                onChange={(value) => props.onChange("barLabel", value as DemoSettings["barLabel"])}
              >
                <SettingRadio id="gantt-demo-label-inside" value="inside" label="Inside" />
                <SettingRadio id="gantt-demo-label-outside" value="outside" label="Outside" />
                <SettingRadio id="gantt-demo-label-auto" value="auto" label="Auto" />
              </RadioGroup>
            </div>
            <div class="space-y-1.5">
              <div class="font-medium text-muted-foreground text-xs">Grid lines</div>
              <RadioGroup
                value={props.settings.timelineLines}
                onChange={(value) =>
                  props.onChange("timelineLines", value as DemoSettings["timelineLines"])
                }
              >
                <SettingRadio id="gantt-demo-lines-vertical" value="vertical" label="Vertical" />
                <SettingRadio id="gantt-demo-lines-both" value="both" label="Both" />
                <SettingRadio id="gantt-demo-lines-none" value="none" label="None" />
              </RadioGroup>
            </div>
          </TabsContent>
          <TabsContent value="region" class="space-y-2 p-3">
            <SettingSelect
              id="gantt-demo-language"
              label="Language"
              value={props.settings.localeId}
              options={LOCALES.map((entry) => ({ value: entry.id, label: entry.label }))}
              onValueChange={(value) => props.onChange("localeId", value)}
            />
            <SettingSelect
              id="gantt-demo-timezone"
              label="Time zone"
              value={props.settings.timeZoneId}
              options={TIME_ZONES.map((entry) => ({ value: entry.id, label: entry.label }))}
              onValueChange={(value) => props.onChange("timeZoneId", value)}
            />
            <p class="text-muted-foreground text-xs leading-relaxed">
              Language switches the date-fns locale, the scale names, and the week start. Time zone
              re-anchors every bar. Arabic also flips the chart to right-to-left.
            </p>
          </TabsContent>
        </Tabs>
        <div class="border-t p-2">
          <Button variant="outline" size="sm" class="w-full" onClick={props.onReset}>
            <RotateCcw class="size-3.5" aria-hidden="true" />
            Reset to defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function GanttDemo() {
  const bars = buildBars(new Date());
  let api: GanttApi | undefined;
  const [settings, setSettings] = createStore<DemoSettings>({
    ...SETTINGS_DEFAULTS,
    interactions: { ...SETTINGS_DEFAULTS.interactions },
  });

  const activeLocale = () => LOCALES.find((entry) => entry.id === settings.localeId) ?? LOCALES[0];
  const activeTimeZone = () =>
    TIME_ZONES.find((entry) => entry.id === settings.timeZoneId) ?? TIME_ZONES[0];

  const resetSettings = () =>
    setSettings({ ...SETTINGS_DEFAULTS, interactions: { ...SETTINGS_DEFAULTS.interactions } });

  // Unscheduled rows accept ONE schedule: the hint tile (or a drag-create
  // range) proposes a slot, and the handler turns it into a real bar.
  const canSelectSlot = (slot: GanttSlotDraft) =>
    !!slot.resourceId &&
    !(api?.getEvents() ?? []).some((event) => event.resourceId === slot.resourceId);

  const handleSelectSlot = (slot: GanttSlotDraft) => {
    if (!api || !slot.resourceId) return;
    api.addEvent({
      id: `scheduled-${slot.resourceId}`,
      title: RESOURCE_TITLES.get(slot.resourceId) ?? "New schedule",
      start: slot.start,
      end: slot.end,
      allDay: true,
      color: "var(--color-indigo-500)",
      resourceId: slot.resourceId,
    });
  };

  return (
    <div class="w-full p-4" dir={activeLocale().dir}>
      <Card class="w-full py-0">
        <CardContent class="p-0">
          <Gantt
            defaultEvents={bars}
            resources={RESOURCES}
            defaultScale="month"
            apiRef={(instance) => {
              api = instance;
            }}
            locale={activeLocale().locale}
            i18n={activeLocale().i18n}
            timeZone={activeTimeZone().value}
            treePanel={{ width: 200 }}
            rowCheckboxes={settings.rowCheckboxes}
            summaryBars={settings.summaryBars}
            zoomControl={settings.zoomControl}
            offscreenIndicators={settings.offscreenIndicators}
            infiniteScroll={settings.infiniteScroll}
            nowIndicator={settings.nowIndicator}
            offDays={settings.offDays}
            dragCreate={settings.dragCreate}
            displayScheduleHint={settings.displayScheduleHint}
            barLabel={settings.barLabel}
            timelineLines={settings.timelineLines}
            interactions={settings.interactions}
            onInteractionsChange={(next) => setSettings("interactions", next)}
            canSelectSlot={canSelectSlot}
            onSelectSlot={handleSelectSlot}
            class="h-[520px] w-full"
          >
            {/* one bordered header row, same look as the plain GanttNav:
                the row owns the border and end padding so the toolbar never
                sits glued to the edge */}
            <div class="flex flex-wrap items-center gap-2 border-b pe-3">
              <GanttNav class="min-w-0 flex-1 border-b-0" />
              <GanttToolbar>
                <SettingsMenu
                  settings={settings}
                  onChange={(key, value) => setSettings(key, value)}
                  onInteractionChange={(key, value) => setSettings("interactions", key, value)}
                  onReset={resetSettings}
                />
              </GanttToolbar>
            </div>
            <GanttView />
          </Gantt>
        </CardContent>
      </Card>
    </div>
  );
}
