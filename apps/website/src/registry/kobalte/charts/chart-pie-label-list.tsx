import { TrendingUp } from "lucide-solid";
import { Pie, PieChart, type PieLabelRenderProps } from "solid-recharts";
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

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "var(--chart-1)",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
  firefox: {
    label: "Firefox",
    color: "var(--chart-3)",
  },
  edge: {
    label: "Edge",
    color: "var(--chart-4)",
  },
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

// Widened view of the config for string-keyed label lookups (no `as` assertions).
const configLabels: Record<string, { label?: string }> = chartConfig;

const RADIAN = Math.PI / 180;

export function ChartPieLabelList() {
  return (
    <Card class="flex flex-col">
      <CardHeader class="items-center pb-0">
        <CardTitle>Pie Chart - Label List</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent class="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          class="mx-auto aspect-square max-h-[250px] [&_.recharts-text]:fill-background"
        >
          <PieChart>
            <ChartTooltip
              content={(contentProps) => (
                <ChartTooltipContent {...contentProps} nameKey="visitors" hideLabel />
              )}
            />
            {/* Deviation: <LabelList> inside <Pie> isn't wired in the port —
                approximated with a function-form label drawn at each slice's midpoint. */}
            <Pie
              data={chartData}
              dataKey="visitors"
              labelLine={false}
              label={(labelProps: PieLabelRenderProps) => (
                <text
                  x={
                    labelProps.cx +
                    labelProps.middleRadius * Math.cos(-labelProps.midAngle * RADIAN)
                  }
                  y={
                    labelProps.cy +
                    labelProps.middleRadius * Math.sin(-labelProps.midAngle * RADIAN)
                  }
                  text-anchor="middle"
                  dominant-baseline="central"
                  class="fill-background"
                  stroke="none"
                  font-size="12"
                >
                  {configLabels[String(labelProps.name)]?.label ?? String(labelProps.name)}
                </text>
              )}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-2 text-sm">
        <div class="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
