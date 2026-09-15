import {
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  FunnelX,
  ListFilter,
  SlidersVertical,
} from "lucide-solid";
import { type ComponentProps, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { cn } from "@/lib/utils";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar, type CalendarRangeValue } from "@/registry/kobalte/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/kobalte/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import { ScrollArea } from "@/registry/kobalte/ui/scroll-area";
import { Slider } from "@/registry/kobalte/ui/slider";

// Every custom control receives the same shape the block passes to
// `customRenderer`, plus an `autofocus` flag the demo derives from the filter
// that was just added, so a freshly created chip opens its editor by itself.
type ControlProps = {
  values: unknown[];
  onChange: (values: unknown[]) => void;
  autofocus?: boolean;
};

const TRIGGER_CLASS = "cursor-default text-start outline-hidden";

const toDate = (value: unknown) => (typeof value === "string" ? new Date(value) : undefined);
const toIsoDay = (date: Date) => date.toISOString().split("T")[0];

function useAutoOpen(props: ControlProps, open: (value: boolean) => void) {
  onMount(() => {
    if (!props.autofocus) return;
    const timer = setTimeout(() => open(true), 400);
    onCleanup(() => clearTimeout(timer));
  });
}

// A modal editor: the chip only shows the formatted value, the dialog owns the
// draft state and commits on Apply.
function ModalDateControl(props: ControlProps) {
  const [open, setOpen] = createSignal(false);
  const [draft, setDraft] = createSignal<Date | undefined>(toDate(props.values?.[0]));

  useAutoOpen(props, setOpen);

  const selected = () => toDate(props.values?.[0]);

  return (
    <Dialog
      open={open()}
      onOpenChange={(next) => {
        if (next) setDraft(selected());
        setOpen(next);
      }}
    >
      <button type="button" class={TRIGGER_CLASS} onClick={() => setOpen(true)}>
        <Show when={selected()} fallback="Select a date">
          {(date) => format(date(), "PPP")}
        </Show>
      </button>
      <DialogContent class="sm:max-w-fit">
        <DialogHeader>
          <DialogTitle>Select Date</DialogTitle>
        </DialogHeader>
        <Calendar mode="single" selected={draft()} onSelect={setDraft} class="p-0" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const date = draft();
              props.onChange(date ? [date.toISOString()] : []);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DateRangeControl(props: ControlProps) {
  const [open, setOpen] = createSignal(false);
  const [range, setRange] = createSignal<CalendarRangeValue | undefined>({
    from: toDate(props.values?.[0]),
    to: toDate(props.values?.[1]),
  });

  useAutoOpen(props, setOpen);

  const apply = () => {
    const current = range();
    if (current?.from) {
      const from = toIsoDay(current.from);
      props.onChange([from, current.to ? toIsoDay(current.to) : from]);
    }
    setOpen(false);
  };

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-start" gutter={8}>
      <PopoverTrigger class={TRIGGER_CLASS}>
        <Show when={range()?.from} fallback={<span>Pick a date range</span>}>
          {(from) => (
            <>
              {format(from(), "LLL dd, y")}
              <Show when={range()?.to}>{(to) => ` - ${format(to(), "LLL dd, y")}`}</Show>
            </>
          )}
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={range()?.from}
          showOutsideDays={false}
          selected={range()}
          onSelect={setRange}
          numberOfMonths={2}
        />
        <div class="flex items-center justify-end gap-1.5 border-border border-t p-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateRangePresetsControl(props: ControlProps) {
  const today = new Date();
  const presets = [
    { label: "Today", range: { from: today, to: today } },
    { label: "Yesterday", range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: "Last 7 days", range: { from: subDays(today, 6), to: today } },
    { label: "Last 30 days", range: { from: subDays(today, 29), to: today } },
    { label: "Month to date", range: { from: startOfMonth(today), to: today } },
    {
      label: "Last month",
      range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
    },
    { label: "Year to date", range: { from: startOfYear(today), to: today } },
    {
      label: "Last year",
      range: { from: startOfYear(subYears(today, 1)), to: endOfYear(subYears(today, 1)) },
    },
  ];

  const [open, setOpen] = createSignal(false);
  const [month, setMonth] = createSignal(today);
  const [range, setRange] = createSignal<CalendarRangeValue | undefined>({
    from: toDate(props.values?.[0]),
    to: toDate(props.values?.[1]),
  });

  useAutoOpen(props, setOpen);

  // Derived, not stored: the active preset is whichever one matches the range.
  const activePreset = () => {
    const current = range();
    if (!current?.from || !current.to) return null;
    return (
      presets.find(
        (preset) =>
          isSameDay(preset.range.from, current.from as Date) &&
          isSameDay(preset.range.to, current.to as Date),
      )?.label ?? null
    );
  };

  const apply = () => {
    const current = range();
    if (current?.from) {
      const from = toIsoDay(current.from);
      props.onChange([from, current.to ? toIsoDay(current.to) : from]);
    }
    setOpen(false);
  };

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom" gutter={8}>
      <PopoverTrigger class={TRIGGER_CLASS}>
        <Show when={range()?.from} fallback={<span>Pick a date range with presets</span>}>
          {(from) => (
            <>
              {format(from(), "LLL dd, y")}
              <Show when={range()?.to}>{(to) => ` - ${format(to(), "LLL dd, y")}`}</Show>
            </>
          )}
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0">
        <div class="flex max-sm:flex-col">
          <div class="relative border-border max-sm:order-1 max-sm:border-t sm:w-32">
            <div class="h-full border-border py-2 sm:border-e">
              <div class="flex flex-col gap-[2px] px-2">
                <For each={presets}>
                  {(preset) => (
                    <Button
                      type="button"
                      variant="ghost"
                      class={cn(
                        "h-8 w-full justify-start",
                        activePreset() === preset.label && "bg-accent",
                      )}
                      onClick={() => {
                        setRange(preset.range);
                        setMonth(preset.range.from);
                      }}
                    >
                      {preset.label}
                    </Button>
                  )}
                </For>
              </div>
            </div>
          </div>
          <Calendar
            mode="range"
            month={month()}
            onMonthChange={setMonth}
            showOutsideDays={false}
            selected={range()}
            onSelect={setRange}
            numberOfMonths={2}
          />
        </div>
        <div class="flex items-center justify-end gap-1.5 border-border border-t p-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const timeSlots = [
  { time: "09:00", available: false },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: true },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: false },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
];

