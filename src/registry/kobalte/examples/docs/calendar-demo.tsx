import { createSignal } from "solid-js";
import { Calendar } from "@/registry/kobalte/ui/calendar";

export default function CalendarDemo() {
  const [date, setDate] = createSignal(new Date());

  return (
    <Calendar
      mode="single"
      selected={date()}
      onSelect={setDate}
      class="rounded-lg border"
      captionLayout="dropdown"
    />
  );
}
