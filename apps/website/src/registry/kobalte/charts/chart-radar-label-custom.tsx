import { TrendingUp } from "lucide-solid";
import { Show } from "solid-js";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "solid-recharts";
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
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartRadarLabelCustom() {
  return (
    <Card>
      <CardHeader class="items-center pb-4">
        <CardTitle>Radar Chart - Custom Label</CardTitle>
        <CardDescription>Showing total visitors for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent class="pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <RadarChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            }}
          >
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} indicator="line" />}
            />
            <PolarAngleAxis
              dataKey="month"
              tick={(tickProps) => {
                const point = chartData[tickProps.index];
                const yValue = typeof tickProps.y === "number" ? tickProps.y : 0;
                return (
                  <Show when={point}>
                    {(data) => (
                      <text
                        x={tickProps.x}
                        y={yValue + (tickProps.index === 0 ? -10 : 0)}
                        text-anchor={tickProps.textAnchor}
                        font-size="13"
                        font-weight="500"
                      >
                        <tspan>{data().desktop}</tspan>
                        <tspan class="fill-muted-foreground">/</tspan>
                        <tspan>{data().mobile}</tspan>
                        <tspan
                          x={tickProps.x}
                          dy="1rem"
                          font-size="12"
                          class="fill-muted-foreground"
                        >
                          {data().month}
                        </tspan>
                      </text>
                    )}
                  </Show>
                );
              }}
            />

            <PolarGrid />
            <Radar dataKey="desktop" fill="var(--color-desktop)" fillOpacity={0.6} />
            <Radar dataKey="mobile" fill="var(--color-mobile)" />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-2 text-sm">
        <div class="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="flex items-center gap-2 leading-none text-muted-foreground">
          January - June 2024
        </div>
      </CardFooter>
    </Card>
  );
}