function DateTimeControl(props: ControlProps) {
  const initial = toDate(props.values?.[0]);
  const [open, setOpen] = createSignal(false);
  const [date, setDate] = createSignal<Date | undefined>(initial);
  const [time, setTime] = createSignal<string | undefined>(
    initial ? initial.toTimeString().slice(0, 5) : "10:00",
  );

  useAutoOpen(props, setOpen);

  const apply = () => {
    const day = date();
    const slot = time();
    if (day && slot) {
      const [hours, minutes] = slot.split(":").map(Number);
      const dateTime = new Date(day);
      dateTime.setHours(hours, minutes, 0, 0);
      props.onChange([dateTime.toISOString()]);
    }
    setOpen(false);
  };

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-start" gutter={8}>
      <PopoverTrigger class={TRIGGER_CLASS}>
        <Show when={date()} fallback={<span>Pick a date and time</span>}>
          {(day) => (
            <>
              {format(day(), "PPP")}
              <Show when={time()}>{(slot) => ` - ${slot()}`}</Show>
            </>
          )}
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-auto gap-0 p-0 pt-1">
        <div class="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={date()}
            onSelect={setDate}
            class="p-2 sm:pe-5"
            disabled={{ before: new Date() }}
          />
          <div class="relative w-full max-sm:h-46 sm:w-40">
            <div class="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea class="h-full sm:border-s">
                <div class="space-y-3">
                  <div class="flex h-5 shrink-0 items-center px-5">
                    <p class="font-medium text-sm">
                      <Show when={date()} fallback="Pick a date">
                        {(day) => format(day(), "EEEE, d")}
                      </Show>
                    </p>
                  </div>
                  <div class="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    <For each={timeSlots}>
                      {(slot) => (
                        <Button
                          variant={time() === slot.time ? "default" : "outline"}
                          size="sm"
                          class="w-full"
                          disabled={!slot.available}
                          onClick={() => setTime(slot.time)}
                        >
                          {slot.time}
                        </Button>
                      )}
                    </For>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-1.5 border-border border-t p-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SliderRangeControl(props: ControlProps) {
  const initial = props.values?.[0];
  const [open, setOpen] = createSignal(false);
  const [range, setRange] = createSignal<number[]>(
    initial && typeof initial === "object" && "min" in initial && "max" in initial
      ? [
          (initial as { min: number; max: number }).min,
          (initial as { min: number; max: number }).max,
        ]
      : [0, 100],
  );

  useAutoOpen(props, setOpen);

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-start" gutter={8}>
      <PopoverTrigger class={TRIGGER_CLASS}>
        {range()[0]} - {range()[1]}
      </PopoverTrigger>
      <PopoverContent class="w-auto p-4">
        <div class="space-y-2.5">
          <div class="space-y-4 pt-2.5">
            <Slider
              value={range()}
              onChange={setRange}
              minValue={0}
              maxValue={100}
              step={1}
              class="w-[200px]"
            />
            <div class="flex justify-between ps-1.5 text-muted-foreground text-xs">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
          <div class="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                props.onChange([{ min: range()[0], max: range()[1] }]);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon" {...props}>
      <ListFilter />
    </Button>
  );
}

