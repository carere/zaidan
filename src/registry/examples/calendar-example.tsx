import { CalendarIcon } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Calendar } from "@/registry/ui/calendar";
import { Card, CardContent, CardFooter } from "@/registry/ui/card";
import { Field, FieldLabel } from "@/registry/ui/field";
import { Input } from "@/registry/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";

export default function CalendarExample() {
  return (
    <ExampleWrapper>
      <CalendarSingle />
      <CalendarMultiple />
      <CalendarRange />
      <CalendarRangeMultipleMonths />
      <CalendarWithTime />
      <CalendarBookedDates />
      <CalendarWithPresets />
      <DatePickerSimple />
      <DatePickerWithDropdowns />
      <DatePickerWithRange />
    </ExampleWrapper>
  );
}

function CalendarSingle() {
  const [date, setDate] = createSignal<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12),
  );
  return (
    <Example title="Single">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="single" value={date()} onValueChange={setDate} />
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
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const [dateRange, setDateRange] = createSignal<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().getFullYear(), 0, 12),
    to: addDays(new Date(new Date().getFullYear(), 0, 12), 30),
  });

  return (
    <Example title="Range" containerClass="lg:col-span-full 2xl:col-span-full" class="p-12">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="range"
            defaultMonth={dateRange().from ?? undefined}
            value={dateRange()}
            onValueChange={setDateRange}
            numberOfMonths={2}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarRangeMultipleMonths() {
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const [range, setRange] = createSignal<{ from: Date | null; to: Date | null }>({
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
            defaultMonth={range().from ?? undefined}
            value={range()}
            onValueChange={setRange}
            numberOfMonths={3}
            fixedWeeks
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarWithTime() {
  const [date, setDate] = createSignal<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 15),
  );
  const [startTime, setStartTime] = createSignal("10:30");
  const [endTime, setEndTime] = createSignal("12:30");

  return (
    <Example title="With Time">
      <Card class="mx-auto w-fit max-w-sm" size="sm">
        <CardContent>
          <Calendar mode="single" value={date()} onValueChange={setDate} fixedWeeks class="p-0" />
          <div class="mt-4 flex gap-2">
            <Field class="flex-1">
              <FieldLabel for="start-time">Start Time</FieldLabel>
              <Input
                id="start-time"
                type="time"
                value={startTime()}
                onInput={(e) => setStartTime(e.currentTarget.value)}
              />
            </Field>
            <Field class="flex-1">
              <FieldLabel for="end-time">End Time</FieldLabel>
              <Input
                id="end-time"
                type="time"
                value={endTime()}
                onInput={(e) => setEndTime(e.currentTarget.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarBookedDates() {
  const [date, setDate] = createSignal<Date | null>(null);

  // Dates that are "booked" (shown as disabled with different styling)
  const bookedDates = [
    new Date(new Date().getFullYear(), new Date().getMonth(), 8),
    new Date(new Date().getFullYear(), new Date().getMonth(), 9),
    new Date(new Date().getFullYear(), new Date().getMonth(), 10),
    new Date(new Date().getFullYear(), new Date().getMonth(), 15),
    new Date(new Date().getFullYear(), new Date().getMonth(), 16),
    new Date(new Date().getFullYear(), new Date().getMonth(), 20),
    new Date(new Date().getFullYear(), new Date().getMonth(), 25),
  ];

  const isSameDay = (a: Date, b: Date): boolean => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isBooked = (day: Date) => {
    return bookedDates.some((bookedDate) => isSameDay(bookedDate, day));
  };

  return (
    <Example title="Booked Dates">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="single" value={date()} onValueChange={setDate} disabled={isBooked} />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarWithPresets() {
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const [date, setDate] = createSignal<Date | null>(new Date(new Date().getFullYear(), 1, 12));
  const [currentMonth, setCurrentMonth] = createSignal<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  return (
    <Example title="With Presets">
      <Card class="mx-auto w-fit max-w-[300px]" size="sm">
        <CardContent>
          <Calendar
            mode="single"
            value={date()}
            onValueChange={setDate}
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
  const [date, setDate] = createSignal<Date | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

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
            <Show when={date()} fallback={<span>Pick a date</span>}>
              {(d) => formatDate(d())}
            </Show>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <Calendar mode="single" value={date()} onValueChange={setDate} />
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}

function DatePickerWithDropdowns() {
  const [date, setDate] = createSignal<Date | null>(null);
  const [currentMonth, setCurrentMonth] = createSignal<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const months = [
    { label: "January", value: 0 },
    { label: "February", value: 1 },
    { label: "March", value: 2 },
    { label: "April", value: 3 },
    { label: "May", value: 4 },
    { label: "June", value: 5 },
    { label: "July", value: 6 },
    { label: "August", value: 7 },
    { label: "September", value: 8 },
    { label: "October", value: 9 },
    { label: "November", value: 10 },
    { label: "December", value: 11 },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i;
    return { label: year.toString(), value: year };
  });

  const handleMonthChange = (value: number) => {
    const newDate = new Date(currentMonth());
    newDate.setMonth(value);
    setCurrentMonth(newDate);
  };

  const handleYearChange = (value: number) => {
    const newDate = new Date(currentMonth());
    newDate.setFullYear(value);
    setCurrentMonth(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Example title="Date Picker with Dropdowns">
      <Field class="mx-auto w-72">
        <FieldLabel for="date-picker-dropdowns">Date</FieldLabel>
        <Popover>
          <PopoverTrigger
            as={Button}
            variant="outline"
            id="date-picker-dropdowns"
            class="justify-start px-2.5 font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            <Show when={date()} fallback={<span>Pick a date</span>}>
              {(d) => formatDate(d())}
            </Show>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <div class="flex gap-2 border-b p-3">
              <Select<(typeof months)[number]>
                options={months}
                optionValue="value"
                optionTextValue="label"
                placeholder="Month"
                value={months.find((m) => m.value === currentMonth().getMonth())}
                onChange={(value) => handleMonthChange(value?.value ?? 0)}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger size="sm" class="flex-1">
                  <SelectValue<(typeof months)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
              <Select<(typeof years)[number]>
                options={years}
                optionValue="value"
                optionTextValue="label"
                placeholder="Year"
                value={years.find((y) => y.value === currentMonth().getFullYear())}
                onChange={(value) => handleYearChange(value?.value ?? 0)}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger size="sm" class="flex-1">
                  <SelectValue<(typeof years)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <Calendar
              mode="single"
              value={date()}
              onValueChange={setDate}
              month={currentMonth()}
              onMonthChange={setCurrentMonth}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}

function DatePickerWithRange() {
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const [date, setDate] = createSignal<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
            <Show when={date().from} fallback={<span>Pick a date</span>}>
              {(from) => (
                <Show when={date().to} fallback={formatDate(from())}>
                  {(to) => (
                    <>
                      {formatDate(from())} - {formatDate(to())}
                    </>
                  )}
                </Show>
              )}
            </Show>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <Calendar
              mode="range"
              defaultMonth={date().from ?? undefined}
              value={date()}
              onValueChange={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </Example>
  );
}
