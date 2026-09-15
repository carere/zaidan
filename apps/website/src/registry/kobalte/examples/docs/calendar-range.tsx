import { addDays } from "date-fns";
import { createSignal } from "solid-js";
import { Calendar, type CalendarRangeValue } from "@/registry/kobalte/ui/calendar";

export default function CalendarRange() {
  const start = new Date(new Date().getFullYear(), 0, 12);
  const [dateRange, setDateRange] = createSignal<CalendarRangeValue>({
    from: start,
    to: addDays(start, 30),
  });

  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange().from}
      selected={dateRange()}
      onSelect={setDateRange}
      numberOfMonths={2}
      class="rounded-lg border"
    />
  );
}
