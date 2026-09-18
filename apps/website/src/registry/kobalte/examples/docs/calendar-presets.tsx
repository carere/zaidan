import { addDays } from "date-fns";
import { createSignal, For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";

const presets = [
  { label: "Today", value: 0 },
  { label: "Tomorrow", value: 1 },
  { label: "In 3 days", value: 3 },
  { label: "In a week", value: 7 },
  { label: "In 2 weeks", value: 14 },
];

export default function CalendarPresets() {
  const [date, setDate] = createSignal(new Date(new Date().getFullYear(), 1, 12));
  const [currentMonth, setCurrentMonth] = createSignal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const selectPreset = (offset: number) => {
    const nextDate = addDays(new Date(), offset);
    setDate(nextDate);
    setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  return (
    <Card class="mx-auto w-fit max-w-[300px]" size="sm">
      <CardContent>
        <Calendar
          mode="single"
          selected={date()}
          onSelect={setDate}
          month={currentMonth()}
          onMonthChange={setCurrentMonth}
          fixedWeeks
          class="p-0 [--cell-size:--spacing(9.5)]"
        />
      </CardContent>
      <CardFooter class="flex flex-wrap gap-2 border-t">
        <For each={presets}>
          {(preset) => (
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              onClick={() => selectPreset(preset.value)}
            >
              {preset.label}
            </Button>
          )}
        </For>
      </CardFooter>
    </Card>
  );
}
