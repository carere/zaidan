import type { JSX } from "solid-js";
import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";

const FITNESS_WEEKLY_LOAD = [
  { day: "M", load: 84 },
  { day: "T", load: 52 },
  { day: "W", load: 73 },
  { day: "T", load: 66 },
  { day: "F", load: 91 },
  { day: "S", load: 48 },
  { day: "S", load: 61 },
];

export function WeeklyFitnessSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Fitness Summary</CardTitle>
        <CardDescription>Calories and workout load by day</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="grid grid-cols-7 gap-1.5">
          <For each={FITNESS_WEEKLY_LOAD}>
            {(day) => (
              <div class="rounded-md p-1.5 text-center ring ring-border">
                <div class="text-sm text-muted-foreground">{day.day}</div>
                <div class="relative mt-1 h-16 overflow-hidden rounded-sm bg-muted">
                  <div
                    class="absolute inset-x-0 bottom-0 rounded-sm bg-chart-3"
                    style={
                      {
                        height: `${day.load}%`,
                      } as JSX.CSSProperties
                    }
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full">View details</Button>
      </CardFooter>
    </Card>
  );
}