export default function FiltersCustomControls() {
  const [filters, setFilters] = createSignal<Filter[]>([
    createFilter("customDateRange", "between", []),
  ]);
  const [lastAddedValues, setLastAddedValues] = createSignal<unknown[] | null>(null);

  const fields: FilterFieldConfig[] = [
    {
      key: "modalDate",
      label: "Modal Date",
      type: "custom",
      icon: () => <CalendarIcon class="size-3.5" />,
      operators: [
        { value: "is", label: "is" },
        { value: "is_not", label: "is not" },
      ],
      customRenderer: (renderer) => (
        <ModalDateControl
          values={renderer.values}
          onChange={renderer.onChange}
          autofocus={renderer.values === lastAddedValues()}
        />
      ),
    },
    {
      key: "customDateRange",
      label: "Date Range",
      type: "custom",
      icon: () => <CalendarIcon class="size-3.5" />,
      operators: [
        { value: "between", label: "between" },
        { value: "not_between", label: "not between" },
      ],
      customRenderer: (renderer) => (
        <DateRangeControl
          values={renderer.values}
          onChange={renderer.onChange}
          autofocus={renderer.values === lastAddedValues()}
        />
      ),
    },
    {
      key: "customDateRangePresets",
      label: "Date Range Presets",
      type: "custom",
      icon: () => <CalendarIcon class="size-3.5" />,
      operators: [
        { value: "between", label: "between" },
        { value: "not_between", label: "not between" },
      ],
      customRenderer: (renderer) => (
        <DateRangePresetsControl
          values={renderer.values}
          onChange={renderer.onChange}
          autofocus={renderer.values === lastAddedValues()}
        />
      ),
    },
    {
      key: "customDateTime",
      label: "Date & Time",
      type: "custom",
      icon: () => <Clock class="size-3.5" />,
      operators: [
        { value: "is", label: "is" },
        { value: "before", label: "before" },
        { value: "after", label: "after" },
      ],
      customRenderer: (renderer) => (
        <DateTimeControl
          values={renderer.values}
          onChange={renderer.onChange}
          autofocus={renderer.values === lastAddedValues()}
        />
      ),
    },
    {
      key: "customSliderRange",
      label: "Slider Range",
      type: "custom",
      icon: () => <SlidersVertical class="size-3.5" />,
      class: "w-36",
      operators: [
        { value: "between", label: "between" },
        { value: "not_between", label: "not between" },
      ],
      customRenderer: (renderer) => (
        <SliderRangeControl
          values={renderer.values}
          onChange={renderer.onChange}
          autofocus={renderer.values === lastAddedValues()}
        />
      ),
    },
  ];

  const handleChange = (next: Filter[]) => {
    const added = next.find((filter) => !filters().some((current) => current.id === filter.id));
    if (added) setLastAddedValues(added.values);
    setFilters(next);
  };

  return (
    <div class="flex grow content-start items-start gap-2.5 self-start">
      <div class="flex-1">
        <Filters
          filters={filters()}
          fields={fields}
          onChange={handleChange}
          trigger={IconTrigger}
        />
      </div>

      <Show when={filters().length > 0}>
        <Button variant="outline" onClick={() => setFilters([])}>
          <FunnelX />
          Clear
        </Button>
      </Show>
    </div>
  );
}
