import { createSignal } from "solid-js";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import { Card, CardContent } from "@/registry/kobalte/ui/card";

export default function CalendarWeekNumbers() {
  const initialDate = new Date(new Date().getFullYear(), 0, 12);
  const [date, setDate] = createSignal(initialDate);

  return (
    <Card class="mx-auto w-fit p-0">
      <CardContent class="p-0">
        <Calendar
          mode="single"
          defaultMonth={date()}
          selected={date()}
          onSelect={setDate}
          showWeekNumber
        />
      </CardContent>
    </Card>
  );
}
