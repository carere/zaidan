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

const chartData = [
  { date: "2024-07-15", running: 450, swimming: 300 },
  { date: "2024-07-16", running: 380, swimming: 420 },
  { date: "2024-07-17", running: 520, swimming: 120 },
  { date: "2024-07-18", running: 140, swimming: 550 },
  { date: "2024-07-19", running: 600, swimming: 350 },
  { date: "2024-07-20", running: 480, swimming: 400 },
];

const chartConfig = {
  running: {
    label: "Running",
    color: "var(--chart-1)",
  },
  swimming: {
    label: "Swimming",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// Widened view of chartConfig so formatters can look up labels by a
// runtime string name without type assertions.
const chartLabels: ChartConfig = chartConfig;

// item.payload is unknown in the port — narrow it with typeof/in checks.
function totalKcal(point: unknown): number {
  if (typeof point !== "object" || point === null) return 0;
  const running = "running" in point && typeof point.running === "number" ? point.running : 0;
  const swimming = "swimming" in point && typeof point.swimming === "number" ? point.swimming : 0;
  return running + swimming;
}

export function ChartTooltipAdvanced() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tooltip - Advanced</CardTitle>
        <CardDescription>Tooltip with custom formatter and total.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                new Date(String(value)).toLocaleDateString("en-US", {
                  weekday: "short",
                })
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
              content={(contentProps) => (
                <ChartTooltipContent
                  {...contentProps}
                  hideLabel
                  class="w-[180px]"
                  formatter={(value, name, item, index) => {
                    const colorVar = typeof name === "string" ? `var(--color-${name})` : undefined;
                    return (
                      <>
                        <div
                          class="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                          style={{ "--color-bg": colorVar }}
                        />
                        {(typeof name === "string" ? chartLabels[name]?.label : undefined) ?? name}
                        <div class="ml-auto flex items-baseline gap-0.5 font-mono font-medium text-foreground tabular-nums">
                          {String(value)}
                          <span class="font-normal text-muted-foreground">kcal</span>
                        </div>
                        {/* Add this after the last item */}
                        {index === 1 ? (
                          <div class="mt-1.5 flex basis-full items-center border-t pt-1.5 text-xs font-medium text-foreground">
                            Total
                            <div class="ml-auto flex items-baseline gap-0.5 font-mono font-medium text-foreground tabular-nums">
                              {totalKcal(item.payload)}
                              <span class="font-normal text-muted-foreground">kcal</span>
                            </div>
                          </div>
                        ) : null}
                      </>
                    );
                  }}
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
