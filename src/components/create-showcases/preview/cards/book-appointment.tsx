import { Alert, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

export function BookAppointment() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Appointment</CardTitle>
        <CardDescription>Dr. Sarah Chen · Cardiology</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Available on March 18, 2026</FieldLabel>
            <ToggleGroup spacing={2} defaultValue={["slot-0"]}>
              <For each={["9:00 AM", "10:30 AM", "11:00 AM", "1:30 PM"]}>
                {(time, index) => (
                  <ToggleGroupItem value={`slot-${index()}`}>{time}</ToggleGroupItem>
                )}
              </For>
            </ToggleGroup>
          </Field>
        </FieldGroup>
        <Alert>
          <AlertTitle>New patient?</AlertTitle>
          <AlertDescription>Please arrive 15 minutes early.</AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Book Appointment</Button>
      </CardFooter>
    </Card>
  );
}

import { For } from "solid-js";
