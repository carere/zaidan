import { TrendingUp } from "lucide-solid";
import { For } from "solid-js";
import { Bar, BarChart, CartesianGrid, Cell, LabelList } from "solid-recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";

export const description = "A bar chart with negative values";

const chartData = [
  { month: "January", visitors: 186 },
  { month: "February", visitors: 205 },
  { month: "March", visitors: -207 },
  { month: "April", visitors: 173 },
  { month: "May", visitors: -209 },
  { month: "June", visitors: 214 },
];

const chartConfig = {
  visitors: { label: "Visitors" },
} satisfies ChartConfig;

export function ChartBarNegative() {
  return (
    <Card data-visual-representative="bar">
      <CardHeader>
        <CardTitle>Bar Chart - Negative</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <ChartTooltip
              cursor={false}
              content={(tooltipProps) => (
                <ChartTooltipContent {...tooltipProps} hideLabel hideIndicator />
              )}
            />
            <Bar dataKey="visitors">
              <LabelList position="top" dataKey="month" fillOpacity={1} />
              <For each={chartData}>
                {(item) => <Cell fill={item.visitors > 0 ? "var(--chart-1)" : "var(--chart-2)"} />}
              </For>
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col items-start gap-2 text-sm">
        <div class="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp class="size-4" />
        </div>
        <div class="text-muted-foreground leading-none">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
