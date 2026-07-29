import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Bar, BarChart, XAxis } from "solid-recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";

export const description = "A stacked bar chart with an advanced tooltip";

const chartData = [
  { date: "2024-07-15", running: 450, swimming: 300 },
  { date: "2024-07-16", running: 380, swimming: 420 },
  { date: "2024-07-17", running: 520, swimming: 120 },
  { date: "2024-07-18", running: 140, swimming: 550 },
  { date: "2024-07-19", running: 600, swimming: 350 },
  { date: "2024-07-20", running: 480, swimming: 400 },
];

const chartConfig = {
  running: { label: "Running", color: "var(--chart-1)" },
  swimming: { label: "Swimming", color: "var(--chart-2)" },
} satisfies ChartConfig;

function getTotal(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return 0;
  const values = payload as { running?: unknown; swimming?: unknown };
  return (
    (typeof values.running === "number" ? values.running : 0) +
    (typeof values.swimming === "number" ? values.swimming : 0)
  );
}

export function ChartTooltipAdvanced() {
  return (
    <Card class="w-full">
      <CardHeader>
        <CardTitle>Tooltip - Advanced</CardTitle>
        <CardDescription>Tooltip with custom formatter and total.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} class="aspect-auto h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                new Date(String(value)).toLocaleDateString("en-US", { weekday: "short" })
              }
            />
            <Bar dataKey="running" stackId="a" fill="var(--color-running)" radius={[0, 0, 4, 4]} />
            <Bar
              dataKey="swimming"
              stackId="a"
              fill="var(--color-swimming)"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip
              content={(tooltipProps) => (
                <ChartTooltipContent
                  {...tooltipProps}
                  hideLabel
                  class="w-[180px]"
                  formatter={(value, name, item, index) => (
                    <>
                      <div
                        class="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                        style={
                          { "--color-bg": `var(--color-${String(name)})` } as JSX.CSSProperties
                        }
                      />
                      {chartConfig[String(name) as keyof typeof chartConfig]?.label ?? name}
                      <div class="ml-auto flex items-baseline gap-0.5 font-medium font-mono text-foreground tabular-nums">
                        {String(value ?? "")}
                        <span class="font-normal text-muted-foreground">kcal</span>
                      </div>
                      <Show when={index === 1}>
                        <div class="mt-1.5 flex basis-full items-center border-t pt-1.5 font-medium text-foreground text-xs">
                          Total
                          <div class="ml-auto flex items-baseline gap-0.5 font-medium font-mono text-foreground tabular-nums">
                            {getTotal(item.payload)}
                            <span class="font-normal text-muted-foreground">kcal</span>
                          </div>
                        </div>
                      </Show>
                    </>
                  )}
                />
              )}
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
