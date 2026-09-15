import { TrendingUp } from "lucide-solid";
import { Label, Pie, PieChart } from "solid-recharts";
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
  { browser: "firefox", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 190, fill: "var(--color-other)" },
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

export function ChartPieDonutText() {
  const totalVisitors = chartData.reduce((acc, curr) => acc + curr.visitors, 0);

  return (
    <Card class="flex flex-col">
      <CardHeader class="items-center pb-0">
        <CardTitle>Pie Chart - Donut with Text</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent class="flex-1 pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={(labelProps) => {
                  const vb = labelProps.viewBox;
                  if (vb && "cx" in vb && typeof vb.cx === "number" && typeof vb.cy === "number") {
                    return (
                      <text x={vb.cx} y={vb.cy} text-anchor="middle" dominant-baseline="middle">
                        <tspan x={vb.cx} y={vb.cy} class="fill-foreground text-3xl font-bold">
                          {totalVisitors.toLocaleString()}
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
            </Pie>
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
