import { TrendingUp } from "lucide-solid";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "solid-recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { type ChartConfig, ChartContainer } from "@/registry/kobalte/ui/chart";

const chartData = [{ browser: "safari", visitors: 1260, fill: "var(--color-safari)" }];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartRadialShape() {
  return (
    <Card class="flex flex-col">
      <CardHeader class="items-center pb-0">
        <CardTitle>Radial Chart - Shape</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent class="flex-1 pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <RadialBarChart data={chartData} endAngle={100} innerRadius={65} outerRadius={95}>
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              class="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="visitors" background />
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
                    <text x={vb.cx} y={vb.cy} text-anchor="middle" dominant-baseline="middle">
                      <tspan x={vb.cx} y={vb.cy} class="fill-foreground text-4xl font-bold">
                        {chartData[0].visitors.toLocaleString()}
                      </tspan>
                      <tspan x={vb.cx} y={vb.cy + 24} class="fill-muted-foreground">
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
