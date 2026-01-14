import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Calendar } from "@/registry/ui/calendar";
import { Card, CardContent } from "../ui/card";

export default function CalendarExample() {
  return (
    <ExampleWrapper>
      <CalendarSingle />
      <CalendarMultiple />
      <CalendarRange />
      <CalendarDisabled />
      <CalendarMultipleMonths />
      <CalendarFixedWeeks />
    </ExampleWrapper>
  );
}

function CalendarSingle() {
  const [date, setDate] = createSignal<Date | null>(null);

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

function CalendarRange() {
  const [range, setRange] = createSignal<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  return (
    <Example title="Range Selection">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="range" value={range()} onValueChange={setRange} />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarMultiple() {
  const [dates, setDates] = createSignal<Date[]>([]);

  return (
    <Example title="Multiple Selection">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="multiple" value={dates()} onValueChange={setDates} />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarDisabled() {
  const [date, setDate] = createSignal<Date | null>(null);

  const disablePastDates = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day < today;
  };

  return (
    <Example title="Disabled Past Dates">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar
            mode="single"
            value={date()}
            onValueChange={setDate}
            disabled={disablePastDates}
          />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarMultipleMonths() {
  const [range, setRange] = createSignal<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  return (
    <Example title="Multiple Months">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="range" value={range()} onValueChange={setRange} numberOfMonths={2} />
        </CardContent>
      </Card>
    </Example>
  );
}

function CalendarFixedWeeks() {
  const [date, setDate] = createSignal<Date | null>(null);

  return (
    <Example title="Fixed Weeks">
      <Card class="mx-auto w-fit p-0">
        <CardContent class="p-0">
          <Calendar mode="single" value={date()} onValueChange={setDate} fixedWeeks />
        </CardContent>
      </Card>
    </Example>
  );
}
