import { TrendingUp } from "lucide-solid";
import { PolarRadiusAxis, RadialBar, RadialBarChart } from "solid-recharts";
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

const chartData = [{ month: "january", mobile: 570, desktop: 1260 }];

const totalVisitors = chartData[0].desktop + chartData[0].mobile;

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

export function ChartRadialStacked() {
  return (
    <Card class="flex flex-col">
      <CardHeader class="items-center pb-0">
        <CardTitle>Radial Chart - Stacked</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-1 items-center pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square w-full max-w-[250px]">
          <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={110}>
            <RadialBar
              dataKey="mobile"
              fill="var(--color-mobile)"
              stackId="a"
              cornerRadius={5}
              class="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="desktop"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-desktop)"
              class="stroke-transparent stroke-2"
            />
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            {/* Deviation: the port's PolarRadiusAxis takes the label as a
                function `label` prop instead of a <Label content> child, and
                has no `tickLine` prop (tick={false} already hides ticks). */}
            <PolarRadiusAxis
              tick={false}
              axisLine={false}
              label={(labelProps) => {
                const vb = labelProps.viewBox;
                if (vb && "cx" in vb) {
                  return (
                    <text x={vb.cx} y={vb.cy} text-anchor="middle">
                      <tspan x={vb.cx} y={vb.cy - 16} class="fill-foreground text-2xl font-bold">
                        {totalVisitors.toLocaleString()}
                      </tspan>
                      <tspan x={vb.cx} y={vb.cy + 4} class="fill-muted-foreground">
                        Visitors
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </RadialBarChart>
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
