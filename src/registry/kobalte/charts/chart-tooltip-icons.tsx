import { Footprints, Waves } from "lucide-solid";
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

export const description = "A stacked bar chart with tooltip icons";

const chartData = [
  { date: "2024-07-15", running: 450, swimming: 300 },
  { date: "2024-07-16", running: 380, swimming: 420 },
  { date: "2024-07-17", running: 520, swimming: 120 },
  { date: "2024-07-18", running: 140, swimming: 550 },
  { date: "2024-07-19", running: 600, swimming: 350 },
  { date: "2024-07-20", running: 480, swimming: 400 },
];

const chartConfig = {
  running: { label: "Running", color: "var(--chart-1)", icon: Footprints },
  swimming: { label: "Swimming", color: "var(--chart-2)", icon: Waves },
} satisfies ChartConfig;

export function ChartTooltipIcons() {
  return (
    <Card class="w-full">
      <CardHeader>
        <CardTitle>Tooltip - Icons</CardTitle>
        <CardDescription>Tooltip with icons.</CardDescription>
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
              content={(tooltipProps) => <ChartTooltipContent {...tooltipProps} hideLabel />}
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
