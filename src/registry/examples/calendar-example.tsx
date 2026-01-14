import { createSignal } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Calendar } from "@/registry/ui/calendar";

export default function CalendarExample() {
  return (
    <ExampleWrapper>
      <CalendarBasic />
      <CalendarRange />
      <CalendarMultiple />
      <CalendarDisabled />
      <CalendarMultipleMonths />
      <CalendarFixedWeeks />
    </ExampleWrapper>
  );
}

function CalendarBasic() {
  const [date, setDate] = createSignal<Date | null>(null);

  return (
    <Example title="Basic">
      <Calendar mode="single" value={date()} onValueChange={setDate} />
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
      <Calendar mode="range" value={range()} onValueChange={setRange} />
    </Example>
  );
}

function CalendarMultiple() {
  const [dates, setDates] = createSignal<Date[]>([]);

  return (
    <Example title="Multiple Selection">
      <Calendar mode="multiple" value={dates()} onValueChange={setDates} />
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
      <Calendar mode="single" value={date()} onValueChange={setDate} disabled={disablePastDates} />
    </Example>
  );
}

function CalendarMultipleMonths() {
  const [date, setDate] = createSignal<Date | null>(null);

  return (
    <Example title="Multiple Months">
      <Calendar mode="single" value={date()} onValueChange={setDate} numberOfMonths={2} />
    </Example>
  );
}

function CalendarFixedWeeks() {
  const [date, setDate] = createSignal<Date | null>(null);

  return (
    <Example title="Fixed Weeks">
      <Calendar mode="single" value={date()} onValueChange={setDate} fixedWeeks />
    </Example>
  );
}
