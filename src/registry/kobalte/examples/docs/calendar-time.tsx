import { Clock2Icon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";

export default function CalendarTime() {
  const [date, setDate] = createSignal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 12),
  );

  return (
    <Card size="sm" class="mx-auto w-fit">
      <CardContent>
        <Calendar mode="single" selected={date()} onSelect={setDate} class="p-0" />
      </CardContent>
      <CardFooter class="border-t bg-card">
        <FieldGroup>
          <Field>
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
                <Clock2Icon class="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
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
                <Clock2Icon class="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardFooter>
    </Card>
  );
}
