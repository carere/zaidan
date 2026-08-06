import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Clock2 } from "lucide-solid";
import { createSignal, Show, splitProps } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Calendar,
  CalendarDayButton,
  type CalendarDayButtonProps,
  type CalendarRangeValue,
} from "@/registry/kobalte/ui/calendar";
import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function CalendarExample() {
  return (
    <ExampleWrapper>
      <CalendarSingle />
      <CalendarMultiple />
      <CalendarWeekNumbers />
      <CalendarBookedDates />
      <CalendarRange />
      <CalendarRangeMultipleMonths />
      <CalendarWithTime />
      <CalendarWithPresets />
      <CalendarCustomDays />
      <DatePickerSimple />
      <DatePickerWithDropdowns />
      <DatePickerWithRange />
      <CalendarInCard />
      <CalendarInPopover />
    </ExampleWrapper>
  );
}

function CalendarSingle() {
  const [date, setDate] = createSignal<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12),
  );
  return (
    <Example title="Single">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="single"
            selected={date()}
            onSelect={(value) => setDate(value)}
            captionLayout="dropdown"
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarMultiple() {
  return (
    <Example title="Multiple">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="multiple" />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarRange() {
  const [dateRange, setDateRange] = createSignal<CalendarRangeValue | undefined>({
    from: new Date(new Date().getFullYear(), 0, 12),
    to: addDays(new Date(new Date().getFullYear(), 0, 12), 30),
  });

  return (
    <Example title="Range" containerClass="lg:col-span-full 2xl:col-span-full" class="p-12">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="range"
            defaultMonth={dateRange()?.from}
            selected={dateRange()}
            onSelect={(value) => setDateRange(value)}
            numberOfMonths={2}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarRangeMultipleMonths() {
  const [range, setRange] = createSignal<CalendarRangeValue | undefined>({
    from: new Date(new Date().getFullYear(), 3, 12),
    to: addDays(new Date(new Date().getFullYear(), 3, 12), 60),
  });

  return (
    <Example
      title="Range Multiple Months"
      containerClass="lg:col-span-full 2xl:col-span-full"
      class="p-12"
    >
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="range"
            defaultMonth={range()?.from}
            selected={range()}
            onSelect={(value) => setRange(value)}
            numberOfMonths={3}
            locale={es}
            fixedWeeks
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarWeekNumbers() {
  const [date, setDate] = createSignal<Date | undefined>(new Date(new Date().getFullYear(), 1, 3));

  return (
    <Example title="Week Numbers" class="justify-center">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="single"
            defaultMonth={date()}
            selected={date()}
            onSelect={(value) => setDate(value)}
            showWeekNumber
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarCustomDays() {
  const [range, setRange] = createSignal<CalendarRangeValue | undefined>({
    from: new Date(new Date().getFullYear(), 11, 8),
    to: addDays(new Date(new Date().getFullYear(), 11, 8), 10),
  });

  return (
    <Example title="Custom Days">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="range"
            defaultMonth={range()?.from}
            selected={range()}
            onSelect={(value) => setRange(value)}
            captionLayout="dropdown"
            class="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
            formatters={{
              formatMonthDropdown: (date) => date.toLocaleString("default", { month: "long" }),
            }}
            components={{ DayButton: CalendarPriceDayButton }}
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarPriceDayButton(props: CalendarDayButtonProps) {
  const [local, others] = splitProps(props, ["children", "day", "modifiers"]);
  const isWeekend = () => local.day.date.getDay() === 0 || local.day.date.getDay() === 6;

  return (
    <CalendarDayButton day={local.day} modifiers={local.modifiers} {...others}>
      {local.children}
      <Show when={!local.modifiers.outside}>
        <span>{isWeekend() ? "$120" : "$100"}</span>
      </Show>
    </CalendarDayButton>
  );
}

function CalendarWithTime() {
  const [date, setDate] = createSignal<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12),
  );

  return (
    <Example title="With Time">
      <Card size="sm" class="mx-auto w-fit">
        <CardContent>
          <Calendar
            mode="single"
            selected={date()}
            onSelect={(value) => setDate(value)}
            class="p-0"
          />
        </CardContent>
        <CardFooter class="border-t bg-card">
          <FieldGroup>
            <Field class="flex-1">
              <FieldLabel for="time-from">Start Time</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="time-from"
                  type="time"
                  step="1"
                  value="10:30:00"
                  class="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon>
                  <Clock2 class="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field class="flex-1">
              <FieldLabel for="time-to">End Time</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="time-to"
                  type="time"
                  step="1"
                  value="12:30:00"
                  class="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon>
                  <Clock2 class="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CalendarBookedDates() {
  const [date, setDate] = createSignal<Date | undefined>(new Date(new Date().getFullYear(), 1, 3));

  const bookedDates = Array.from(
    { length: 15 },
    (_, index) => new Date(new Date().getFullYear(), 1, 12 + index),
  );

  return (
    <Example title="Booked Dates">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="single"
            defaultMonth={date()}
            selected={date()}
            onSelect={(value) => setDate(value)}
            disabled={bookedDates}
            modifiers={{ booked: bookedDates }}
            modifiersClassNames={{ booked: "[&>button]:line-through opacity-100" }}
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarWithPresets() {
  const [date, setDate] = createSignal<Date | undefined>(new Date(new Date().getFullYear(), 1, 12));
  const [currentMonth, setCurrentMonth] = createSignal<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  return (
    <Example title="With Presets">
      <Card class="mx-auto w-fit max-w-[300px]" size="sm">
        <CardContent>
          <Calendar
            mode="single"
            selected={date()}
            onSelect={(value) => setDate(value)}
            month={currentMonth()}
            onMonthChange={setCurrentMonth}
            fixedWeeks
            class="p-0 [--cell-size:--spacing(9.5)]"
          />
        </CardContent>
        <CardFooter class="flex flex-wrap gap-2 border-t">
          {[
            { label: "Today", value: 0 },
            { label: "Tomorrow", value: 1 },
            { label: "In 3 days", value: 3 },
            { label: "In a week", value: 7 },
            { label: "In 2 weeks", value: 14 },
          ].map((preset) => (
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              onClick={() => {
                const newDate = addDays(new Date(), preset.value);
                setDate(newDate);
                setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
              }}
            >
              {preset.label}
            </Button>
          ))}
        </CardFooter>
      </Card>
    </Example>
  );
}

function DatePickerSimple() {
  const [date, setDate] = createSignal<Date | undefined>();

  return (
    <Example title="Date Picker Simple">
      <Field class="mx-auto w-72">
        <FieldLabel for="date-picker-simple">Date</FieldLabel>
        <Popover>
          <PopoverTrigger
            as={Button}
            variant="outline"
            id="date-picker-simple"
            class="justify-start px-2.5 font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            <Show when={date()} fallback={<span>Pick a date</span>} keyed>
              {(value) => format(value, "PPP")}
            </Show>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto p-0">
            <Calendar mode="single" selected={date()} onSelect={(value) => setDate(value)} />
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}

function DatePickerWithDropdowns() {
  const [date, setDate] = createSignal<Date | undefined>();
  const [open, setOpen] = createSignal(false);

  return (
    <Example title="Date Picker with Dropdowns">
      <Field class="mx-auto w-72">
        <FieldLabel for="date-picker-dropdowns">Date</FieldLabel>
        <Popover open={open()} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
          <PopoverTrigger
            as={Button}
            variant="outline"
            id="date-picker-dropdowns"
            class="justify-start px-2.5 font-normal"
          >
            <Show when={date()} fallback={<span>Pick a date</span>} keyed>
              {(value) => format(value, "PPP")}
            </Show>
            <ChevronDown data-icon="inline-end" class="ml-auto" />
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto p-0">
            <Calendar
              mode="single"
              selected={date()}
              onSelect={(value) => setDate(value)}
              captionLayout="dropdown"
            />
            <div class="flex gap-2 border-t p-2">
              <Button variant="outline" size="sm" class="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}

function DatePickerWithRange() {
  const [date, setDate] = createSignal<CalendarRangeValue | undefined>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  return (
    <Example title="Date Picker Range">
      <Field class="mx-auto w-72">
        <FieldLabel for="date-picker-range">Date Picker Range</FieldLabel>
        <Popover>
          <PopoverTrigger
            as={Button}
            variant="outline"
            id="date-picker-range"
            class="justify-start px-2.5 font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            <Show when={date()?.from} fallback={<span>Pick a date</span>} keyed>
              {(from) => (
                <Show when={date()?.to} fallback={format(from, "LLL dd, y")} keyed>
                  {(to) => (
                    <>
                      {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
                    </>
                  )}
                </Show>
              )}
            </Show>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto p-0">
            <Calendar
              mode="range"
              defaultMonth={date()?.from}
              selected={date()}
              onSelect={(value) => setDate(value)}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}

function CalendarInCard() {
  return (
    <Example title="In Card">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="single" />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarInPopover() {
  return (
    <Example title="In Popover">
      <Popover>
        <PopoverTrigger as={Button} variant="outline" class="px-2.5 font-normal">
          <CalendarIcon data-icon="inline-start" />
          Open Calendar
        </PopoverTrigger>
        <PopoverContent align="start" class="w-auto p-0">
          <Calendar mode="single" />
        </PopoverContent>
      </Popover>
    </Example>
  );
}
