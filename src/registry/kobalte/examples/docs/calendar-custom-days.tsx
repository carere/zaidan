import { addDays } from "date-fns";
import { createSignal, Show, splitProps } from "solid-js";
import {
  Calendar,
  CalendarDayButton,
  type CalendarDayButtonProps,
  type CalendarRangeValue,
} from "@/registry/kobalte/ui/calendar";
import { Card, CardContent } from "@/registry/kobalte/ui/card";

const PriceDayButton = (props: CalendarDayButtonProps) => {
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
};

export default function CalendarCustomDays() {
  const start = new Date(new Date().getFullYear(), 11, 8);
  const [range, setRange] = createSignal<CalendarRangeValue>({
    from: start,
    to: addDays(start, 10),
  });

  return (
    <Card class="mx-auto w-fit p-0">
      <CardContent class="p-0">
        <Calendar
          mode="range"
          defaultMonth={range().from}
          selected={range()}
          onSelect={setRange}
          captionLayout="dropdown"
          class="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
          formatters={{
            formatMonthDropdown: (date) => date.toLocaleString("default", { month: "long" }),
          }}
          components={{ DayButton: PriceDayButton }}
        />
      </CardContent>
    </Card>
  );
}
