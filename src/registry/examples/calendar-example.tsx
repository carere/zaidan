import { CalendarIcon } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Calendar } from "@/registry/ui/calendar";
import { Card, CardContent, CardFooter } from "@/registry/ui/card";
import { Field, FieldLabel } from "@/registry/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/ui/popover";

export default function CalendarExample() {
  return (
    <ExampleWrapper>
      <CalendarSingle />
      <CalendarMultiple />
      <CalendarRange />
      <CalendarRangeMultipleMonths />
      <CalendarWithPresets />
      <DatePickerSimple />
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
