import { TrendingUp } from "lucide-solid";
import { CartesianGrid, Dot, Line, LineChart } from "solid-recharts";

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

export const description = "A line chart with a custom label";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const chartConfig = {
  visitors: { label: "Visitors", color: "var(--chart-2)" },
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
  firefox: { label: "Firefox", color: "var(--chart-3)" },
  edge: { label: "Edge", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig;

export function ChartLineLabelCustom() {
  return (
    <Card class="w-full">
      <CardHeader>
        <CardTitle>Line Chart - Custom Label</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} class="aspect-auto h-[300px] w-full">
          <LineChart accessibilityLayer data={chartData} margin={{ top: 24, left: 24, right: 24 }}>
            <CartesianGrid vertical={false} />
            <ChartTooltip
              cursor={false}
              content={(tooltipProps) => (
                <ChartTooltipContent
                  {...tooltipProps}
                  indicator="line"
                  nameKey="visitors"
                  hideLabel
                />
              )}
            />
            <Line
              dataKey="visitors"
              type="natural"
              stroke="var(--color-visitors)"
              strokeWidth={2}
              dot={(props) => {
                const payload = props.payload as (typeof chartData)[number];
                return (
                  <g>
                    <Dot
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill="var(--color-visitors)"
                      stroke="var(--color-visitors)"
                    />
                    <text
                      x={props.cx}
                      y={props.cy == null ? undefined : props.cy - 12}
                      text-anchor="middle"
                      class="fill-foreground"
                      font-size="12"
                      data-line-label
                    >
                      {chartConfig[payload.browser as keyof typeof chartConfig]?.label}
                    </text>
                  </g>
                );
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
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
