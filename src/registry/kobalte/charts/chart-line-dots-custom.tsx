import { GitCommitVertical, TrendingUp } from "lucide-solid";
import { CartesianGrid, Line, LineChart, XAxis } from "solid-recharts";
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

export function ChartLineDotsCustom() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Chart - Custom Dots</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            <Line
              dataKey="desktop"
              type="natural"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={(dotProps) => {
                if (dotProps.cx == null || dotProps.cy == null) {
                  return null;
                }

                const r = 24;

                return (
                  <GitCommitVertical
                    x={dotProps.cx - r / 2}
                    y={dotProps.cy - r / 2}
                    width={r}
                    height={r}
                    fill="hsl(var(--background))"
                    stroke="var(--color-desktop)"
                  />
                );
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col items-start gap-2 text-sm">
        <div class="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
